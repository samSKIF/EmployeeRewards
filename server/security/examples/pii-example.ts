import { encryptPII, decryptPII } from '@platform/sdk';

// Example only — not wired into DB yet.
export function demoEncryptEmail(email: string, tenantId: string) {
  const aad = { tenant_id: tenantId, field: 'email' };
  const enc = encryptPII(email, aad);
  const roundtrip = decryptPII(enc, aad);
  return { enc, roundtrip };
}