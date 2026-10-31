import { app } from './app';
import { env } from './config/env';
import { prisma } from './database/prisma';

const server = app.listen(env.PORT, () => console.log(`API listening on http://localhost:${env.PORT}`));

async function shutdown() {
  server.close();
  await prisma.$disconnect();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
