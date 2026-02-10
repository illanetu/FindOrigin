/**
 * Валидация initData от Telegram Mini App (Web App).
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */

import crypto from 'crypto';

const WEBAPP_DATA_SECRET = 'WebAppData';

/**
 * Собирает data_check_string из сырой initData, сохраняя оригинальную кодировку
 * (Telegram подписывает именно такую строку).
 */
function buildDataCheckString(initData: string): string | null {
  const pairs = initData.trim().split('&').filter(Boolean);
  const withoutHash: string[] = [];
  for (const pair of pairs) {
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    const key = pair.slice(0, eq);
    if (key === 'hash') continue;
    withoutHash.push(pair);
  }
  withoutHash.sort((a, b) => {
    const keyA = a.slice(0, a.indexOf('='));
    const keyB = b.slice(0, b.indexOf('='));
    return keyA.localeCompare(keyB);
  });
  return withoutHash.join('\n');
}

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
  const token = botToken?.trim();
  if (!initData?.trim() || !token) return false;
  const initDataTrimmed = initData.trim();

  const params = new URLSearchParams(initDataTrimmed);
  const hash = params.get('hash');
  const authDate = params.get('auth_date');

  if (!hash || !authDate) return false;

  const authTimestamp = parseInt(authDate, 10);
  if (isNaN(authTimestamp)) return false;
  if (Date.now() / 1000 - authTimestamp > maxAgeSeconds) return false;

  const tryValidate = (dataCheckString: string) => {
    const computed = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    return computed === hash;
  };

  // Вариант 1: официальная формулировка — secret_key = bot_token (один шаг)
  let secretKey = token;
  const dataCheckStringRaw = buildDataCheckString(initDataTrimmed);
  if (dataCheckStringRaw && tryValidate(dataCheckStringRaw)) return true;

  // Вариант 2: secret_key = HMAC("WebAppData", bot_token), затем hash = HMAC(secret_key, data_check_string)
  secretKey = crypto
    .createHmac('sha256', WEBAPP_DATA_SECRET)
    .update(token)
    .digest();
  if (dataCheckStringRaw && tryValidate(dataCheckStringRaw)) return true;

  // Вариант 3: data_check_string из декодированных параметров (сырая строка не подошла)
  params.delete('hash');
  const dataCheckStringDecoded = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  if (dataCheckStringDecoded && tryValidate(dataCheckStringDecoded)) return true;

  return false;
}
