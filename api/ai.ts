import { handleAiRequest } from './_lib/openai';

export const runtime = 'nodejs';

async function readJsonBody(request: Request): Promise<any> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function GET() {
  return Response.json({ ok: true, route: '/api/ai' }, { status: 200 });
}

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const result = await handleAiRequest(body);
  return Response.json(result.body, { status: result.status });
}
