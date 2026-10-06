// Medical & Radiology Autocomplete and Spellcheck Engine

export const RADIOLOGY_DICTIONARY = new Set<string>([
  // Common English Words
  'a', 'about', 'above', 'accidental', 'according', 'across', 'acute', 'additional', 'adjacent', 'admitted', 'after',
  'again', 'against', 'age', 'aged', 'agreed', 'air', 'align', 'alignment', 'acetabular', 'acetabulum', 'degenerative', 'degeneration', 'pregnant', 'pregnancy', 'bony', 'bone', 'all', 'almost', 'alone', 'along', 'already', 'also', 'although',
  'always', 'am', 'amount', 'an', 'and', 'another', 'answer', 'any', 'anyone', 'anything', 'anyway', 'appear',
  'appeared', 'appearing', 'appears', 'appliances', 'applied', 'apply', 'appropriate', 'are', 'area', 'areas', 'around',
  'as', 'ask', 'asked', 'aspect', 'aspects', 'assessment', 'associated', 'assumed', 'at', 'attenuation', 'audit',
  'available', 'average', 'back', 'background', 'bad', 'based', 'baseline', 'be', 'because', 'become', 'becomes',
  'been', 'before', 'began', 'begin', 'behind', 'being', 'below', 'beneath', 'benign', 'beside', 'best', 'better',
  'between', 'beyond', 'bilateral', 'bilaterally', 'biological', 'biopsy', 'bit', 'blank', 'blood', 'body', 'bone',
  'bones', 'border', 'borders', 'both', 'bottom', 'boundary', 'box', 'brain', 'brief', 'bright', 'broad', 'brought',
  'build', 'building', 'built', 'but', 'by', 'call', 'called', 'came', 'can', 'cannot', 'case', 'cases', 'cause',
  'caused', 'causes', 'causing', 'cavity', 'cell', 'cells', 'center', 'central', 'centre', 'certain', 'change',
  'changed', 'changes', 'changing', 'chart', 'check', 'checked', 'checking', 'chest', 'chief', 'chronic', 'clean',
  'clear', 'cleared', 'clearly', 'clears', 'clerical', 'clinical', 'clinically', 'close', 'closed', 'closely', 'clot',
  'cm', 'code', 'colleague', 'collected', 'collection', 'column', 'combination', 'combined', 'come', 'comes', 'coming',
  'common', 'commonly', 'compared', 'comparison', 'compartment', 'complete', 'completed', 'completely', 'complex',
  'complication', 'complications', 'component', 'components', 'computed', 'conclusion', 'conclusions', 'condition',
  'conditions', 'confirmed', 'confirmation', 'consider', 'considerable', 'considered', 'considering', 'consistency',
  'consistent', 'consistently', 'consisting', 'consolidation', 'consultant', 'contact', 'contain', 'contained', 'contains',
  'contoured', 'contours', 'control', 'controlled', 'copd', 'copy', 'core', 'coronal', 'correlate', 'correlated',
  'correlation', 'costal', 'could', 'count', 'country', 'course', 'cover', 'coverage', 'covered', 'cortex', 'cortical',
  'created', 'critical', 'crossover', 'csf', 'ct', 'current', 'currently', 'cusp', 'cut', 'daily', 'dark', 'data',
  'date', 'day', 'days', 'dear', 'decrease', 'decreased', 'decreasing', 'deep', 'defect', 'defects', 'define',
  'defined', 'definite', 'definitely', 'degree', 'delayed', 'demographic', 'demonstrate', 'demonstrated', 'demonstrates',
  'demonstrating', 'dense', 'density', 'department', 'depend', 'dependent', 'depending', 'depth', 'described', 'description',
  'detail', 'detailed', 'details', 'detect', 'detected', 'detection', 'development', 'device', 'devices', 'diagnosis',
  'diagnostic', 'diagram', 'diameter', 'diaphragm', 'diaphragmatic', 'did', 'differ', 'difference', 'different', 'difficult',
  'digital', 'dilated', 'dilation', 'dimension', 'dimensions', 'direct', 'direction', 'directly', 'disc', 'discharged',
  'discipline', 'discovery', 'disease', 'diseases', 'disk', 'dislocated', 'dislocation', 'displaced', 'displacement',
  'disruption', 'distal', 'distally', 'distance', 'distant', 'distinct', 'distinguishable', 'distortion', 'disturbed',
  'distribution', 'diverticulitis', 'division', 'do', 'doctor', 'does', 'doing', 'done', 'dose', 'dosimetry', 'double',
  'doubt', 'down', 'dr', 'drain', 'drainage', 'drained', 'draw', 'drawn', 'due', 'during', 'dx', 'each', 'early',
  'easily', 'easy', 'echogenic', 'echogenicity', 'edema', 'edematous', 'edge', 'edges', 'effect', 'effects', 'effusion',
  'eight', 'either', 'element', 'elements', 'elevation', 'elevated', 'ellipse', 'else', 'emphysema', 'end', 'ended',
  'ending', 'endogenous', 'endoscopy', 'ends', 'encephalomalacia', 'leukomalacia', 'myelomalacia', 'osteomalacia', 'chondromalacia', 'enlarged', 'enlargement', 'enlarging', 'enough', 'enter', 'entered',
  'entire', 'entirely', 'entry', 'epicondyle', 'equal', 'equally', 'equipment', 'equivalent', 'erosion', 'erosions',
  'error', 'errors', 'essential', 'established', 'estimate', 'estimated', 'etiology', 'eval', 'evaluate', 'evaluated',
  'evaluating', 'evaluation', 'even', 'event', 'eventually', 'ever', 'every', 'everyone', 'everything', 'evidence',
  'evident', 'exact', 'exactly', 'examination', 'examinations', 'examine', 'examined', 'examining', 'exams', 'example',
  'exceed', 'exceeded', 'excellent', 'except', 'excess', 'excessive', 'exclusion', 'exclusively', 'excised', 'excision',
  'exhibit', 'exhibiting', 'exhibits', 'exist', 'existing', 'exists', 'expanded', 'expansile', 'expansion', 'expect',
  'expected', 'expert', 'expiration', 'expired', 'explain', 'explained', 'explanation', 'explore', 'explored', 'exposure',
  'express', 'expressed', 'extend', 'extended', 'extending', 'extends', 'extension', 'extensive', 'extensively', 'extent',
  'external', 'extra', 'extracranial', 'extradural', 'extramedullary', 'extramural', 'extraparenchymal', 'extrapleural',
  'extravasation', 'extremity', 'extrinsic', 'exudate', 'eye', 'eyes', 'fabric', 'face', 'facet', 'facets', 'facial',
  'fact', 'factor', 'factors', 'fail', 'failed', 'failure', 'faint', 'faintly', 'falciform', 'fall', 'fallen',
  'falling', 'false', 'falx', 'familial', 'family', 'far', 'fascia', 'fascial', 'fast', 'fat', 'fatty', 'feature',
  'features', 'feeling', 'feet', 'felt', 'femur', 'femoral', 'few', 'fewer', 'fibrofatty', 'fibroid', 'fibrosis',
  'fibrotic', 'fibula', 'fibular', 'field', 'fields', 'figure', 'figures', 'file', 'filed', 'film', 'films',
  'filter', 'filtration', 'final', 'finally', 'finding', 'findings', 'fine', 'finger', 'fingers', 'first', 'fissure',
  'fistula', 'fit', 'five', 'fixed', 'flair', 'flank', 'flat', 'flattened', 'flattening', 'flexion', 'flocculent',
  'floor', 'flow', 'fluid', 'fluids', 'focal', 'focally', 'focus', 'focused', 'fold', 'folds', 'follow', 'followed',
  'following', 'follows', 'foot', 'for', 'foramen', 'foramina', 'foraminal', 'force', 'forces', 'foreign', 'form',
  'formation', 'formed', 'former', 'formerly', 'forms', 'formula', 'forth', 'forty', 'forward', 'fossa', 'fossae',
  'found', 'four', 'fourth', 'fraction', 'fracture', 'fractured', 'fractures', 'fragment', 'fragmentation', 'fragmented',
  'fragments', 'frame', 'frames', 'free', 'freely', 'frequent', 'frequently', 'fresh', 'friction', 'from', 'front',
  'frontal', 'full', 'fully', 'function', 'functional', 'functioning', 'functions', 'fundus', 'further', 'fused',
  'fusion', 'gain', 'gained', 'gait', 'gallbladder', 'game', 'ganglion', 'gangrene', 'gap', 'gaps', 'gas',
  'gaseous', 'gastric', 'gastrointestinal', 'gave', 'general', 'generally', 'generated', 'generation', 'genetic',
  'genital', 'genitourinary', 'get', 'gets', 'getting', 'girdle', 'gland', 'glands', 'glandular', 'glenoid',
  'glenohumeral', 'gliosis', 'glomus', 'glottis', 'gluteal', 'go', 'goes', 'going', 'gone', 'good', 'got',
  'grade', 'graded', 'grades', 'grading', 'gradual', 'gradually', 'graft', 'grafts', 'grain', 'gram', 'grand',
  'granuloma', 'granulomatous', 'graph', 'graphic', 'graphy', 'grasp', 'grass', 'grating', 'grave', 'gravity',
  'gray', 'great', 'greater', 'greatest', 'greatly', 'grey', 'grid', 'groin', 'groove', 'gross', 'grossly',
  'ground', 'group', 'groups', 'grow', 'growing', 'grown', 'growth', 'guarded', 'guidance', 'guide', 'guided',
  'guideline', 'guidelines', 'guides', 'had', 'hair', 'half', 'hallmark', 'hallux', 'halos', 'hamate', 'hand',
  'hands', 'handle', 'handled', 'hang', 'happen', 'happened', 'happens', 'hard', 'hardly', 'harm', 'has',
  'hat', 'have', 'having', 'hazard', 'he', 'head', 'headed', 'heading', 'heads', 'heal', 'healed', 'healing',
  'health', 'healthcare', 'healthy', 'hear', 'heard', 'hearing', 'heart', 'heat', 'heavy', 'height', 'heights',
  'held', 'hello', 'help', 'helped', 'helpful', 'helping', 'hemangioma', 'hematoma', 'hemivertebra', 'hemisphere',
  'hemispheres', 'hemorrhage', 'hemorrhagic', 'hemothorax', 'hepatic', 'hepatomegaly', 'her', 'here', 'hernia',
  'herniated', 'herniation', 'herniations', 'hers', 'herself', 'hesitation', 'hi', 'hiatal', 'hidden', 'high',
  'higher', 'highest', 'highlighted', 'highly', 'hilar', 'hilum', 'him', 'himself', 'hind', 'hip', 'hips',
  'his', 'histology', 'histological', 'history', 'hit', 'hold', 'holder', 'holding', 'holds', 'hole', 'holes',
  'hollow', 'home', 'homogeneous', 'homogeneously', 'hook', 'hope', 'hoped', 'horizontal', 'horizontally', 'hospital',
  'host', 'hot', 'hour', 'hours', 'house', 'how', 'however', 'hr', 'hrct', 'hu', 'huge', 'human', 'humerus',
  'humeral', 'hundred', 'hyperdense', 'hyperdensity', 'hyperostosis', 'hyperplasia', 'hypertension', 'hypertrophic',
  'hypertrophied', 'hypertrophy', 'hypodense', 'hypodensity', 'hypoplasia', 'hypoplastic', 'hypothesized', 'i',
  'ic', 'idea', 'ideal', 'ideally', 'identical', 'identified', 'identifies', 'identify', 'identifying', 'identity',
  'idiopathic', 'ie', 'if', 'ii', 'iii', 'iliac', 'ilium', 'ill', 'illness', 'illustration', 'image', 'imaged',
  'images', 'imaging', 'immediate', 'immediately', 'impact', 'impacted', 'impaction', 'impairment', 'impedance',
  'imperfection', 'impingement', 'implant', 'implantation', 'implants', 'importance', 'important', 'impose',
  'imposed', 'impossible', 'impression', 'impressions', 'impressed', 'impressive', 'improved', 'improvement',
  'in', 'inability', 'inaccurate', 'inadequate', 'inappropriate', 'inbound', 'incidental', 'incidentally',
  'incision', 'incisional', 'incline', 'inclined', 'include', 'included', 'includes', 'including', 'inclusion',
  'incomplete', 'incompletely', 'inconclusive', 'inconsistent', 'increase', 'increased', 'increases', 'increasing',
  'increments', 'indeed', 'indentation', 'independent', 'independently', 'index', 'indicate', 'indicated', 'indicates',
  'indicating', 'indication', 'indications', 'indicative', 'indicator', 'indirect', 'indirectly', 'individual',
  'individually', 'induce', 'induced', 'induration', 'infarct', 'infarction', 'infarcts', 'infection', 'infections',
  'infectious', 'inferior', 'inferiorly', 'infiltrate', 'infiltrates', 'infiltrating', 'infiltration', 'inflammatory',
  'flow', 'influence', 'influenced', 'infoldings', 'inform', 'information', 'infrapatellar', 'infraspinatus',
  'inguinal', 'initial', 'initially', 'initiated', 'initiation', 'injuries', 'injury', 'injure', 'injured', 'inlet',
  'inner', 'innominate', 'input', 'inserted', 'insertion', 'inside', 'insight', 'insignificant', 'instability',
  'instance', 'instances', 'instant', 'instantly', 'instead', 'institute', 'institution', 'instruction', 'instrument',
  'instrumentation', 'intact', 'intake', 'integer', 'integral', 'integrated', 'integration', 'integrity', 'intensity',
  'intensive', 'intention', 'interaction', 'interarticularis', 'intercondylar', 'intercostal', 'interest', 'interesting',
  'interface', 'interference', 'interhemispheric', 'interior', 'interlobular', 'intermediate', 'intermittent', 'internal',
  'internally', 'international', 'interparietal', 'interpedicular', 'interphalangeal', 'interpretation', 'interpreted',
  'interpreter', 'intersegmental', 'interspinal', 'interstices', 'interstitial', 'interstitium', 'interval',
  'interventional', 'intervertebral', 'intestinal', 'intestine', 'intestines', 'intima', 'intimal', 'into',
  'intracranial', 'intradural', 'intramedullary', 'intramural', 'intramuscular', 'intraparenchymal', 'intraperitoneal',
  'intrathecal', 'intrathoracic', 'intravascular', 'intravenous', 'intratumoral', 'intrinsic', 'introduced',
  'introduction', 'invaded', 'invading', 'invasion', 'invasive', 'investigated', 'investigation', 'investigations',
  'involve', 'involved', 'involvement', 'involves', 'involving', 'ipsilateral', 'irradiate', 'irradiated', 'irradiation',
  'irregular', 'irregularity', 'irregularly', 'irreversible', 'irrigation', 'is', 'ischial', 'ischium', 'island',
  'isolated', 'isolation', 'issue', 'issued', 'issues', 'it', 'item', 'items', 'its', 'itself', 'iv', 'jackets',
  'jaw', 'jejunum', 'joint', 'joints', 'jovial', 'jugular', 'junction', 'junctional', 'just', 'juxtaarticular',
  'keep', 'keeping', 'keeps', 'kellgren', 'key', 'kidney', 'kidneys', 'kill', 'killed', 'kind', 'kinds', 'knee',
  'knees', 'knew', 'knob', 'knot', 'know', 'known', 'knows', 'kyphosis', 'lab', 'label', 'labeled', 'labral',
  'labrum', 'lacks', 'lacrimal', 'laminar', 'lamina', 'laminate', 'landmark', 'landmarks', 'laparoscopy', 'laparotomy',
  'large', 'largely', 'larger', 'largest', 'larynx', 'last', 'late', 'lately', 'later', 'lateral', 'laterally',
  'latter', 'law', 'lawrence', 'laxity', 'layer', 'layers', 'lead', 'leading', 'leads', 'leak', 'leakage', 'leaking',
  'lean', 'least', 'left', 'leg', 'legs', 'length', 'lengthening', 'lengthens', 'lens', 'lesion', 'lesions', 'less',
  'lesser', 'let', 'letter', 'letters', 'level', 'levels', 'lever', 'ligament', 'ligamentous', 'ligaments',
  'ligamentum', 'light', 'lightly', 'like', 'likely', 'limb', 'limbs', 'limit', 'limitation', 'limitations',
  'limited', 'limiting', 'limits', 'line', 'lineage', 'linear', 'linearly', 'lines', 'lining', 'link', 'linked',
  'lip', 'lipoma', 'list', 'listed', 'listen', 'lithiasis', 'little', 'live', 'liver', 'living', 'load', 'loading',
  'lobe', 'lobes', 'lobular', 'lobulated', 'lobule', 'local', 'localization', 'localized', 'located', 'location',
  'locations', 'lock', 'locked', 'locking', 'lodged', 'long', 'longer', 'longest', 'longitudinal', 'longitudinally',
  'look', 'looked', 'looking', 'looks', 'loop', 'loops', 'loose', 'looseness', 'loosening', 'lordosis', 'lordotic',
  'loss', 'lost', 'lot', 'lots', 'low', 'lower', 'lowest', 'lucency', 'lucent', 'lumbar', 'lumbosacral', 'lumen',
  'luminal', 'lump', 'lunar', 'lunate', 'lung', 'lungs', 'lymph', 'lymphadenopathy', 'lymphatic', 'lymphoid',
  'lymphoma', 'lytic', 'ma', 'machine', 'macroadenoma', 'macroscopic', 'made', 'magnetic', 'magnification',
  'magnifier', 'magnitude', 'main', 'maintained', 'maintaining', 'maintains', 'maintenance', 'major', 'majority',
  'make', 'makes', 'making', 'male', 'malignant', 'malignancy', 'malleolus', 'malleolar', 'mammary', 'mammogram',
  'mammography', 'mammographic', 'manage', 'managed', 'management', 'mandible', 'mandibular', 'manner', 'many',
  'map', 'mapped', 'mapping', 'margin', 'marginal', 'margins', 'mark', 'marked', 'markedly', 'marker', 'markers',
  'market', 'marking', 'markings', 'marks', 'marrow', 'mass', 'masses', 'massive', 'massively', 'mastoid',
  'matched', 'matching', 'material', 'materials', 'matrix', 'matter', 'mature', 'maturity', 'maxilla', 'maxillary',
  'maximal', 'maximally', 'maximum', 'may', 'maybe', 'me', 'mean', 'meaning', 'means', 'meant', 'measure',
  'measured', 'measurement', 'measurements', 'measures', 'measuring', 'meatus', 'mechanical', 'medial', 'medially',
  'median', 'mediastinal', 'mediastinum', 'medical', 'medication', 'medications', 'medium', 'medulla', 'medullary',
  'meet', 'meeting', 'meets', 'membranous', 'membrane', 'membranes', 'meniscal', 'meniscus', 'mental', 'mention',
  'mentioned', 'mesenteric', 'mesentery', 'metacarpal', 'metacarpophalangeal', 'metally', 'metal', 'metallic',
  'metaphyseal', 'metaphysis', 'metastasis', 'metastases', 'metastatic', 'metatarsal', 'metatarsophalangeal',
  'method', 'methods', 'microadenoma', 'microcalcification', 'microscopic', 'mid', 'midbrain', 'middle', 'midline',
  'midshaft', 'might', 'mild', 'mildly', 'milieu', 'military', 'mind', 'minimal', 'minimally', 'minimum', 'minor',
  'minute', 'minutes', 'mirror', 'missed', 'missing', 'mixed', 'ml', 'mm', 'mobile', 'mobility', 'mode', 'model',
  'moderate', 'moderately', 'modern', 'modification', 'modified', 'modify', 'modulate', 'modulated', 'modality',
  'modic', 'moisture', 'molar', 'moment', 'monitoring', 'month', 'months', 'more', 'moreover', 'morning',
  'morphology', 'morphological', 'most', 'mostly', 'motion', 'motor', 'mount', 'mounted', 'mouth', 'move',
  'moved', 'movement', 'movements', 'moves', 'moving', 'mri', 'mr', 'mucosa', 'mucosal', 'mucous', 'mucus',
  'multi', 'multicystic', 'multifocal', 'multilocular', 'multimodality', 'multiple', 'multisliced', 'mural',
  'muscle', 'muscles', 'muscular', 'musculature', 'musculoskeletal', 'must', 'my', 'myocardial', 'myocardium',
  'myeloid', 'myeloma', 'myopathy', 'myositis', 'myself', 'name', 'named', 'names', 'narrow', 'narrowed',
  'narrowing', 'narrows', 'nasal', 'nasopharynx', 'native', 'natural', 'naturally', 'nature', 'nausea', 'navicular',
  'near', 'nearby', 'nearer', 'nearest', 'nearly', 'neck', 'necks', 'necrosis', 'necrotic', 'need', 'needed',
  'needle', 'needles', 'needs', 'negative', 'negatively', 'neither', 'neoplasm', 'neoplastic', 'nerve', 'nerves',
  'nervous', 'net', 'network', 'neural', 'neuralgia', 'neuroforamen', 'neuroforaminal', 'neurological', 'neuroma',
  'neurovascular', 'neutral', 'never', 'new', 'newly', 'next', 'nick', 'night', 'nine', 'no', 'noble', 'nodal',
  'node', 'nodes', 'nodular', 'nodule', 'nodules', 'noise', 'nominal', 'non', 'nondisplaced', 'none', 'nonfocal',
  'noninvasive', 'nonmassive', 'nonpathological', 'nonradiating', 'nonspecific', 'nonthermal', 'nontender',
  'nontortuous', 'nor', 'normal', 'normality', 'normally', 'nose', 'not', 'notable', 'notably', 'notch', 'notched',
  'notches', 'note', 'noted', 'notes', 'nothing', 'notice', 'noticeable', 'noticed', 'noting', 'nuance', 'nuchal',
  'nuclear', 'nucleus', 'null', 'number', 'numbers', 'numerous', 'numbness', 'nurse', 'nut', 'nutrition',
  'obey', 'object', 'objective', 'objectives', 'objects', 'oblique', 'obliquely', 'obliterated', 'obliteration',
  'observation', 'observations', 'observe', 'observed', 'observing', 'obstacle', 'obstruct', 'obstructed',
  'obstruction', 'obstructive', 'obstructs', 'obtained', 'obtaining', 'obtains', 'obturator', 'obvious', 'obviously',
  'occipital', 'occlusion', 'occlusive', 'occult', 'occupying', 'occur', 'occurred', 'occurrence', 'occurring',
  'occurs', 'ocular', 'odd', 'of', 'off', 'offset', 'often', 'old', 'older', 'oldest', 'olecranon', 'omental',
  'omentum', 'on', 'once', 'one', 'ones', 'ongoing', 'only', 'onset', 'onto', 'opacity', 'opacification', 'opaque',
  'open', 'opened', 'opening', 'openly', 'opens', 'operate', 'operated', 'operating', 'operation', 'operative',
  'opinion', 'opinions', 'opposite', 'optic', 'optimal', 'optimally', 'option', 'options', 'or', 'oral',
  'orbit', 'orbital', 'orbits', 'organ', 'organic', 'organism', 'organizations', 'organs', 'orientation', 'oriented',
  'origin', 'original', 'originally', 'originate', 'originated', 'originating', 'originates', 'orthopedic', 'osseous',
  'ossification', 'ossified', 'osteoarthritis', 'osteoarthritic', 'osteoblastoma', 'osteochondral', 'osteochondritis',
  'osteochondroma', 'osteogenesis', 'osteoid', 'osteoma', 'osteomyelitis', 'osteopenia', 'osteopenic', 'osteophyte',
  'osteophytes', 'osteophytic', 'osteoporosis', 'osteoporotic', 'osteosarcoma', 'osteotomy', 'other', 'others',
  'otherwise', 'our', 'ours', 'ourselves', 'out', 'outcome', 'outcomes', 'outer', 'outline', 'outlined', 'outlines',
  'outlet', 'outlining', 'output', 'outset', 'outside', 'outstanding', 'oval', 'ovary', 'ovarian', 'over', 'overall',
  'overlying', 'overnight', 'overt', 'overuse', 'overwhelming', 'own', 'pack', 'package', 'packed', 'packet', 'pacs',
  'pad', 'page', 'paid', 'pain', 'painful', 'pains', 'pair', 'palate', 'palm', 'palmar', 'palpable', 'palpated',
  'pancreas', 'pancreatic', 'pancreatitis', 'panel', 'paper', 'para', 'paraspinal', 'parenchyma', 'parenchymal',
  'pararespiratory', 'parietal', 'park', 'part', 'partial', 'partially', 'particle', 'particles', 'particular',
  'particularly', 'parties', 'partly', 'parts', 'party', 'passage', 'passages', 'passed', 'passes', 'passing',
  'past', 'patella', 'patellar', 'patellofemoral', 'path', 'pathway', 'pathways', 'pathology', 'pathologic',
  'pathological', 'pathognomonic', 'patient', 'patients', 'pattern', 'patterns', 'pa', 'pbh', 'peak', 'pediatric',
  'pedicle', 'pedicles', 'pedicular', 'peduncle', 'pelvic', 'pelvis', 'penetrate', 'penetration', 'penile', 'penis',
  'per', 'percent', 'percentage', 'perceptable', 'percutaneous', 'pericardium', 'pericardial', 'perineural', 'perineum',
  'period', 'periodic', 'periodically', 'perioditis', 'periods', 'periosteal', 'periosteum', 'peritoneal', 'peritoneum',
  'perivascular', 'perivertebral', 'permanent', 'permanently', 'permissible', 'peroneal', 'perpendicular', 'perpetual',
  'persistent', 'persistently', 'persists', 'person', 'personal', 'personality', 'personnel', 'perspective', 'petechiae',
  'petrous', 'pg', 'phalanx', 'phalanges', 'pharyngeal', 'pharynx', 'phase', 'phases', 'phenomenon', 'phlebolith',
  'phleboliths', 'phrenic', 'physical', 'physically', 'physician', 'physicians', 'physiological', 'physiologically',
  'physique', 'pick', 'picture', 'piece', 'pieces', 'pigtail', 'pillar', 'pillow', 'pin', 'ping', 'pink', 'pinned',
  'pinning', 'pins', 'pip', 'pipe', 'piriform', 'pisiform', 'pit', 'pitfall', 'pituitary', 'place', 'placed',
  'placement', 'places', 'placing', 'plain', 'plan', 'plane', 'planes', 'planning', 'plans', 'plantar', 'plaque',
  'plasma', 'plastic', 'plate', 'plateau', 'platelet', 'plates', 'platform', 'plausible', 'play', 'pleura',
  'pleural', 'plexus', 'plica', 'pliable', 'plug', 'plugs', 'plus', 'pneumatic', 'pneumonia', 'pneumoperitoneum',
  'pneumothorax', 'pocket', 'point', 'pointed', 'pointing', 'points', 'poison', 'polar', 'pole', 'poles', 'policy',
  'pool', 'popliteal', 'portion', 'portions', 'position', 'positioned', 'positioning', 'positions', 'positive',
  'positively', 'possibility', 'possible', 'possibly', 'posterior', 'posteriorly', 'posterolateral', 'posteromedial',
  'posteroinferior', 'posterosuperior', 'post-op', 'postoperative', 'postoperatively', 'postprandial', 'potassium',
  'potential', 'potentially', 'pouch', 'pound', 'powder', 'power', 'practical', 'practically', 'practice',
  'precautions', 'preceding', 'precise', 'precisely', 'pre-op', 'preoperative', 'presence', 'present', 'presentation',
  'presented', 'presenting', 'presently', 'presents', 'preservation', 'preserved', 'preserving', 'pressure', 'pressures',
  'presumably', 'presumed', 'presumption', 'prevent', 'prevented', 'prevention', 'prevents', 'previous', 'previously',
  'primary', 'primarily', 'primitive', 'principal', 'principle', 'print', 'prior', 'priority', 'privacy', 'private',
  'probability', 'probable', 'probably', 'probe', 'probes', 'procedure', 'procedures', 'proceed', 'proceeding',
  'process', 'processed', 'processes', 'processing', 'produce', 'produced', 'produces', 'producing', 'product',
  'production', 'products', 'profound', 'prognosis', 'program', 'progress', 'progression', 'progressive', 'progressively',
  'project', 'projected', 'projection', 'projections', 'projects', 'prolonged', 'prominence', 'prominent', 'prominently',
  'proof', 'proper', 'properly', 'properties', 'property', 'proportional', 'proportionate', 'proposal', 'proposed',
  'prostate', 'prostatic', 'prosthesis', 'prosthetic', 'protect', 'protected', 'protection', 'protective', 'protein',
  'protocol', 'protocols', 'protrude', 'protruding', 'protrusion', 'prove', 'proved', 'proven', 'provide', 'provided',
  'provider', 'provides', 'providing', 'province', 'provisional', 'proximal', 'proximally', 'pseudoarthrosis',
  'pseudocyst', 'psoriasis', 'psoas', 'psychiatric', 'pubic', 'pubis', 'public', 'published', 'pulmonary', 'pulmonic',
  'pulse', 'pump', 'punch', 'punctate', 'punctured', 'puncture', 'pupil', 'purchase', 'pure', 'purely', 'purpose',
  'pursue', 'pus', 'push', 'pushed', 'put', 'puts', 'putting', 'p-value', 'pylon', 'pyelonephritis', 'pyloric',
  'pyogenic', 'quadrant', 'quadrants', 'quadriceps', 'quality', 'quantification', 'quantified', 'quantitative',
  'quantity', 'quantum', 'quarter', 'question', 'questionable', 'questionably', 'questions', 'quick', 'quickly',
  'quiet', 'quite', 'quote', 'radial', 'radially', 'radiation', 'radicular', 'radiculopathy', 'radiogram', 'radiograph',
  'radiographic', 'radiographical', 'radiographically', 'radiographs', 'radiography', 'radiological', 'radiologically',
  'radiology', 'radiologist', 'radiopaqual', 'radio-opaque', 'radiopaque', 'radius', 'radix', 'raise', 'raised',
  'ramus', 'rami', 'range', 'ranging', 'rank', 'rapid', 'rapidly', 'rare', 'rarely', 'rate', 'rates', 'rating',
  'ratio', 'ratios', 'raw', 'ray', 'rays', 'reach', 'reached', 'reaching', 'reaction', 'reactive', 'read', 'reading',
  'readily', 'ready', 'real', 'realignment', 'reality', 'realize', 'really', 'reason', 'reasonable', 'reasonably',
  'reasons', 'reevaluation', 'reassurance', 'recall', 'recap', 'received', 'receiver', 'receiving', 'recent',
  'recently', 'recess', 'recesses', 'recipient', 'recognized', 'recommend', 'recommendation', 'recommendations',
  'recommended', 'reconstruction', 'reconstructed', 'record', 'recorded', 'records', 'recovery', 'rectal', 'rectus',
  'rectum', 'recurrent', 'recurring', 'red', 'redistribution', 'reduce', 'reduced', 'reduces', 'reducing', 'reduction',
  'redundant', 'refer', 'reference', 'referenced', 'referral', 'referred', 'referring', 'refers', 'refill', 'reflect',
  'reflected', 'reflecting', 'reflection', 'reflects', 'reflex', 'reflexes', 'refractory', 'regard', 'regarded',
  'regarding', 'regardless', 'region', 'regional', 'regionally', 'regions', 'register', 'registered', 'regression',
  'regressive', 'regular', 'regularly', 'regulation', 'rehabilitation', 'reimbursement', 'reinforcement', 'reinfection',
  'relapse', 'related', 'relation', 'relationship', 'relative', 'relatively', 'relatives', 'relax', 'relaxation',
  'relaxed', 'relate', 'release', 'released', 'relevant', 'reliability', 'reliable', 'reliably', 'relief', 'relieve',
  'relieved', 'remain', 'remainder', 'remained', 'remaining', 'remains', 'remark', 'remarkable', 'remarkably',
  'remarks', 'remedy', 'remember', 'remission', 'remittance', 'remnant', 'remnants', 'removal', 'remove', 'removed',
  'renal', 'rendered', 'renovated', 'repair', 'repaired', 'repeat', 'repeated', 'repeatedly', 'replace', 'replaced',
  'replacement', 'replacing', 'report', 'reported', 'reporter', 'reporting', 'reports', 'reposition', 'repositioned',
  'represent', 'representation', 'representative', 'represented', 'representing', 'represents', 'reproduce',
  'reproducible', 'request', 'requested', 'require', 'required', 'requirement', 'requirements', 'requires', 'requiring',
  'resected', 'resection', 'resembling', 'reservoir', 'resident', 'residual', 'resolution', 'resolved', 'resolving',
  'resonant', 'resort', 'resource', 'respect', 'respective', 'respectively', 'respiration', 'respiratory', 'response',
  'responsiveness', 'rest', 'resting', 'restoration', 'restored', 'restraint', 'restricted', 'restriction', 'restrictive',
  'result', 'resulted', 'resulting', 'results', 'resume', 'resumed', 'retained', 'retention', 'reticular', 'reticulation',
  'retina', 'retinal', 'retraction', 'retracted', 'retricular', 'retrocardiac', 'retrograde', 'retrolisthesis',
  'retroperitoneal', 'retroperitoneum', 'retropharyngeal', 'retrospect', 'retrospective', 'retrospectively', 'retrosternal',
  'return', 'returned', 'revealed', 'revealing', 'reveals', 'reversal', 'reversed', 'reversible', 'review', 'reviewed',
  'reviewing', 'reviews', 'revise', 'revised', 'revision', 'rheumatoid', 'rhinitis', 'rhizotomy', 'rib', 'ribs',
  'ridge', 'right', 'rigid', 'rigidity', 'ring', 'rings', 'risk', 'risks', 'rise', 'risen', 'river', 'road',
  'robust', 'rod', 'rods', 'role', 'room', 'root', 'roots', 'rotated', 'rotation', 'rotational', 'rotator',
  'rough', 'roughly', 'round', 'rounded', 'route', 'routine', 'routinely', 'row', 'rows', 'rule', 'ruled',
  'rules', 'ruling', 'run', 'running', 'rupture', 'ruptured', 'sac', 'saccular', 'sacral', 'sacroiliac', 'sacrum',
  'saddle', 'safety', 'sagittal', 'said', 'sake', 'same', 'sample', 'samples', 'sampling', 'saw', 'say', 'saying',
  'says', 'scan', 'scanned', 'scanner', 'scanning', 'scans', 'scapula', 'scapular', 'scar', 'scaring', 'scars',
  'scatter', 'scattered', 'schema', 'scheme', 'schmorl', 'sciatic', 'sciatica', 'scintigraphy', 'sclera', 'scleral',
  'sclerosis', 'sclerotic', 'scoliosis', 'scope', 'screen', 'screening', 'screw', 'screws', 'scrotal', 'scrotum',
  'seat', 'seated', 'second', 'secondary', 'secondly', 'seconds', 'secretion', 'secretions', 'section', 'sectional',
  'sections', 'sector', 'secure', 'secured', 'see', 'seeing', 'seek', 'seen', 'sees', 'segment', 'segmental',
  'segmentation', 'segmented', 'segments', 'seizure', 'seizures', 'select', 'selected', 'selecting', 'selection',
  'selective', 'selectively', 'self', 'sella', 'sellar', 'semi', 'semilunar', 'seminoma', 'send', 'sending', 'sensation',
  'sense', 'sensitive', 'sensitivity', 'sensory', 'sent', 'separate', 'separated', 'separately', 'separation',
  'septa', 'septal', 'septate', 'septum', 'sequence', 'sequences', 'sequential', 'serial', 'serially', 'series',
  'serious', 'seriously', 'serous', 'serum', 'server', 'service', 'session', 'set', 'sets', 'setting', 'settled',
  'seven', 'seventh', 'several', 'severe', 'severely', 'severity', 'sew', 'sex', 'shading', 'shadow', 'shadowing',
  'shadows', 'shaft', 'shafts', 'shake', 'shaken', 'shall', 'shape', 'shaped', 'shapes', 'share', 'shared', 'sharp',
  'sharply', 'she', 'sheath', 'sheaths', 'sheet', 'sheets', 'shelf', 'shell', 'shift', 'shifted', 'shifting',
  'shifts', 'shin', 'short', 'shortened', 'shortening', 'shortly', 'shot', 'shoulder', 'shoulders', 'show', 'showed',
  'showing', 'shown', 'shows', 'shrinkage', 'shunt', 'shunts', 'shunted', 'sick', 'side', 'sided', 'sides', 'sight',
  'sign', 'signal', 'signals', 'signature', 'significance', 'significant', 'significantly', 'signed', 'significant',
  'signing', 'signs', 'silhouette', 'silhouettes', 'similar', 'similarly', 'simple', 'simply', 'simulate', 'simulated',
  'simulation', 'simultaneous', 'simultaneously', 'since', 'single', 'singles', 'sinoatrial', 'sinus', 'sinuses',
  'sinusoid', 'site', 'sites', 'situation', 'six', 'sixth', 'size', 'sized', 'sizes', 'skeletal', 'skeleton',
  'skin', 'skull', 'slant', 'slice', 'slices', 'slide', 'slight', 'slightest', 'slightly', 'slip', 'slipped',
  'slippage', 'slit', 'slope', 'sloping', 'slow', 'slower', 'slowly', 'small', 'smaller', 'smallest', 'smooth',
  'smoothed', 'smoothly', 'smoothness', 'so', 'soft', 'softs', 'software', 'softly', 'solid', 'solidification',
  'solitary', 'solution', 'some', 'somebody', 'somehow', 'someone', 'something', 'sometime', 'sometimes', 'somewhat',
  'somewhere', 'sonographic', 'sonographically', 'sonography', 'soon', 'sore', 'sort', 'sorted', 'source', 'sources',
  'space', 'spaced', 'spaces', 'spacing', 'spared', 'sparing', 'spasm', 'spastic', 'spatial', 'spatially', 'special',
  'specialist', 'specialized', 'species', 'specific', 'specifically', 'specified', 'specimen', 'spectoscopy',
  'speed', 'sphenoid', 'sphenoidal', 'sphere', 'spherical', 'sphincter', 'spicata', 'spike', 'spikes', 'spinal',
  'spindle', 'spine', 'spines', 'spinous', 'spiral', 'spleen', 'splenic', 'splint', 'splinted', 'split', 'splitting',
  'spondylitis', 'spondylodiscitis', 'spondylolisthesis', 'spondylolysis', 'spondylosis', 'spondylotic', 'spongy',
  'spontaneous', 'spontaneously', 'spot', 'spots', 'spotted', 'spotty', 'sprain', 'sprained', 'spread', 'spreading',
  'spring', 'spur', 'spurs', 'spurred', 'spurring', 'sputum', 'square', 'squared', 'stability', 'stable', 'stably',
  'staff', 'stage', 'staged', 'stages', 'staging', 'stain', 'stained', 'staining', 'stair', 'stalk', 'stamp',
  'stand', 'standard', 'standardized', 'standards', 'standing', 'stands', 'star', 'stature', 'start', 'started',
  'starting', 'starts', 'stasis', 'state', 'stated', 'statement', 'states', 'stating', 'station', 'stationery',
  'statistical', 'stature', 'status', 'stay', 'stayed', 'staying', 'steady', 'steadily', 'stenosis', 'stenotic',
  'stent', 'stented', 'stents', 'step', 'steps', 'sternal', 'sternoclavicular', 'sternum', 'steroid', 'stethescope',
  'stiffness', 'still', 'stimulate', 'stimulated', 'stimulation', 'stimulus', 'stitch', 'stitches', 'stomach',
  'stone', 'stones', 'stool', 'stop', 'stopped', 'stopping', 'storage', 'store', 'stored', 'stories', 'story',
  'straight', 'straightened', 'straightening', 'strain', 'strained', 'strait', 'strand', 'stranding',
  'strands', 'strap', 'stratification', 'stratified', 'streak', 'streaking', 'streaks', 'strength', 'stress',
  'stressed', 'stretcher', 'stretching', 'strict', 'strictly', 'stricture', 'strictures', 'stride', 'strip',
  'stripe', 'stripes', 'stroke', 'strokes', 'strong', 'strongly', 'structural', 'structurally', 'structure',
  'structured', 'structures', 'stuck', 'studies', 'study', 'studying', 'stuff', 'stump', 'subacute', 'subarachnoid',
  'subcapital', 'subclavian', 'subchondral', 'subcortical', 'subcutaneous', 'subdural', 'subfalcine', 'subglenoid',
  'subject', 'subjective', 'subjects', 'subglenoid', 'subhepatic', 'subjacent', 'subjunction', 'sublateral',
  'sublobar', 'subluxated', 'subluxation', 'subluxations', 'submandibular', 'submental', 'submucosal', 'subphrenic',
  'subpleural', 'subscapularis', 'subseptal', 'substernal', 'subtle', 'subtly', 'subtrochanteric', 'subtyping',
  'successful', 'successfully', 'such', 'suction', 'sudden', 'suddenly', 'suffered', 'suffering', 'sufficient',
  'sufficiently', 'sugar', 'suggest', 'suggested', 'suggesting', 'suggestion', 'suggestions', 'suggestive',
  'suggests', 'suitability', 'suitable', 'suite', 'sulcus', 'sulci', 'sum', 'summarized', 'summary', 'superior',
  'superiorly', 'superoinferior', 'superolateral', 'superomedial', 'supine', 'supplemental', 'supplementary',
  'supplied', 'supplies', 'supply', 'support', 'supported', 'suppose', 'supposed', 'suppression', 'suppurative',
  'supra-acetabular', 'supracondylar', 'supradiaphragmatic', 'suprapatellar', 'supraglenoid', 'suprapubic', 'supraspinatus',
  'supratentorial', 'sure', 'surely', 'surface', 'surfaces', 'surgeon', 'surgeons', 'surgery', 'surgical',
  'surgically', 'surrounding', 'surrounds', 'surveillance', 'survey', 'suspect', 'suspected', 'suspecting',
  'suspicion', 'suspicious', 'sustained', 'sustentaculum', 'suture', 'sutures', 'swab', 'swallow', 'swallowing',
  'sweat', 'swelling', 'swollen', 'symmetric', 'symmetrical', 'symmetrically', 'symmetry', 'sympathetic',
  'symptom', 'symptomatic', 'symptomatically', 'symptoms', 'synchondrosis', 'syndesmosis', 'syndesmophyte',
  'syndrome', 'synechiae', 'synovial', 'synovium', 'synovitis', 'system', 'systemic', 'systematically', 'systems',
  'systolic', 'table', 'tables', 'tachycardia', 'tactile', 'tail', 'take', 'taken', 'takes', 'taking', 'talus',
  'talar', 'talocalcaneal', 'talonavicular', 'target', 'targeted', 'tarsal', 'tarsus', 'taste', 'task', 'teach',
  'team', 'tear', 'tearing', 'tears', 'technique', 'techniques', 'technologist', 'technology', 'teeth', 'tell',
  'telling', 'temperature', 'temporal', 'temporarily', 'temporary', 'temporomandibular', 'tendon', 'tendons',
  'tendinous', 'tendinitis', 'tendinopathy', 'tendinosis', 'tenosynovitis', 'tenderness', 'ten', 'tenth', 'tentorial',
  'tentorium', 'term', 'terminal', 'terminate', 'terminated', 'termination', 'terms', 'tertiary', 'test', 'tested',
  'testing', 'tests', 'text', 'than', 'thank', 'that', 'the', 'thecal', 'their', 'them', 'themselves', 'then',
  'theory', 'therapeutic', 'therapy', 'there', 'thereafter', 'thereby', 'therefore', 'thereof', 'these', 'they',
  'thick', 'thickened', 'thickening', 'thicker', 'thickness', 'thigh', 'thighs', 'thin', 'thing', 'things',
  'thinning', 'thins', 'third', 'thirds', 'thirty', 'this', 'thoracic', 'thoracolumbar', 'thorax', 'thorough',
  'thoroughly', 'those', 'though', 'thought', 'thousand', 'three', 'threshold', 'throat', 'thrombosis', 'thrombus',
  'through', 'throughout', 'thumb', 'thus', 'tibia', 'tibial', 'tibiotalar', 'time', 'timed', 'timer', 'times',
  'timing', 'tip', 'tips', 'tissue', 'tissues', 'to', 'today', 'together', 'told', 'tolerance', 'tolerated',
  'tomography', 'tone', 'tongue', 'too', 'took', 'tooth', 'top', 'topic', 'topical', 'topographical', 'topography',
  'tops', 'torn', 'torsion', 'tortuous', 'tortuosity', 'total', 'totally', 'touch', 'touched', 'toward', 'towards',
  'toxic', 'toxicity', 'trabecula', 'trabeculae', 'trabecular', 'trabeculation', 'trace', 'traced', 'traces',
  'trachea', 'tracheal', 'tracheostomy', 'tract', 'traction', 'tracts', 'traffic', 'trait', 'transected',
  'transection', 'transverse', 'transversely', 'trapezoid', 'trapezium', 'trauma', 'traumatic', 'treadmill',
  'treat', 'treated', 'treating', 'treatment', 'treatments', 'tree', 'tremor', 'trend', 'trends', 'triangle',
  'triangular', 'triceps', 'tricuspid', 'trigeminal', 'trigger', 'triggered', 'triquetrum', 'trochanter', 'trochanteric',
  'trochlea', 'trochlear', 'trouble', 'true', 'truly', 'truncal', 'truncation', 'trunk', 'trust', 'truth', 'try',
  'trying', 'tube', 'tubercle', 'tuberculous', 'tuberculosis', 'tuberosity', 'tubes', 'tubular', 'tubule', 'tubules',
  'tumor', 'tumors', 'tumour', 'tumours', 'tunnel', 'turbinate', 'turn', 'turned', 'turning', 'turns', 'twelve',
  'twenty', 'twice', 'two', 'type', 'typed', 'types', 'typical', 'typically', 'typing', 'ulcer', 'ulceration',
  'ulcerative', 'ulna', 'ulnar', 'ultimate', 'ultimately', 'ultrasound', 'ultrasonographic', 'ultrasonography',
  'umbilical', 'umbilicus', 'unable', 'unaffected', 'unaltered', 'unambiguous', 'unchanged', 'unclear', 'uncommon',
  'uncomplicated', 'unconscious', 'under', 'undergo', 'undergoing', 'undergone', 'underground', 'underlying',
  'undermined', 'underside', 'understand', 'understanding', 'understood', 'undertaken', 'undisplaced', 'undue',
  'unequivocal', 'uneventful', 'uneventfully', 'unexpected', 'unfavorable', 'unfused', 'ungual', 'unilateral',
  'unilaterally', 'unilocular', 'unit', 'units', 'universal', 'universe', 'unlikely', 'unmatched', 'unmodified',
  'unmarked', 'unmistakable', 'unnecessary', 'unobstructed', 'unobstructive', 'unopposed', 'unremarkable',
  'unremarkably', 'unrestricted', 'unsatisfactory', 'unseen', 'unstable', 'unsuccessful', 'unsupported', 'until',
  'unusual', 'unusually', 'unwanted', 'up', 'upon', 'upper', 'upward', 'upwards', 'upright', 'urgency', 'urgent',
  'urgently', 'urinary', 'urine', 'urogram', 'urography', 'urolithiasis', 'usable', 'usage', 'use', 'used',
  'useful', 'user', 'users', 'uses', 'using', 'usual', 'usually', 'uterus', 'uterine', 'utility', 'utilization',
  'utilized', 'utmost', 'vacuum', 'vague', 'vaguely', 'valid', 'validated', 'validation', 'validity', 'valgus',
  'valley', 'value', 'valued', 'values', 'valve', 'valves', 'valvular', 'varus', 'vascular', 'vascularity',
  'vasculature', 'vasodilation', 'vein', 'veins', 'vena', 'venous', 'ventral', 'ventricle', 'ventricles',
  'ventricular', 'ventriculomegaly', 'vermiform', 'vermis', 'vertebra', 'vertebrae', 'vertebral', 'vertex',
  'vertical', 'vertically', 'vertigo', 'very', 'vessel', 'vessels', 'via', 'vial', 'viable', 'viability', 'vibration',
  'view', 'viewed', 'viewing', 'viewpoint', 'views', 'vigorous', 'viral', 'virtual', 'virtually', 'viscera',
  'visceral', 'visible', 'visibly', 'vision', 'visit', 'visits', 'visual', 'visualization', 'visualized', 'vital',
  'vitamin', 'vocal', 'void', 'voiding', 'volar', 'vol volume', 'volumes', 'volumetric', 'voluntary', 'volvulus',
  'vomer', 'vomiting', 'vessel', 'wall', 'walls', 'want', 'wanted', 'wants', 'wash', 'washed', 'washing', 'was',
  'waste', 'wasted', 'water', 'wave', 'waves', 'wavy', 'way', 'ways', 'we', 'weak', 'weakness', 'wear', 'wearing',
  'wedge', 'wedging', 'week', 'weeks', 'weigh', 'weighed', 'weight', 'weightbearing', 'weights', 'well', 'went',
  'were', 'west', 'what', 'whatever', 'when', 'whenever', 'where', 'whereas', 'whereby', 'wherein', 'whereupon',
  'wherever', 'whether', 'which', 'while', 'whilst', 'white', 'whole', 'whom', 'whose', 'why', 'wide', 'widely',
  'wider', 'widespread', 'widening', 'width', 'widths', 'wife', 'will', 'window', 'windows', 'wing', 'wings',
  'wise', 'wish', 'wished', 'wishes', 'with', 'within', 'without', 'woman', 'women', 'word', 'words', 'work',
  'worked', 'worker', 'working', 'workup', 'workspace', 'workstation', 'world', 'worse', 'worsened', 'worsening',
  'worst', 'worth', 'would', 'wound', 'wounds', 'wrist', 'wrists', 'write', 'writing', 'written', 'wrong', 'wrote',
  'x-ray', 'xray', 'xrays', 'yard', 'year', 'years', 'yellow', 'yes', 'yet', 'yield', 'yielded', 'yields', 'you',
  'young', 'younger', 'youngest', 'your', 'yours', 'yourself', 'yourselves', 'zero', 'zone', 'zones', 'zygoma', 'zygomatic'
]);

