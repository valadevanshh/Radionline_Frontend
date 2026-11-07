import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { BODY_PARTS } from './body-parts';
import { buildReportSourceHtml, type PrintReportPayload } from './print-helper';
import {
  backendStyleNewestExactMatch,
  chooseAutoAppliedTemplate,
  commitAndSwitchPart,
  identifyStudy,
  isTemplateOwnedBySession,
  parseTemplateBody,
  replacementNeedsConfirm,
  savedTextForParts,
  templatesForStudyPicker,
  writeActivePartText,
  type TemplateChoice,
} from './template-match';

const DOCTOR = { role: 'DOCTOR', doctorId: 'doc-owner', userId: 'user-owner' };

function choice(partial: TemplateChoice & { id: string }): TemplateChoice {
  return {
    modality: 'X-Ray',
    doctorId: 'doc-owner',
    centerId: 'centre-a',
    createdAt: '2024-01-01T00:00:00Z',
    findings: 'FAKE FINDINGS ' + partial.id,
    impression: 'FAKE IMPRESSION ' + partial.id,
    ...partial,
  };
}

const SUPPLIED_TITLES: { title: string; key: string }[] = [
  { title: 'ABDOMEN STANDING', key: 'abdomen' },
  { title: 'ABDOMEN – K.U.B.', key: 'kub' },
  { title: 'NECK SOFT TISSUE', key: 'soft-tissue-neck' },
  { title: 'NECK SOFT TISSUES (ENLARGED ADENOIDS)', key: 'soft-tissue-neck' },
  { title: 'ANKLE', key: 'ankle' },
  { title: 'ASCENDING URETHROGRAM', key: 'ascending-urethrogram' },
  { title: 'BARIUM ENEMA', key: 'barium-enema' },
  { title: 'BARIUM SWALLOW UNDER IITV', key: 'barium-swallow' },
  { title: 'BOTH HEELS', key: 'heel' },
  { title: 'BOTH HIPS', key: 'both-hips' },
  { title: 'BOTH KNEES TKR', key: 'knee' },
  { title: 'BOTH CALCANEUM LATERAL', key: 'heel' },
  { title: 'CERVICAL SPINE AP/LAT', key: 'cervical-spine' },
  { title: 'CHEST PA', key: 'chest' },
  { title: 'CHEST (PORTABLE)', key: 'chest' },
  { title: 'DORSO LUMBAR SPINE AP AND LATERAL', key: 'dorso-lumbar-spine' },
  { title: 'DORSAL SPINE AP/LAT', key: 'dorsal-spine' },
  { title: 'ELBOW JOINT AP/LAT', key: 'elbow' },
  { title: 'FEMUR WITH KNEE AND LEG AP/LAT', key: 'femur-knee-leg' },
  { title: 'FOOT AP/OBL/LAT', key: 'foot' },
  { title: 'FOREARM AP/LAT', key: 'forearm' },
  { title: 'HAND AP/OBL/LAT', key: 'hand' },
  { title: 'H.S.G.', key: 'hsg' },
  { title: 'KNEE JOINT AP/LAT', key: 'knee' },
  { title: 'KNEE JOINT AP/LAT REPLACEMENT', key: 'knee' },
  { title: 'BOTH KNEES OA2', key: 'knee' },
  { title: 'BOTH KNEES OA1', key: 'knee' },
  { title: 'L.S. SPINE AP', key: 'ls-spine' },
  { title: 'L.S. SPINE AP/LAT', key: 'ls-spine' },
  { title: 'NASAL BONE BOTH LATERAL', key: 'nasal-bone' },
  { title: 'NECK SOFT TISSUES', key: 'soft-tissue-neck' },
  { title: 'P.N.S.', key: 'pns' },
  { title: 'PELVIS WITH BOTH HIPS THR', key: 'pelvis-with-both-hips' },
  { title: 'PELVIS WITH BOTH HIPS', key: 'pelvis-with-both-hips' },
  { title: 'P.N.S. (SINUSITIS)', key: 'pns' },
  { title: 'RIBCAGE', key: 'ribs' },
  { title: 'SCANOGRAM LEG', key: 'scanogram-lower-limb' },
  { title: 'SHOULDER AP/LAT OA', key: 'shoulder' },
  { title: 'SHOULDER (NORMAL)', key: 'shoulder' },
  { title: 'SKULL AP/LAT', key: 'skull' },
  { title: 'WRIST AP/LAT', key: 'wrist' },
  { title: 'SCANOGRAM SPINE', key: 'scanogram-spine' },
  { title: 'COCCYX (AP/LAT)', key: 'coccyx' },
  { title: 'M.C.U. PM FOR CHILD', key: 'mcu' },
  { title: 'THUMB (AP/LAT)', key: 'thumb' },
  { title: 'LEG', key: 'leg' },
  { title: 'BOTH HUMERUS AP/LAT', key: 'humerus' },
  { title: 'ASCENDING URETHROGRAM 1', key: 'ascending-urethrogram' },
  { title: 'L.S. SPINE LATERAL/FLEXION', key: 'ls-spine' },
  { title: 'ASCENDING URETHROGRAM & MICTURATING CYSTO-URETHROGRAM (ADULT)', key: 'aug-mcu' },
  { title: 'ASCENDING URETHROGRAM PM', key: 'ascending-urethrogram' },
  { title: 'SACROCOCCYX (AP/LAT)', key: 'sacrococcyx' },
  { title: 'ASCENDING URETHROGRAM & MICTURATING CYSTO-URETHROGRAM', key: 'aug-mcu' },
  { title: 'BARIUM ENEMA PM', key: 'barium-enema' },
  { title: 'BARIUM SWALLOW PM', key: 'barium-swallow' },
  { title: 'BARIUM MEAL STOMACH/DUODENUM', key: 'barium-meal' },
  { title: 'BARIUM MEAL FOLLOW THROUGH', key: 'bmft' },
  { title: 'BARIUM MEAL STOMACH/DUODENUM', key: 'barium-meal' },
  { title: 'TEMPOROMANDIBULAR JOINTS (OPEN AND CLOSED MOUTH VIEW)', key: 'tmj' },
  { title: 'MANDIBLE', key: 'mandible' },
  { title: 'MANDIBLE AP/OBL', key: 'mandible' },
  { title: 'BARIUM FOR I/C AND DISTAL LOOP COLOGRAM', key: 'distal-cologram' },
  { title: "RYLE'S TUBE INSERTION UNDER IITV", key: 'ryles-tube' },
];

