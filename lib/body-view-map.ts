/**
 * t85: which X-ray views belong to a body part (Upload dialog view list).
 * The master lists (body-parts-data.ts) have no mapping, so body parts are matched
 * by keyword to view groups. A body part naming several regions (e.g. "Knee and Femur")
 * gets the union of those groups. No match (custom / unusual part) = every view.
 */
import { VIEWS_DATA } from '@/lib/body-parts-data';

const ALL_VIEWS = Array.from(new Set(VIEWS_DATA.map((v) => v.name.trim()).filter(Boolean)));
const byUpper = new Map(ALL_VIEWS.map((v) => [v.toUpperCase(), v]));

const CHEST = ['PA', 'AP', 'LATERAL', 'AP ERECT', 'PA ERECT', 'AP SUPINE', 'SUPINE', 'LORDOTIC', 'LATERAL DECUBITUS', 'EXPIRATORY CHEST RADIOGRAPH', 'AP SUPINE (NEONATAL)', 'CROSS TABLE LATERAL', 'OBLIQUE', 'PA-Flip Horizontal', 'PA Flip Horizontal'];
const RIBS = ['RIBS AP', 'RIBS PA', 'RIBS OBLIQUE', 'AP', 'PA', 'OBLIQUE'];
const STERNUM = ['STERNUM LATERAL', 'STERNUM OBLIQUE', 'PA', 'LATERAL', 'OBLIQUE'];
const ABDOMEN = ['AP', 'PA', 'SUPINE', 'AP SUPINE', 'PA SUPINE', 'AP ERECT', 'PA ERECT', 'PA PRONE', 'LATERAL', 'LATERAL DECUBITUS', 'DORSAL DECUBITUS', 'AP DECUBITUS', 'CROSS TABLE LATERAL', 'LATERAL XTABLE', 'OBLIQUE', 'AP OBLIQUE', 'MULTI VIEW 1', 'MULTI VIEW 2', 'MULTI VIEW 3', 'MULTI VIEW 4', 'MULTI VIEW 5', 'MULTI VIEW 6'];
const CSPINE = ['AP', 'LATERAL', 'OBLIQUE', 'AP OPEN MOUTH ODONTOID', 'AP CLOSED MOUTH ODONTOID (FUCHS VIEW)', 'ODONTOID', 'OPEN MOUTH', 'CLOSE MOUTH', "CERVICOTHORACIC (SWIMMER'S VIEW)", 'SWIMMER', 'FLEXION', 'EXTENSION', 'LATERAL FLEXION AND EXTENSION'];
const SPINE = ['AP', 'PA', 'LATERAL', 'OBLIQUE', 'AP OBLIQUE', 'AP AXIAL', 'FLEXION', 'EXTENSION', 'LATERAL FLEXION AND EXTENSION'];
const HIP = ['AP', 'LATERAL', 'FROG LEG', 'DUNN', 'VON ROSEN', 'HORIZONTAL BEAM LATERAL', 'CROSS TABLE LATERAL', 'INLET', 'OUTLET', 'OBLIQUE ACETABULAR (JUDET VIEW)', 'CLEMENTS-NAKAYAMA', 'FLAMINGO', 'INTERNAL ROTATION', 'EXTERNAL ROTATION'];
const KNEE = ['AP', 'LATERAL', 'AP WEIGHT-BEARING', 'WEIGHTBEARING AP', 'WEIGHTBEARING LATERAL', 'INTERCONDYLAR', 'TUNNEL', 'ROSENBERG', 'SKYLINE LAURINE', 'SKYLINE LAURIN', 'SKYLINE MERCHANT', 'SUNRISE', 'TANGENTIAL', 'OBLIQUE', 'HORIZONTAL BEAM LATERAL'];
const LONG_BONE = ['AP', 'LATERAL', 'OBLIQUE', 'HORIZONTAL BEAM LATERAL'];
const ANKLE = ['AP', 'LATERAL', 'AP MORTISE', 'AP STRESS', 'OBLIQUE', 'AXIAL', 'WEIGHTBEARING AP', 'WEIGHTBEARING LATERAL', 'Both Saltzman View', 'SALTZMAN'];
const FOOT = ['DP', 'DORSOPLANTAR', 'DP OBLIQUE', 'LATERAL', 'OBLIQUE', 'AP', 'WEIGHTBEARING AP', 'WEIGHTBEARING LATERAL', 'AXIAL', 'TANGENTIAL'];
const SHOULDER = ['AP', 'LATERAL', 'INTERNAL ROTATION', 'EXTERNAL ROTATION', 'SUPEROINFERIOR AXIAL', 'INFEROSUPERIOR AXIAL', 'MODIFIED TRAUMA AXIAL', 'Y LATERAL', 'AP GLENOID (GRASHEY VIEW)', 'APICAL OBLIQUE (GARTH VIEW)', 'STRYKER NOTCH', 'AXILLARY', 'ZANCA', 'AP CEPHALIC', 'SUPINE LATERAL', 'MODIFIED SUPINE LATERAL'];
const HUMERUS = ['AP', 'LATERAL', 'HUMERUS (NECK) AP', 'HUMERUS AXIAL (BICIPITAL GROOVE) (FISK VIEW)', 'SUPINE LATERAL', 'MODIFIED SUPINE LATERAL'];
const ELBOW = ['AP', 'LATERAL', 'OBLIQUE', 'EXTERNAL OBLIQUE', 'MEDIAL OBLIQUE', 'SUPRACONDYLAR AP', 'ACUTE FLEXION AP', "COYLE'S", 'AXIAL'];
const WRIST = ['PA', 'AP', 'LATERAL', 'OBLIQUE', 'PA OBLIQUE', 'PA ULNAR DEVIATION', 'PA RADIAL DEVIATION', 'SCAPHOID', 'CARPAL TUNNEL', 'CARPAL BRIDGE', 'TRAPEZIUM', 'PISIFORM'];
const HAND = ['PA', 'AP', 'LATERAL', 'OBLIQUE', 'PA OBLIQUE', 'AP OBLIQUE', 'BALL-CATCHER (NORGAARD VIEW)'];
const SKULL = ['PA', 'AP', 'LATERAL', 'PA ANGLED (CALDWELL VIEW)', 'CALDWELL', 'PA AXIAL (CALDWELL VIEW)', 'AP AXIAL(TOWNE VIEW)', 'TOWNE', 'SUBMENTOVERTEX (SMV)', 'AXIAL'];
const FACE = ['PARIETOCANTHAL (WATERS VIEW)', 'WATERS', 'OM', 'OCCIPITOMENTAL (WATERS VIEW)', 'OCCIPITOMENTAL 30º (TITTERINGTON VIEW)', 'TRANSORAL PARIETOCANTHAL (OPEN MOUTH WATERS VIEW)', 'ACANTHIOPARIETAL (REVERSE WATERS VIEW)', 'PA ANGLED (CALDWELL VIEW)', 'CALDWELL', 'LATERAL', 'SUBMENTOVERTEX (SMV)'];
const MASTOID = ['STENVERS', 'MODIFIED STENVERS', 'AXIOLATERAL', 'AXIOLATERAL OBLIQUE', 'AP AXIAL(TOWNE VIEW)', 'TOWNE', 'LATERAL'];
const JAW = ['PA', 'LATERAL', 'AXIOLATERAL', 'AXIOLATERAL OBLIQUE', 'OPEN MOUTH', 'CLOSE MOUTH', 'AP AXIAL(TOWNE VIEW)', 'TOWNE', 'PANORAMIC', 'OPG'];
const DENTAL = ['PANORAMIC', 'OPG', 'CEPHALOGRAPHIC', 'LATERAL'];
const NECK = ['AP', 'LATERAL'];
const FULL = ['AP', 'PA', 'LATERAL', 'AP WEIGHT-BEARING', 'MULTI VIEW 1', 'MULTI VIEW 2', 'MULTI VIEW 3', 'MULTI VIEW 4', 'MULTI VIEW 5', 'MULTI VIEW 6'];
const TAIL = ['SPECIAL', 'NOT AVAILABLE (NA)'];

