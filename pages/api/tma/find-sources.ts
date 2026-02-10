import type { NextApiRequest, NextApiResponse } from 'next';
import { validateInitData } from '@/lib/tma-auth';
import { runFindSources } from '@/lib/run-find-sources';
import type { AnalysisResult } from '@/lib/openai';

export const config = {
  api: { bodyParser: { sizeLimit: '500kb' } },
};

type FindSourcesBody = {
  text: string;
  initData: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const token = process.env.BOT_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Bot not configured' });
  }

  const { text, initData } = (req.body || {}) as FindSourcesBody;
  if (!initData || typeof initData !== 'string') {
    return res.status(401).json({ error: 'Missing or invalid initData from Telegram' });
  }
  if (!validateInitData(initData, token)) {
    return res.status(401).json({ error: 'Invalid Telegram Mini App signature' });
  }
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid text' });
  }

  try {
    const analysis: AnalysisResult = await runFindSources(text.trim(), { botToken: token });
    return res.status(200).json(analysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('AI API') || message.includes('короткий') || message.includes('Источники не найдены')
      ? 400
      : 500;
    return res.status(status).json({ error: message });
  }
}
