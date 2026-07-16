# Registra las tareas de mineria de Mercado Libre en el Programador de Tareas de Windows.
# Se registran bajo el usuario actual (no requiere Administrador); corren con la sesion iniciada.
# Config critica para notebooks:
#   - AllowStartIfOnBatteries:    arranca aunque este a bateria
#   - DontStopIfGoingOnBatteries: NO se mata si se desenchufa el cargador
#   - StartWhenAvailable:         recupera corridas perdidas al prender la PC
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\create_scheduler_task.ps1

$BatchPath = "c:\Users\usuario\Downloads\proyectoTesis\scripts\run_mining_task.bat"
$TaskNamePrefix = "MercadoLibre_Mining"

if (-not (Test-Path $BatchPath)) {
    Write-Error "Batch file not found at $BatchPath"
    exit 1
}

# Horarios de ejecucion diaria (3 corridas para capturar fluctuacion de precios)
$Times = @("08:00", "16:00", "23:30")

$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 4)

Write-Host "Registrando tareas diarias a las: $($Times -join ', ')" -ForegroundColor Cyan

foreach ($Time in $Times) {
    $TaskName = "${TaskNamePrefix}_" + $Time.Replace(':', '')

    # Eliminar version anterior si existe (schtasks no falla el script si no existe)
    schtasks /delete /tn "$TaskName" /f 2>$null | Out-Null

    $Action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$BatchPath`""
    $Trigger = New-ScheduledTaskTrigger -Daily -At $Time

    try {
        Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Force -ErrorAction Stop | Out-Null
        Write-Host "Tarea registrada: $TaskName" -ForegroundColor Green
    } catch {
        Write-Error "Fallo al registrar ${TaskName}: $($_.Exception.Message)"
    }
}

Write-Host "`nListo. Verificar con: Get-ScheduledTask -TaskName '$TaskNamePrefix*'" -ForegroundColor Green