const RULES: [RegExp, string[]][] = [
  [/\becg\b/, ['ECG']],
  [/\beeg\b/, ['EEG']],
  [/\bopg\b|dental|panoramic|ceph/, DENTAL],
  [/\bribs?\b/, RIBS],
  [/sternum/, STERNUM],
  [/chest|thorax|apicogram|thoracic inlet|lung/, CHEST],
  [/abdomen|\bkub\b|bladder|infantogram|invertogram|ivhrtogram|\bivp\b|barium|bmft|enema|colo|gallbladder|intestine|esophag|cholang|cholong|hsg|hystero|\bmcu\b|\brgu\b|\bdru\b|\brug\b|\basu\b|urethro|cysto|vcug|fistulo|sinogram|loopogram|cologram/, ABDOMEN],
  [/cervical/, CSPINE],
  [/dorsal|thoracic spine|lumbar|\bls\b|\btl\b|spine|sacrum|coccyx|sacroiliac|\bsi joints?\b/, SPINE],
  [/\bhips?\b|pelvis|\bpbh\b|acetab/, HIP],
  [/femur|femurs|thigh/, LONG_BONE.concat(['AP', 'LATERAL'])],
  [/knee|patella/, KNEE],
  [/fibula|tibia|\blegs?\b|lower limb|scanogram|\blli\b/, LONG_BONE.concat(FULL)],
  [/ankle|ankel|calcaneus|heel/, ANKLE],
  [/\bfoot\b|\bfeet\b|\btoe\b|sesamoid|\bsm bone\b/, FOOT],
  [/shoulder|clavicle|scapula|\bac joint/, SHOULDER],
  [/humerus|\barms?\b/, HUMERUS],
  [/elbow|forearm/, ELBOW],
  [/wrist|scaphoid/, WRIST],
  [/\bhands?\b|finger|thumb/, HAND],
  [/mastoid/, MASTOID],
  [/mandible|\btm joints?\b|tmj|styloid/, JAW],
  [/paranasal|\bpns\b|sinus|nasal|orbit|facial|zygoma/, FACE],
  [/skull|cranium/, SKULL],
  [/neck|\bstn\b|adenoid|pharynx|larynx|nasopharynx/, NECK],
  [/full body|multiple studies/, FULL],
];

function resolve(names: string[]): string[] {
  const out: string[] = [];
  for (const n of names) {
    const v = byUpper.get(n.toUpperCase());
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

/** Views for a body part (OTHER / add-new is added by the Autocomplete itself). */
export function viewsForBodyPart(bodyPart: string | null | undefined, extra: string[] = []): string[] {
  const s = String(bodyPart || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!s) return Array.from(new Set([...ALL_VIEWS, ...extra]));
  const picked: string[] = [];
  for (const [re, views] of RULES) if (re.test(s)) picked.push(...views);
  if (!picked.length) return Array.from(new Set([...ALL_VIEWS, ...extra]));
  return Array.from(new Set([...resolve(picked), ...resolve(TAIL), ...extra]));
}
