import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleAiRequest } from './api/_lib/openai';

async function readJsonBody(req: NodeJS.ReadableStream): Promise<any> {
    const chunks: Buffer[] = [];

    for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    if (chunks.length === 0) {
        return {};
    }

    const raw = Buffer.concat(chunks).toString('utf8');
    return raw ? JSON.parse(raw) : {};
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    Object.assign(process.env, env);

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        {
          name: 'freshkeeper-local-ai-api',
          configureServer(server) {
            server.middlewares.use('/api/ai', async (req, res, next) => {
              if (req.method !== 'POST') {
                next();
                return;
              }

              try {
                const body = await readJsonBody(req);
                const result = await handleAiRequest(body);
                res.statusCode = result.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result.body));
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Local AI proxy failed.';
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: message }));
              }
            });
          }
        }
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
