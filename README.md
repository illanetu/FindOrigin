# FindOrigin Bot

Telegram-бот для поиска источников информации. Получает текст или ссылку на пост и пытается найти источник этой информации.

## Технологии

- **Next.js 14** - React фреймворк
- **TypeScript** - типизация
- **Vercel** - деплой

## Установка

1. Установите зависимости:
```powershell
npm install
```

2. Создайте файл `.env` в корне проекта (скопируйте из `.env.example`):
```
BOT_TOKEN=ваш_токен_бота
WEBHOOK_URL=https://your-app.vercel.app/api/webhook
```

Чтобы получить токен бота:
- Найдите [@BotFather](https://t.me/BotFather) в Telegram
- Отправьте команду `/newbot`
- Следуйте инструкциям для создания бота
- Скопируйте полученный токен в файл `.env`

## Разработка

Запуск в режиме разработки:
```powershell
npm run dev
```

Приложение будет доступно по адресу `http://localhost:3000`

## Деплой на Vercel

1. Подключите репозиторий к Vercel
2. Добавьте переменные окружения в настройках проекта:
   - `BOT_TOKEN` - токен вашего бота
3. После деплоя обновите `WEBHOOK_URL` в `.env` на ваш Vercel URL
4. Настройте webhook:
```powershell
npm run setup-webhook
```

Или вручную через API:
```powershell
$token = "your_bot_token"
$webhookUrl = "https://your-app.vercel.app/api/webhook"
Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/setWebhook" -Method Post -Body (@{url=$webhookUrl} | ConvertTo-Json) -ContentType "application/json"
```

## Структура проекта

- `app/api/webhook/route.ts` - обработчик webhook от Telegram
- `lib/telegram.ts` - утилиты для работы с Telegram API
- `lib/text-extraction.ts` - извлечение данных из текста
- `lib/webhook-setup.ts` - настройка webhook
- `scripts/setup-webhook.ts` - скрипт для настройки webhook

## Текущий функционал

✅ Обработка текстовых сообщений  
✅ Извлечение ключевых утверждений  
✅ Извлечение дат, чисел, имен, ссылок  
✅ Базовая обработка ссылок на Telegram-посты  
⏳ Поиск источников (в разработке)  
⏳ AI-анализ и сравнение смысла (в разработке)