test('supplied template titles resolve by body part, including duplicate titles', () => {
  assert.equal(SUPPLIED_TITLES.length, 63);
  const seen = new Map<string, number>();
  for (let i = 0; i < SUPPLIED_TITLES.length; i++) {
    const row = SUPPLIED_TITLES[i];
    const id = identifyStudy(row.title);
    assert.equal(id.supported, true, row.title);
    assert.equal(id.key, row.key, row.title);
    assert.notEqual(id.key, 'general', row.title);
    seen.set(row.title, (seen.get(row.title) || 0) + 1);
  }
  assert.equal(seen.get('BARIUM MEAL STOMACH/DUODENUM'), 2);
});

test('catalogue body parts stay supported and are not labelled GENERAL', () => {
  for (let i = 0; i < BODY_PARTS.length; i++) {
    const part = BODY_PARTS[i];
    const view = part.views[0] ? ' ' + part.views[0] : '';
    const label = part.part + view + (part.sides ? ' (LEFT)' : '');
    const id = identifyStudy(label);
    assert.equal(id.supported, true, label);
    assert.ok(id.key, label);
    assert.notEqual(id.key, 'general', label);
  }
  assert.equal(identifyStudy('LS SPINE AP/LAT').key, identifyStudy('LUMBAR SPINE AP').key);
  assert.notEqual(identifyStudy('DORSAL SPINE AP/LAT').key, identifyStudy('DORSO LUMBAR SPINE AP AND LATERAL').key);
  assert.notEqual(identifyStudy('CERVICAL SPINE AP').key, identifyStudy('L.S. SPINE AP/LAT').key);
  assert.equal(identifyStudy('CHEST PA').key, identifyStudy('CHEST (PORTABLE)').key);
  assert.equal(identifyStudy('KNEE AP/LAT (LEFT)').key, identifyStudy('BOTH KNEES OA2').key);
  assert.equal(identifyStudy('SOFT TISSUE NECK LATERAL').key, identifyStudy('NECK SOFT TISSUE').key);
  assert.equal(identifyStudy('RGU').key, identifyStudy('ASCENDING URETHROGRAM').key);
  assert.equal(identifyStudy('Abdomen Barium Enema').key, 'barium-enema');
  assert.equal(identifyStudy('Scanogram Both Lower Limbs Standing').key, 'scanogram-lower-limb');
});

