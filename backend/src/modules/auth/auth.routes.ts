import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AccountStatus, Role } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { env } from '../../config/env';
import { HttpError } from '../../common/errors';
import { authenticate } from './authenticate';

export const authRouter = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });
const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(9).max(128).regex(/[A-Z]/, 'Must contain an uppercase letter').regex(/[a-z]/, 'Must contain a lowercase letter').regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
  name: z.string().trim().min(1).max(160),
  companyName: z.string().trim().max(160).optional(),
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1).max(128) });

function accessToken(user: { id: string; role: Role; customer: { id: string } | null }) {
  return jwt.sign({ role: user.role, customerId: user.customer?.id ?? null }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'],
  });
}

authRouter.post('/register', async (req, res, next) => {
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
      select: { id: true, email: true, role: true, status: true },
    });
    res.status(201).json({ data: user, message: 'Account created. Email verification delivery will be enabled with the mail integration.' });
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
