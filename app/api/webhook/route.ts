import { NextRequest, NextResponse } from 'next/server';
import { TelegramUpdate, sendTelegramMessage, getTelegramPostContent } from '@/lib/telegram';
import { extractData, cleanText, normalizeDate } from '@/lib/text-extraction';

// Настройка runtime для Vercel (nodejs для полной поддержки всех API)
export const runtime = 'nodejs';

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
  let text = message.text;

  // Проверяем, является ли сообщение ссылкой на Telegram-пост
  const telegramLinkPattern = /https?:\/\/t\.me\/[^\s]+/;
  const telegramLink = text.match(telegramLinkPattern)?.[0];
  
  if (telegramLink) {
    // Пытаемся извлечь текст из поста
    const postContent = await getTelegramPostContent(telegramLink, token);
    if (postContent) {
      text = postContent;
    } else {
      // Если не удалось извлечь, используем исходный текст
      await sendTelegramMessage(
        chatId,
        'Получена ссылка на Telegram-пост. Обработка ссылок на посты будет реализована позже.',
        token
      );
      return;
    }
  }

  // Очищаем текст
  const cleanedText = cleanText(text);

  // Извлекаем данные из текста
  const extractedData = extractData(cleanedText);

  // Нормализуем даты
  const normalizedDates = extractedData.dates.map(normalizeDate);

  // Формируем ответ пользователю
  let responseText = '📋 Извлеченные данные из текста:\n\n';
  
  if (extractedData.keyStatements.length > 0) {
    responseText += '🔑 Ключевые утверждения:\n';
    extractedData.keyStatements.slice(0, 3).forEach((stmt, idx) => {
      responseText += `${idx + 1}. ${stmt}\n`;
    });
    responseText += '\n';
  }

  if (normalizedDates.length > 0) {
    responseText += `📅 Даты: ${normalizedDates.join(', ')}\n\n`;
  }

  if (extractedData.numbers.length > 0) {
    responseText += `🔢 Числа: ${extractedData.numbers.slice(0, 5).join(', ')}\n\n`;
  }

  if (extractedData.names.length > 0) {
    responseText += `👤 Имена: ${extractedData.names.slice(0, 5).join(', ')}\n\n`;
  }

  if (extractedData.links.length > 0) {
    responseText += `🔗 Ссылки: ${extractedData.links.join(', ')}\n\n`;
  }

  if (
    extractedData.keyStatements.length === 0 &&
    normalizedDates.length === 0 &&
    extractedData.numbers.length === 0 &&
    extractedData.names.length === 0 &&
    extractedData.links.length === 0
  ) {
    responseText = 'Не удалось извлечь структурированные данные из текста.';
  }

  responseText += '\n⏳ Поиск источников будет реализован на следующем этапе.';

  // Отправляем ответ
  await sendTelegramMessage(chatId, responseText, token);
}
