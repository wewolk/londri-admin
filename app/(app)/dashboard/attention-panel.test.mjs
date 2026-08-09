import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const pagePath = new URL('./page.tsx', import.meta.url);

test('dashboard does not render the Perlu perhatian panel', async () => {
  const source = await readFile(pagePath, 'utf8');
  assert.equal(source.includes('Perlu perhatian'), false);
});