test('unsupported procedures are not mapped to GENERAL or a nearby part', () => {
  for (const label of ['', 'GENERAL', 'OTHER', 'BRAIN / HEAD', 'HIP & PELVIS AP/LAT', 'NOT A REAL PROCEDURE']) {
    const id = identifyStudy(label);
    assert.equal(id.supported, false, label || '(empty)');
    assert.equal(id.key, null, label || '(empty)');
  }
  assert.equal(identifyStudy('IVP').supported, true);
  assert.equal(identifyStudy('IVP').key, 'ivp');
  assert.notEqual(identifyStudy('IVP').key, identifyStudy('ABDOMEN ERECT').key);
  assert.notEqual(identifyStudy('Chest and Abdomen').key, 'chest');
  assert.notEqual(identifyStudy('Chest and Abdomen').key, 'abdomen');
  const note = templatesForStudyPicker({
    templates: [choice({ id: 'abd', title: 'ABDOMEN STANDING', bodyPart: 'ABDOMEN' })],
    studyLabel: 'IVP',
    modality: 'X-Ray',
    session: DOCTOR,
  });
  assert.equal(note.candidates.length, 0);
  assert.match(note.note, /not a catalogue study procedure|No saved templates match IVP/);
  assert.equal(note.study.key, 'ivp');
  const unknown = templatesForStudyPicker({
    templates: [choice({ id: 'gen', title: 'GENERAL TEMPLATE', bodyPart: 'GENERAL' })],
    studyLabel: 'GENERAL',
    modality: 'X-Ray',
    session: DOCTOR,
  });
  assert.equal(unknown.candidates.length, 0);
  assert.match(unknown.note, /not a catalogue study procedure/);
  assert.doesNotMatch(unknown.note, /mapped to GENERAL/i);
});

