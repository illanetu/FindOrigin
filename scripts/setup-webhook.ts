/**
 * Скрипт для настройки webhook в Telegram
 * Запуск: npx tsx scripts/setup-webhook.ts
 */

import { setWebhook, getWebhookInfo } from '../lib/webhook-setup';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function main() {
  const token = process.env.BOT_TOKEN;
  const webhookUrl = process.env.WEBHOOK_URL;

  if (!token) {
    console.error('Ошибка: BOT_TOKEN не найден в .env файле!');
    process.exit(1);
  }

  if (!webhookUrl) {
    console.error('Ошибка: WEBHOOK_URL не найден в .env файле!');
    console.error('Укажите URL вашего приложения, например: https://your-app.vercel.app/api/webhook');
    process.exit(1);
  }

  console.log('Проверка текущего webhook...');
  const currentInfo = await getWebhookInfo(token);
  if (currentInfo?.result?.url) {
    console.log(`Текущий webhook: ${currentInfo.result.url}`);
  }

  console.log(`\nУстановка webhook: ${webhookUrl}`);
  const success = await setWebhook(token, webhookUrl);

  if (success) {
    console.log('✅ Webhook успешно установлен!');
    
    // Проверяем информацию о webhook
    const info = await getWebhookInfo(token);
    if (info?.result) {
      console.log('\nИнформация о webhook:');
      console.log(JSON.stringify(info.result, null, 2));
    }
  } else {
    console.error('❌ Ошибка при установке webhook');
    process.exit(1);
  }
}

main().catch(console.error);
