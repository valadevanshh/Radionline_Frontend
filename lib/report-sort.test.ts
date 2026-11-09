import assert from 'node:assert/strict';
import test from 'node:test';
import { compareReportsByStudyDateDesc } from './report-sort';

test('study date descending handles ISO, ambiguous day-first dates, urgency, and year boundaries', () => {
  const rows = [
    {id:'urgent-old',studyDate:'2026-01-01',isUrgent:true},
    {id:'november',studyDate:'08/11/2026'},
    {id:'october',studyDate:'31-10-2026'},
    {id:'december',studyDate:'2026-12-01T00:00:00Z'},
    {id:'last-year',studyDate:'31/12/2025'},
  ];
  assert.deepEqual([...rows].sort(compareReportsByStudyDateDesc).map(row=>row.id),
    ['december','november','october','urgent-old','last-year']);
  assert.equal(rows[0].id,'urgent-old');
});

test('same study day sorts latest upload first and preserves equal rows', () => {
  const rows = [
    {id:'early',studyDate:'08-11-2026',createdAt:'2026-11-08T05:00:00Z'},
    {id:'late',studyDate:'2026-11-08',createdAt:'2026-11-08T12:00:00Z'},
    {id:'equal',studyDate:'08/11/2026',createdAt:'2026-11-08T12:00:00Z'},
  ];
  assert.deepEqual(rows.sort(compareReportsByStudyDateDesc).map(row=>row.id),['late','equal','early']);
});

test('missing and invalid study dates sort last without hiding a report', () => {
  const rows = [
    {id:'missing',studyDate:null}, {id:'impossible',studyDate:'31-02-2026'},
    {id:'bad',studyDate:'not a date'}, {id:'valid',studyDate:'29-02-2024'},
  ];
  assert.deepEqual(rows.sort(compareReportsByStudyDateDesc).map(row=>row.id),['valid','missing','impossible','bad']);
});
