import assert from 'node:assert/strict';
import test from 'node:test';
import { explicitStudyViews } from './study-views';

test('one selected view is one view no matter how many files were picked', () => {
  const views = explicitStudyViews({ viewList: ['PA'] });
  assert.deepEqual(views, ['PA']);
  assert.equal(views.length, 1);
});

test('AP and LATERAL are two views even when a single file was uploaded', () => {
  assert.deepEqual(explicitStudyViews({ viewList: ['AP', 'LATERAL'] }), ['AP', 'LATERAL']);
});

test('AP/LAT is kept as the selected combination label', () => {
  assert.deepEqual(explicitStudyViews({ viewList: ['AP/LAT'] }), ['AP/LAT']);
});

test('a legacy single view field is sent when the multi-select is empty', () => {
  assert.deepEqual(explicitStudyViews({ viewList: [], view: 'AP/LATERAL' }), ['AP/LATERAL']);
});

test('no selected view sends nothing for the server to parse from the study name', () => {
  assert.deepEqual(explicitStudyViews({ viewList: [], view: '  ' }), []);
});
