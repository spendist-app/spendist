import { createHash, timingSafeEqual } from 'node:crypto';

export function bearerSecretMatches(
  authorization: string | null,
  secret: string
): boolean {
  if (!secret || !authorization) return false;

  const expected = createHash('sha256')
    .update('Bearer ' + secret)
    .digest();

  const received = createHash('sha256').update(authorization.trim()).digest();

  return timingSafeEqual(expected, received);
}
