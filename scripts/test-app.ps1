# Скрипт для проверки работы приложения
# Использование: .\scripts\test-app.ps1

param(
    [string]$VercelUrl = "",
    [string]$Token = ""
)

Write-Host "=== Проверка работы приложения ===" -ForegroundColor Cyan
Write-Host ""

# 1. Проверка локальной сборки
Write-Host "1. Проверка локальной сборки..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ Сборка успешна" -ForegroundColor Green
} else {
    Write-Host "   ✗ Ошибка сборки" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 2. Проверка API endpoint (если указан URL)
if ($VercelUrl) {
    Write-Host "2. Проверка API endpoint на Vercel..." -ForegroundColor Yellow
    Write-Host "   URL: $VercelUrl/api/webhook" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri "$VercelUrl/api/webhook" -Method POST -ContentType "application/json" -Body '{"test":true}' -ErrorAction Stop
        Write-Host "   ✓ Endpoint доступен (статус: $($response.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "   ✗ Endpoint недоступен или ошибка: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# 3. Проверка webhook в Telegram (если указан токен)
if ($Token) {
    Write-Host "3. Проверка webhook в Telegram..." -ForegroundColor Yellow
    try {
        $webhookInfo = Invoke-RestMethod -Uri "https://api.telegram.org/bot$Token/getWebhookInfo"
        if ($webhookInfo.ok) {
            Write-Host "   ✓ Webhook настроен" -ForegroundColor Green
            Write-Host "   URL: $($webhookInfo.result.url)" -ForegroundColor Gray
            Write-Host "   Ожидающие обновления: $($webhookInfo.result.pending_update_count)" -ForegroundColor Gray
        } else {
            Write-Host "   ✗ Ошибка получения информации о webhook" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ✗ Ошибка: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "=== Проверка завершена ===" -ForegroundColor Cyan
