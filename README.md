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

2. Создайте файл `.env` в корне проекта:
```
BOT_TOKEN=ваш_токен_бота
WEBHOOK_URL=https://your-app.vercel.app/api/webhook
GOOGLE_SEARCH_API_KEY=ваш_ключ_google_search_api
GOOGLE_SEARCH_ENGINE_ID=ваш_search_engine_id
OPENAI_API_KEY=ваш_ключ_openai_api
```

### Настройка API ключей

**Telegram Bot Token:**
- Найдите [@BotFather](https://t.me/BotFather) в Telegram
- Отправьте команду `/newbot`
- Следуйте инструкциям для создания бота
- Скопируйте полученный токен в `BOT_TOKEN`

**Google Custom Search API:**
1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите [Custom Search API](https://console.cloud.google.com/apis/library/customsearch.googleapis.com)
4. Создайте API ключ в разделе "Учетные данные"
5. Создайте поисковую систему в [Google Custom Search](https://programmablesearchengine.google.com/controlpanel/create)
   - Укажите сайты для поиска или выберите "Search the entire web"
6. Скопируйте API ключ в `GOOGLE_SEARCH_API_KEY`
7. Скопируйте Search Engine ID в `GOOGLE_SEARCH_ENGINE_ID`

**OpenAI API:**
1. Зарегистрируйтесь на [OpenAI Platform](https://platform.openai.com/)
2. Перейдите в раздел [API Keys](https://platform.openai.com/api-keys)
3. Создайте новый API ключ
4. Скопируйте ключ в `OPENAI_API_KEY`

## Разработка

Запуск в режиме разработки:
```powershell
npm run dev
```

Приложение будет доступно по адресу `http://localhost:3000`

## Деплой на Vercel

1. Подключите репозиторий к Vercel
2. Добавьте переменные окружения в настройках проекта:
   - `BOT_TOKEN` - токен вашего Telegram бота
   - `GOOGLE_SEARCH_API_KEY` - ключ Google Custom Search API
   - `GOOGLE_SEARCH_ENGINE_ID` - ID поисковой системы Google
   - `OPENAI_API_KEY` - ключ OpenAI API
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
- `lib/google-search.ts` - поиск источников через Google Custom Search API
- `lib/openai.ts` - AI-анализ источников с помощью OpenAI (gpt-4o-mini)
- `lib/webhook-setup.ts` - настройка webhook
- `scripts/setup-webhook.ts` - скрипт для настройки webhook

## Функционал

✅ Обработка текстовых сообщений  
✅ Поиск источников через Google Custom Search API  
✅ Поиск по категориям: официальные сайты, новости, блоги, научные публикации  
✅ AI-анализ источников с помощью OpenAI (gpt-4o-mini)  
✅ Семантическое сравнение текста с найденными источниками  
✅ Оценка релевантности и уверенности для каждого источника  
✅ Форматированный ответ с топ-3 источниками

## Как это работает

1. Пользователь отправляет боту текст или ссылку на Telegram-пост
2. Бот ищет источники информации через Google Custom Search API по разным категориям
3. Найденные источники анализируются с помощью OpenAI (gpt-4o-mini)
4. AI определяет релевантность каждого источника и степень соответствия
5. Пользователь получает форматированный ответ с топ-3 источниками, оценкой релевантности и объяснением