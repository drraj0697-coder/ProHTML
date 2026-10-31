/* Subject-classification regression tests — no browser, no packages:
 *   node tests/subjects.cjs
 *
 * The classifier lives inside index.html (it must run before the test iframe is created), so
 * this file extracts that section and exercises it against miniature test files in the same
 * RAW_CFG + SUBJECT_LIST shape as the real Marrow runner.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const from = html.indexOf('/* ===== Subject classification');
const to = html.indexOf('async function openFile(id)');
const spanFrom = html.indexOf('function cfgSpan(t)');
const spanTo = html.indexOf('function isGrand(');
if (from < 0 || to < 0 || spanFrom < 0 || spanTo < 0) throw new Error('classification section not found in index.html');
// Classic (sloppy) eval so the section's function declarations are visible below, exactly as
// they are to loadFrame().
eval(html.slice(from, to) + '\n' + html.slice(spanFrom, spanTo));

const LABELS = ['Anatomy', 'Physiology', 'Biochemistry', 'Pathology', 'Pharmacology', 'Microbiology',
  'Forensic Medicine', 'Community Medicine (PSM)', 'ENT', 'Ophthalmology', 'Medicine', 'Surgery',
  'Obstetrics & Gynaecology', 'Paediatrics', 'Orthopaedics', 'Dermatology', 'Psychiatry',
  'Anaesthesia', 'Radiology'];

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('PASS', name); }
  catch (error) { console.error('FAIL', name); throw error; }
}
function page(config, labels) {
  return '<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div>\n' +
    '<script>\nconst RAW_CFG = ' + JSON.stringify(config) + ';\n' +
    'const SUBJECT_LIST = ' + JSON.stringify(labels || LABELS) + ';\n</script></body></html>';
}
function cfgOf(text) { const sp = cfgSpan(text); return JSON.parse(text.slice(sp[0], sp[1])); }
function dist(text) { return qdist(cfgOf(text).questions); }
function labelsOf(text) {
  const m = /const SUBJECT_LIST = \[([\s\S]*?)\]/.exec(text);
  const out = [], re = /'([^']*)'|"([^"]*)"/g; let x;
  if (m) while ((x = re.exec(m[1]))) out.push(x[1] !== undefined ? x[1] : x[2]);
  return out;
}
function qdist(questions) {
  const out = {};
  questions.forEach(q => { out[q.s] = (out[q.s] || 0) + 1; });
  return out;
}
function subjectTestQ(title, questions) {
  return { title, brand: title, sections: 1, minutes: 10, mc: 4, mw: 1, sizes: [questions.length], questions };
}

/* One realistic question per subject (stem + options + explanation). */
const SAMPLES = [
  ['Anatomy', 'A 45-year-old man has a laceration in the popliteal fossa. Which nerve is most likely injured?', 'Common peroneal nerve', 'Tibial nerve', 'Sural nerve', 'Obturator nerve', 'The popliteal fossa contains the tibial and common peroneal nerves.'],
  ['Physiology', 'Which of the following increases cardiac output by the Frank-Starling mechanism?', 'Increased end-diastolic volume', 'Decreased venous return', 'Increased afterload', 'Bradycardia', 'Stroke volume rises with end-diastolic fibre length.'],
  ['Biochemistry', 'A child with hypoglycaemia and hepatomegaly has decreased glucose-6-phosphatase activity. Which glycogen storage disease is this?', 'Von Gierke disease', 'McArdle disease', 'Pompe disease', 'Cori disease', 'Gluconeogenesis and glycogenolysis are blocked.'],
  ['Pathology', 'A biopsy shows pleomorphic cells with hyperchromatic nuclei and atypical mitoses. What is the best description?', 'Malignant neoplasm', 'Benign tumour', 'Granuloma', 'Apoptosis', 'Dysplasia progressing to carcinoma.'],
  ['Pharmacology', 'Which drug is the antidote for organophosphate poisoning?', 'Atropine', 'Naloxone', 'N-acetylcysteine', 'Flumazenil', 'Atropine blocks muscarinic effects; pralidoxime reactivates cholinesterase.'],
  ['Microbiology', 'A sputum sample grows acid-fast bacilli on Lowenstein-Jensen medium. Which organism is this?', 'Mycobacterium tuberculosis', 'Staphylococcus aureus', 'Escherichia coli', 'Candida albicans', 'Ziehl-Neelsen staining shows acid-fast bacilli.'],
  ['Forensic Medicine', 'At autopsy, petechiae and a ligature mark are seen in a case of hanging. Which finding indicates vital reaction?', 'Vitreous haemorrhage', 'Rigor mortis', 'Livor mortis', 'Diatom in bone marrow', 'Medicolegal autopsy findings.'],
  ['Community Medicine (PSM)', 'A screening test has high sensitivity but low specificity. What does this mean?', 'Many false positives', 'Many false negatives', 'High positive predictive value', 'Low prevalence', 'Sensitivity detects true positives; specificity rules out disease.'],
  ['ENT', 'A patient has conductive hearing loss with an intact tympanic membrane and a positive Rinne test. What is the likely diagnosis?', 'Otosclerosis', 'Presbyacusis', 'Cholesteatoma', 'Meniere disease', 'Stapes fixation causes conductive deafness.'],
  ['Ophthalmology', 'A patient with diabetes has retinal neovascularisation and vitreous haemorrhage. What is the most likely finding?', 'Proliferative retinopathy', 'Papilledema', 'Amblyopia', 'Trachoma', 'Retinal ischaemia drives VEGF.'],
  ['Medicine', 'A patient with fever, cough and night sweats has a cavitary lesion on chest X-ray. What is the diagnosis?', 'Pulmonary tuberculosis', 'Asthma', 'COPD', 'Pneumothorax', 'Sputum AFB confirms tuberculosis.'],
  ['Surgery', 'A young man has right iliac fossa pain with rebound tenderness and a positive McBurney sign. What is the diagnosis?', 'Acute appendicitis', 'Cholecystitis', 'Intestinal obstruction', 'Renal colic', 'Appendicectomy is the treatment.'],
  ['Obstetrics & Gynaecology', 'A 34-week pregnant woman has raised blood pressure and proteinuria. What is the diagnosis?', 'Pre-eclampsia', 'Gestational diabetes', 'Placenta praevia', 'Ectopic pregnancy', 'Antenatal hypertension with proteinuria.'],
  ['Paediatrics', 'A 6-month-old infant has severe bronchiolitis with wheeze after a cold. Which virus is most common?', 'Respiratory syncytial virus', 'Measles', 'Rotavirus', 'Varicella', 'RSV causes bronchiolitis in infants.'],
  ['Orthopaedics', 'An elderly woman falls and has a Colles fracture of the distal radius. What deformity is seen?', 'Dinner fork deformity', 'Garden spade deformity', 'Swan neck deformity', 'Claw hand', 'Dorsal displacement of the distal fragment.'],
  ['Dermatology', 'A young man has well-defined scaly plaques on the elbows and knees with auspitz sign. What is the diagnosis?', 'Psoriasis', 'Eczema', 'Tinea corporis', 'Pemphigus vulgaris', 'Koebner phenomenon and silvery scales.'],
  ['Psychiatry', 'A patient hears voices discussing him and believes neighbours are plotting against him. What is this?', 'Schizophrenia', 'Bipolar mania', 'OCD', 'Depression', 'Delusions and hallucinations.'],
  ['Anaesthesia', 'Before intubation, which drug is used to prevent aspiration by cricoid pressure?', 'Succinylcholine', 'Propofol', 'Ketamine', 'Halothane', 'Rapid sequence induction with cricoid pressure.'],
  ['Radiology', 'A chest X-ray shows a widened mediastinum after trauma. What is the most likely finding?', 'Aortic injury', 'Pneumonia', 'Pleural effusion', 'Tuberculosis', 'CT angiography confirms aortic injury.']
];
const realQuestions = SAMPLES.map(([s, q, a, b, c, d, e]) => ({ q, o: [a, b, c, d], a: 0, e, s }));
const vague = [
  { q: 'Which of the following statements is correct about this case?', o: ['one', 'two', 'three', 'four'], a: 0, e: '' },
  { q: 'Identify the image shown below.', o: ['A', 'B', 'C', 'D'], a: 0, e: '' }
];

