import { SignJWT, jwtVerify, JWTPayload } from 'jose';

export type ServiceTokenClaims = JWTPayload & {
  svc: string;        // caller service name
  aud: string | string[]; // audience (target service)
};

export async function issueServiceToken(
  secret: string,
  claims: Omit<ServiceTokenClaims, 'iat' | 'exp'>
): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return await new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('5m') // short-lived
    .sign(key);
}

export async function verifyServiceToken(
  secret: string,
  token: string,
  expectedAud?: string
): Promise<ServiceTokenClaims> {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key, expectedAud ? { audience: expectedAud } : undefined);
  return payload as ServiceTokenClaims;
}