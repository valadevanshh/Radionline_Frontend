import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {buildLabelPrintHtml, printLabels} from '../lib/print-label';
import type {XRayReport} from '../lib/radiology-store';
async function main(){
 const browser=await chromium.launch({...(process.platform==='win32'?{channel:'msedge'}:{}),headless:true});
 try{
  const page=await browser.newPage({viewport:{width:810,height:1150}});await page.emulateMedia({media:'print'});
  const samples=Array.from({length:21},(_,i)=>({id:'sample-'+i,fullName:'SAMPLE PATIENT '+(i+1),patientNumber:'SAMPLE-'+(i+1),age:35,gender:'Female',studyDate:'2026-11-08',bodyParts:['CHEST PA'],referringPhysicianName:'Dr Sample Referrer'} as XRayReport));
  for(const [count,pages] of [[1,1],[10,1],[11,2],[20,2],[21,3]]){
   await page.setContent(buildLabelPrintHtml(samples.slice(0,count)));
   assert.equal(await page.locator('.sheet').count(),pages);
   assert.equal(await page.locator('.label').count(),count);
   const sheets=await page.locator('.sheet').evaluateAll(items=>items.map(sheet=>{
    const rect=sheet.getBoundingClientRect();const cells=Array.from(sheet.querySelectorAll('.cell')).map(cell=>{const r=cell.getBoundingClientRect();const label=cell.querySelector('.label')!.getBoundingClientRect();return {x:r.x,y:r.y,right:label.right,bottom:label.bottom};});
    return {width:rect.width,height:rect.height,top:rect.top,bottom:rect.bottom,right:rect.right,cells};
   }));
   for(const sheet of sheets){
    assert.ok(Math.abs(sheet.width-210*96/25.4)<1);assert.ok(Math.abs(sheet.height-297*96/25.4)<1);
    assert.ok(sheet.cells.length<=10);
    for(const cell of sheet.cells){assert.ok(cell.bottom<sheet.bottom-1);assert.ok(cell.right<sheet.right-1);}
    assert.equal(new Set(sheet.cells.map(cell=>Math.round(cell.x))).size,Math.min(2,sheet.cells.length));
    assert.equal(new Set(sheet.cells.map(cell=>Math.round(cell.y))).size,Math.ceil(sheet.cells.length/2));
   }
   const pdf = await page.pdf({preferCSSPageSize:true,printBackground:true});
   assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length,pages,'printed page count must match without blank pages');
   console.log(`PASS: ${count} labels use ${pages} A4 page(s), two columns and up to five rows, no overflow`);
  }
  await page.setContent(buildLabelPrintHtml(samples.slice(0,10)));
  mkdirSync('_ui_shots',{recursive:true});await page.screenshot({path:'_ui_shots/a4-ten-labels.png',fullPage:true});
  assert.equal(printLabels([]),false);
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
