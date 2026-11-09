/**
 * PACS template choice.
 *
 * Related templates are listed for the doctor to pick. Nothing is auto-inserted:
 * a newer or pathological variant must not fill an empty report by itself.
 *
 * Body-part matching is catalogue-aware and alias-based. A template matches a
 * study only when both resolve to the same canonical key. View, laterality and
 * clinical-variant words (AP, lateral, left, OA, TKR, …) are ignored. A shorter
 * name inside a longer procedure ("leg" inside "scanogram leg", "knee" inside
 * "femur with knee and leg") is not a match.
 *
 * Unknown study labels stay unsupported. They are not folded into GENERAL.
 *
 * Backend GET /templates/match (Radionline_Backend app/routers/templates.py)
 * is a different rule: created_at descending, first row whose modality and
 * bodyPart are equal after trim + lowercase. That picks the newest exact row,
 * including a pathological one, and it does not understand aliases. The viewer
 * must not call it to fill a report. The doctor's own template list (GET
 * /templates), filtered here, is the source of choices. No API change is
 * required. A future non-breaking `candidates=1` list could share these keys;
 * until then the server endpoint can stay as it is.
 *
 * Doctor accounts are not hardcoded. Ownership is "this session's own ids".
 */
import { BODY_PARTS } from './body-parts';
import { BODY_PARTS_DATA } from './body-parts-data';

export interface StudyIdentity {
  /** Original label, unchanged. Empty when the case has no procedure name. */
  label: string;
  /** Canonical catalogue key, or null when the label is not a known procedure. */
  key: string | null;
  supported: boolean;
}

export interface TemplateChoice {
  id?: string;
  title?: string;
  modality?: string;
  bodyPart?: string | null;
  findings?: string;
  impression?: string;
  content?: string;
  doctorId?: string | null;
  centerId?: string | null;
  createdAt?: string;
}

export interface TemplateSession {
  role?: string | null;
  doctorId?: string | number | null;
  userId?: string | number | null;
}

export interface PartTextMaps {
  findings: Record<string, string>;
  impressions: Record<string, string>;
}

interface Alias {
  phrase: string;
  key: string;
}

const PROCEDURE_KEYS: Record<string, 1> = {
  hsg: 1,
  mcu: 1,
  'ascending-urethrogram': 1,
  'aug-mcu': 1,
  'barium-enema': 1,
  'barium-swallow': 1,
  'barium-meal': 1,
  bmft: 1,
  'distal-cologram': 1,
  cologram: 1,
  'ryles-tube': 1,
  ivp: 1,
  'scanogram-lower-limb': 1,
  'scanogram-spine': 1,
};

const CONTRAST_KEYS: Record<string, 1> = {
  hsg: 1,
  mcu: 1,
  'ascending-urethrogram': 1,
  'aug-mcu': 1,
  'barium-enema': 1,
  'barium-swallow': 1,
  'barium-meal': 1,
  bmft: 1,
  'distal-cologram': 1,
  cologram: 1,
  'ryles-tube': 1,
  ivp: 1,
};

/** Leftover tokens that do not change which body part a label is. */
const FILLER: Record<string, 1> = {};
const FILLER_WORDS = [
  'left', 'right', 'both', 'bilateral', 'lt', 'rt', 'l', 'r', 'b',
  'ap', 'pa', 'lat', 'lateral', 'obl', 'oblique', 'axial', 'view', 'views',
  'skyline', 'sunrise', 'flexion', 'extension', 'supine', 'erect', 'standing',
  'portable', 'frontal', 'dp', 'dorsoplantar', 'weightbearing', 'waters', 'caldwell',
  'lordotic', 'decubitus', 'prone', 'expiratory', 'inspiratory', 'pediatric',
  'paediatric', 'neonatal', 'mortise', 'tunnel', 'tangential', 'frog', 'swimmer',
  'odontoid', 'inlet', 'outlet', 'y', 'grashey', 'axillary', 'zanca', 'scaphoid',
  'norgaard', 'towne', 'smv', 'stenvers', 'panoramic', 'opg', 'horizontal', 'beam',
  'cross', 'table', 'weight', 'bearing', 'open', 'closed', 'mouth', 'rotation',
  'internal', 'external', 'ulnar', 'radial', 'cephalic', 'apical', 'modified',
  'trauma', 'flip', 'multi',
  'oa', 'oa1', 'oa2', 'tkr', 'thr', 'replacement', 'normal', 'adenoids', 'enlarged',
  'sinusitis', 'pm', 'child', 'adult', 'postop', 'fracture', 'spondylosis', 'iitv',
  'insertion', 'prosthesis', 'clips',
  'and', 'with', 'of', 'the', 'for', 'under', 'to', 'a', 'an', 'in', 'on',
  'examination', 'xray', 'x', 'ray', 'radiograph', 'radiographs', 'study',
  'joint', 'joints', 'image', 'images',
];
for (let i = 0; i < FILLER_WORDS.length; i++) FILLER[FILLER_WORDS[i]] = 1;

