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
  reports.push(...Array.from({length:8},(_,i)=>makeReport('extra-'+i,'Sample Additional Patient '+(i+1),'2020-01-01')));
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
  await page.goto(baseURL+'/dashboard/radiology');
  let table=await checkTable(page,7);
  const desktopContainer=page.locator('.data-table-container').first();
  assert.ok(await desktopContainer.evaluate(el=>el.clientWidth>window.innerWidth-120));
  assert.ok(await desktopContainer.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  const headers=await table.locator('thead th').evaluateAll(cells=>cells.map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right};}));
  for(let i=1;i<headers.length;i++)assert.ok(headers[i].left>=headers[i-1].right-1,'desktop columns must not overlap');
  assert.equal(await table.locator('tbody tr').first().locator('td').last().locator('button').count(),5);
  const handle=table.getByRole('separator',{name:'Resize Center Name column'});
  const header=table.locator('th[data-column-key="centerName"]');
  const before=(await header.boundingBox())!;const grip=(await handle.boundingBox())!;
  const indicator=await handle.evaluate(el=>getComputedStyle(el,'::before').backgroundColor);
  assert.notEqual(indicator,'rgba(0, 0, 0, 0)');
  assert.equal(await handle.evaluate(el=>getComputedStyle(el,'::before').width),'1px');
  assert.equal(await handle.evaluate(el=>getComputedStyle(el,'::before').opacity),'0.4');
  assert.equal(await handle.evaluate(el=>getComputedStyle(el,'::after').content),'none');
  await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2);await page.mouse.down();
  await page.mouse.move(grip.x+grip.width/2+65,grip.y+grip.height/2,{steps:8});await page.mouse.up();
  const resized=(await header.boundingBox())!;
  assert.ok(Math.abs(resized.width-before.width-65)<3);
  await handle.focus();await handle.press('ArrowRight');
  assert.ok(Math.abs((await header.boundingBox())!.width-resized.width-16)<3);
  assert.equal(await page.evaluate(()=>document.body.style.cursor),'');
  await table.getByRole('separator',{name:'Resize Actions column'}).press('Home');
  await checkTable(page,7);
  await page.reload();await checkTable(page,7);
  mkdirSync('_ui_shots',{recursive:true});await page.screenshot({path:'_ui_shots/centers-table-visible.png',fullPage:true});
  console.log('PASS: all centre columns and five action buttons fit; visible grips resize by mouse and keyboard');
  await page.setViewportSize({width:900,height:1000});table=await checkTable(page,7);
  const container=page.locator('.data-table-container').first();
  assert.ok(await container.evaluate(el=>el.scrollWidth>el.clientWidth));
  await container.evaluate(el=>el.scrollLeft=el.scrollWidth);
  await checkTable(page,7);
  await page.screenshot({path:'_ui_shots/centers-table-tablet.png',fullPage:true});
  console.log('PASS: tablet keeps every column and resize handle; horizontal scrolling preserves actions');
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(baseURL+'/dashboard/all-reports');table=await checkTable(page,8);
  assert.equal(await table.locator('th[data-column-key="radiologist"]').count(),0);
  assert.equal(await table.locator('tbody tr').first().locator('td').count(),8);
  assert.ok((await table.locator('tbody tr').first().innerText()).includes('Sample Newest Patient'));
  await table.getByRole('button',{name:'Show studies',exact:true}).first().click();
  const expanded=table.locator('td[colspan]').first();await expanded.waitFor();
  assert.notEqual(await expanded.evaluate(el=>getComputedStyle(el).position),'sticky');
  await page.setViewportSize({width:900,height:1000});await checkTable(page,8);
  await page.evaluate(()=>{
    new MutationObserver(mutations=>{for(const mutation of mutations)for(const node of mutation.addedNodes){
      if(node instanceof HTMLIFrameElement && node.id==='rn-label-print' && node.contentWindow)node.contentWindow.print=()=>{};
    }}).observe(document.body,{childList:true});
  });
  await page.getByTestId('select-all').check();await page.getByTestId('print-label-btn').click();
  const labelFrame=page.frameLocator('#rn-label-print');
  await labelFrame.locator('.sheet').first().waitFor();
  assert.equal(await labelFrame.locator('.sheet').count(),2);
  assert.equal(await labelFrame.locator('.sheet').nth(0).locator('.label').count(),10);
  assert.equal(await labelFrame.locator('.sheet').nth(1).locator('.label').count(),1);
  assert.equal(await labelFrame.locator('.sheet').first().evaluate(el=>getComputedStyle(el).gridTemplateRows.split(' ').length),5);
  console.log('PASS: actual All Reports print action produces ten labels on first A4 sheet and remaining label on second');
  console.log('PASS: All Reports keeps all columns/actions, study-date sort and expanded details on tablet');
  await page.goto(baseURL+'/dashboard/managers');await checkTable(page,5);
  console.log('PASS: Managers columns, full access summary and action buttons remain visible');
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await setup(mobile);
  await mobile.goto(baseURL+'/dashboard/radiology');
  const card=mobile.locator('.rt-card').first();await card.waitFor();
  assert.ok((await card.innerText()).includes(center.email));
  assert.equal(await card.locator('.rt-card-actions button').count(),5);
  assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  await mobile.setViewportSize({width:900,height:1000});await checkTable(mobile,7);
  const touchHandle=mobile.getByRole('separator',{name:'Resize Center Name column'});
  const touchHeader=mobile.locator('th[data-column-key="centerName"]');
  const initial=(await touchHeader.boundingBox())!;const target=(await touchHandle.boundingBox())!;
  const cdp=await mobile.context().newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:target.x+7,y:target.y+target.height/2,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:target.x+57,y:target.y+target.height/2,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(Math.abs((await touchHeader.boundingBox())!.width-initial.width-50)<3);
  await checkTable(mobile,7);
  assert.deepEqual(errors,[]);
  console.log('PASS: mobile cards preserve all data/actions; touch column resize works on tablet; no browser errors');
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
