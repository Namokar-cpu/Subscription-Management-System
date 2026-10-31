import { createHash, randomBytes } from 'node:crypto';
import { AuthTokenType } from '@prisma/client';
import { prisma } from '../../database/prisma';

const EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function hashAuthToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function issueEmailVerificationToken(userId: string) {
  const token = randomBytes(32).toString('hex');
  await prisma.authToken.create({
    data: {
      userId,
      type: AuthTokenType.EMAIL_VERIFICATION,
      tokenHash: hashAuthToken(token),
      expiresAt: new Date(Date.now() + EMAIL_TOKEN_TTL_MS),
    },
  });
  return token;
}