/** Region words allowed only when registering a named special procedure, not when matching a study. */
const REGION_WORD: Record<string, 1> = { abdomen: 1, chest: 1, skull: 1, pelvis: 1, neck: 1 };

const EXPLICIT_ALIASES: { phrase: string; key: string }[] = [
  { phrase: 'pelvis with both hips', key: 'pelvis-with-both-hips' },
  { phrase: 'both hips', key: 'both-hips' },
  { phrase: 'hips', key: 'both-hips' },
  { phrase: 'pbh hip', key: 'hip' },
  { phrase: 'pbh', key: 'hip' },
  { phrase: 'hip', key: 'hip' },
  { phrase: 'pelvis', key: 'pelvis' },
  { phrase: 'si joints', key: 'si-joints' },
  { phrase: 'si joint', key: 'si-joints' },
  { phrase: 'sacroiliac joints', key: 'si-joints' },
  { phrase: 'sacroiliac joint', key: 'si-joints' },
  { phrase: 'sacroiliac', key: 'si-joints' },
  { phrase: 'si', key: 'si-joints' },
  { phrase: 'femur with knee and leg', key: 'femur-knee-leg' },
  { phrase: 'scanogram both lower limbs standing', key: 'scanogram-lower-limb' },
  { phrase: 'scanogram both lower limbs', key: 'scanogram-lower-limb' },
  { phrase: 'scanogram left lower limb standing', key: 'scanogram-lower-limb' },
  { phrase: 'scanogram left lower limb', key: 'scanogram-lower-limb' },
  { phrase: 'scanogram right lower limb standing', key: 'scanogram-lower-limb' },
  { phrase: 'scanogram right lower limb', key: 'scanogram-lower-limb' },
  { phrase: 'scanogram lower limb', key: 'scanogram-lower-limb' },
  { phrase: 'scanogram leg', key: 'scanogram-lower-limb' },
  { phrase: 'scanogram spine', key: 'scanogram-spine' },
  { phrase: 'soft tissue neck', key: 'soft-tissue-neck' },
  { phrase: 'soft tissue necks', key: 'soft-tissue-neck' },
  { phrase: 'neck soft tissues', key: 'soft-tissue-neck' },
  { phrase: 'neck soft tissue', key: 'soft-tissue-neck' },
  { phrase: 'stn', key: 'soft-tissue-neck' },
  { phrase: 'neck', key: 'soft-tissue-neck' },
  { phrase: 'dorso lumbar spine', key: 'dorso-lumbar-spine' },
  { phrase: 'dorsolumbar spine', key: 'dorso-lumbar-spine' },
  { phrase: 'dorso lumbar', key: 'dorso-lumbar-spine' },
  { phrase: 'dl spine', key: 'dorso-lumbar-spine' },
  { phrase: 'dlsp', key: 'dorso-lumbar-spine' },
  { phrase: 'cervical spine', key: 'cervical-spine' },
  { phrase: 'c spine', key: 'cervical-spine' },
  { phrase: 'csp', key: 'cervical-spine' },
  { phrase: 'dorsal spine', key: 'dorsal-spine' },
  { phrase: 'thoracic spine', key: 'dorsal-spine' },
  { phrase: 'd spine', key: 'dorsal-spine' },
  { phrase: 'dsp', key: 'dorsal-spine' },
  { phrase: 'lumbo sacral spine', key: 'ls-spine' },
  { phrase: 'lumbosacral spine', key: 'ls-spine' },
  { phrase: 'lumbo sacral', key: 'ls-spine' },
  { phrase: 'lumbosacral', key: 'ls-spine' },
  { phrase: 'lumbar spine', key: 'ls-spine' },
  { phrase: 'ls spine', key: 'ls-spine' },
  { phrase: 'l spine', key: 'ls-spine' },
  { phrase: 'lsp', key: 'ls-spine' },
  { phrase: 'whole spine', key: 'whole-spine' },
  { phrase: 'sacrococcyx', key: 'sacrococcyx' },
  { phrase: 'sacrum', key: 'sacrum' },
  { phrase: 'coccyx', key: 'coccyx' },
  { phrase: 'abdomen kub', key: 'kub' },
  { phrase: 'kub', key: 'kub' },
  { phrase: 'abdomen', key: 'abdomen' },
  { phrase: 'calcaneum', key: 'heel' },
  { phrase: 'calcaneus', key: 'heel' },
  { phrase: 'heels', key: 'heel' },
  { phrase: 'heel', key: 'heel' },
  { phrase: 'paranasal sinuses', key: 'pns' },
  { phrase: 'paranasal sinus', key: 'pns' },
  { phrase: 'paranasal', key: 'pns' },
  { phrase: 'pns', key: 'pns' },
  { phrase: 'nasal bones', key: 'nasal-bone' },
  { phrase: 'nasal bone', key: 'nasal-bone' },
  { phrase: 'skull nasal', key: 'nasal-bone' },
  { phrase: 'skull mandible', key: 'mandible' },
  { phrase: 'skull cranium', key: 'skull' },
  { phrase: 'cranium', key: 'skull' },
  { phrase: 'skull', key: 'skull' },
  { phrase: 'mandible', key: 'mandible' },
  { phrase: 'temporomandibular joints', key: 'tmj' },
  { phrase: 'temporomandibular joint', key: 'tmj' },
  { phrase: 'temporomandibular', key: 'tmj' },
  { phrase: 'tm joints', key: 'tmj' },
  { phrase: 'tm joint', key: 'tmj' },
  { phrase: 'tmj', key: 'tmj' },
  { phrase: 'ascending urethrogram and micturating cysto urethrogram', key: 'aug-mcu' },
  { phrase: 'ascending urethrogram and micturating cystourethrogram', key: 'aug-mcu' },
  { phrase: 'micturating cysto urethrogram', key: 'mcu' },
  { phrase: 'micturating cystourethrogram', key: 'mcu' },
  { phrase: 'micturating cystourethrography', key: 'mcu' },
  { phrase: 'voiding cystourethrography', key: 'mcu' },
  { phrase: 'vcug', key: 'mcu' },
  { phrase: 'mcu', key: 'mcu' },
  { phrase: 'ascending urethrogram', key: 'ascending-urethrogram' },
  { phrase: 'ascending urethrography', key: 'ascending-urethrogram' },
  { phrase: 'retrograde urethrography', key: 'ascending-urethrogram' },
  { phrase: 'retrograde urethrogram', key: 'ascending-urethrogram' },
  { phrase: 'rgu', key: 'ascending-urethrogram' },
  { phrase: 'rug', key: 'ascending-urethrogram' },
  { phrase: 'asu', key: 'ascending-urethrogram' },
  { phrase: 'barium for i c and distal loop cologram', key: 'distal-cologram' },
  { phrase: 'barium for ic and distal loop cologram', key: 'distal-cologram' },
  { phrase: 'distal loop cologram', key: 'distal-cologram' },
  { phrase: 'distal colostogram', key: 'distal-cologram' },
  { phrase: 'barium meal follow through', key: 'bmft' },
  { phrase: 'bmft', key: 'bmft' },
  { phrase: 'barium meal stomach duodenum', key: 'barium-meal' },
  { phrase: 'barium meal', key: 'barium-meal' },
  { phrase: 'barium swallow', key: 'barium-swallow' },
  { phrase: 'barium enema', key: 'barium-enema' },
  { phrase: 'abdomen barium enema', key: 'barium-enema' },
  { phrase: 'ryles tube', key: 'ryles-tube' },
  { phrase: 'ryle tube', key: 'ryles-tube' },
  { phrase: 'hysterosalpingography', key: 'hsg' },
  { phrase: 'hsg', key: 'hsg' },
  { phrase: 'intravenous pyelogram', key: 'ivp' },
  { phrase: 'ivp', key: 'ivp' },
  { phrase: 'ribcage', key: 'ribs' },
  { phrase: 'rib cage', key: 'ribs' },
  { phrase: 'ribs', key: 'ribs' },
  { phrase: 'rib', key: 'ribs' },
  { phrase: 'both knees', key: 'knee' },
  { phrase: 'knees', key: 'knee' },
  { phrase: 'knee', key: 'knee' },
  { phrase: 'elbow', key: 'elbow' },
  { phrase: 'shoulder', key: 'shoulder' },
  { phrase: 'wrist', key: 'wrist' },
  { phrase: 'wrists', key: 'wrist' },
  { phrase: 'forearm', key: 'forearm' },
  { phrase: 'humeri', key: 'humerus' },
  { phrase: 'humerus', key: 'humerus' },
  { phrase: 'arms', key: 'humerus' },
  { phrase: 'arm', key: 'humerus' },
  { phrase: 'ankles', key: 'ankle' },
  { phrase: 'ankle', key: 'ankle' },
  { phrase: 'feet', key: 'foot' },
  { phrase: 'foot', key: 'foot' },
  { phrase: 'toes', key: 'toe' },
  { phrase: 'toe', key: 'toe' },
  { phrase: 'thumb', key: 'thumb' },
  { phrase: 'thumbs', key: 'thumb' },
  { phrase: 'finger', key: 'finger' },
  { phrase: 'fingers', key: 'finger' },
  { phrase: 'hands', key: 'hand' },
  { phrase: 'hand', key: 'hand' },
  { phrase: 'chest', key: 'chest' },
  { phrase: 'leg', key: 'leg' },
  { phrase: 'legs', key: 'leg' },
  { phrase: 'femur', key: 'femur' },
  { phrase: 'clavicle', key: 'clavicle' },
  { phrase: 'sternum', key: 'sternum' },
  { phrase: 'orbit', key: 'orbit' },
  { phrase: 'mastoid', key: 'mastoid' },
  { phrase: 'nasopharynx', key: 'nasopharynx' },
];