test('grand test with no subject field is classified across the 19 subjects', () => {
  const questions = realQuestions.concat(vague).map(q => Object.assign({}, q, { s: undefined }));
  const out = applySubjects(page(subjectTestQ('INICET Grand Test 1', questions)), 'INICET Grand Test 1.html');
  const d = dist(out);
  assert.ok(Object.keys(d).length >= 15, 'subject groups: ' + JSON.stringify(d));
  assert.ok((d.Unclassified || 0) <= 5, 'unclassified: ' + (d.Unclassified || 0));
});

test('every representative question lands in its own subject', () => {
  SAMPLES.forEach(([expected, q, a, b, c, d, e]) => {
    assert.equal(subjClassify({ q, o: [a, b, c, d], e }, null), expected, q);
  });
});

test('a grand test whose questions all say "Medicine" is re-scored, not trusted', () => {
  const questions = realQuestions.map(q => Object.assign({}, q, { s: 'Medicine' })).concat(vague);
  const out = applySubjects(page(subjectTestQ('INICET Grand Test 1', questions)), 'INICET Grand Test 1.html');
  const d = dist(out);
  assert.ok(Object.keys(d).length >= 15, 'subject groups: ' + JSON.stringify(d));
  assert.ok((d.Medicine || 0) < questions.length / 2, 'Medicine still dominant: ' + d.Medicine);
});

test('an already-classified grand test is returned byte-identical', () => {
  const src = page(subjectTestQ('INICET Grand Test 1', realQuestions));
  const out = applySubjects(src, 'INICET Grand Test 1.html');
  assert.equal(out, src);
});

