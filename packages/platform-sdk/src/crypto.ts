import { randomBytes, createCipheriv, createDecipheriv, webcrypto } from 'node:crypto';

type KeyEntry = { kid: string; key: Buffer };
type Keyring = { current: KeyEntry; all: Record<string, KeyEntry> };

function parseKeyring(): Keyring {
  const currentKid = process.env.DATA_KEY_CURRENT_KID || 'v1';
  const currentKeyB64 = process.env.DATA_KEY_CURRENT || '';
  const keysJson = process.env.DATA_KEYS_JSON || '{}';

  if (!currentKeyB64) {
    throw new Error('DATA_KEY_CURRENT is required (base64 32 bytes for AES-256-GCM)');
  }
  const current: KeyEntry = { kid: currentKid, key: Buffer.from(currentKeyB64, 'base64') };
  const parsed: Record<string, string> = JSON.parse(keysJson || '{}');
  const all: Record<string, KeyEntry> = { [currentKid]: current };
  for (const [kid, b64] of Object.entries(parsed)) {
    all[kid] = { kid, key: Buffer.from(b64 as string, 'base64') };
  }
  if (current.key.length !== 32) {
    throw new Error('DATA_KEY_CURRENT must be 32 bytes (base64) for AES-256-GCM');
  }
  return { current, all };
}

export type Encrypted = {
  kid: string;                  // key id / version
  iv: string;                   // base64 12 bytes
  ct: string;                   // base64 ciphertext
  tag: string;                  // base64 auth tag (16 bytes)
  alg: 'AES-256-GCM';
};

function toB64(b: Buffer) { return b.toString('base64'); }

export function encryptPII(plaintext: string, aad?: Record<string, string>): Encrypted {
  const { current } = parseKeyring();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', current.key, iv);
  if (aad) {
    const aadBuf = Buffer.from(JSON.stringify(aad), 'utf8');
    cipher.setAAD(aadBuf);
  }
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { kid: current.kid, iv: toB64(iv), ct: toB64(ct), tag: toB64(tag), alg: 'AES-256-GCM' };
}

export function decryptPII(enc: Encrypted, aad?: Record<string, string>): string {
  const { all } = parseKeyring();
  const entry = all[enc.kid];
  if (!entry) throw new Error(`Unknown key id: ${enc.kid}`);
  const iv = Buffer.from(enc.iv, 'base64');
  const ct = Buffer.from(enc.ct, 'base64');
  const tag = Buffer.from(enc.tag, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', entry.key, iv);
  if (aad) {
    const aadBuf = Buffer.from(JSON.stringify(aad), 'utf8');
    decipher.setAAD(aadBuf);
  }
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

/** Attempt to re-encrypt with the current key if enc.kid != current.kid */
export function maybeRotate(enc: Encrypted, aad?: Record<string, string>): Encrypted {
  const { current } = parseKeyring();
  if (enc.kid === current.kid) return enc;
  const plain = decryptPII(enc, aad);
  return encryptPII(plain, aad);
}

export function generateDataKey(): { kid: string; keyB64: string } {
  const raw = randomBytes(32);
  const kid = `v${Math.floor(Date.now()/1000)}`;
  return { kid, keyB64: raw.toString('base64') };
}