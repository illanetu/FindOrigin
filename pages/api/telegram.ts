import type { NextApiRequest, NextApiResponse } from 'next';
import { TelegramUpdate, sendTelegramMessage, getTelegramPostContent } from '@/lib/telegram';
import { searchMultipleCategories } from '@/lib/google-search';
import { compareWithSources, formatAnalysisResponse } from '@/lib/openai';

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

  let text = message.text.trim();

  const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const openrouterApiKey = process.env.OPENROUTER_API_KEY;

  if (!googleApiKey || !googleSearchEngineId) {
    await sendTelegramMessage(
      chatId,
      '❌ Ошибка: Google Search API не настроен. Проверьте переменные окружения GOOGLE_SEARCH_API_KEY и GOOGLE_SEARCH_ENGINE_ID.',
      token
    );
    return;
  }

  const aiApiKey = openrouterApiKey || openaiApiKey;
  const useOpenRouter = !!openrouterApiKey;
  if (!aiApiKey) {
    await sendTelegramMessage(
      chatId,
      '❌ Ошибка: AI API не настроен. Проверьте переменную окружения OPENAI_API_KEY или OPENROUTER_API_KEY.',
      token
    );
    return;
  }

  const telegramLinkPattern = /https?:\/\/t\.me\/[^\s]+/;
  const telegramLink = text.match(telegramLinkPattern)?.[0];
  if (telegramLink) {
    const postContent = await getTelegramPostContent(telegramLink, token);
    if (postContent) {
      text = postContent;
    } else {
      await sendTelegramMessage(
        chatId,
        '⚠️ Получена ссылка на Telegram-пост, но не удалось извлечь его содержимое. Обрабатываю ссылку как обычный текст.',
        token
      );
    }
  }

  if (!text || text.length < 10) {
    await sendTelegramMessage(
      chatId,
      '❌ Текст слишком короткий для анализа. Пожалуйста, отправьте более подробное сообщение.',
      token
    );
    return;
  }

  await sendTelegramMessage(
    chatId,
    '🔍 Ищу источники информации... Это может занять некоторое время.',
    token
  );

  try {
    const searchResults = await searchMultipleCategories(
      text,
      googleApiKey,
      googleSearchEngineId
    );
    const allSources = [
      ...searchResults.official,
      ...searchResults.news,
      ...searchResults.blog,
      ...searchResults.research,
    ];

    if (allSources.length === 0) {
      await sendTelegramMessage(
        chatId,
        '❌ Источники не найдены. Попробуйте переформулировать запрос.',
        token
      );
      return;
    }

    const sourcesToAnalyze = allSources.slice(0, 5);
    await sendTelegramMessage(
      chatId,
      '🤖 Анализирую найденные источники с помощью AI (gpt-4o-mini)...',
      token
    );

    const analysis = await compareWithSources(text, sourcesToAnalyze, aiApiKey, useOpenRouter);
    const responseText = formatAnalysisResponse(analysis);
    await sendTelegramMessage(chatId, responseText, token);
  } catch (error) {
    console.error('Error processing update:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    let userMsg = '❌ Произошла ошибка при поиске или анализе источников. Попробуйте позже.';
    if (/Google Search API|403|401|invalid|quota|API key|customsearch/i.test(errMsg)) {
      userMsg += '\n\n💡 Поиск (Google): проверьте GOOGLE_SEARCH_API_KEY и GOOGLE_SEARCH_ENGINE_ID в Vercel. Custom Search API должен быть включён в Google Cloud.';
    } else if (/openai|openrouter|gpt|rate limit|insufficient_quota/i.test(errMsg)) {
      userMsg += '\n\n💡 AI (OpenRouter/OpenAI): проверьте OPENROUTER_API_KEY или OPENAI_API_KEY в Vercel. Модель: openai/gpt-4o-mini.';
    }
    await sendTelegramMessage(chatId, userMsg, token);
  }
}
