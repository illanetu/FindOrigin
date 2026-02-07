/**
 * Утилита для настройки webhook в Telegram
 */

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

/**
 * Установка webhook URL в Telegram
 */
export async function setWebhook(token: string, webhookUrl: string): Promise<boolean> {
  try {
    const url = `${TELEGRAM_API_URL}${token}/setWebhook`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Telegram API error: ${error.description || response.statusText}`);
    }

    const result = await response.json();
    return result.ok === true;
  } catch (error) {
    console.error('Error setting webhook:', error);
    return false;
  }
}

/**
 * Получение информации о текущем webhook
 */
export async function getWebhookInfo(token: string): Promise<any> {
  try {
    const url = `${TELEGRAM_API_URL}${token}/getWebhookInfo`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting webhook info:', error);
    return null;
  }
}

/**
 * Удаление webhook
 */
export async function deleteWebhook(token: string): Promise<boolean> {
  try {
    const url = `${TELEGRAM_API_URL}${token}/deleteWebhook`;
    
    const response = await fetch(url, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.ok === true;
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return false;
  }
}
