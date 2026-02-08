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

# 2. Проверка webhook
Write-Host "2. Проверка webhook..." -ForegroundColor Yellow
if ($token) {
    try {
        $webhookInfo = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getWebhookInfo" -ErrorAction Stop
        if ($webhookInfo.ok) {
            Write-Host "   URL: $($webhookInfo.result.url)" -ForegroundColor Green
            Write-Host "   Ожидающие обновления: $($webhookInfo.result.pending_update_count)" -ForegroundColor $(if ($webhookInfo.result.pending_update_count -gt 0) { "Yellow" } else { "Green" })
            
            if ($webhookInfo.result.pending_update_count -gt 0) {
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
        
        # Проверка endpoint
        try {
            $testBody = @{test=$true} | ConvertTo-Json
            $webResponse = Invoke-WebRequest -Uri "$vercelUrl/api/webhook" -Method POST -ContentType "application/json" -Body $testBody -UseBasicParsing -ErrorAction Stop
            Write-Host "   Endpoint отвечает (статус: $($webResponse.StatusCode))" -ForegroundColor Green
        } catch {
            $statusCode = $_.Exception.Response.StatusCode.value__
            if ($statusCode -eq 200 -or $statusCode -eq 405) {
                Write-Host "   Endpoint доступен (статус: $statusCode)" -ForegroundColor Green
            } else {
                Write-Host "   Endpoint вернул ошибку: $statusCode" -ForegroundColor Yellow
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
Write-Host "   Если бот не отвечает, проверьте:" -ForegroundColor White
Write-Host "   1. Vercel Dashboard -> Settings -> Environment Variables" -ForegroundColor Cyan
Write-Host "      Убедитесь, что все переменные добавлены для Production" -ForegroundColor Cyan
Write-Host ""
Write-Host "   2. Vercel Dashboard -> Deployments -> [последний деплой] -> Logs" -ForegroundColor Cyan
Write-Host "      Проверьте логи на наличие ошибок" -ForegroundColor Cyan
Write-Host ""
Write-Host "   3. Убедитесь, что проект успешно задеплоен:" -ForegroundColor Cyan
Write-Host "      Vercel Dashboard -> Deployments (должен быть статус Ready)" -ForegroundColor Cyan
Write-Host ""
Write-Host "   4. Проверьте переменные окружения на Vercel:" -ForegroundColor Cyan
Write-Host "      - BOT_TOKEN" -ForegroundColor White
Write-Host "      - GOOGLE_SEARCH_API_KEY" -ForegroundColor White
Write-Host "      - GOOGLE_SEARCH_ENGINE_ID" -ForegroundColor White
Write-Host "      - OPENROUTER_API_KEY (или OPENAI_API_KEY)" -ForegroundColor White
Write-Host "      - OPENAI_BASE_URL (опционально)" -ForegroundColor White
Write-Host ""

Write-Host "=== Диагностика завершена ===" -ForegroundColor Cyan