test('aliases match the body part and reject broad substring hits', () => {
  const library = SUPPLIED_TITLES.map((row, index) =>
    choice({
      id: 't' + index,
      title: row.title,
      bodyPart: row.title,
      createdAt: '2026-0' + ((index % 9) + 1) + '-01T00:00:00Z',
    }),
  );
  function idsFor(label: string, modality = 'X-Ray') {
    return templatesForStudyPicker({ templates: library, studyLabel: label, modality, session: DOCTOR }).candidates.map((t) => t.title);
  }
  const chest = idsFor('CHEST PA');
  assert.ok(chest.indexOf('CHEST PA') >= 0);
  assert.ok(chest.indexOf('CHEST (PORTABLE)') >= 0);
  assert.equal(chest.indexOf('BOTH KNEES OA2'), -1);
  assert.equal(chest.indexOf('ABDOMEN STANDING'), -1);

  const knee = idsFor('KNEE AP/LAT (LEFT)');
  assert.ok(knee.indexOf('KNEE JOINT AP/LAT') >= 0);
  assert.ok(knee.indexOf('BOTH KNEES TKR') >= 0);
  assert.ok(knee.indexOf('BOTH KNEES OA1') >= 0);
  assert.ok(knee.indexOf('KNEE JOINT AP/LAT REPLACEMENT') >= 0);
  assert.equal(knee.indexOf('FEMUR WITH KNEE AND LEG AP/LAT'), -1);
  assert.equal(knee.indexOf('LEG'), -1);

  assert.deepEqual(idsFor('LEG AP/LAT'), ['LEG']);
  assert.deepEqual(idsFor('SCANOGRAM LEG'), ['SCANOGRAM LEG']);
  assert.equal(idsFor('SCANOGRAM SPINE').indexOf('L.S. SPINE AP/LAT'), -1);
  assert.equal(idsFor('SCANOGRAM SPINE').indexOf('LEG'), -1);

  assert.deepEqual(idsFor('HIP AP/LAT (LEFT)'), []);
  assert.deepEqual(idsFor('BOTH HIPS AP'), ['BOTH HIPS']);
  assert.ok(idsFor('PELVIS WITH BOTH HIPS AP').indexOf('PELVIS WITH BOTH HIPS') >= 0);
  assert.equal(idsFor('PELVIS WITH BOTH HIPS AP').indexOf('BOTH HIPS'), -1);
  assert.deepEqual(idsFor('PELVIS AP'), []);

  assert.equal(idsFor('ANKLE AP/LAT (RIGHT)').indexOf('BOTH HEELS'), -1);
  assert.equal(idsFor('HEEL LATERAL (LEFT)').indexOf('ANKLE'), -1);
  assert.ok(idsFor('HEEL LATERAL (LEFT)').indexOf('BOTH CALCANEUM LATERAL') >= 0);
  assert.equal(idsFor('THUMB AP/LAT (LEFT)').indexOf('HAND AP/OBL/LAT'), -1);
  assert.equal(idsFor('HAND AP/OBLIQUE').indexOf('THUMB (AP/LAT)'), -1);
  assert.equal(idsFor('FOREARM AP/LAT').indexOf('BOTH HUMERUS AP/LAT'), -1);
  assert.equal(idsFor('KUB').indexOf('ABDOMEN STANDING'), -1);
  assert.ok(idsFor('KUB').indexOf('ABDOMEN – K.U.B.') >= 0);
  assert.equal(idsFor('ABDOMEN ERECT').indexOf('ABDOMEN – K.U.B.'), -1);
  assert.equal(idsFor('DORSAL SPINE LATERAL').indexOf('DORSO LUMBAR SPINE AP AND LATERAL'), -1);
  assert.equal(idsFor('HSG').indexOf('ABDOMEN STANDING'), -1);
  assert.equal(idsFor('BARIUM MEAL').indexOf('BARIUM MEAL FOLLOW THROUGH'), -1);
  assert.equal(idsFor('BARIUM MEAL').indexOf('BARIUM SWALLOW UNDER IITV'), -1);
  const meals = idsFor('BARIUM MEAL STOMACH/DUODENUM');
  assert.equal(meals.filter((title) => title === 'BARIUM MEAL STOMACH/DUODENUM').length, 2);

  const ct = templatesForStudyPicker({
    templates: library,
    studyLabel: 'CHEST PA',
    modality: 'CT',
    session: DOCTOR,
  });
  assert.equal(ct.candidates.length, 0);
  const fluoro = templatesForStudyPicker({
    templates: [choice({ id: 'sw', title: 'BARIUM SWALLOW UNDER IITV', bodyPart: 'BARIUM SWALLOW', modality: 'Fluoroscopy' })],
    studyLabel: 'BARIUM SWALLOW',
    modality: 'X-Ray',
    session: DOCTOR,
  });
  assert.equal(fluoro.candidates.length, 1);
});