export function isWordMisspelled(word: string): boolean {
  if (!word || word.length <= 1 || !isNaN(Number(word))) return false;
  
  // Ignore numbers, medical codes (L1-L5, T12, C1), ratios (II/III), units (mm, cm, kVp, mA, ms), single characters
  if (/^[A-Z0-9\-\.\/\(\)]+$/i.test(word) && (word.length <= 3 || /\d/.test(word))) return false;

  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean || clean.length <= 1) return false;

  // 1. Exact match in standard/medical dictionary
  if (RADIOLOGY_DICTIONARY.has(clean)) return false;

  // 2. Common English/Medical inflections (-s, -es, -ed, -ing, -ly, -ic, -al, -ment, -ative, -ive, -ant, -ent, -y, -ar, -tion)
  if (clean.endsWith('s') && RADIOLOGY_DICTIONARY.has(clean.slice(0, -1))) return false;
  if (clean.endsWith('es') && RADIOLOGY_DICTIONARY.has(clean.slice(0, -2))) return false;
  if (clean.endsWith('ed') && (RADIOLOGY_DICTIONARY.has(clean.slice(0, -2)) || RADIOLOGY_DICTIONARY.has(clean.slice(0, -1)))) return false;
  if (clean.endsWith('ing') && (RADIOLOGY_DICTIONARY.has(clean.slice(0, -3)) || RADIOLOGY_DICTIONARY.has(clean.slice(0, -3) + 'e'))) return false;
  if (clean.endsWith('ly') && RADIOLOGY_DICTIONARY.has(clean.slice(0, -2))) return false;
  if (clean.endsWith('ment') && RADIOLOGY_DICTIONARY.has(clean.slice(0, -4))) return false;
  if (clean.endsWith('ative') && (RADIOLOGY_DICTIONARY.has(clean.slice(0, -5)) || RADIOLOGY_DICTIONARY.has(clean.slice(0, -5) + 'e'))) return false;
  if (clean.endsWith('ive') && (RADIOLOGY_DICTIONARY.has(clean.slice(0, -3)) || RADIOLOGY_DICTIONARY.has(clean.slice(0, -3) + 'e'))) return false;
  if (clean.endsWith('y') && RADIOLOGY_DICTIONARY.has(clean.slice(0, -1))) return false;
  if (clean.endsWith('ar') && RADIOLOGY_DICTIONARY.has(clean.slice(0, -2))) return false;
  if (clean.endsWith('al') && RADIOLOGY_DICTIONARY.has(clean.slice(0, -2))) return false;


  // 3. Medical Compound / Prefix Rules
  const medicalPrefixes = [
    'sub', 'peri', 'retro', 'intra', 'extra', 'trans', 'inter', 'costo', 'broncho', 'cardio', 'osteo',
    'chondro', 'myo', 'neuro', 'vascu', 'arthr', 'spondyl', 'vertebr', 'radi', 'thorac', 'abdomin',
    'pelv', 'femor', 'tibi', 'hepat', 'renal', 'pulmon', 'pleur', 'mediastin', 'pericard', 'cerebr',
    'encephal', 'encephalo', 'mening', 'super', 'supra', 'infra', 'hyper', 'hypo', 'micro', 'macro', 'post', 'pre',
    'para', 'pseudo', 'bi', 'tri', 'hemi', 'leuko', 'myelo', 'crani', 'tracheo', 'nephro', 'gastro', 'colo', 'angio'
  ];

  // 4. Medical Suffix Rules (-malacia, -opathy, -osis, -itis, -plasty, -ectomy, -otomy, -gram, -graphy, -scopy, -sclerosis, -phyte)
  const medicalSuffixes = [
    'malacia', 'malacias', 'opathy', 'opathies', 'pathy', 'pathies', 'osis', 'oses', 'itis', 'itides',
    'plasty', 'plasties', 'ectomy', 'ectomies', 'otomy', 'otomies', 'gram', 'grams', 'graphy', 'graphies',
    'scopy', 'scopies', 'sclerosis', 'phyte', 'phytes', 'megaly', 'megalies', 'plasia', 'plasias', 'trophy',
    'trophies', 'dystrophy', 'genic', 'gram', 'al', 'ar', 'ic', 'ous', 'oid', 'ectasis', 'ectasias', 'emia',
    'kinesis', 'lithiasis', 'lysis', 'lytic', 'necrosis', 'necrotic', 'paresis', 'plegia', 'poiesis', 'ptosis',
    'stenosis', 'stenoses', 'stomy', 'tripsy', 'uria'
  ];

  // Check prefix + suffix combination (e.g. encephalo + malacia -> encephalomalacia)
  for (const prefix of medicalPrefixes) {
    if (clean.startsWith(prefix)) {
      const remainder = clean.slice(prefix.length);
      if (remainder.length >= 3) {
        if (RADIOLOGY_DICTIONARY.has(remainder) ||
            medicalPrefixes.some(p => remainder.startsWith(p)) ||
            medicalSuffixes.some(s => remainder.endsWith(s))) {
          return false;
        }
      }
    }
  }

  for (const suffix of medicalSuffixes) {
    if (clean.endsWith(suffix) && clean.length > suffix.length + 3) {
      const stem = clean.slice(0, -suffix.length);
      if (RADIOLOGY_DICTIONARY.has(stem) || medicalPrefixes.some(p => stem.startsWith(p))) {
        return false;
      }
    }
  }

  // Fail all dictionary and medical morphological checks = Genuine Typo (e.g., wroking, fakture, tesst)
  return true;
}

