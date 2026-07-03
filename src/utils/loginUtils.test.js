import assert from 'node:assert/strict';
import test from 'node:test';
import { isStudentLoginValue, normalizeStudentLogin } from './loginUtils.js';

test('accepts any valid email address for login', () => {
  assert.equal(isStudentLoginValue('student@example.com'), true);
  assert.equal(isStudentLoginValue('student@gmail.com'), true);
  assert.equal(isStudentLoginValue('student@ctuet.edu.vn'), true);
});

test('accepts student IDs in the existing format', () => {
  assert.equal(isStudentLoginValue('HTTT2311017'), true);
  assert.equal(isStudentLoginValue('httt2311017'), true);
});

test('normalizes email logins to lowercase and student IDs to uppercase', () => {
  assert.equal(normalizeStudentLogin('Student@Example.com'), 'student@example.com');
  assert.equal(normalizeStudentLogin('httt2311017'), 'HTTT2311017');
});
