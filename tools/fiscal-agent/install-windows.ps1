# Ponte di stampa Ristoflow su un PC Windows (stessa rete delle stampanti).
# Uso, da PowerShell:  irm https://raw.githubusercontent.com/ristomanager-it/gestionale-antonio/main/tools/fiscal-agent/install-windows.ps1 | iex
$ErrorActionPreference = 'Stop'
$base = 'https://raw.githubusercontent.com/ristomanager-it/gestionale-antonio/main/tools/fiscal-agent'
$dir  = Join-Path $env:USERPROFILE 'ristoflow-ponte'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Location $dir

function Trova-Python {
  $c = @("$env:LOCALAPPDATA\Programs\Python\Python312\python.exe", "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe",
         "$env:ProgramFiles\Python312\python.exe", "$env:ProgramFiles\Python313\python.exe")
  foreach ($p in $c) { if (Test-Path $p) { return $p } }
  $cmd = Get-Command python.exe -ErrorAction SilentlyContinue | Where-Object { $_.Source -notlike '*WindowsApps*' } | Select-Object -First 1
  if ($cmd) { return $cmd.Source }
  return $null
}

Write-Host '-> Controllo Python'
$py = Trova-Python
if (-not $py) {
  Write-Host '-> Installo Python (un paio di minuti)'
  winget install -e --id Python.Python.3.12 --scope user --silent --accept-package-agreements --accept-source-agreements | Out-Null
  $py = Trova-Python
}
if (-not $py) { throw 'Python non trovato: installalo da python.org e rilancia questo comando.' }
$pyw = Join-Path (Split-Path $py) 'pythonw.exe'
Write-Host "   $py"

Write-Host '-> Librerie'
& $py -m pip install --quiet --disable-pip-version-check websocket-client pillow brother-ql-next

Write-Host '-> Scarico il programma'
foreach ($f in 'agent.py','realtime.py','stampe.py','ponte.py','avvia.py') {
  Invoke-WebRequest -UseBasicParsing -Uri "$base/$f" -OutFile "$dir\$f"
}

if (-not (Test-Path "$dir\.env")) {
  Write-Host ''
  Write-Host '-> Configurazione (una volta sola)'
  $sec = Read-Host 'Incolla la chiave service_role di Supabase (non si vede mentre incolli)' -AsSecureString
  $key = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
  @(
    'SUPABASE_URL=https://cuhcscpvhypoaplcmtjk.supabase.co'
    "SUPABASE_SERVICE_ROLE_KEY=$($key.Trim())"
    'RISTOFLOW_AZIENDA_ID=b331365f-17db-4dda-aa2f-77a09427fe42'
    'RISTOFLOW_SEDE_ID=09649aaa-2b3b-4553-b20c-23c69512836a'
    'RISTOFLOW_STAMPANTI=192.168.1.114,192.168.1.5'
    "RISTOFLOW_PONTE_NOME=pc-$($env:COMPUTERNAME.ToLower())"
  ) | Set-Content -Encoding ASCII "$dir\.env"
} else { Write-Host '-> .env già presente: lo tengo' }

Write-Host '-> Il PC non va in sospensione quando è attaccato alla corrente'
powercfg /change standby-timeout-ac 0 | Out-Null
powercfg /change hibernate-timeout-ac 0 | Out-Null

Write-Host "-> Avvio automatico all'accensione"
$lnk = Join-Path ([Environment]::GetFolderPath('Startup')) 'Ristoflow ponte stampa.lnk'
$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut($lnk); $s.TargetPath = $pyw; $s.Arguments = "`"$dir\avvia.py`""; $s.WorkingDirectory = $dir; $s.Save()

Write-Host '-> Avvio il ponte'
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*ristoflow-ponte*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Process -FilePath $pyw -ArgumentList "`"$dir\avvia.py`"" -WorkingDirectory $dir
Start-Sleep -Seconds 10
if (Test-Path "$dir\agent.log") { Get-Content "$dir\agent.log" -Tail 8 }
Write-Host ''
Write-Host "== Fatto. Se vedi 'Realtime iscrizione: ok' il ponte è attivo. =="