export interface AutocompleteSuggestion {
  phrase: string;
  category: 'Finding' | 'Impression' | 'Anatomy';
  triggerWords: string[];
}

export const AUTOCOMPLETE_SUGGESTIONS: AutocompleteSuggestion[] = [
  {
    phrase: 'No displaced cortical fracture or dislocation identified.',
    category: 'Finding',
    triggerWords: ['no', 'displaced', 'fracture', 'dislocation', 'cortical', 'bony'],
  },
  {
    phrase: 'Joint space alignment is maintained with normal articular surfaces.',
    category: 'Finding',
    triggerWords: ['joint', 'space', 'alignment', 'maintained', 'articular'],
  },
  {
    phrase: 'No focal parenchymal consolidation, pneumothorax, or pleural effusion seen.',
    category: 'Finding',
    triggerWords: ['no', 'focal', 'parenchymal', 'consolidation', 'pneumothorax', 'effusion', 'lung'],
  },
  {
    phrase: 'Cardiac size and mediastinal contours are within normal limits for age.',
    category: 'Finding',
    triggerWords: ['cardiac', 'size', 'mediastinal', 'contours', 'heart', 'normal'],
  },
  {
    phrase: 'Mild age-related degenerative osteophytes noted at joint margins.',
    category: 'Finding',
    triggerWords: ['mild', 'age', 'degenerative', 'osteophytes', 'margins', 'osteoarthritis'],
  },
  {
    phrase: 'Straightening of normal lumbar lordosis secondary to muscle spasm.',
    category: 'Finding',
    triggerWords: ['straightening', 'lumbar', 'lordosis', 'spasm', 'spine'],
  },
  {
    phrase: 'Intervertebral disc space height and pedicular morphology are preserved.',
    category: 'Finding',
    triggerWords: ['intervertebral', 'disc', 'height', 'pedicles', 'preserved'],
  },
  {
    phrase: 'Soft tissues are unremarkable without radio-opaque foreign body or calcification.',
    category: 'Finding',
    triggerWords: ['soft', 'tissues', 'unremarkable', 'foreign', 'calcification'],
  },
  {
    phrase: '1. No evidence of acute bony fracture or dislocation in current study.',
    category: 'Impression',
    triggerWords: ['1', 'impression', 'acute', 'fracture', 'normal'],
  },
  {
    phrase: '2. Mild degenerative spondylotic changes as detailed above.',
    category: 'Impression',
    triggerWords: ['2', 'degenerative', 'spondylotic', 'spondylosis'],
  },
];

