import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MAX_FILE_SIZE_BYTES,
  DEFAULT_MAX_PAGES,
  normalizeConvertConfig,
} from '../src/config';

test('normalizeConvertConfig applies safe defaults', () => {
  const config = normalizeConvertConfig();

  assert.equal(config.pageBreaks, false);
  assert.equal(config.forcedLanguage, undefined);
  assert.equal(config.maxPages, DEFAULT_MAX_PAGES);
  assert.equal(config.maxFileSizeBytes, DEFAULT_MAX_FILE_SIZE_BYTES);
  assert.equal(config.useSystemFonts, false);
  assert.equal(config.stopAtErrors, true);
  assert.equal(config.isEvalSupported, false);
  assert.equal(config.disableFontFace, true);
});

test('normalizeConvertConfig keeps backwards-compatible language input', () => {
  const config = normalizeConvertConfig({ language: 'python' });

  assert.equal(config.forcedLanguage, 'python');
});

test('normalizeConvertConfig rejects invalid numeric limits', () => {
  assert.throws(() => normalizeConvertConfig({ maxPages: 0 }), /maxPages must be a positive integer/);
  assert.throws(
    () => normalizeConvertConfig({ maxFileSizeBytes: -1 }),
    /maxFileSizeBytes must be a positive integer/
  );
});
