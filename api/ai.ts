import { handleAiRequest } from './_lib/openai';

async function readJsonBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) {
    return {};
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      res.status(200).json({ ok: true, route: '/api/ai' });
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed.' });
      return;
    }
    const body = await readJsonBody(req);
    const result = await handleAiRequest(body);
    res.status(result.status).json(result.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unhandled AI route error.';
    console.error('API route failure:', error);
    res.status(500).json({ error: message });
  }
}