test('no newest or pathological variant is auto-applied', () => {
  const normal = choice({
    id: 'cerv-normal',
    title: 'CERVICAL SPINE NORMAL',
    bodyPart: 'CERVICAL SPINE',
    findings: 'The cervical spine is normally aligned.',
    impression: 'No significant abnormality seen.',
    createdAt: '2020-01-01T00:00:00Z',
  });
  const pathological = choice({
    id: 'cerv-path',
    title: 'CERVICAL SPINE AP/LAT',
    bodyPart: 'CERVICAL SPINE',
    findings: 'There is reduction in the disc spaces at C4-C5 and C5-C6, with posterior osteophytes, due to cervical spondylosis.',
    impression: 'CERVICAL SPONDYLOSIS WITH REDUCTION OF DISC SPACES.',
    createdAt: '2026-11-01T00:00:00Z',
    centerId: 'centre-b',
  });
  const picked = templatesForStudyPicker({
    templates: [normal, pathological],
    studyLabel: 'CERVICAL SPINE AP/LAT',
    modality: 'X-Ray',
    session: DOCTOR,
  });
  assert.deepEqual(picked.candidates.map((t) => t.id).sort(), ['cerv-normal', 'cerv-path']);
  assert.equal(chooseAutoAppliedTemplate(picked.candidates), null);
  const newest = backendStyleNewestExactMatch([normal, pathological], 'X-Ray', 'CERVICAL SPINE');
  assert.equal(newest && newest.id, 'cerv-path');
  assert.equal(chooseAutoAppliedTemplate(newest ? [newest] : []), null);
  assert.equal(backendStyleNewestExactMatch([normal, pathological], 'X-Ray', 'CERVICAL SPINE AP/LAT'), null);
});

test('ownership and all-centre scope stay intact without a hardcoded account', () => {
  const own = choice({ id: 'own', title: 'CHEST PA', bodyPart: 'CHEST', centerId: 'centre-a' });
  const ownOtherCentre = choice({ id: 'own-b', title: 'CHEST (PORTABLE)', bodyPart: 'CHEST', centerId: 'centre-b', doctorId: 'user-owner' });
  const other = choice({ id: 'other', title: 'CHEST PA COPY', bodyPart: 'CHEST', doctorId: 'doc-other', centerId: 'centre-a' });
  const unnamed = choice({ id: 'blank-owner', title: 'CHEST PA', bodyPart: 'CHEST', doctorId: '' });
  const picked = templatesForStudyPicker({
    templates: [other, ownOtherCentre, own, unnamed],
    studyLabel: 'CHEST PA',
    modality: 'X-Ray',
    session: DOCTOR,
  });
  assert.deepEqual(picked.candidates.map((t) => t.id).sort(), ['own', 'own-b']);
  assert.equal(isTemplateOwnedBySession('doc-other', DOCTOR), false);
  assert.equal(isTemplateOwnedBySession('doc-owner', DOCTOR), true);
  assert.equal(isTemplateOwnedBySession('user-owner', DOCTOR), true);
  const centre = templatesForStudyPicker({
    templates: [own, other],
    studyLabel: 'CHEST PA',
    modality: 'X-Ray',
    session: { role: 'CENTER' },
  });
  assert.equal(centre.candidates.length, 2);
  const src = fs.readFileSync(new URL('./template-match.ts', import.meta.url), 'utf8');
  const viewer = fs.readFileSync(new URL('../components/DicomViewerModal.tsx', import.meta.url), 'utf8');
  assert.equal(src.indexOf('1791101395940'), -1);
  assert.equal(viewer.indexOf('1791101395940'), -1);
  assert.equal(viewer.indexOf('ApiClient.matchTemplate'), -1);
  assert.equal(viewer.indexOf('matchTemplate('), -1);
});

