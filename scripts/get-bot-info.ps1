# Скрипт для получения информации о боте
# Использование: .\scripts\get-bot-info.ps1

$envFile = Get-Content .env
$tokenLine = $envFile | Where-Object { $_ -match "BOT_TOKEN" }
$token = $tokenLine.Split('=')[1].Trim()

Write-Host "=== Информация о боте ===" -ForegroundColor Cyan
Write-Host ""

try {
    $botInfo = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getMe"
    
    if ($botInfo.ok) {
        Write-Host "Имя бота: @$($botInfo.result.username)" -ForegroundColor Green
        Write-Host "Полное имя: $($botInfo.result.first_name)" -ForegroundColor Green
        if ($botInfo.result.last_name) {
            Write-Host "Фамилия: $($botInfo.result.last_name)" -ForegroundColor Green
        }
        Write-Host ""
        Write-Host "ID: $($botInfo.result.id)" -ForegroundColor Gray
        Write-Host "Может присоединяться к группам: $($botInfo.result.can_join_groups)" -ForegroundColor Gray
        Write-Host "Может читать сообщения: $($botInfo.result.can_read_all_group_messages)" -ForegroundColor Gray
        Write-Host "Поддерживает inline запросы: $($botInfo.result.supports_inline_queries)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Ссылка на бота: https://t.me/$($botInfo.result.username)" -ForegroundColor Yellow
    } else {
        Write-Host "Ошибка получения информации о боте" -ForegroundColor Red
    }
} catch {
    Write-Host "Ошибка: $($_.Exception.Message)" -ForegroundColor Red
}
