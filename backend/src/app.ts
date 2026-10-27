import express from 'express';
import { createApp } from './createApp.js';
import { repo } from './container.js';

const app = express();
app.set('trust proxy', 1);

app.use(
  createApp({
    repo,
    corsOrigin: process.env.CORS_ORIGIN,
    rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE ?? 600),
    enableRateLimit: true,
  }),
);

export default app;