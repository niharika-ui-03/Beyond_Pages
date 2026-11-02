import express from 'express';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');

app.use(express.json({ limit: '2kb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 30 }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use(express.static(dist));

const port = process.env.PORT || 3000;
app.listen(port, (err) => {
  if (err) {
    console.error('Server failed to start:', err.message);
    process.exit(1);
  }
  console.log(`Beyond Pages server on http://localhost:${port}`);
});