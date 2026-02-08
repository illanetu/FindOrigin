# Скрипт для диагностики проблем с ботом
# Использование: .\scripts\diagnose-bot.ps1

Write-Host "=== Диагностика бота ===" -ForegroundColor Cyan
Write-Host ""

# 1. Проверка токена
Write-Host "1. Проверка токена бота..." -ForegroundColor Yellow
$envFile = Get-Content .env -ErrorAction SilentlyContinue
if ($envFile) {
    $tokenLine = $envFile | Where-Object { $_ -match "BOT_TOKEN" }
    if ($tokenLine) {
        $token = $tokenLine.Split('=')[1].Trim()
        Write-Host "   Токен найден: $($token.Substring(0, 10))..." -ForegroundColor Green
        
        # Проверка валидности токена
        try {
            $botInfo = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getMe" -ErrorAction Stop
            if ($botInfo.ok) {
                Write-Host "   Бот: @$($botInfo.result.username)" -ForegroundColor Green
            }
        } catch {
            Write-Host "   ОШИБКА: Неверный токен!" -ForegroundColor Red
        }
    } else {
        Write-Host "   ОШИБКА: BOT_TOKEN не найден в .env" -ForegroundColor Red
    }
} else {
    Write-Host "   ОШИБКА: Файл .env не найден" -ForegroundColor Red
}
Write-Host ""

# 2. Проверка webhook (и последней ошибки от Telegram!)
Write-Host "2. Проверка webhook..." -ForegroundColor Yellow
if ($token) {
    try {
        $webhookInfo = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getWebhookInfo" -ErrorAction Stop
        if ($webhookInfo.ok) {
            $r = $webhookInfo.result
            Write-Host "   URL: $($r.url)" -ForegroundColor Green
            Write-Host "   Ожидающие обновления: $($r.pending_update_count)" -ForegroundColor $(if ($r.pending_update_count -gt 0) { "Yellow" } else { "Green" })
            if ($r.last_error_message) {
                Write-Host "   ПОСЛЕДНЯЯ ОШИБКА ОТ TELEGRAM: $($r.last_error_message)" -ForegroundColor Red
                Write-Host "   (значит Telegram шлёт запросы, но сервер отвечает ошибкой)" -ForegroundColor Gray
            } else {
                Write-Host "   Последняя ошибка: нет (Telegram не сообщал об ошибках)" -ForegroundColor Green
            }
            if ($r.pending_update_count -gt 0) {
                Write-Host "   ВНИМАНИЕ: Есть необработанные обновления!" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "   ОШИБКА: Не удалось получить информацию о webhook" -ForegroundColor Red
    }
}
Write-Host ""

# 3. Проверка переменных окружения
Write-Host "3. Проверка переменных окружения в .env..." -ForegroundColor Yellow
$requiredVars = @("BOT_TOKEN", "GOOGLE_SEARCH_API_KEY", "GOOGLE_SEARCH_ENGINE_ID", "OPENROUTER_API_KEY", "OPENAI_API_KEY")
$foundVars = @()

if ($envFile) {
    foreach ($var in $requiredVars) {
        $varLine = $envFile | Where-Object { $_ -match "^[^#]*$var\s*=" }
        if ($varLine) {
            $foundVars += $var
            Write-Host "   $var: найдено" -ForegroundColor Green
        } else {
            Write-Host "   $var: НЕ НАЙДЕНО" -ForegroundColor Red
        }
    }
}
Write-Host ""

# 4. Проверка доступности Vercel
Write-Host "4. Проверка доступности Vercel..." -ForegroundColor Yellow
$vercelUrl = "https://findorigin.vercel.app"
try {
    $response = Test-NetConnection -ComputerName findorigin.vercel.app -Port 443 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($response) {
        Write-Host "   Сервер доступен" -ForegroundColor Green
        
        # Проверка POST к /api/telegram (рекомендуемый webhook)
        try {
            $testBody = '{"update_id":1,"message":{"message_id":1,"chat":{"id":123,"type":"private"},"date":1234567890,"text":"test"}}'
            $webResponse = Invoke-WebRequest -Uri "$vercelUrl/api/telegram" -Method POST -ContentType "application/json" -Body $testBody -UseBasicParsing -ErrorAction Stop
            Write-Host "   POST /api/telegram: $($webResponse.StatusCode) OK" -ForegroundColor Green
        } catch {
            $statusCode = $_.Exception.Response.StatusCode.value__
            Write-Host "   POST /api/telegram: $statusCode" -ForegroundColor $(if ($statusCode -eq 405) { "Red" } else { "Yellow" })
            if ($statusCode -eq 405) {
                Write-Host "   Если 405 — Telegram тоже получит 405, запросы 'не доходят' в логах (Telegram перестаёт слать после ошибки)" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "   Сервер недоступен" -ForegroundColor Red
    }
} catch {
    Write-Host "   ОШИБКА: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 5. Рекомендации
Write-Host "5. Рекомендации:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Если в логах Vercel только GET / и нет POST /api/telegram:" -ForegroundColor White
Write-Host "   • Выше смотрите 'ПОСЛЕДНЯЯ ОШИБКА ОТ TELEGRAM' — если есть 405, ваш POST с компа тоже даёт 405, нужно чинить endpoint" -ForegroundColor Cyan
Write-Host "   • Выше смотрите 'POST /api/telegram' — должен быть 200. Если 405: Settings -> Deployment Protection отключить для Production" -ForegroundColor Cyan
Write-Host "   • Vercel -> Firewall: не блокировать запросы к /api/telegram" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Переменные на Vercel (Settings -> Environment Variables, Production):" -ForegroundColor White
Write-Host "   BOT_TOKEN, GOOGLE_SEARCH_API_KEY, GOOGLE_SEARCH_ENGINE_ID, OPENROUTER_API_KEY или OPENAI_API_KEY" -ForegroundColor Cyan
Write-Host ""

Write-Host "=== Диагностика завершена ===" -ForegroundColor Cyan
