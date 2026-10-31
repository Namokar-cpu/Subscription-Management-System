import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { env } from './config/env';
import { errorHandler, HttpError } from './common/errors';
import { authRouter } from './modules/auth/auth.routes';
import { healthRouter } from './modules/health/health.routes';
import { razorpayRouter } from './modules/payments/razorpay.routes';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.get('/api/v1/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1', razorpayRouter);
app.use((_req, _res, next) => next(new HttpError(404, 'Endpoint not found.')));
app.use((error: unknown, _req: express.Request, _res: express.Response, next: express.NextFunction) => {
  if (error instanceof ZodError) {
    next(new HttpError(400, error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')));
    return;
  }
  next(error);
});
app.use(errorHandler);
