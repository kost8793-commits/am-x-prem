import { app } from '../src/server/app';

// Vercel Serverless Function catch-all entry point for /api/*
export default function handler(req: any, res: any) {
  return app(req, res);
}
