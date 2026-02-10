/**
 * Валидация initData от Telegram Mini App (Web App).
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */

import crypto from 'crypto';

const WEBAPP_DATA_SECRET = 'WebAppData';

/**
 * Проверяет подпись initData от Telegram Mini App.
 * initData — строка в формате query string (например из window.Telegram.WebApp.initData).
 * Возвращает true, если подпись верна и данные не просрочены (по умолчанию 24 часа).
 */
export function validateInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds: number = 24 * 60 * 60
): boolean {
  if (!initData || !botToken) return false;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  const authDate = params.get('auth_date');

  if (!hash || !authDate) return false;

  const authTimestamp = parseInt(authDate, 10);
  if (isNaN(authTimestamp)) return false;
  if (Date.now() / 1000 - authTimestamp > maxAgeSeconds) return false;

  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', botToken)
    .update(WEBAPP_DATA_SECRET)
    .digest();
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return computedHash === hash;
}
