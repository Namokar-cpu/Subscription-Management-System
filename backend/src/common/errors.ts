import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: { message: error.message } });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    res.status(409).json({ error: { message: 'A record with those details already exists.' } });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    res.status(404).json({ error: { message: 'Record not found.' } });
    return;
  }
  console.error(error);
  res.status(500).json({ error: { message: 'An unexpected server error occurred.' } });
};
