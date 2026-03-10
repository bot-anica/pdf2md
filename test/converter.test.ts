import test from 'node:test';
import assert from 'node:assert/strict';
import { convertPdf } from '../src/converter';

test('convertPdf enforces the configured buffer size limit before parsing', async () => {
  await assert.rejects(
    () =>
      convertPdf(Buffer.alloc(8), {
        maxFileSizeBytes: 4,
      }),
    /exceeds the configured limit/
  );
});
