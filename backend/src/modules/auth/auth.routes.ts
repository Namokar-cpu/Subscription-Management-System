import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AccountStatus, AuthTokenType, Role } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { env } from '../../config/env';
import { HttpError } from '../../common/errors';
import { authenticate } from './authenticate';
import { hashAuthToken, issueEmailVerificationToken } from './auth-token.service';
import { sendVerificationEmail } from '../../integrations/email/resend-email.service';

export const authRouter = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });
const emailActionLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false });
const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(9).max(128).regex(/[A-Z]/, 'Must contain an uppercase letter').regex(/[a-z]/, 'Must contain a lowercase letter').regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
  name: z.string().trim().min(1).max(160),
  companyName: z.string().trim().max(160).optional(),
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1).max(128) });
const emailSchema = z.object({ email: z.string().email().max(254) });

function accessToken(user: { id: string; role: Role; customer: { id: string } | null }) {
  return jwt.sign({ role: user.role, customerId: user.customer?.id ?? null }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'],
  });
}

authRouter.post('/register', emailActionLimiter, async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const email = input.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, 'An account with this email already exists.');
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.CUSTOMER,
        status: AccountStatus.PENDING_VERIFICATION,
        customer: { create: { name: input.name, companyName: input.companyName, billingEmail: email } },
      },
      select: { id: true, email: true, role: true, status: true, customer: { select: { name: true } } },
    });
    const token = await issueEmailVerificationToken(user.id);
    const verificationUrl = `${env.PUBLIC_API_URL}/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`;
    await sendVerificationEmail({ to: user.email, name: user.customer?.name ?? 'there', verificationUrl });
    res.status(201).json({
      data: { id: user.id, email: user.email, role: user.role, status: user.status },
      message: 'Account created. Check your email to verify your address.',
    });
  } catch (error) { next(error); }
});

authRouter.post('/resend-verification', emailActionLimiter, async (req, res, next) => {
  try {
    const { email } = emailSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, email: true, status: true, customer: { select: { name: true } } },
    });
    if (user?.status === AccountStatus.PENDING_VERIFICATION) {
      const token = await issueEmailVerificationToken(user.id);
      const verificationUrl = `${env.PUBLIC_API_URL}/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`;
      await sendVerificationEmail({ to: user.email, name: user.customer?.name ?? 'there', verificationUrl });
    }
    res.json({ message: 'If the account needs verification, a new email has been sent.' });
  } catch (error) { next(error); }
});

authRouter.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/i) }).parse(req.query);
    const authToken = await prisma.authToken.findUnique({ where: { tokenHash: hashAuthToken(token) } });
    if (!authToken || authToken.type !== AuthTokenType.EMAIL_VERIFICATION || authToken.consumedAt || authToken.expiresAt <= new Date()) {
      throw new HttpError(400, 'This verification link is invalid or expired. Request a new one.');
    }

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.authToken.updateMany({
        where: { id: authToken.id, consumedAt: null, expiresAt: { gt: new Date() } },
        data: { consumedAt: new Date() },
      });
      if (claimed.count !== 1) throw new HttpError(400, 'This verification link has already been used or expired.');
      await tx.user.update({ where: { id: authToken.userId }, data: { status: AccountStatus.ACTIVE } });
    });
    res.json({ message: 'Email verified. Your account is active; you can now sign in.' });
  } catch (error) { next(error); }
});

authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() }, include: { customer: { select: { id: true } } } });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) throw new HttpError(401, 'Invalid email or password.');
    if (user.status !== AccountStatus.ACTIVE) throw new HttpError(403, 'This account is not active. Complete verification or contact an administrator.');
    res.json({ data: { accessToken: accessToken(user), tokenType: 'Bearer', expiresIn: env.JWT_ACCESS_TTL, user: { id: user.id, email: user.email, role: user.role } } });
  } catch (error) { next(error); }
});

authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId }, select: { id: true, email: true, role: true, status: true, customer: { select: { id: true, name: true, companyName: true } } } });
    if (!user) throw new HttpError(404, 'User not found.');
    res.json({ data: user });
  } catch (error) { next(error); }
});
