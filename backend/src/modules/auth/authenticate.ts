import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../../config/env';
import { HttpError } from '../../common/errors';
import { prisma } from '../../database/prisma';

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'Authentication is required.');
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET);
    if (typeof payload === 'string' || !payload.sub || !Object.values(Role).includes(payload.role as Role)) throw new HttpError(401, 'Invalid access token.');
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, role: true, status: true, customer: { select: { id: true } } } });
    if (!user || user.status !== 'ACTIVE') throw new HttpError(401, 'Account is inactive.');
    req.auth = { userId: user.id, role: user.role, customerId: user.customer?.id ?? null };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) next(new HttpError(401, 'Invalid or expired access token.'));
    else next(error);
  }
};

export function allowRoles(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) return next(new HttpError(401, 'Authentication is required.'));
    if (!roles.includes(req.auth.role)) return next(new HttpError(403, 'You do not have permission to perform this action.'));
    next();
  };
}
