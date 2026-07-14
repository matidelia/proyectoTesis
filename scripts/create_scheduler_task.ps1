# Registra las tareas de mineria de Mercado Libre en el Programador de Tareas de Windows.
# Se registran bajo el usuario actual (no requiere Administrador); corren con la sesion iniciada.
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\create_scheduler_task.ps1

$BatchPath = "c:\Users\usuario\Downloads\proyectoTesis\scripts\run_mining_task.bat"
$TaskNamePrefix = "MercadoLibre_Mining"

if (-not (Test-Path $BatchPath)) {
    Write-Error "Batch file not found at $BatchPath"
    exit 1
}

# Horarios de ejecucion diaria (3 corridas para capturar fluctuacion de precios)
$Times = @("08:00", "16:00", "23:30")

Write-Host "Registrando tareas diarias a las: $($Times -join ', ')" -ForegroundColor Cyan

foreach ($Time in $Times) {
    $TaskName = "${TaskNamePrefix}_" + $Time.Replace(':', '')

    # Sobrescribir si ya existe
    schtasks /query /tn "$TaskName" 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "La tarea $TaskName ya existe. Sobrescribiendo..." -ForegroundColor Yellow
        schtasks /delete /tn "$TaskName" /f | Out-Null
    }

    # Crear la tarea bajo el usuario actual (corre solo con sesion iniciada,
    # pero no requiere permisos de Administrador)
    schtasks /create /tn "$TaskName" /tr "cmd.exe /c `"$BatchPath`"" /sc daily /st $Time /f

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Tarea registrada: $TaskName" -ForegroundColor Green
    } else {
        Write-Error "Fallo al registrar: $TaskName"
    }
}

Write-Host "`nListo. Verificar con: Get-ScheduledTask -TaskName '$TaskNamePrefix*'" -ForegroundColor Green
