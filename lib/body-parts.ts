/**
 * X-ray body part + view pickers. The stored study name stays the same text the app has
 * always used ("CHEST PA", "KNEE AP/LAT (LEFT)", "LS SPINE FLEXION/EXTENSION"), so reports,
 * print and billing are unaffected: name = PART + ' ' + VIEW + (side ? ' (SIDE)' : '').
 */
export interface BodyPartDef {
  part: string;
  group: string;
  views: string[];
  /** offer LEFT / RIGHT (and BOTH when 'both') variants */
  sides?: 'lr' | 'both';
}

const SPINE_VIEWS = ['AP/LAT', 'AP', 'LATERAL', 'OBLIQUE', 'FLEXION/EXTENSION'];
const LIMB_VIEWS = ['AP/LAT', 'AP', 'LATERAL', 'OBLIQUE'];
const HAND_VIEWS = ['AP/OBLIQUE', 'AP', 'OBLIQUE', 'LATERAL'];

export const BODY_PARTS: BodyPartDef[] = [
  { group: 'Chest', part: 'CHEST', views: ['PA', 'AP', 'LATERAL', 'PA & LATERAL', 'SUPINE'] },
  { group: 'Chest', part: 'RIBS', views: ['AP/OBLIQUE', 'AP', 'OBLIQUE'] },
  { group: 'Chest', part: 'STERNUM', views: ['LATERAL', 'OBLIQUE'] },
  { group: 'Head & Neck', part: 'SKULL', views: ['AP/LAT', 'PA', 'AP', 'LATERAL'] },
  { group: 'Head & Neck', part: 'PNS', views: ['WATERS VIEW', 'CALDWELL VIEW'] },
  { group: 'Head & Neck', part: 'NASAL BONE', views: ['LATERAL'] },
  { group: 'Head & Neck', part: 'NASOPHARYNX', views: ['LATERAL'] },
  { group: 'Head & Neck', part: 'SOFT TISSUE NECK', views: ['AP/LAT', 'AP', 'LATERAL'] },
  { group: 'Head & Neck', part: 'MANDIBLE', views: ['PA/OBLIQUE', 'PA', 'OBLIQUE'] },
  { group: 'Head & Neck', part: 'TMJ', views: ['(OPEN/CLOSED MOUTH)'] },
  { group: 'Head & Neck', part: 'MASTOID', views: ['VIEWS'] },
  { group: 'Head & Neck', part: 'ORBIT', views: ['PA'] },
  { group: 'Spine', part: 'CERVICAL SPINE', views: SPINE_VIEWS },
  { group: 'Spine', part: 'DORSAL SPINE', views: SPINE_VIEWS },
  { group: 'Spine', part: 'DORSO LUMBAR SPINE', views: SPINE_VIEWS },
  { group: 'Spine', part: 'LUMBAR SPINE', views: SPINE_VIEWS },
  { group: 'Spine', part: 'LS SPINE', views: SPINE_VIEWS },
  { group: 'Spine', part: 'SACRUM', views: ['AP/LAT', 'AP', 'LATERAL'] },
  { group: 'Spine', part: 'COCCYX', views: ['AP/LAT', 'AP', 'LATERAL'] },
  { group: 'Spine', part: 'SACROCOCCYX', views: ['AP/LAT', 'AP', 'LATERAL'] },
  { group: 'Spine', part: 'WHOLE SPINE', views: ['AP/LAT', 'AP', 'LATERAL'] },
  { group: 'Pelvis & Hip', part: 'PELVIS', views: ['AP'] },
  { group: 'Pelvis & Hip', part: 'PELVIS WITH BOTH HIPS', views: [] },
  { group: 'Pelvis & Hip', part: 'BOTH HIPS', views: ['AP', 'FROG LEG'] },
  { group: 'Pelvis & Hip', part: 'HIP', views: ['AP/LAT', 'AP', 'LATERAL'], sides: 'lr' },
  { group: 'Pelvis & Hip', part: 'SI JOINTS', views: ['AP', 'OBLIQUE'] },
  { group: 'Lower limb', part: 'FEMUR', views: LIMB_VIEWS, sides: 'lr' },
  { group: 'Lower limb', part: 'KNEE', views: [...LIMB_VIEWS, 'SKYLINE VIEW', 'STANDING AP'], sides: 'both' },
  { group: 'Lower limb', part: 'LEG', views: LIMB_VIEWS, sides: 'lr' },
  { group: 'Lower limb', part: 'ANKLE', views: LIMB_VIEWS, sides: 'both' },
  { group: 'Lower limb', part: 'FOOT', views: HAND_VIEWS, sides: 'both' },
  { group: 'Lower limb', part: 'HEEL', views: ['LATERAL/AXIAL', 'LATERAL', 'AXIAL'], sides: 'lr' },
  { group: 'Lower limb', part: 'TOES', views: HAND_VIEWS, sides: 'lr' },
  { group: 'Upper limb', part: 'CLAVICLE', views: ['AP'], sides: 'lr' },
  { group: 'Upper limb', part: 'SHOULDER', views: ['AP', 'AP/AXIAL', 'AXIAL', 'Y VIEW'], sides: 'lr' },
  { group: 'Upper limb', part: 'HUMERUS', views: LIMB_VIEWS, sides: 'lr' },
  { group: 'Upper limb', part: 'ELBOW', views: LIMB_VIEWS, sides: 'lr' },
  { group: 'Upper limb', part: 'FOREARM', views: LIMB_VIEWS, sides: 'lr' },
  { group: 'Upper limb', part: 'WRIST', views: LIMB_VIEWS, sides: 'both' },
  { group: 'Upper limb', part: 'HAND', views: HAND_VIEWS, sides: 'both' },
  { group: 'Upper limb', part: 'FINGER', views: LIMB_VIEWS, sides: 'lr' },
  { group: 'Upper limb', part: 'THUMB', views: LIMB_VIEWS, sides: 'lr' },
  { group: 'Abdomen', part: 'KUB', views: [] },
  { group: 'Abdomen', part: 'ABDOMEN', views: ['ERECT', 'SUPINE', 'ERECT/SUPINE'] },
];

const SIDE_RE = / \((LEFT|RIGHT|BOTH)\)$/;

/** Body part choices ("KNEE", "KNEE (LEFT)", ...). */
export function bodyPartChoices(): { group: string; value: string }[] {
  const out: { group: string; value: string }[] = [];
  for (const d of BODY_PARTS) {
    out.push({ group: d.group, value: d.part });
    if (d.sides) {
      out.push({ group: d.group, value: `${d.part} (LEFT)` }, { group: d.group, value: `${d.part} (RIGHT)` });
      if (d.sides === 'both') out.push({ group: d.group, value: `${d.part} (BOTH)` });
    }
  }
  return out;
}

export function findPart(choice: string): BodyPartDef | undefined {
  const base = choice.replace(SIDE_RE, '');
  return BODY_PARTS.find((d) => d.part === base);
}

/** Views for a body part choice ([] = no view needed). */
export function viewsFor(choice: string): string[] {
  return findPart(choice)?.views || [];
}

/** "KNEE (LEFT)" + "AP/LAT" -> "KNEE AP/LAT (LEFT)"; '' when a needed view is missing. */
export function composeStudyName(choice: string, view: string): string {
  const def = findPart(choice);
  if (!def) return '';
  const side = choice.match(SIDE_RE)?.[1];
  if (def.views.length && !view) return '';
  return [def.part, def.views.length ? view : '', side ? `(${side})` : ''].filter(Boolean).join(' ');
}
