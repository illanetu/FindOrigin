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

### 4. API route не отвечает или возвращает 500

**Проверьте:**
- Переменная `BOT_TOKEN` добавлена в Vercel
- Runtime указан в `app/api/webhook/route.ts`: `export const runtime = 'nodejs';`
- Логи в Vercel Dashboard → Deployments → [ваш деплой] → Functions

### 5. Webhook не получает запросы от Telegram

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

### 6. Проблемы с типами TypeScript

**Решение:**
- Убедитесь, что `tsconfig.json` настроен правильно
- Проверьте, что все типы импортированы корректно
- Запустите: `npm run build` для проверки типов

### 7. Проблемы с путями импорта (@/)

**Решение:**
- Убедитесь, что в `tsconfig.json` есть:
```json
"paths": {
  "@/*": ["./*"]
}
```

### 8. Функция превышает таймаут

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
