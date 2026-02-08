# Решение проблем с Vercel

## Типичные проблемы и их решения

### 1. Ошибка "No Output Directory named 'public' found"

**Решение:**
- Убедитесь, что файл `vercel.json` существует в корне проекта
- Убедитесь, что директория `public` существует (даже если она пустая)
- В настройках проекта Vercel (Settings → General) оставьте "Output Directory" пустым для Next.js проектов

### 2. Ошибка сборки на Vercel

**Проверьте:**
- Все зависимости указаны в `package.json` (не только в `devDependencies`)
- TypeScript компилируется без ошибок: `npm run build`
- Нет проблем с импортами и путями

**Решение:**
```powershell
# Проверьте локально
npm run build
```

### 3. Переменные окружения не работают

**Решение:**
1. В Vercel Dashboard → Settings → Environment Variables
2. Добавьте переменные:
   - `BOT_TOKEN` - токен вашего бота
   - Для Production, Preview и Development окружений
3. После добавления переменных пересоберите проект

### 4. Ошибка 405 Method Not Allowed на POST /api/webhook

**Частая причина: Deployment Protection (защита деплоя).**

1. Откройте **Vercel Dashboard** → ваш проект **FindOrigin** → **Settings** → **Deployment Protection**.
2. Для **Production** отключите защиту или выберите вариант, при котором публичные запросы к API не блокируются (например, «Only Preview Deployments» или отключите для Production).
3. Telegram шлёт POST без авторизации — если включена Vercel Authentication / Password Protection, POST к `/api/webhook` будет получать 405 или 403.
4. Сохраните настройки и снова проверьте POST (см. README или скрипт проверки).

**Проверка с вашего ПК:** если GET к `https://ваш-проект.vercel.app/api/webhook` возвращает 200, а POST — 405, почти всегда виновата защита деплоя или фаервол проекта.

### 4b. В логах Vercel только GET /, запросов к /api/telegram нет, бот молчит

Это значит одно из двух: **запросы от Telegram до Vercel не доходят** или **Telegram получает ошибку и перестаёт слать**.

1. **Узнайте, что видит Telegram:**  
   `Invoke-RestMethod -Uri "https://api.telegram.org/botВАШ_ТОКЕН/getWebhookInfo" | ConvertTo-Json -Depth 5`  
   Смотрите **`last_error_message`**. Если там есть текст (например «405 Method Not Allowed») — Telegram **доходит** до вашего URL, но сервер отвечает ошибкой. Тогда нужно чинить endpoint (см. п. 4 про Deployment Protection и POST).

2. **Проверьте POST с вашего ПК:**  
   POST к `https://ваш-проект.vercel.app/api/telegram` с телом-JSON. Если у вас 405, то и у Telegram 405 — в логах POST не будет, т.к. Telegram после ошибки не ретраит бесконечно.

3. **Vercel Firewall:**  
   В проекте: Settings → Firewall. Убедитесь, что не блокируются запросы к `/api/telegram` (или отключите правила для проверки).

4. **Логи:**  
   В Logs откройте фильтр по пути или поиск по «telegram» / «POST», чтобы не смотреть только GET.

### 4c. В логах нет ни одного сообщения про telegram — проблема в Telegram?

Скорее всего **не в самом Telegram**, а в том, что запросы от серверов Telegram до Vercel не доходят или блокируются.

**Проверка «Telegram точно шлёт обновления»:**

1. Временно снимите webhook и включите режим getUpdates — так вы убедитесь, что бот вообще получает сообщения.
2. Настройте webhook снова и проверьте **Vercel Firewall** — часто запросы от IP Telegram блокируются.

**Команды (PowerShell):**

```powershell
# 1) Снять webhook
Invoke-RestMethod -Uri "https://api.telegram.org/botВАШ_ТОКЕН/deleteWebhook"

# 2) Написать боту в Telegram одно сообщение

# 3) Получить обновления вручную — если здесь есть update, значит Telegram доставляет
Invoke-RestMethod -Uri "https://api.telegram.org/botВАШ_ТОКЕН/getUpdates" | ConvertTo-Json -Depth 10
```

Если в `getUpdates` есть ваше сообщение — **Telegram работает**, обновления есть. Тогда снова поставьте webhook и проверьте **Vercel → Settings → Firewall**: отключите правила для проверки или добавьте исключение для пути `/api/telegram`, чтобы запросы от любых IP (в т.ч. серверов Telegram) не блокировались.

**Итог:** если с вашего ПК POST к `/api/telegram` возвращает 200, а в логах Vercel вызовов нет — запросы от Telegram либо блокируются (Firewall), либо не доходят до того же деплоя. Проверка через getUpdates подтверждает, что «проблема не в Telegram».

### 5. API route не отвечает или возвращает 500

**Проверьте:**
- Переменная `BOT_TOKEN` добавлена в Vercel
- Webhook реализован в `pages/api/webhook.ts` (Pages Router)
- Логи в Vercel Dashboard → Deployments → [ваш деплой] → Functions

### 6. Webhook не получает запросы от Telegram

**Решение:**
1. Убедитесь, что проект задеплоен и доступен
2. Получите URL вашего приложения из Vercel Dashboard
3. Настройте webhook:
```powershell
npm run setup-webhook
```

Или вручную:
```powershell
$token = "ваш_токен"
$webhookUrl = "https://ваш-проект.vercel.app/api/webhook"
Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/setWebhook" -Method Post -Body (@{url=$webhookUrl} | ConvertTo-Json) -ContentType "application/json"
```

4. Проверьте статус webhook:
```powershell
Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getWebhookInfo"
```

### 7. Проблемы с типами TypeScript

**Решение:**
- Убедитесь, что `tsconfig.json` настроен правильно
- Проверьте, что все типы импортированы корректно
- Запустите: `npm run build` для проверки типов

### 8. Проблемы с путями импорта (@/)

**Решение:**
- Убедитесь, что в `tsconfig.json` есть:
```json
"paths": {
  "@/*": ["./*"]
}
```

### 9. Функция превышает таймаут

**Решение:**
- Убедитесь, что основной ответ (200 OK) отправляется быстро
- Долгие операции выполняются асинхронно (не блокируют ответ)
- В Vercel есть лимит на время выполнения функции

## Проверка конфигурации

### Правильная структура проекта:
```
HelloBot/
├── app/
│   ├── api/
│   │   └── webhook/
│   │       └── route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── lib/
├── public/
├── package.json
├── next.config.js
├── tsconfig.json
└── vercel.json
```

### Правильный vercel.json:
```json
{
  "framework": "nextjs"
}
```

### Правильный next.config.js:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
```

## Полезные команды

```powershell
# Локальная проверка сборки
npm run build

# Проверка типов
npm run lint

# Запуск в режиме разработки
npm run dev

# Проверка webhook
$token = "ваш_токен"
Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getWebhookInfo"
```

## Где найти логи

1. Vercel Dashboard → Deployments
2. Выберите нужный деплой
3. Откройте вкладку "Functions" или "Logs"
4. Там будут все ошибки и логи выполнения

## Контакты для поддержки

- Документация Vercel: https://vercel.com/docs
- Документация Next.js: https://nextjs.org/docs