test('a subject test puts every MCQ of the test in that subject', () => {
  // Mixed source subjects, title names Radiology: the whole test is Radiology.
  const out = applySubjects(page(subjectTestQ('Radiology - Inicet May 2023', realQuestions)), 'Radiology - Inicet May 2023.html');
  assert.deepEqual(Object.keys(dist(out)), ['Radiology']);
  assert.equal(dist(out).Radiology, realQuestions.length);
});

test('a subject test named only by its file name is still one subject', () => {
  const qs = realQuestions.map(q => Object.assign({}, q, { s: undefined }));
  const out = applySubjects(page(subjectTestQ('Inicet May 2023', qs)), 'Dermatology.html');
  assert.deepEqual(Object.keys(dist(out)), ['Dermatology']);
});

test('a multi-test pack of subject tests is classified per test', () => {
  const pack = { tests: ['Anatomy', 'Physiology', 'Biochemistry'].map(name =>
    subjectTestQ(name, realQuestions.slice(0, 4).map(q => Object.assign({}, q, { s: 'Medicine' })))) };
  const out = applySubjects(page(pack), 'Grand Tests Pack.html');
  cfgOf(out).tests.forEach(t => assert.deepEqual(Object.keys(qdist(t.questions)), [t.title],
    t.title + ': ' + JSON.stringify(t.questions.map(q => q.s))));
});

test('a Grand Test title beats a misleading file name', () => {
  const out = applySubjects(page(subjectTestQ('Grand Test 1', realQuestions.concat(vague))), 'Radiology.html');
  assert.ok(Object.keys(dist(out)).length > 3);
});

test('a small single-subject custom module keeps every question in its subject', () => {
  const cfg = subjectTestQ('Marrow Custom Module', realQuestions.slice(0, 8).map(q => Object.assign({}, q, { s: 'Medicine' })));
  const src = page(Object.assign(cfg, { reviewSubjects: ['Medicine'] }));
  const out = applySubjects(src, 'Marrow Custom Module.html');
  assert.deepEqual(Object.keys(dist(out)), ['Medicine']);
});

test('a multi-subject custom module is not forced into one subject', () => {
  const src = page({
    title: 'Surgery Module', brand: 'Surgery Module', reviewSubjects: ['Surgery', 'Medicine'],
    sections: 1, minutes: 10, mc: 4, mw: 1, sizes: [6],
    questions: realQuestions.slice(0, 6).map((q, i) => Object.assign({}, q, { s: i % 2 ? 'Surgery' : 'Medicine' }))
  });
  const d = dist(applySubjects(src, 'Surgery Module.html'));
  assert.ok(d.Surgery > 0 && d.Medicine > 0, JSON.stringify(d));
});

test('subject aliases are normalised', () => {
  const qs = [{ q: 'q', o: ['a', 'b'], a: 0, e: '', s: 'psm' }, { q: 'q', o: ['a', 'b'], a: 0, e: '', s: 'obg' },
    { q: 'q', o: ['a', 'b'], a: 0, e: '', s: '  fmt  ' }];
  const d = dist(applySubjects(page(subjectTestQ('Mixed Test', qs)), 'Mixed Test.html'));
  assert.equal(d['Community Medicine (PSM)'], 1);
  assert.equal(d['Obstetrics & Gynaecology'], 1);
  assert.equal(d['Forensic Medicine'], 1);
});

test('a template with different subject labels gets labels it recognises', () => {
  const labels = LABELS.map(l => l === 'Community Medicine (PSM)' ? 'Community Medicine' : l === 'Obstetrics & Gynaecology' ? 'Obs & Gyn' : l);
  const out = applySubjects(page(subjectTestQ('INICET Grand Test 1', realQuestions), labels), 'INICET Grand Test 1.html');
  const list = labelsOf(out);
  const d = dist(out);
  assert.ok(!d['Community Medicine (PSM)'] && !d['Obstetrics & Gynaecology'], JSON.stringify(d));
  Object.keys(d).forEach(label => assert.ok(list.indexOf(label) >= 0, label + ' missing from SUBJECT_LIST: ' + list));
});

test('Unclassified is added to SUBJECT_LIST so the template can show it', () => {
  const qs = realQuestions.map(q => Object.assign({}, q, { s: undefined })).concat(vague);
  const out = applySubjects(page(subjectTestQ('Grand Test 1', qs)), 'Grand Test 1.html');
  assert.ok(dist(out).Unclassified > 0);
  assert.ok(/const SUBJECT_LIST = \[[^\]]*'Unclassified'\]/.test(out));
});

test('broken or non-runner files are returned unchanged', () => {
  const broken = page(subjectTestQ('Grand Test 1', realQuestions)).replace('"title":"Grand Test 1"', '"title":');
  assert.equal(applySubjects(broken, 'x.html'), broken);
  const plain = '<!doctype html><html><body>hello</body></html>';
  assert.equal(applySubjects(plain, 'x.html'), plain);
});

console.log('\n' + passed + ' subject-classification tests passed');
