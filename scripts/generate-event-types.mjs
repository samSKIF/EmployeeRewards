import { compileFromFile } from 'json-schema-to-typescript';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const IN_DIR = 'contracts/events';
const OUT_DIR = 'packages/events-types';

await mkdir(OUT_DIR, { recursive: true });

const files = await readdir(IN_DIR);
for (const f of files) {
  if (!f.endsWith('.json') || f.includes('.example.')) continue;
  const name = f.replace('.json', '').replace('@', '_');
  const schemaPath = path.join(IN_DIR, f);
  
  // Generate TypeScript with proper interface naming
  const ts = await compileFromFile(schemaPath, { 
    bannerComment: '', 
    style: { bracketSpacing: false },
    format: false, // Disable prettier formatting to avoid syntax errors
    additionalProperties: false
  });
  
  await writeFile(path.join(OUT_DIR, `${name}.d.ts`), ts, 'utf8');
  console.log('Generated:', `${name}.d.ts`);
}
console.log('Done. Types out to', OUT_DIR);