function sortAliases(list: Alias[]): Alias[] {
  return list.slice().sort((a, b) => b.phrase.length - a.phrase.length || (a.phrase < b.phrase ? -1 : a.phrase > b.phrase ? 1 : 0));
}

export function normalizeStudyText(value: string | null | undefined): string {
  return String(value || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/\./g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slug(value: string): string {
  return value.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function remainderAfterPhrase(hay: string, phrase: string): string | null {
  if (!phrase) return null;
  const padded = ' ' + hay + ' ';
  const needle = ' ' + phrase + ' ';
  const at = padded.indexOf(needle);
  if (at < 0) return null;
  return (padded.slice(0, at) + ' ' + padded.slice(at + needle.length)).replace(/\s+/g, ' ').trim();
}

function isFillerToken(token: string): boolean {
  if (!token) return true;
  if (FILLER[token]) return true;
  return /^\d+$/.test(token);
}

function exactAliasKey(aliases: Alias[], phrase: string): string | null {
  for (let i = 0; i < aliases.length; i++) {
    if (aliases[i].phrase === phrase) return aliases[i].key;
  }
  return null;
}

function remainderAllowed(rest: string, key: string, allowProcedureRegions: boolean, aliases: Alias[]): boolean {
  if (!rest) return true;
  const tokens = rest.split(' ');
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (isFillerToken(token)) continue;
    if (allowProcedureRegions && PROCEDURE_KEYS[key] && (REGION_WORD[token] || exactAliasKey(aliases, token) === key)) {
      continue;
    }
    return false;
  }
  return true;
}

function resolveKey(aliases: Alias[], raw: string, allowProcedureRegions: boolean): string | null {
  const hay = normalizeStudyText(raw);
  if (!hay || hay === 'general' || hay === 'other') return null;
  for (let i = 0; i < aliases.length; i++) {
    const alias = aliases[i];
    const rest = remainderAfterPhrase(hay, alias.phrase);
    if (rest === null) continue;
    if (remainderAllowed(rest, alias.key, allowProcedureRegions, aliases)) return alias.key;
  }
  return null;
}

function buildAliasList(): Alias[] {
  const explicit = sortAliases(
    EXPLICIT_ALIASES.map((entry) => ({ phrase: normalizeStudyText(entry.phrase), key: entry.key })).filter((entry) => entry.phrase),
  );
  const list = explicit.slice();
  const seen: Record<string, 1> = {};
  for (let i = 0; i < list.length; i++) seen[list[i].phrase] = 1;

  const names: string[] = [];
  for (let i = 0; i < BODY_PARTS.length; i++) names.push(BODY_PARTS[i].part);
  for (let i = 0; i < BODY_PARTS_DATA.length; i++) names.push(BODY_PARTS_DATA[i].name);

  for (let i = 0; i < names.length; i++) {
    const phrase = normalizeStudyText(names[i]);
    if (!phrase || phrase === 'general' || phrase === 'other' || seen[phrase]) continue;
    const fromExplicit = resolveKey(explicit, phrase, true);
    const key = fromExplicit || slug(phrase);
    if (!key || key === 'general' || key === 'other') continue;
    list.push({ phrase, key });
    seen[phrase] = 1;
  }
  return sortAliases(list);
}

const ALIASES = buildAliasList();

export function identifyStudy(label: string | null | undefined): StudyIdentity {
  const original = String(label || '').trim();
  const key = resolveKey(ALIASES, original, false);
  if (!key) return { label: original, key: null, supported: false };
  return { label: original, key, supported: true };
}

export function templateCanonicalKey(template: { bodyPart?: string | null; title?: string | null }): string | null {
  const fromPart = identifyStudy(template.bodyPart || '');
  if (fromPart.supported && fromPart.key) return fromPart.key;
  const fromTitle = identifyStudy(template.title || '');
  if (fromTitle.supported && fromTitle.key) return fromTitle.key;
  return null;
}

function modalityFamily(value: string | null | undefined): string {
  const text = normalizeStudyText(value);
  if (!text) return '';
  if (/fluoroscopy|\bfluoro\b|\biitv\b|screening/.test(text)) return 'fluoro';
  if (/\bct\b|\bcat\b/.test(text)) return 'ct';
  if (/\bmri\b|\bmr\b/.test(text)) return 'mri';
  if (/ultrasound|\busg\b|sonograph/.test(text)) return 'us';
  if (/mammograph|\bmammo\b/.test(text)) return 'mammo';
  if (/xray|x ray|\bdx\b|radiograph|\bcr\b|\bdr\b/.test(text)) return 'xray';
  return 'other:' + text;
}

export function modalitiesCompatible(
  caseModality: string | null | undefined,
  templateModality: string | null | undefined,
  studyKey: string | null,
): boolean {
  const left = modalityFamily(caseModality);
  const right = modalityFamily(templateModality);
  if (!left || !right) return true;
  if (left === right) return true;
  if (studyKey && CONTRAST_KEYS[studyKey] && ((left === 'xray' && right === 'fluoro') || (left === 'fluoro' && right === 'xray'))) {
    return true;
  }
  return false;
}

export function isTemplateOwnedBySession(
  templateDoctorId: string | number | null | undefined,
  session: TemplateSession | null | undefined,
): boolean {
  if (!session || session.role !== 'DOCTOR') return true;
  const own: string[] = [];
  const doctorId = String(session.doctorId == null ? '' : session.doctorId).trim();
  const userId = String(session.userId == null ? '' : session.userId).trim();
  if (doctorId) own.push(doctorId);
  if (userId && own.indexOf(userId) < 0) own.push(userId);
  const templateId = String(templateDoctorId == null ? '' : templateDoctorId).trim();
  if (!templateId || own.length === 0) return false;
  for (let i = 0; i < own.length; i++) {
    if (own[i] === templateId) return true;
  }
  return false;
}

function byTitleThenId<T extends { title?: string; id?: string }>(a: T, b: T): number {
  const titleA = String(a.title || '');
  const titleB = String(b.title || '');
  if (titleA < titleB) return -1;
  if (titleA > titleB) return 1;
  const idA = String(a.id || '');
  const idB = String(b.id || '');
  if (idA < idB) return -1;
  if (idA > idB) return 1;
  return 0;
}

export function templatePickerNote(study: StudyIdentity, candidateCount: number, showAll: boolean): string {
  const label = study.label;
  if (!study.supported) {
    if (!label) return 'No study procedure is recorded for this case. No template was applied.';
    if (showAll) {
      return '“' + label + '” is not a catalogue study procedure. No template was applied. Showing every template you can use; applying one fills this study only.';
    }
    return '“' + label + '” is not a catalogue study procedure. No template was applied.';
  }
  if (showAll) return '';
  if (candidateCount === 0) return 'No saved templates match ' + label + '.';
  const noun = candidateCount === 1 ? 'template matches' : 'templates match';
  return candidateCount + ' ' + noun + ' this study. Choose one to apply it to this study only.';
}

export interface TemplatePickerResult<T> {
  study: StudyIdentity;
  candidates: T[];
  note: string;
}

/**
 * Choices for the active study. Never selects one of them.
 * `showAll` keeps ownership filtering and skips body-part / modality filtering.
 */
export function templatesForStudyPicker<T extends TemplateChoice>(args: {
  templates: readonly T[];
  studyLabel: string | null | undefined;
  modality?: string | null;
  session?: TemplateSession | null;
  showAll?: boolean;
}): TemplatePickerResult<T> {
  const study = identifyStudy(args.studyLabel);
  const showAll = !!args.showAll;
  const owned: T[] = [];
  for (let i = 0; i < args.templates.length; i++) {
    const template = args.templates[i];
    if (!isTemplateOwnedBySession(template.doctorId, args.session)) continue;
    if (!showAll) {
      if (!study.supported || !study.key) continue;
      if (templateCanonicalKey(template) !== study.key) continue;
      if (!modalitiesCompatible(args.modality, template.modality, study.key)) continue;
    }
    owned.push(template);
  }
  owned.sort(byTitleThenId);
  return { study, candidates: owned, note: templatePickerNote(study, owned.length, showAll) };
}

/** The viewer must not auto-insert any candidate, including the newest pathological one. */
export function chooseAutoAppliedTemplate<T>(_candidates: readonly T[] | null | undefined): null {
  return null;
}

/**
 * Mirror of backend GET /templates/match: newest createdAt, exact trimmed
 * case-insensitive modality + bodyPart. No aliases. Tests use this to prove
 * the viewer does not follow that rule. Do not call it to fill a report.
 */
export function backendStyleNewestExactMatch<T extends { modality?: string; bodyPart?: string | null; createdAt?: string }>(
  templates: readonly T[],
  modality: string,
  bodyPart: string,
): T | null {
  const mod = String(modality || '').trim().toLowerCase();
  const bp = String(bodyPart || '').trim().toLowerCase();
  if (!mod || !bp) return null;
  const ordered = templates.slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  for (let i = 0; i < ordered.length; i++) {
    const template = ordered[i];
    if (String(template.modality || '').trim().toLowerCase() !== mod) continue;
    if (String(template.bodyPart || '').trim().toLowerCase() !== bp) continue;
    return template;
  }
  return null;
}

export function plainTextFromTemplateHtml(html: string): string {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Pull findings and impression without rewriting text that is already stored. */
export function parseTemplateBody(rawFindings?: string | null, rawImpression?: string | null, content?: string | null): { findings: string; impression: string } {
  let findings = String(rawFindings || '').trim();
  let impression = String(rawImpression || '').trim();
  if ((!findings || !impression) && content) {
    const plain = plainTextFromTemplateHtml(content);
    // Match section labels on their own line (or followed by a colon), never
    // the words "findings" / "impression" occurring within the report narrative.
    const findingsHeading = /(?:^|\n)[ \t]*(?:RADIOLOGICAL[ \t]+)?FINDINGS[ \t]*(?::[ \t]*|(?=\n|$))/im.exec(plain);
    const impressionHeading = /(?:^|\n)[ \t]*IMPRESSION(?:[ \t]*&[ \t]*CONCLUSION)?[ \t]*(?::[ \t]*|(?=\n|$))/im.exec(plain);
    if (!findings) {
      const start = findingsHeading ? findingsHeading.index + findingsHeading[0].length : 0;
      const end = impressionHeading && impressionHeading.index >= start ? impressionHeading.index : plain.length;
      findings = plain.slice(start, end).trim();
    }
    if (!impression && impressionHeading) {
      impression = plain.slice(impressionHeading.index + impressionHeading[0].length).trim();
    }
  }
  return { findings, impression };
}

export function writeActivePartText(
  maps: PartTextMaps,
  activePart: string,
  body: { findings: string; impression: string },
): PartTextMaps & { applied: boolean } {
  const findings = { ...maps.findings };
  const impressions = { ...maps.impressions };
  if (!activePart) return { findings, impressions, applied: false };
  findings[activePart] = body.findings;
  impressions[activePart] = body.impression;
  return { findings, impressions, applied: true };
}

export function applyTemplateToActivePart(
  maps: PartTextMaps,
  activePart: string,
  body: { findings: string; impression: string },
): PartTextMaps & { applied: boolean } {
  return writeActivePartText(maps, activePart, body);
}

export function commitAndSwitchPart(
  maps: PartTextMaps,
  fromPart: string,
  toPart: string,
  editorFindings: string,
  editorImpression: string,
): {
  findings: Record<string, string>;
  impressions: Record<string, string>;
  editorFindings: string;
  editorImpression: string;
} {
  const written = fromPart
    ? writeActivePartText(maps, fromPart, { findings: editorFindings, impression: editorImpression })
    : { findings: { ...maps.findings }, impressions: { ...maps.impressions }, applied: false };
  return {
    findings: written.findings,
    impressions: written.impressions,
    editorFindings: written.findings[toPart] || '',
    editorImpression: written.impressions[toPart] || '',
  };
}

export function replacementNeedsConfirm(
  currentFindings: string,
  currentImpression: string,
  nextFindings: string,
  nextImpression: string,
): boolean {
  const hasText = Boolean(String(currentFindings || '').trim() || String(currentImpression || '').trim());
  if (!hasText) return false;
  return String(currentFindings || '').trim() !== String(nextFindings || '').trim()
    || String(currentImpression || '').trim() !== String(nextImpression || '').trim();
}

export function savedTextForParts(
  parts: readonly string[],
  report: {
    findings?: string | null;
    impression?: string | null;
    reportsByBodyPart?: Record<string, string> | null;
    impressionsByBodyPart?: Record<string, string> | null;
  } | null | undefined,
): { findings: Record<string, string>; impressions: Record<string, string>; hasSavedDraft: boolean } {
  const findings: Record<string, string> = { ...(report && report.reportsByBodyPart ? report.reportsByBodyPart : {}) };
  const impressions: Record<string, string> = { ...(report && report.impressionsByBodyPart ? report.impressionsByBodyPart : {}) };
  const findingValues = Object.keys(findings);
  const impressionValues = Object.keys(impressions);
  let anyPart = false;
  for (let i = 0; i < findingValues.length; i++) {
    if (String(findings[findingValues[i]] || '').trim()) anyPart = true;
  }
  for (let i = 0; i < impressionValues.length; i++) {
    if (String(impressions[impressionValues[i]] || '').trim()) anyPart = true;
  }
  const hasSavedDraft = Boolean(
    (report && report.findings && String(report.findings).trim())
    || (report && report.impression && String(report.impression).trim())
    || anyPart,
  );
  // Legacy cases stored one findings/impression string and no per-study map.
  // Only those fall back to that string. A map that already names a study must
  // not be copied onto the other studies.
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!String(findings[part] || '').trim() && !anyPart && report && report.findings) {
      findings[part] = String(report.findings);
    } else if (!findings[part]) {
      findings[part] = '';
    }
    if (!String(impressions[part] || '').trim() && !anyPart && report && report.impression) {
      impressions[part] = String(report.impression);
    } else if (!impressions[part]) {
      impressions[part] = '';
    }
  }
  return { findings, impressions, hasSavedDraft };
}
