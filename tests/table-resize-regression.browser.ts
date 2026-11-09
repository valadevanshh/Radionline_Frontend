import {chromium,type Page} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';

async function main(){
 const baseURL=process.env.DASHBOARD_TEST_BASE_URL || "http://127.0.0.1:3100";
 const appHost=new URL(baseURL).host;
 const browser=await chromium.launch({...(process.platform==='win32'?{channel:'msedge'}:{}),headless:true});
 const errors:string[]=[];
 try{
  const center={id:'table-center',centerName:'Sample International Diagnostic Radiology and Advanced Imaging Centre',address:'Sample address with a sufficiently long location description for wrapping',email:'sample.international.diagnostic.radiology.contact@example.invalid',contactNumber:'9876543210',username:'sample_international_diagnostic_radiology_center_login',password:null,headerTemplateUrl:'/sample-header.png'};
  const rates={center:{firstStudy:30,additionalStudy:15},doctor:{firstStudy:20,additionalStudy:10}};
  const makeReport=(id:string,name:string,date:string,urgent=false)=>({id,fullName:name,patientNumber:'SYS-'+id,centerPatientId:'CTR-'+id,age:35,gender:'Female',radiologyCenterId:center.id,radiologyCenterName:center.centerName,bodyParts:['CHEST PA'],studyDate:date,createdAt:'2026-11-08T12:00:00Z',status:'Pending',isUrgent:urgent,assignedDoctorName:'Dr Sample Radiologist',studies:[{id:id+'-study',bodyPart:'CHEST PA',reportStatus:'PENDING',images:[]}]});
  const reports=[makeReport('old','Sample Old Patient With Long Name','01-10-2026',true),makeReport('new','Sample Newest Patient With Long Name','08/11/2026'),makeReport('middle','Sample Middle Patient','2026-11-01')];
  const permissions={reports:{read:true,write:true,delete:true},doctors:{read:true,write:true,delete:true},centers:{read:true,write:true,delete:true}};
  const setup=async(page:Page)=>{
   page.setDefaultTimeout(12000);page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(()=>localStorage.setItem('radionline_session_v1',JSON.stringify({role:'SUPER_ADMIN',name:'Sample Admin',email:'sample@example.invalid',multiCenter:true})));
   await page.routeWebSocket('**/*',ws=>ws.close());
   await page.route('**/*',route=>{
    const u=new URL(route.request().url());if(u.host===appHost&&!u.pathname.startsWith('/api/')&&!u.pathname.endsWith('/sample-header.png'))return route.continue();
    let data:any=[];
    if(u.pathname.endsWith('/centers'))data=[center];
    else if(u.pathname.includes('/billing/center-pricing'))data={default:rates,centers:[{...rates,centerId:center.id,centerName:center.centerName,isDefault:false,currency:'INR'}]};
    else if(u.pathname.endsWith('/reports'))data=reports;
    else if(u.pathname.endsWith('/doctors'))data=[{id:'sample-doctor',fullName:'Dr Sample Radiologist',expertise:[]}];
    else if(u.pathname.endsWith('/managers'))data=[{id:1,name:'Sample Manager With A Long Display Name',email:'sample.management.long.login@example.invalid',permissions,pendingRequests:12}];
    return route.fulfill({json:data,headers:{'access-control-allow-origin':'*'}});
   });
  };
  const checkTable=async(page:Page,expected:number)=>{
   const table=page.locator('table.data-table').first();await table.waitFor();
   assert.equal(await table.locator('thead th:visible').count(),expected);
   assert.equal(await table.getByRole('separator').count(),expected);
   const problem=await table.locator('tbody tr').first().locator('td').evaluateAll(cells=>{
    const issues:string[]=[];
    for(const [index,cell] of cells.entries()){
     const box=cell.getBoundingClientRect();const walker=document.createTreeWalker(cell,NodeFilter.SHOW_TEXT);let node:Node|null;
     while(node=walker.nextNode()){
      if(!node.textContent?.trim())continue;
      const range=document.createRange();range.selectNodeContents(node);
      for(const r of range.getClientRects())if(r.width&&r.height&&(r.left<box.left-1||r.right>box.right+1||r.top<box.top-1||r.bottom>box.bottom+1))issues.push('cell '+index+' text escapes bounds');
     }
    }
    return issues;
   });
   assert.deepEqual(problem,[]);
   const actions=table.locator('tbody tr').first().locator('td').last();
   const cell=(await actions.boundingBox())!;
   for(const button of await actions.locator('button').all()){
    if(!await button.isVisible())continue;
    const box=(await button.boundingBox())!;
    assert.ok(box.x>=cell.x-1&&box.x+box.width<=cell.x+cell.width+1);
   }
   return table;
  };
  const page=await browser.newPage({viewport:{width:1920,height:1080}});await setup(page);
  const settle=()=>page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  for(const viewportWidth of [1920,1440,900]){
   await page.setViewportSize({width:viewportWidth,height:1080});
   for(const [path,key,label,count] of [['radiology','centerName','Center Name',7],['all-reports','patient','Patient',8],['managers','name','Manager Name',5]] as const){
    await page.goto(baseURL+'/dashboard/'+path);const table=await checkTable(page,count);
    const header=table.locator(`th[data-column-key="${key}"]`);
    const handle=table.getByRole('separator',{name:`Resize ${label} column`});
    const widths=()=>table.locator('thead th').evaluateAll(items=>items.map(el=>el.getBoundingClientRect().width));
    const original=await widths();
    for(let attempt=0;attempt<4;attempt++){
     await handle.click();await settle();const actual=await widths();
     assert.ok(original.every((value,index)=>Math.abs(value-actual[index])<0.6),`${path} ${viewportWidth}: clicking must not change any width`);
    }
    let box=(await handle.boundingBox())!;
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
    await page.mouse.move(box.x+box.width/2+1,box.y+box.height/2);await page.mouse.up();await settle();
    const jitter=await widths();assert.ok(original.every((value,index)=>Math.abs(value-jitter[index])<0.6));
    const before=(await header.boundingBox())!.width;
    const minimum=Number(await handle.getAttribute('aria-valuemin'));
    box=(await handle.boundingBox())!;
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
    await page.mouse.move(box.x+box.width/2-80,box.y+box.height/2,{steps:8});await page.mouse.up();await settle();
    assert.ok(Math.abs((await header.boundingBox())!.width-Math.max(minimum,before-80))<1.2,`${path} ${viewportWidth}: shrinking follows pointer exactly`);
    await checkTable(page,count);
    await page.reload();await checkTable(page,count);
    const keyBefore=(await header.boundingBox())!.width;
    await handle.focus();await handle.press('ArrowRight');await settle();
    assert.ok(Math.abs((await header.boundingBox())!.width-keyBefore-16)<1.2,`${path} ${viewportWidth}: keyboard starts from rendered width`);
    const start=(await header.boundingBox())!.width;box=(await handle.boundingBox())!;
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
    await page.mouse.move(box.x+box.width/2+50,box.y+box.height/2,{steps:5});await settle();
    assert.ok(Math.abs((await header.boundingBox())!.width-start-50)<1.2);
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:5});await page.mouse.up();await settle();
    assert.ok(Math.abs((await header.boundingBox())!.width-start)<1.2,'reversing a drag must restore the original width');
    const clicked=await widths();await handle.click();await settle();const again=await widths();
    assert.ok(clicked.every((value,index)=>Math.abs(value-again[index])<0.6));
    assert.equal(await page.evaluate(()=>document.body.style.cursor),'');
    console.log(`PASS: ${path} at ${viewportWidth}px: repeated single clicks, tiny pointer jitter, shrink, keyboard, reverse drag, no clipping`);
   }
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