export function getSpellingSuggestion(rawWord: string): string | undefined {
  if (!rawWord || rawWord.length <= 2) return undefined;

  const clean = rawWord.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!clean) return undefined;

  let bestMatch: string | undefined;
  let minDistance = 3;

  for (const dictWord of Array.from(RADIOLOGY_DICTIONARY)) {
    if (Math.abs(dictWord.length - clean.length) > 2) continue;
    const dist = levenshteinDistance(clean, dictWord);
    if (dist < minDistance) {
      minDistance = dist;
      bestMatch = dictWord;
    }
  }

  if (!bestMatch) return undefined;

  // Preserve initial capitalization if present
  if (rawWord[0] === rawWord[0].toUpperCase() && rawWord[0] !== rawWord[0].toLowerCase()) {
    return bestMatch.charAt(0).toUpperCase() + bestMatch.slice(1);
  }

  return bestMatch;
}

// Spellchecker function: Returns array of misspelled words and suggested corrections
export function checkSpelling(text: string): { word: string; suggestion?: string }[] {
  if (!text) return [];

  // Tokenize text into words (removing HTML tags and punctuation)
  const cleanText = text.replace(/<[^>]*>/g, ' ');
  const rawWords = cleanText.toLowerCase().match(/\b[a-z0-9_]+\b/gi) || [];
  const misspelled: { word: string; suggestion?: string }[] = [];

  for (const raw of rawWords) {
    if (raw.length <= 2 || !isNaN(Number(raw))) continue;

    if (!RADIOLOGY_DICTIONARY.has(raw)) {
      const suggestion = getSpellingSuggestion(raw);
      misspelled.push({
        word: raw,
        suggestion,
      });
    }
  }

  const seen = new Set<string>();
  return misspelled.filter((item) => {
    if (seen.has(item.word)) return false;
    seen.add(item.word);
    return true;
  });
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}
