import test from 'node:test';
import assert from 'node:assert/strict';
import { getMatchingPresetForCoordinates, isLocationPresetLocked, shouldRequireLocationName } from './locationUtils.js';

test('locks coordinate inputs when a saved preset is active', () => {
  assert.equal(isLocationPresetLocked('preset', 7), true);
  assert.equal(isLocationPresetLocked('manual', 7), false);
  assert.equal(isLocationPresetLocked('preset', null), false);
});

test('requires a location name for manual coordinates', () => {
  assert.equal(
    shouldRequireLocationName({ requireGps: true, latitude: '10.1', longitude: '20.2', locationMode: 'manual', selectedPresetId: null }),
    true,
  );
});

test('does not require a location name when a saved preset is selected', () => {
  assert.equal(
    shouldRequireLocationName({ requireGps: true, latitude: '10.1', longitude: '20.2', locationMode: 'preset', selectedPresetId: 7 }),
    false,
  );
});

test('matches a saved preset by coordinates', () => {
  const preset = { id: 11, name: 'Hội trường A', latitude: '10.1', longitude: '20.2' };
  assert.deepEqual(getMatchingPresetForCoordinates('10.1', '20.2', [preset]), preset);
  assert.equal(getMatchingPresetForCoordinates('10.1', '20.3', [preset]), null);
});
