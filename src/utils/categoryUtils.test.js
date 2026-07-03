import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCategoryOptions, getCategoryMaxPoints, clampPointsToCategoryLimit } from './categoryUtils.js';

test('normalizeCategoryOptions maps database rows into display categories', () => {
  const rows = [
    { id: 1, title: 'Tham gia học tập', max_points: 20 },
    { id: 2, title: 'Chấp hành nội quy', max_points: 25 },
  ];

  const result = normalizeCategoryOptions(rows);

  assert.deepEqual(result, [
    { name: 'Tham gia học tập', maxPoints: 20, id: 1 },
    { name: 'Chấp hành nội quy', maxPoints: 25, id: 2 },
  ]);
});

test('getCategoryMaxPoints returns a fallback when category is missing', () => {
  const categories = [
    { name: 'Tham gia học tập', maxPoints: 20 },
  ];

  assert.equal(getCategoryMaxPoints('Tham gia học tập', categories), 20);
  assert.equal(getCategoryMaxPoints('Không tồn tại', categories), 100);
});

test('getCategoryMaxPoints caps values at 100 points', () => {
  const categories = [
    { name: 'Tham gia học tập', maxPoints: 150 },
  ];

  assert.equal(getCategoryMaxPoints('Tham gia học tập', categories), 100);
});

test('clampPointsToCategoryLimit caps values at the category maximum', () => {
  const categories = [
    { name: 'Tham gia học tập', maxPoints: 80 },
  ];

  assert.equal(clampPointsToCategoryLimit(90, 'Tham gia học tập', categories), 80);
  assert.equal(clampPointsToCategoryLimit(-5, 'Tham gia học tập', categories), 0);
  assert.equal(clampPointsToCategoryLimit(120, 'Không tồn tại', categories), 100);
});