test('template body is stored on the active study only and other tabs keep their text', () => {
  const chest = 'CHEST PA';
  const knee = 'KNEE AP/LAT (LEFT)';
  const draft = 'Existing chest draft that must stay.';
  const kneeFindings = 'FAKE KNEE FINDINGS LINE';
  const kneeImpression = 'FAKE KNEE IMPRESSION LINE';
  const opened = savedTextForParts([chest, knee], {
    findings: '',
    impression: '',
    reportsByBodyPart: { [chest]: draft },
    impressionsByBodyPart: { [chest]: 'Chest impression stays.' },
  });
  assert.equal(opened.hasSavedDraft, true);
  assert.equal(opened.findings[chest], draft);
  assert.equal(opened.findings[knee] || '', '');
  assert.equal(replacementNeedsConfirm(draft, 'Chest impression stays.', kneeFindings, kneeImpression), true);
  assert.equal(replacementNeedsConfirm('', '', kneeFindings, kneeImpression), false);

  const applied = writeActivePartText(
    { findings: opened.findings, impressions: opened.impressions },
    knee,
    { findings: kneeFindings, impression: kneeImpression },
  );
  assert.equal(applied.findings[chest], draft);
  assert.equal(applied.findings[knee], kneeFindings);
  assert.equal(applied.impressions[chest], 'Chest impression stays.');
  assert.equal(applied.impressions[knee], kneeImpression);

  const backToChest = commitAndSwitchPart(
    { findings: applied.findings, impressions: applied.impressions },
    knee,
    chest,
    kneeFindings,
    kneeImpression,
  );
  assert.equal(backToChest.editorFindings, draft);
  assert.equal(backToChest.editorImpression, 'Chest impression stays.');
  assert.equal(backToChest.findings[knee], kneeFindings);

  const saved = writeActivePartText(
    { findings: backToChest.findings, impressions: backToChest.impressions },
    chest,
    { findings: backToChest.editorFindings, impression: backToChest.editorImpression },
  );
  assert.equal(saved.findings[chest], draft);
  assert.equal(saved.findings[knee], kneeFindings);
  assert.equal(saved.impressions[knee], kneeImpression);
});

test('an existing draft is not replaced by a newer template on open', () => {
  const pathological = 'There is reduction in the disc spaces at C4-C5 and C5-C6, with posterior osteophytes, due to cervical spondylosis.';
  const saved = savedTextForParts(['CERVICAL SPINE AP/LAT'], {
    findings: 'EXISTING DRAFT LINE',
    impression: 'KEEP THIS IMPRESSION',
    reportsByBodyPart: {},
    impressionsByBodyPart: {},
  });
  assert.equal(saved.findings['CERVICAL SPINE AP/LAT'], 'EXISTING DRAFT LINE');
  assert.equal(saved.impressions['CERVICAL SPINE AP/LAT'], 'KEEP THIS IMPRESSION');
  assert.equal(JSON.stringify(saved).indexOf(pathological), -1);
  const mixed = savedTextForParts(['CHEST PA', 'KNEE AP/LAT (LEFT)'], {
    findings: 'LEGACY CHEST TEXT',
    impression: 'LEGACY CHEST IMPRESSION',
    reportsByBodyPart: { 'CHEST PA': 'CHEST DRAFT ONLY' },
    impressionsByBodyPart: { 'CHEST PA': 'CHEST IMPRESSION ONLY' },
  });
  assert.equal(mixed.findings['CHEST PA'], 'CHEST DRAFT ONLY');
  assert.equal(mixed.findings['KNEE AP/LAT (LEFT)'], '');
  assert.equal(mixed.impressions['KNEE AP/LAT (LEFT)'], '');
  assert.equal(chooseAutoAppliedTemplate([{ id: 'newest', findings: pathological }]), null);
});

