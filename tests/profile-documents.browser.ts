import {chromium,type Page} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';

async function main(){
 const baseURL=process.env.DASHBOARD_TEST_BASE_URL || "http://127.0.0.1:3100";
 const appHost=new URL(baseURL).host;
 const browser=await chromium.launch({...(process.platform==='win32'?{channel:'msedge'}:{}),headless:true});
 try {
  const errors:string[]=[];
  let doctor:any={id:'sample-doctor',firstName:'Sample',lastName:'Doctor',fullName:'Dr Sample Doctor',email:'sample@example.invalid',contactNumber:'123',degree:'MD',expertise:[],signatureScale:100,cvUrl:'/sample-cv.pdf',cvFileName:'Existing CV.pdf',certificates:[{id:'existing',url:'/existing.pdf',fileName:'Existing certificate.pdf'}]};
  let center:any={id:'sample-center',centerName:'Sample Center',email:'sample-center@example.invalid',contactNumber:'123',documents:[],letterheadMode:'header'};
  let rejectSave=false;let lastDoctor:any;let lastCenter:any;
  const files=[{name:'Medical degree.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 sample')},{name:'Registration certificate.png',mimeType:'image/png',buffer:Buffer.from('PNG sample')}];
  let serial=0;
  const stored=(items:any[])=>items.map(item=>item.url.startsWith('data:')?{...item,id:'saved-'+(++serial),url:'/saved-'+serial+'.pdf'}:item);
  const setup=async(page:Page,role:string)=>{
   page.setDefaultTimeout(12000);page.on('pageerror',err=>errors.push(err.message));
   await page.addInitScript(role=>localStorage.setItem('radionline_session_v1',JSON.stringify({role,name:'Sample User',doctorId:'sample-doctor',centerId:'sample-center',email:'sample@example.invalid',multiCenter:true})),role);
   await page.routeWebSocket('**/*',ws=>ws.close());
   await page.route('**/*',route=>{
    const u=new URL(route.request().url());
    if(u.host===appHost&&!u.pathname.endsWith('.pdf')&&!u.pathname.includes('/api/'))return route.continue();
    let data:any=[];
    if(route.request().method()==='PUT'||route.request().method()==='POST'){
      if(rejectSave)return route.fulfill({status:500,json:{detail:'Sample save failure'},headers:{'access-control-allow-origin':'*'}});
      const body=route.request().postDataJSON();
      if(u.pathname.includes('/doctors')){lastDoctor=body;doctor={...doctor,...body,certificates:stored(body.certificates||doctor.certificates)};data=doctor;}
      else if(u.pathname.includes('/centers')){lastCenter=body;center={...center,...body,documents:stored(body.documents||center.documents)};data=center;}
    }else if(u.pathname.endsWith('/doctors/me'))data=doctor;
    else if(u.pathname.endsWith('/doctors/directory')||u.pathname.endsWith('/doctors'))data=[doctor];
    else if(u.pathname.endsWith('/centers'))data=[center];
    return route.fulfill({json:data,headers:{'access-control-allow-origin':'*'}});
   });
  };
  const page=await browser.newPage({viewport:{width:1440,height:1100}});await setup(page,'DOCTOR');
  await page.goto(baseURL+'/dashboard/profile');
  let section=page.getByTestId('doctor-certificates');
  await section.getByText('Existing certificate.pdf',{exact:true}).waitFor();
  assert.equal(await section.locator('input[type=file]').getAttribute('multiple'),'');
  await section.locator('input[type=file]').setInputFiles(files);
  await section.getByText(files[1].name,{exact:true}).waitFor();
  assert.equal(await section.locator('li').count(),3);
  await section.locator('input[type=file]').setInputFiles({name:'Invalid.exe',mimeType:'application/x-msdownload',buffer:Buffer.from('bad')});
  await section.getByRole('alert').waitFor();assert.equal(await section.locator('li').count(),3);
  rejectSave=true;await page.getByTestId('doctor-profile-save').click();await page.getByRole('alert').filter({hasText:'Sample save failure'}).waitFor();
  assert.equal(await section.locator('li').count(),3);
  rejectSave=false;await page.getByTestId('doctor-profile-save').click();await page.getByText('Saved',{exact:true}).waitFor();
  assert.equal(lastDoctor.certificates.length,3);assert.ok(lastDoctor.certificates[1].url.startsWith('data:application/pdf;base64,'));assert.equal(doctor.cvFileName,'Existing CV.pdf');
  await page.reload();section=page.getByTestId('doctor-certificates');await section.getByText(files[1].name,{exact:true}).waitFor();
  await section.getByRole('button',{name:'Remove Medical degree.pdf',exact:true}).click();await page.getByTestId('doctor-profile-save').click();await page.getByText('Saved',{exact:true}).waitFor();
  await page.reload();section=page.getByTestId('doctor-certificates');await section.getByText(files[1].name,{exact:true}).waitFor();assert.equal(await section.locator('li').count(),2);
  await section.scrollIntoViewIfNeeded();mkdirSync('_ui_shots',{recursive:true});await page.screenshot({path:'_ui_shots/doctor-multiple-certificates.png'});
  console.log('PASS: doctor certificates multi-select, validation, failed-save retention, save/reload and individual removal; existing CV preserved');
  const admin=await browser.newPage({viewport:{width:1440,height:1100}});await setup(admin,'SUPER_ADMIN');
  await admin.goto(baseURL+'/dashboard/center-info');await admin.getByRole('button',{name:'Edit Profile',exact:true}).click();
  section=admin.getByTestId('center-documents');await section.locator('input[type=file]').setInputFiles(files);await section.getByText(files[1].name,{exact:true}).waitFor();
  await admin.getByTestId('center-info-save').click();await admin.getByText('Center details & letterhead updated.',{exact:true}).waitFor();
  assert.equal(lastCenter.documents.length,2);assert.equal(lastCenter.letterheadMode,'header');
  await admin.reload();section=admin.getByTestId('center-documents');await section.getByText(files[1].name,{exact:true}).waitFor();assert.equal(await section.getByRole('button',{name:/^Remove /}).count(),0);
  await admin.getByRole('button',{name:'Edit Profile',exact:true}).click();await section.getByRole('button',{name:'Remove Medical degree.pdf',exact:true}).click();await admin.getByTestId('center-info-save').click();await admin.getByText('Center details & letterhead updated.',{exact:true}).waitFor();
  await admin.reload();section=admin.getByTestId('center-documents');await section.getByText(files[1].name,{exact:true}).waitFor();assert.equal(await section.locator('li').count(),1);
  await section.scrollIntoViewIfNeeded();await admin.screenshot({path:'_ui_shots/center-multiple-documents.png'});
  await admin.goto(baseURL+'/dashboard/radiology');await admin.getByTestId('center-edit-sample-center').click();
  section=admin.getByTestId('center-documents');await section.getByText(files[1].name,{exact:true}).waitFor();assert.ok(await section.locator('input[type=file]').getAttribute('multiple')!==null);
  await section.locator('input[type=file]').setInputFiles(files);await section.getByText(files[0].name,{exact:true}).waitFor();
  rejectSave=true;await admin.getByRole('button',{name:'Save Changes',exact:true}).click();await admin.getByText('Sample save failure',{exact:true}).waitFor();
  assert.equal(await section.locator('li').count(),3);rejectSave=false;
  await admin.getByRole('button',{name:'Save Changes',exact:true}).click();await section.waitFor({state:'hidden'});
  assert.equal(lastCenter.documents.length,3);
  console.log('PASS: center documents multi-select, save/reload, view-only list, individual removal, edit-modal prefill and letterhead preservation');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
