import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { defaultOutputPathFor, prepareCliPaths } from '../src/cli-support';

test('defaultOutputPathFor replaces .pdf extension', () => {
  assert.equal(defaultOutputPathFor('/tmp/example.pdf'), '/tmp/example.md');
  assert.equal(defaultOutputPathFor('/tmp/example.PDF'), '/tmp/example.md');
});

test('defaultOutputPathFor appends .md to non-pdf inputs', () => {
  assert.equal(defaultOutputPathFor('/tmp/example'), '/tmp/example.md');
});

test('prepareCliPaths rejects stdout together with output', () => {
  const inputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf2md-cli-'));
  const inputPath = path.join(inputDir, 'sample.pdf');
  fs.writeFileSync(inputPath, Buffer.from('pdf'));

  assert.throws(
    () =>
      prepareCliPaths(inputPath, {
        output: path.join(inputDir, 'sample.md'),
        stdout: true,
        maxFileSizeBytes: 1024,
      }),
    /Cannot use --stdout together with --output/
  );
});

test('prepareCliPaths rejects overwriting the input file without force', () => {
  const inputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf2md-cli-'));
  const inputPath = path.join(inputDir, 'sample.pdf');
  fs.writeFileSync(inputPath, Buffer.from('pdf'));

  assert.throws(
    () =>
      prepareCliPaths(inputPath, {
        output: inputPath,
        force: false,
        maxFileSizeBytes: 1024,
      }),
    /Refusing to overwrite the input file/
  );
});

test('prepareCliPaths rejects existing output files without force', () => {
  const inputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf2md-cli-'));
  const inputPath = path.join(inputDir, 'sample.pdf');
  const outputPath = path.join(inputDir, 'sample.md');
  fs.writeFileSync(inputPath, Buffer.from('pdf'));
  fs.writeFileSync(outputPath, 'existing');

  assert.throws(
    () =>
      prepareCliPaths(inputPath, {
        output: outputPath,
        force: false,
        maxFileSizeBytes: 1024,
      }),
    /Refusing to overwrite existing output file/
  );
});

test('prepareCliPaths rejects non-pdf input unless explicitly allowed', () => {
  const inputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf2md-cli-'));
  const inputPath = path.join(inputDir, 'sample.txt');
  fs.writeFileSync(inputPath, Buffer.from('plain text'));

  assert.throws(
    () =>
      prepareCliPaths(inputPath, {
        maxFileSizeBytes: 1024,
      }),
    /Input must have a \.pdf extension/
  );
});