test('selected findings and impression render in the editor source and stay on save', () => {
  const findings = 'There is reduction in the disc spaces at C4-C5 and C5-C6, with posterior osteophytes, due to cervical spondylosis.';
  const impression = 'CERVICAL SPONDYLOSIS WITH REDUCTION OF DISC SPACES.';
  const swallow = "There is no evidence of gastro-oesophageal reflux or hiatus hernia during Valsalva's manoeuvre.";
  const parsed = parseTemplateBody(findings, impression);
  assert.equal(parsed.findings, findings);
  assert.equal(parsed.impression, impression);
  const fromHtml = parseTemplateBody(
    '',
    '',
    '<b>FINDINGS:</b><br/>' + findings + '<br/><br/><b>IMPRESSION:</b><br/>' + impression,
  );
  assert.equal(fromHtml.findings, findings);
  assert.equal(fromHtml.impression, impression);
  const kept = parseTemplateBody(swallow, 'NO SIGNIFICANT ABNORMALITY SEEN.', '<b>FINDINGS:</b>replaced');
  assert.equal(kept.findings, swallow);

  const part = 'CERVICAL SPINE AP/LAT';
  const stored = writeActivePartText(
    { findings: { [part]: '', 'CHEST PA': 'chest stays' }, impressions: { [part]: '', 'CHEST PA': 'chest impression stays' } },
    part,
    parsed,
  );
  assert.equal(stored.findings[part], findings);
  assert.equal(stored.impressions[part], impression);
  assert.equal(stored.findings['CHEST PA'], 'chest stays');

  const payload: PrintReportPayload = {
    centerName: 'Test Centre',
    patientName: 'FAKE PATIENT',
    patientId: 'PID-TEST',
    ageSex: '40 / M',
    studyDate: '01-01-2026',
    referringDoctor: 'Dr Test',
    modality: 'X-Ray',
    studyParts: part,
    clinicalHistory: '',
    studies: [{ title: part, technique: 'X-Ray — ' + part, findings: stored.findings[part], impression: stored.impressions[part] }],
    doctorName: 'Dr Tester',
    reportedAt: '',
  };
  const html = buildReportSourceHtml(payload, { editorText: true });
  assert.ok(html.indexOf(findings) >= 0);
  assert.ok(html.indexOf(impression) >= 0);
  assert.match(html, /data-b="findings-0"/);
  assert.match(html, /data-b="impression-0"/);
  const swallowHtml = buildReportSourceHtml({
    ...payload,
    studies: [{ title: 'BARIUM SWALLOW', technique: 'Fluoroscopy', findings: swallow, impression: 'NO SIGNIFICANT ABNORMALITY SEEN.' }],
  }, { editorText: true });
  assert.ok(swallowHtml.indexOf(swallow) >= 0);

  const empty = buildReportSourceHtml({
    ...payload,
    studies: [{ title: part, technique: 'X-Ray', findings: '', impression: '' }],
  }, { editorText: true });
  const findingsTag = empty.match(/data-b="findings-0"[^>]*>([^<]*)</);
  const impressionTag = empty.match(/data-b="impression-0"[^>]*>([^<]*)</);
  assert.ok(findingsTag);
  assert.ok(impressionTag);
  assert.equal(findingsTag && findingsTag[1], '');
  assert.equal(impressionTag && impressionTag[1], '');
});

test('a template body part wins over a conflicting title, and GENERAL falls through to the title', () => {
  const conflict = templatesForStudyPicker({
    templates: [choice({ id: 'mix', title: 'CHEST PA', bodyPart: 'KNEE' })],
    studyLabel: 'CHEST PA',
    modality: 'X-Ray',
    session: DOCTOR,
  });
  assert.equal(conflict.candidates.length, 0);
  const fromTitle = templatesForStudyPicker({
    templates: [choice({ id: 't', title: 'CHEST PA', bodyPart: 'GENERAL' })],
    studyLabel: 'CHEST (PORTABLE)',
    modality: 'X-Ray',
    session: DOCTOR,
  });
  assert.equal(fromTitle.candidates.length, 1);
});
