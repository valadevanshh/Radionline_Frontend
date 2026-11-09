import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';

async function main() {
 const baseURL=process.env.PACS_TEST_BASE_URL || 'http://127.0.0.1:3100';
 const appOrigin=new URL(baseURL).origin;
 const browser = await chromium.launch({ ...(process.platform === 'win32' ? {channel:'msedge'} : {}), headless:true });
 try {
  const page = await browser.newPage({viewport:{width:1550,height:1100}});
  page.setDefaultTimeout(12000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.routeWebSocket('**/*', ws => ws.close());
  const makeReport = (id:string, parts:string[], findings:string) => ({
   id,patientNumber:'SYSTEM-'+id,centerPatientId:'CENTER-'+id,fullName:'Sample '+id,age:35,gender:'Female',
   radiologyCenterId:'center-a',radiologyCenterName:'Sample Centre',bodyParts:parts,modality:'X-Ray',
   status:'In Review',claimStatus:'CLAIMED',claimedByDoctorId:'doctor-a',assignedDoctorId:'doctor-a',
   studyDate:'2026-11-08',createdAt:'2026-11-08',findings,impression:findings?'Baseline impression.':'',
   reportsByBodyPart:Object.fromEntries(parts.map(part=>[part,findings])),
   impressionsByBodyPart:Object.fromEntries(parts.map(part=>[part,findings?'Baseline impression.':''])),
   studies:parts.map((part,i)=>({id:id+'-study-'+i,bodyPart:part,reportStatus:findings?'DRAFT':'PENDING',
    status:'CLAIMED',claimedBy:'doctor-a',findings,impression:findings?'Baseline impression.':''})),
  });
  const reports: Record<string,any> = {
   'patient-a':makeReport('patient-a',['CHEST PA','KNEE AP'],'Baseline findings.'),
   'patient-b':makeReport('patient-b',['KNEE AP'],''),
   'signed-patient':makeReport('signed-patient',['CHEST PA'],'Signed findings.'),
  };
  reports['signed-patient'].status='Completed';
  reports['signed-patient'].studies[0].reportStatus='SIGNED';
  const signedText=Array.from({length:45},(_,i)=>`Signed finding ${i+1}: preserved report content.`).join('\n');
  reports['signed-patient'].findings=signedText;
  reports['signed-patient'].reportsByBodyPart['CHEST PA']=signedText;
  reports['signed-patient'].studies[0].findings=signedText;
  const templates:any[] = [{id:'template-chest',title:'Chest baseline',centerId:'ALL',centerName:'All Centers',
   modality:'X-Ray',bodyPart:'CHEST PA',findings:'Baseline findings.',impression:'Baseline impression.',doctorId:'doctor-a',createdAt:'2026-11-08'}];
  templates.push({...templates[0],id:'template-distinct',title:'Distinct chest template',findings:'Selected template findings visible before signing.',impression:'Selected template impression before signing.'});
  templates.push({...templates[0],id:'template-html',title:'Legacy chest HTML',findings:'',impression:'',content:'<h3>FINDINGS:</h3><p>Legacy HTML findings before signing.</p><h3>IMPRESSION:</h3><p>Legacy HTML impression before signing.</p>'});
  templates.push({...templates[0],id:'template-long',title:'Long chest template',findings:Array.from({length:45},(_,i)=>`Template line ${i+1}: Sample reusable finding.`).join('\n')});
  const baseline=JSON.stringify(templates[0]);
  let templateWrites=0; let draftWrites=0; let failDraft=false; let lastDraft:any;
  await page.addInitScript(()=>localStorage.setItem('radionline_session_v1',JSON.stringify({role:'DOCTOR',doctorId:'doctor-a',userId:100,name:'Dr Sample',email:'doctor@example.invalid'})));
  await page.route('**/*',async route=>{
   const request=route.request(); const url=new URL(request.url());
   if((url.origin===appOrigin && !url.pathname.startsWith('/api/')) || url.protocol==='data:')return route.continue();
   const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};
   if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
   let data:any=[];
   const draft=url.pathname.match(/\/reports\/([^/]+)\/studies\/([^/]+)\/draft$/);
   const report=url.pathname.match(/\/reports\/([^/]+)$/);
   if(draft){
    if(failDraft)return route.fulfill({status:500,headers,json:{detail:'Sample draft failure'}});
    draftWrites++;lastDraft=request.postDataJSON();
    const item=reports[draft[1]]; const study=item.studies.find((s:any)=>s.id===draft[2]);
    Object.assign(study,lastDraft,{reportStatus:'DRAFT'});
    item.reportsByBodyPart[study.bodyPart]=lastDraft.findings;
    item.impressionsByBodyPart[study.bodyPart]=lastDraft.impression;
    item.findings=lastDraft.findings;item.impression=lastDraft.impression;
    data={ok:true,study,report:item};
   }else if(url.pathname.endsWith('/templates')){
    if(request.method()==='POST'){
     templateWrites++;
     data={...request.postDataJSON(),id:'template-created-'+templateWrites,doctorId:'doctor-a',createdAt:'2026-11-08'};
     templates.push(data);
    }else data=templates;
   }else if(report&&reports[report[1]])data=reports[report[1]];
   else if(url.pathname.endsWith('/centers'))data=[{id:'center-a',centerName:'Sample Centre'}];
   else if(url.pathname.endsWith('/doctors'))data=[{id:'doctor-a',fullName:'Dr Sample',expertise:[]}];
   return route.fulfill({headers,json:structuredClone(data)});
  });
  const findings=()=>page.getByRole('textbox',{name:'Patient findings'}).first();
  const impression=()=>page.getByRole('textbox',{name:'Patient impression'}).first();
  await page.goto(baseURL+'/dashboard/workspace/patient-a');
  await findings().waitFor();
  await page.getByTestId('template-select').selectOption('stored_template-chest');
  await page.getByTestId('template-select').selectOption('stored_template-distinct');
  await page.getByTestId('template-replace-confirm').click();
  assert.equal(await findings().inputValue(),'Selected template findings visible before signing.');
  assert.equal(await impression().inputValue(),'Selected template impression before signing.');
  assert.ok((await page.getByTestId('findings-editor').first().innerText()).includes('Selected template findings visible before signing.'));
  assert.equal(draftWrites,0);
  assert.equal(reports['patient-a'].studies[0].reportStatus,'DRAFT');
  await page.getByTestId('template-select').selectOption('stored_template-chest');
  await page.getByTestId('template-replace-cancel').click();
  assert.equal(await findings().inputValue(),'Selected template findings visible before signing.');
  await page.getByTestId('template-select').selectOption('stored_template-chest');
  await page.getByTestId('template-replace-confirm').click();
  await page.getByTestId('template-select').selectOption('stored_template-html');
  await page.getByTestId('template-replace-confirm').click();
  assert.equal(await findings().inputValue(),'Legacy HTML findings before signing.');
  assert.equal(await impression().inputValue(),'Legacy HTML impression before signing.');
  mkdirSync('_ui_shots',{recursive:true});
  await page.screenshot({path:'_ui_shots/pacs-template-loaded.png',fullPage:true});
  await page.getByTestId('template-select').selectOption('stored_template-long');
  await page.getByTestId('template-replace-confirm').click();
  const loaded=await page.getByRole('textbox',{name:'Patient findings'}).evaluateAll(fields=>fields.map(field=>(field as HTMLTextAreaElement).value).join(''));
  assert.equal(loaded.replace(/\s/g,''),templates[3].findings.replace(/\s/g,''));
  await page.getByTestId('template-select').selectOption('stored_template-chest');
  await page.getByTestId('template-replace-confirm').click();
  console.log('PASS: distinct, legacy HTML, and multi-page templates display visibly before signing; cancel preserves patient text');
  const patientText='Baseline findings. Added for this patient only.';
  await findings().fill(patientText);
  await impression().fill('Patient-specific revised impression.');
  failDraft=true;
  await page.getByTitle('Save Draft Report',{exact:true}).click();
  await page.getByText('Sample draft failure',{exact:true}).waitFor();
  assert.equal(reports['patient-a'].studies[0].findings,'Baseline findings.');
  failDraft=false;
  await page.getByTitle('Save Draft Report',{exact:true}).click();
  await page.getByText('Draft saved for CHEST PA',{exact:true}).waitFor();
  assert.equal(lastDraft.findings,patientText);
  assert.equal(lastDraft.templateId,'template-chest');
  assert.equal(templateWrites,0);
  assert.equal(JSON.stringify(templates[0]),baseline);
  assert.equal(reports['patient-a'].studies[1].findings,'Baseline findings.');
  assert.equal(reports['patient-b'].studies[0].findings,'');
  await page.reload(); await findings().waitFor();assert.equal(await findings().inputValue(),patientText);
  await page.getByTestId('study-chips').getByRole('button').nth(1).click();
  assert.equal(await findings().inputValue(),'Baseline findings.');
  await page.getByTestId('study-chips').getByRole('button').nth(0).click();
  assert.equal(await findings().inputValue(),patientText);
  console.log('PASS: patient-only additions/removals, draft error/retry, real template ID, reload, body-part isolation, original template unchanged');

  await page.goto(baseURL+'/dashboard/workspace/patient-b');await findings().waitFor();
  assert.equal(await findings().inputValue(),'');
  await page.getByTestId('save-as-template').click();
  const templateFindings=page.getByPlaceholder('Enter standard radiological findings here (e.g. lung fields, heart size, osseous structures, soft tissues)...');
  await templateFindings.waitFor();
  await page.getByPlaceholder('e.g. Chest PA/AP Normal...').fill('Knee AP reusable');
  await templateFindings.fill('Reusable knee findings.');
  await page.getByPlaceholder('Enter diagnostic impression & final conclusion...').fill('Reusable knee impression.');
  // A parent render must not reset the template the doctor is typing.
  await page.waitForTimeout(100);
  assert.equal(await templateFindings.inputValue(),'Reusable knee findings.');
  const submit=page.locator('button[type="submit"]').filter({hasText:/Save/});
  await submit.click();
  await templateFindings.waitFor({state:'detached'});
  assert.equal(templateWrites,1);
  assert.equal(templates[4].doctorId,'doctor-a');
  assert.equal(templates[4].bodyPart,'KNEE AP');
  assert.equal(await findings().inputValue(),'Reusable knee findings.');
  assert.equal(await page.getByTestId('template-select').inputValue(),'stored_template-created-1');
  assert.equal(reports['patient-b'].studies[0].findings,'');
  await findings().fill('Patient B adjustment.');
  await page.getByTitle('Save Draft Report',{exact:true}).click();
  await page.getByText('Draft saved for KNEE AP',{exact:true}).waitFor();
  assert.equal(templates[4].findings,'Reusable knee findings.');
  assert.equal(lastDraft.templateId,'template-created-1');
  assert.equal(templateWrites,1);
  console.log('PASS: create a reusable template from an empty patient report, apply it, then save patient-only changes without modifying the template');

  await page.goto(baseURL+'/dashboard/workspace/signed-patient');await findings().waitFor();
  assert.equal(await findings().getAttribute('readonly'),'');
  assert.equal(await impression().getAttribute('readonly'),'');
  assert.ok(await page.getByTestId('template-select').isDisabled());
  assert.ok(await page.getByTitle('Report completed - read-only (only Super Admin can edit)').first().isDisabled());
  const signedFields=page.getByRole('textbox',{name:'Patient findings'});
  assert.ok(await signedFields.count()>1);
  const before=await signedFields.evaluateAll(fields=>fields.map(field=>(field as HTMLTextAreaElement).value).join(''));
  await signedFields.nth(1).focus();
  await signedFields.nth(1).press('Control+Home');
  await signedFields.nth(1).press('Backspace');
  assert.equal(await signedFields.evaluateAll(fields=>fields.map(field=>(field as HTMLTextAreaElement).value).join('')),before);
  assert.equal(draftWrites,2);
  assert.deepEqual(errors,[]);
  mkdirSync('_ui_shots',{recursive:true});
  await page.screenshot({path:'_ui_shots/pacs-doctor-locked.png',fullPage:true});
  console.log('PASS: signed report is truly read-only; no browser errors. All external APIs and sockets mocked.');
 } finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
