/**
 * Утилиты для работы с Telegram Bot API
 */

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

export interface TelegramMessage {
  message_id: number;
  from?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  date: number;
  text?: string;
  entities?: Array<{
    type: string;
    offset: number;
    length: number;
    url?: string;
  }>;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}

/**
 * Отправка сообщения через Telegram Bot API
 */
export async function sendTelegramMessage(
  chatId: number,
  text: string,
  token: string
): Promise<void> {
  const url = `${TELEGRAM_API_URL}${token}/sendMessage`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Telegram API error: ${error.description || response.statusText}`);
  }
}

/**
 * Получение информации о сообщении из Telegram-поста по ссылке
 */
export async function getTelegramPostContent(
  link: string,
  token: string
): Promise<string | null> {
  try {
    // Парсинг ссылки на Telegram-пост
    // Формат: https://t.me/channel/123 или https://t.me/c/channel_id/123
    const match = link.match(/t\.me\/(?:c\/)?([^\/]+)\/(\d+)/);
    if (!match) {
      return null;
    }

    const [, channel, postId] = match;
    
    // Попытка получить информацию о посте через Telegram API
    // Примечание: для этого может потребоваться, чтобы бот был администратором канала
    // или использовать другие методы получения контента
    
    // Временная заглушка - в реальной реализации нужно использовать
    // методы Telegram API для получения контента поста
    return null;
  } catch (error) {
    console.error('Error getting Telegram post content:', error);
    return null;
  }
}
