import { handleAiRequest } from '../server/openai';

export const runtime = 'nodejs';

async function readJsonBody(request: Request): Promise<any> {
  try {
    return await request.json();
  } catch (error) {
    return {};
  }
}

export default {
  async fetch(request: Request) {
    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed.' }, { status: 405 });
    }

    const body = await readJsonBody(request);
    const result = await handleAiRequest(body);
    return Response.json(result.body, { status: result.status });
  }
};
