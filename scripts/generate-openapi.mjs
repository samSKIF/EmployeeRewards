/**
 * Generates typed axios clients for each OpenAPI spec.
 * Add your service specs to the 'specs' array below.
 * Example entry: { name: 'auth', spec: 'services/auth/openapi.yaml' }
 */
import { exec as cbExec } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir } from 'node:fs/promises';

const exec = promisify(cbExec);
const OUT_ROOT = 'packages/clients';

const specs = [
  // TODO: add your OpenAPI spec paths here, e.g.:
  // { name: 'api-gateway', spec: 'services/api-gateway/openapi.yaml' },
  // { name: 'employee-core', spec: 'services/employee-core/openapi.yaml' }
];

await mkdir(OUT_ROOT, { recursive: true });

for (const { name, spec } of specs) {
  const out = `${OUT_ROOT}/${name}`;
  // openapi-typescript-codegen exposes the 'openapi' bin
  const cmd = `npx openapi -i ${spec} -o ${out} -c axios -n ${name}-client`;
  console.log('Generating client:', name, 'from', spec);
  try {
    const { stdout, stderr } = await exec(cmd);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (e) {
    console.error('Client generation failed for', name, e?.message || e);
  }
}
console.log('Client generation finished.');