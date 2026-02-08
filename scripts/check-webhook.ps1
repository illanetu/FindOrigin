# Скрипт для проверки webhook
# Использование: .\scripts\check-webhook.ps1

param(
    [string]$VercelUrl = "https://findorigin.vercel.app",
    [string]$Token = ""
)

Write-Host "=== Проверка webhook ===" -ForegroundColor Cyan
Write-Host ""

# 1. Проверка доступности сервера
Write-Host "1. Проверка доступности сервера..." -ForegroundColor Yellow
try {
    $test = Test-NetConnection -ComputerName findorigin.vercel.app -Port 443 -InformationLevel Quiet
    if ($test) {
        Write-Host "   ✓ Сервер доступен" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Сервер недоступен" -ForegroundColor Red
    }
} catch {
    Write-Host "   ✗ Ошибка: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 2. Проверка webhook в Telegram
if ($Token) {
    Write-Host "2. Проверка webhook в Telegram..." -ForegroundColor Yellow
    try {
        $webhookInfo = Invoke-RestMethod -Uri "https://api.telegram.org/bot$Token/getWebhookInfo"
        if ($webhookInfo.ok) {
            Write-Host "   ✓ Webhook настроен" -ForegroundColor Green
            Write-Host "   URL: $($webhookInfo.result.url)" -ForegroundColor Gray
            Write-Host "   Ожидающие обновления: $($webhookInfo.result.pending_update_count)" -ForegroundColor Gray
            Write-Host "   IP адрес: $($webhookInfo.result.ip_address)" -ForegroundColor Gray
        } else {
            Write-Host "   ✗ Ошибка получения информации о webhook" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ✗ Ошибка: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# 3. Проверка endpoint через POST запрос
Write-Host "3. Проверка endpoint /api/webhook..." -ForegroundColor Yellow
$webhookUrl = "$VercelUrl/api/webhook"
Write-Host "   URL: $webhookUrl" -ForegroundColor Gray

$testBody = @{
    update_id = 123456
    message = @{
        message_id = 1
        chat = @{
            id = 123456
            type = "private"
        }
        date = [int](Get-Date -UFormat %s)
        text = "test"
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri $webhookUrl -Method POST -ContentType "application/json" -Body $testBody -ErrorAction Stop
    Write-Host "   ✓ Endpoint отвечает" -ForegroundColor Green
    Write-Host "   Ответ: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "   ⚠ Статус: $statusCode" -ForegroundColor Yellow
    if ($statusCode -eq 200 -or $statusCode -eq 405) {
        Write-Host "   ℹ Endpoint доступен (405 - нормально для тестового запроса)" -ForegroundColor Cyan
    } else {
        Write-Host "   ✗ Ошибка: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# 4. Рекомендации
Write-Host "4. Как протестировать бота:" -ForegroundColor Yellow
Write-Host "   • Откройте Telegram и найдите вашего бота" -ForegroundColor White
Write-Host "   • Отправьте боту любое текстовое сообщение" -ForegroundColor White
Write-Host "   • Бот должен ответить с результатами поиска источников" -ForegroundColor White
Write-Host "   • Проверьте логи на Vercel Dashboard -> Deployments -> Logs" -ForegroundColor White
Write-Host ""

Write-Host "=== Проверка завершена ===" -ForegroundColor Cyan
