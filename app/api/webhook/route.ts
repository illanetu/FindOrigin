import { NextRequest, NextResponse } from 'next/server';
import { TelegramUpdate, sendTelegramMessage, getTelegramPostContent } from '@/lib/telegram';
import { searchSources, searchMultipleCategories } from '@/lib/google-search';
import { compareWithSources, formatAnalysisResponse } from '@/lib/openai';

// Настройка runtime для Vercel (nodejs для полной поддержки всех API)
export const runtime = 'nodejs';

// Отключаем body parsing для raw body (если нужно)
export const dynamic = 'force-dynamic';

/**
 * OPTIONS /api/webhook
 * Обработка preflight запросов
 */
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

/**
 * POST /api/webhook
 * Обработчик webhook от Telegram
 */
export async function POST(request: NextRequest) {
  try {
    const token = process.env.BOT_TOKEN;
    
    if (!token) {
      console.error('BOT_TOKEN не найден в переменных окружения');
      return NextResponse.json(
        { error: 'Bot token not configured' },
        { status: 500 }
      );
    }

    // Быстро возвращаем 200 OK, чтобы Telegram не повторял запрос
    const update: TelegramUpdate = await request.json();
    
    // Обрабатываем асинхронно, не блокируя ответ
    processUpdate(update, token).catch(error => {
      console.error('Error processing update:', error);
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Асинхронная обработка обновления от Telegram
 */
async function processUpdate(update: TelegramUpdate, token: string): Promise<void> {
  const message = update.message || update.edited_message;
  
  if (!message || !message.text) {
    return;
  }

  const chatId = message.chat.id;
  let text = message.text.trim();

  // Проверяем наличие необходимых API ключей
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

  // Поддерживаем либо OpenAI, либо OpenRouter
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

  // Проверяем, является ли сообщение ссылкой на Telegram-пост
  const telegramLinkPattern = /https?:\/\/t\.me\/[^\s]+/;
  const telegramLink = text.match(telegramLinkPattern)?.[0];
  
  if (telegramLink) {
    // Пытаемся извлечь текст из поста
    const postContent = await getTelegramPostContent(telegramLink, token);
    if (postContent) {
      text = postContent;
    } else {
      // Если не удалось извлечь, отправляем сообщение
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

  // Отправляем сообщение о начале обработки
  await sendTelegramMessage(
    chatId,
    '🔍 Ищу источники информации... Это может занять некоторое время.',
    token
  );

  try {
    // Ищем источники по разным категориям
    const searchResults = await searchMultipleCategories(
      text,
      googleApiKey,
      googleSearchEngineId
    );

    // Объединяем результаты из всех категорий
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

    // Ограничиваем количество источников для анализа (максимум 5)
    const sourcesToAnalyze = allSources.slice(0, 5);

    // Анализируем источники с помощью AI
    await sendTelegramMessage(
      chatId,
      '🤖 Анализирую найденные источники с помощью AI...',
      token
    );

    const analysis = await compareWithSources(text, sourcesToAnalyze, aiApiKey, useOpenRouter);

    // Формируем и отправляем финальный ответ
    const responseText = formatAnalysisResponse(analysis);
    await sendTelegramMessage(chatId, responseText, token);
  } catch (error) {
    console.error('Error processing update:', error);
    await sendTelegramMessage(
      chatId,
      '❌ Произошла ошибка при поиске или анализе источников. Попробуйте позже.',
      token
    );
  }
}
