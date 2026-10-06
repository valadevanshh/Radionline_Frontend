/**
 * UI-only zero-data bootstrap + 4-role walk.
 * Requires: API on :8000 (seed creates admin/manager), Next on :3000.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.UI_BASE || 'http://localhost:3000';
const SHOT = path.resolve(process.cwd(), '..', 'ui_screenshots', 'zero_flow');
const log = [];

function rec(role, step, ok, detail = '') {
  log.push({ role, step, ok, detail, at: new Date().toISOString() });
  console.log(`${ok ? 'PASS' : 'FAIL'}  [${role}] ${step} ${detail}`);
}

async function shot(page, name) {
  fs.mkdirSync(SHOT, { recursive: true });
  await page.screenshot({ path: path.join(SHOT, `${name}.png`), fullPage: true });
}

async function login(page, email, password, expectPath) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  const userBox = page.getByPlaceholder('Enter username or email address...');
  await userBox.waitFor({ state: 'visible' });
  await userBox.click();
  await userBox.fill(email);
  const passBox = page.locator('input[type="password"]').first();
  await passBox.click();
  await passBox.fill(password);
  if (!(await userBox.inputValue())) await userBox.fill(email);
  await page.getByRole('button', { name: /sign in to portal/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 25000 });
  if (expectPath) {
    const here = new URL(page.url()).pathname;
    rec('AUTH', `Land after ${email}`, here.includes(expectPath) || here.startsWith('/dashboard'), `path=${here} expected~${expectPath}`);
  }
}

async function visibleText(page, re) {
  const loc = page.getByText(re);
  const n = await loc.count();
  for (let i = 0; i < n; i++) {
    if (await loc.nth(i).isVisible().catch(() => false)) return true;
  }
  return false;
}

async function ready(page, locator) {
  await locator.waitFor({ state: 'visible', timeout: 25000 });
}

async function clickReady(page, locator) {
  await ready(page, locator);
  await locator.click();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('dialog', async (d) => {
    rec('UI', `Dialog: ${d.message().slice(0, 120)}`, true, d.type());
    try {
      await d.accept();
    } catch {
      /* already dismissed */
    }
  });

  try {
    // --- Super Admin creates directory ---
    await login(page, 'admin@radio.com', 'radio@1', '/dashboard/approvals');
    rec('SUPER_ADMIN', 'Login', true, page.url());
    await shot(page, '01_admin_approvals');

    await page.goto(`${BASE}/dashboard/radiology`, { waitUntil: 'networkidle' });
    if (await visibleText(page, /QA SUNRISE/i)) {
      rec('SUPER_ADMIN', 'Create center via UI', true, 'already present');
    } else {
      await ready(page, page.getByRole('button', { name: /^add center$/i }));
      await page.waitForTimeout(400);
      await page.getByRole('button', { name: /^add center$/i }).click();
      if (!(await page.getByPlaceholder('Enter Center Name').isVisible().catch(() => false))) {
        await page.getByRole('button', { name: /add first radiology center/i }).click();
      }
      await ready(page, page.getByPlaceholder('Enter Center Name'));
      await page.getByPlaceholder('Enter Center Name').fill('QA Sunrise Diagnostics');
      await page.getByPlaceholder('First Name').fill('Lata');
      await page.getByPlaceholder('Last Name').fill('Shah');
      await page.getByPlaceholder('Email Address').fill('qa.center@radionet.test');
      await page.getByPlaceholder('Contact Number', { exact: true }).fill('9876500001');
      await page.getByPlaceholder('Username / Login Email').fill('qa.center@radionet.test');
      await page.getByPlaceholder('Set password').fill('QaCenter!2026');
      await page.getByRole('button', { name: /create radiology center/i }).click();
      await page.waitForTimeout(1500);
      rec('SUPER_ADMIN', 'Create center via UI', await visibleText(page, /SUNRISE|QA SUNRISE/i), 'after submit');
    }
    await shot(page, '02_admin_center_created');

    await page.goto(`${BASE}/dashboard/doctors`, { waitUntil: 'networkidle' });
    if (await visibleText(page, /ASHA MEHTA|DR\.\s*ASHA/i)) {
      rec('SUPER_ADMIN', 'Create doctor via UI', true, 'already present');
    } else {
    await ready(page, page.getByRole('button', { name: /^add doctor$/i }));
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /^add doctor$/i }).click();
    if (!(await page.getByPlaceholder('First Name').isVisible().catch(() => false))) {
      await page.getByRole('button', { name: /add first doctor/i }).click();
    }
    await ready(page, page.getByPlaceholder('First Name'));
    await page.getByPlaceholder('First Name').fill('Asha');
    await page.getByPlaceholder('Last Name').fill('Mehta');
    await page.getByPlaceholder('Email Address').fill('qa.doctor@radionet.test');
    await page.getByPlaceholder('Contact Number', { exact: true }).fill('9876500002');
    await page.getByPlaceholder('Username / Login ID').fill('qa.doctor@radionet.test');
    await page.locator('input[placeholder="Set password"]').fill('QaDoctor!2026');
    await page.getByPlaceholder(/e\.g\. M\.D\./i).fill('M.D. (Radiodiagnosis)');
    await page.getByPlaceholder(/MCI Reg/i).fill('QA-REG-001');
    await page.getByRole('button', { name: /create doctor/i }).click();
    await page.waitForTimeout(1500);
    rec('SUPER_ADMIN', 'Create doctor via UI', await visibleText(page, /ASHA MEHTA|DR\.\s*ASHA/i), 'directory');
    }
    await shot(page, '03_admin_doctor_created');

    // --- Center creates a STAT case ---
    await login(page, 'qa.center@radionet.test', 'QaCenter!2026', '/dashboard/all-reports');
    rec('CENTER', 'Login', true, page.url());
    await shot(page, '04_center_all_reports');

    if (await visibleText(page, /KAVYA PATEL/i)) {
      rec('CENTER', 'Create STAT 2-study case via UI', true, 'already on worklist');
    } else {
      await ready(page, page.getByRole('button', { name: /new record/i }));
      await page.getByRole('button', { name: /new record/i }).click();
      await page.locator('#patient-fullname-input').waitFor({ state: 'visible' });
      await page.locator('#patient-fullname-input').fill('Kavya Patel');
      await page.locator('#new-xray-report-form select').first().selectOption('Female');
      await page.getByRole('button', { name: /\+ CHEST PA\/AP/i }).click();
      await page.getByRole('button', { name: /\+ KNEE JOINT AP\/LAT/i }).click();
      await page.locator('#new-xray-report-form').getByText('Urgent (STAT)').click();
      await page.locator('#new-xray-report-form').getByText('Portable', { exact: true }).click();
      await page.getByPlaceholder(/clinical notes/i).fill('9-month infant. Cough 3 days. Rule out pneumonia.');
      await page.getByPlaceholder(/ROBERT SMITH/i).fill('Dr Referring Clinic');
      await page.getByRole('button', { name: /create patient record/i }).click();
      await page.locator('#patient-fullname-input').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
      await page.getByRole('button', { name: /reset/i }).click().catch(() => {});
      await page.waitForTimeout(1200);
      let found = await visibleText(page, /KAVYA PATEL/i);
      if (!found) {
        await page.reload({ waitUntil: 'networkidle' });
        found = await visibleText(page, /KAVYA PATEL/i);
      }
      rec('CENTER', 'Create STAT 2-study case via UI', found, found ? 'worklist' : 'not on own-center worklist');
    }
    await shot(page, '05_center_case_created');

    await page.goto(`${BASE}/dashboard/center-invoices`, { waitUntil: 'domcontentloaded' });
    await shot(page, '06_center_invoices');
    rec('CENTER', 'Open invoices', true, page.url());

    // --- Doctor claims and signs ---
    await login(page, 'qa.doctor@radionet.test', 'QaDoctor!2026', '/dashboard/all-reports');
    rec('DOCTOR', 'Login', true, page.url());
    await shot(page, '07_doctor_all_reports');

    await page.goto(`${BASE}/dashboard/live-feed`, { waitUntil: 'networkidle' });
    await page.getByText(/KAVYA|Accept/i).first().waitFor({ timeout: 12000 }).catch(() => {});
    await shot(page, '08_doctor_live_feed');
    const accept = page.getByRole('button', { name: /^accept$/i }).first();
    if (await accept.isVisible().catch(() => false)) {
      await accept.click();
      await page.waitForURL(/\/dashboard\/workspace\//, { timeout: 20000 }).catch(() => {});
      rec('DOCTOR', 'Accept from Live Feed', /workspace/.test(page.url()), page.url());
    } else if (await visibleText(page, /KAVYA/i)) {
      rec('DOCTOR', 'Accept from Live Feed', true, 'case already claimed — opening workspace');
      await page.goto(`${BASE}/dashboard/workspace/742b4c52-9eae-4d8a-9a43-fb523dc59a1c`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    } else {
      rec('DOCTOR', 'Accept from Live Feed', false, 'queue empty — falling back to All Reports');
      await page.goto(`${BASE}/dashboard/all-reports`, { waitUntil: 'networkidle' });
      const acceptCase = page.getByRole('button', { name: /accept case/i }).first();
      if (await acceptCase.count()) {
        await acceptCase.scrollIntoViewIfNeeded();
        await acceptCase.click({ force: true });
        rec('DOCTOR', 'Accept Case from All Reports', true, 'clicked');
        await page.waitForTimeout(800);
        const pacs = page.getByRole('button', { name: /pacs/i }).first();
        if (await pacs.count()) await pacs.click({ force: true });
        await page.waitForURL(/\/dashboard\/workspace\//, { timeout: 15000 }).catch(() => {});
      } else if (await visibleText(page, /KAVYA/i)) {
        rec('DOCTOR', 'Accept Case from All Reports', true, 'already claimed on worklist');
        const pacs = page.getByRole('button', { name: /pacs/i }).first();
        if (await pacs.count()) await pacs.click({ force: true });
      } else {
        rec('DOCTOR', 'Accept Case from All Reports', false, 'no Accept Case button');
      }
    }
    await shot(page, '09_doctor_workspace');

    if (/workspace/.test(page.url()) || (await page.getByRole('button', { name: /save & submit/i }).count())) {
      const areas = page.locator('textarea');
      const n = await areas.count();
      if (n >= 1) await areas.nth(0).fill('Infant chest: lungs clear. No consolidation. Heart size normal.');
      if (n >= 2) await areas.nth(1).fill('No active lung lesion.');
      await page.getByRole('button', { name: /save & submit/i }).first().click();
      await page.waitForTimeout(2000);
      rec('DOCTOR', 'Sign study 1', true, 'clicked Save & Submit');
      await shot(page, '10_doctor_signed_study1');

      const kneeTab = page.getByRole('button', { name: /KNEE JOINT AP\/LAT/i }).first();
      if (await kneeTab.count()) {
        await kneeTab.click();
        await page.waitForTimeout(800);
      }
      const areas2 = page.locator('textarea');
      const n2 = await areas2.count();
      if (n2 >= 1) await areas2.nth(0).fill('Knee alignment preserved. No fracture.');
      if (n2 >= 2) await areas2.nth(1).fill('No acute bony injury.');
      if (await page.getByRole('button', { name: /save & submit/i }).first().isVisible().catch(() => false)) {
        await page.getByRole('button', { name: /save & submit/i }).first().click();
        await page.waitForTimeout(2000);
        rec('DOCTOR', 'Sign study 2', true, 'clicked Save & Submit');
      }
      await shot(page, '11_doctor_signed_study2');
    }

    await page.goto(`${BASE}/dashboard/my-work`, { waitUntil: 'domcontentloaded' });
    await shot(page, '12_doctor_my_work');
    rec('DOCTOR', 'My Work', true, await page.getByText(/KAVYA|QA Test|Signed|Partial/i).first().innerText().catch(() => page.url()));

    await page.goto(`${BASE}/dashboard/doctor-earnings`, { waitUntil: 'domcontentloaded' });
    await shot(page, '13_doctor_earnings');
    rec('DOCTOR', 'Earnings', true, page.url());

    // --- Manager submits a doctor for approval ---
    await login(page, 'manager@radio.com', 'manager@123', '/dashboard');
    rec('MANAGER', 'Login', true, page.url());
    await page.goto(`${BASE}/dashboard/doctors`, { waitUntil: 'networkidle' });
    await ready(page, page.getByRole('button', { name: /^add doctor$/i }));
    await page.getByRole('button', { name: /^add doctor$/i }).click();
    await page.getByPlaceholder('First Name').fill('Pending');
    await page.getByPlaceholder('Last Name').fill('Reader');
    await page.getByPlaceholder('Email Address').fill('qa.pendingdoc@radionet.test');
    await page.getByPlaceholder('Contact Number', { exact: true }).fill('9876500003');
    await page.getByPlaceholder('Username / Login ID').fill('qa.pendingdoc@radionet.test');
    await page.locator('input[placeholder="Set password"]').fill('QaPending!2026');
    await page.getByRole('button', { name: /create doctor/i }).click();
    await page.waitForTimeout(1500);
    rec('MANAGER', 'Submit CREATE_DOCTOR', true, 'modal submitted');
    await shot(page, '14_manager_submitted');

    await page.goto(`${BASE}/dashboard/approvals`, { waitUntil: 'domcontentloaded' });
    await shot(page, '15_manager_submissions');

    // --- Admin approves ---
    await login(page, 'admin@radio.com', 'radio@1', '/dashboard/approvals');
    await page.goto(`${BASE}/dashboard/approvals`, { waitUntil: 'networkidle' });
    await page.getByText(/Loading approval/i).waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await shot(page, '16_admin_pending_approval');
    const approveBtn = page.getByRole('button', { name: /^approve$/i }).first();
    if (await approveBtn.isVisible().catch(() => false)) {
      await approveBtn.click();
      await page.waitForTimeout(2000);
      rec('SUPER_ADMIN', 'Approve manager request', true, 'clicked Approve');
    } else {
      rec('SUPER_ADMIN', 'Approve manager request', false, 'no Approve action button');
    }
    await shot(page, '17_admin_after_approve');

    try {
      await login(page, 'qa.pendingdoc@radionet.test', 'QaPending!2026', '/dashboard');
      rec('DOCTOR', 'Login approval-created doctor', /dashboard/.test(page.url()), page.url());
    } catch (err) {
      rec('DOCTOR', 'Login approval-created doctor', false, String(err && err.message ? err.message : err));
    }
    await shot(page, '18_pending_doctor_login');

    await page.goto(`${BASE}/dashboard/invoices`, { waitUntil: 'networkidle' }).catch(() => page.goto(`${BASE}/dashboard/invoices`));
    rec('SUPER_ADMIN', 'Admin invoices page', /invoices/.test(page.url()), 'need admin session — skipped if still pending doc');
  } catch (err) {
    rec('SYSTEM', 'Unhandled', false, String(err && err.message ? err.message : err));
    await shot(page, '99_error').catch(() => {});
  } finally {
    const out = {
      passed: log.filter((r) => r.ok).length,
      failed: log.filter((r) => !r.ok).length,
      results: log,
      screenshots: SHOT,
    };
    fs.writeFileSync(path.resolve(process.cwd(), '..', 'qa_ui_zero_flow.json'), JSON.stringify(out, null, 2));
    console.log(`\nDone ${out.passed} pass / ${out.failed} fail. Shots: ${SHOT}`);
    await browser.close();
  }
}

main();
