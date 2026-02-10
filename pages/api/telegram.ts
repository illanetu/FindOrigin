import type { NextApiRequest, NextApiResponse } from 'next';
import { TelegramUpdate, sendTelegramMessage } from '@/lib/telegram';
import { formatAnalysisResponse } from '@/lib/openai';
import { runFindSources } from '@/lib/run-find-sources';

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } },
};

/**
 * Webhook для Telegram по пути /api/telegram (обход 405 на /api/webhook).
 * GET — проверка, POST — обновления от Telegram.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, message: 'Telegram webhook. Send POST here.' });
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const token = process.env.BOT_TOKEN;
    if (!token) {
      console.error('[telegram] BOT_TOKEN не найден в переменных окружения');
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    const update = req.body as TelegramUpdate;
    if (!update || typeof update !== 'object') {
      console.error('[telegram] Invalid body:', typeof req.body, req.body);
      return res.status(400).json({ error: 'Invalid request body' });
    }

    console.log('[telegram] Update received:', update.update_id, update.message?.text?.slice(0, 50) ?? '(no text)');
    await processUpdate(update, token);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[telegram] Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function processUpdate(update: TelegramUpdate, token: string): Promise<void> {
  const message = update.message || update.edited_message;
  if (!message) return;

  const chatId = message.chat.id;
  if (!message.text || !message.text.trim()) {
    await sendTelegramMessage(
      chatId,
      '📝 Отправьте текстовое сообщение (не короче 10 символов) — я ищу источники по тексту.',
      token
    );
    return;
  }

  const text = message.text.trim();

  try {
    const analysis = await runFindSources(text, {
      botToken: token,
      sendStatus: (msg) => sendTelegramMessage(chatId, msg, token),
    });
    const responseText = formatAnalysisResponse(analysis);
    await sendTelegramMessage(chatId, responseText, token);
  } catch (error) {
    console.error('Error processing update:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    const isKnownError =
      errMsg.includes('AI API') || errMsg.includes('короткий') || errMsg.includes('Источники не найдены');
    let userMsg = isKnownError
      ? '❌ ' + errMsg
      : '❌ Произошла ошибка при поиске или анализе источников. Попробуйте позже.';
    if (/Google Search API|Brave Search API|Search1API|Wikipedia API|customsearch|403|401|invalid|quota|API key/i.test(errMsg)) {
      if (errMsg.includes('Search1API')) userMsg += '\n\n💡 Поиск (Search1API/DuckDuckGo): проверьте SEARCH1API_KEY в Vercel.';
      else if (errMsg.includes('Google')) userMsg += '\n\n💡 Поиск (Google): проверьте GOOGLE_SEARCH_API_KEY и GOOGLE_SEARCH_ENGINE_ID в Vercel.';
      else if (errMsg.includes('Brave')) userMsg += '\n\n💡 Поиск (Brave): проверьте BRAVE_API_KEY в Vercel.';
      else userMsg += '\n\n💡 Поиск (Википедия): ошибка сети или Википедия недоступна.';
    } else if (/openai|openrouter|gpt|rate limit|insufficient_quota/i.test(errMsg)) {
      userMsg += '\n\n💡 AI (OpenRouter/OpenAI): проверьте OPENROUTER_API_KEY или OPENAI_API_KEY в Vercel.';
    }
    await sendTelegramMessage(chatId, userMsg, token);
  }
}
