import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeText, matchesNaturalQuery, getTopEventMatch } from './searchUtils.js';

test('normalizeText strips accents and spaces', () => {
  assert.equal(normalizeText('Hiến máu tình nguyện'), 'hien mau tinh nguyen');
});

test('matchesNaturalQuery supports accent-insensitive matching', () => {
  const eventName = 'Hiến máu tình nguyện';
  assert.equal(matchesNaturalQuery('hien mau', eventName), true);
  assert.equal(matchesNaturalQuery('tinh nguyen', eventName), true);
  assert.equal(matchesNaturalQuery('khong co', eventName), false);
});

test('getTopEventMatch returns the single closest activity for a search query', () => {
  const events = [
    { id: 'EVT-26016', name: 'Hiến máu tình nguyện đợt 2 - Năm 2026' },
    { id: 'EVT-26020', name: 'Cuộc thi Tiếng Anh chuyên ngành CNTT' },
  ];

  assert.equal(getTopEventMatch('hien mau', events)?.id, 'EVT-26016');
  assert.equal(getTopEventMatch('tiếng anh', events)?.id, 'EVT-26020');
  assert.equal(getTopEventMatch('khong co', events), null);
});
