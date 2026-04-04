import { test, describe } from 'node:test';
import assert from 'node:assert';
import { escapeJson } from './utils.ts';

describe('escapeJson', () => {
  test('should not change normal strings', () => {
    assert.strictEqual(escapeJson('normal'), 'normal');
    assert.strictEqual(escapeJson('acc_123'), 'acc_123');
  });

  test('should escape double quotes', () => {
    assert.strictEqual(escapeJson('string "with" quotes'), 'string \\"with\\" quotes');
  });

  test('should escape backslashes', () => {
    assert.strictEqual(escapeJson('string \\with\\ backslashes'), 'string \\\\with\\\\ backslashes');
  });

  test('should escape both double quotes and backslashes', () => {
    assert.strictEqual(escapeJson('string with \\ and "'), 'string with \\\\ and \\"');
  });

  test('should handle empty string', () => {
    assert.strictEqual(escapeJson(''), '');
  });

  test('should handle string with only special characters', () => {
    assert.strictEqual(escapeJson('\\"'), '\\\\\\\"');
  });
});
