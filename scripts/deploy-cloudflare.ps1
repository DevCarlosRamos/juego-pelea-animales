#Requires -Version 5.1
<#
.SYNOPSIS
  Despliega PELEA CON ANIMALES en Cloudflare (Cloudflare Pages + Pages Functions + D1).

.DESCRIPTION
  Automatiza TODO el despliegue a producción:
    1. Verifica Node y dependencias (wrangler).
    2. Autenticación con Cloudflare (wrangler login) si no hay sesión.
    3. Crea/verifica la base de datos D1 y actualiza wrangler.toml.
    4. Aplica el esquema de la base de datos (d1/schema.sql) en remoto.
    5. Crea el proyecto de Cloudflare Pages si no existe.
    6. Despliega el frontend + Pages Functions.
    7. Configura el dominio personalizado y el DNS (CNAME a pages.dev).
    8. Verifica que todo responde por HTTPS.

.PARAMETER SkipLogin
  Omite el paso de login (útil cuando CLOUDFLARE_API_TOKEN ya está definido
  o ya hay sesión de wrangler).

.PARAMETER NoDomain
  Despliega solo a pages.dev sin tocar DNS ni el dominio personalizado.

.EXAMPLE
  .\scripts\deploy-cloudflare.ps1

.EXAMPLE
  .\scripts\deploy-cloudflare.ps1 -NoDomain
#>
[CmdletBinding()]
param(
  [string]$Project = 'juego-pelea-animales',
  [string]$DbName = 'pelea-animales-db',
  [string]$Domain = 'pelea-animales.devcarlosramos.uk',
  [string]$Zone = 'devcarlosramos.uk',
  [string]$AccountId = 'dddf712d62299484667edb2d69761ffc',
  [switch]$SkipLogin,
  [switch]$NoDomain
)

Set-StrictMode -Version Latest
# NOTA: NO usar 'Stop' global en Windows PowerShell 5.1: convierte los warnings
# de stderr de comandos nativos (wrangler/node) en errores terminantes.
# Los fallos críticos se controlan con throw explícitos y $LASTEXITCODE.
$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Step([string]$m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Ok([string]$m)   { Write-Host "    OK: $m" -ForegroundColor Green }
function Warn([string]$m) { Write-Host "    AVISO: $m" -ForegroundColor Yellow }

# ============================================================
# 1. Prerrequisitos
# ============================================================
Step '1/8 Verificando Node.js y dependencias (wrangler)'
node --version | Out-Null
if (-not (Test-Path 'node_modules\.bin\wrangler.cmd')) {
  Write-Host 'Instalando wrangler (dependencia local)...'
  npm install
}
Ok 'wrangler disponible'

# ============================================================
# 2. Autenticación con Cloudflare
# ============================================================
Step '2/8 Autenticación de wrangler'

# Ubicación del archivo de sesión de wrangler (varía según SO/XDG)
function Find-WrConfig {
  $candidates = @(
    (Join-Path $env:USERPROFILE '.wrangler\config\default.toml'),
    (Join-Path $env:APPDATA 'xdg.config\.wrangler\config\default.toml')
  )
  if ($env:XDG_CONFIG_HOME) {
    $candidates += (Join-Path $env:XDG_CONFIG_HOME '.wrangler\config\default.toml')
  }
  foreach ($c in $candidates) { if (Test-Path $c) { return $c } }
  return $null
}
$WrConfig = Find-WrConfig

function Test-WrLogin {
  npx wrangler whoami *> $null
  return ($LASTEXITCODE -eq 0)
}

if ($env:CLOUDFLARE_API_TOKEN) {
  Ok 'Se usará CLOUDFLARE_API_TOKEN (variable de entorno)'
} elseif (Test-WrLogin) {
  Ok 'Ya hay una sesión guardada de wrangler'
} elseif ($SkipLogin) {
  throw 'Sin sesión de wrangler y -SkipLogin activo. Ejecuta antes: wrangler login'
} else {
  Write-Host 'Se abrirá el navegador para autorizar wrangler (una sola vez)...'
  npx wrangler login
  $WrConfig = Find-WrConfig
  if (-not (Test-WrLogin)) { throw 'El login de wrangler no se completó.' }
  Ok 'Login completado'
}

# ============================================================
# 3. Base de datos D1 (crear si falta y actualizar wrangler.toml)
# ============================================================
Step '3/8 Creando/verificando la base de datos D1'
$cfgPath = Join-Path $Root 'wrangler.toml'
$cfgText = Get-Content $cfgPath -Raw
$placeholder = '00000000-0000-0000-0000-000000000001'
$dbId = ''
if ($cfgText -match 'database_id\s*=\s*"([^"]+)"') { $dbId = $matches[1] }

if (-not $dbId -or $dbId -eq $placeholder) {
  $out = npx wrangler d1 create $DbName --binding DB --update-config --location weur 2>$null | Out-String

  # Buscar el uuid REAL en la salida del comando (el --update-config a veces no escribe la config)
  $realUuid = ''
  if ($out -match 'database_id\s*=\s*"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"') {
    $realUuid = $matches[1]
  } elseif ($out -match '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') {
    $realUuid = $matches[1]
  }

  if ($realUuid -and $realUuid -ne $placeholder) {
    $dbId = $realUuid
    # Asegurar que wrangler.toml contiene el id real
    $cfgText = Get-Content $cfgPath -Raw
    if ($cfgText -notmatch [regex]::Escape($dbId)) {
      $cfgText = $cfgText -replace 'database_id\s*=\s*"[^"]*"', "database_id = `"$dbId`""
      Set-Content -Path $cfgPath -Value $cfgText -Encoding UTF8
    }
    Ok "D1 '$DbName' creada (uuid $dbId)"
  } else {
    Warn "No se pudo crear la D1 (quizá ya existía). Obteniendo uuid desde 'wrangler d1 list'..."
    $list = npx wrangler d1 list 2>$null | Out-String
    foreach ($line in ($list -split "`n")) {
      if ($line -match [regex]::Escape($DbName) -and
          $line -match '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') {
        $dbId = $matches[1]; break
      }
    }
    if (-not $dbId) { throw "No se pudo determinar el uuid de la D1 '$DbName'. Revisa: npx wrangler d1 list" }
    # Actualizar wrangler.toml manualmente
    $cfgText = $cfgText -replace 'database_id\s*=\s*"[^"]*"', "database_id = `"$dbId`""
    Set-Content -Path $cfgPath -Value $cfgText -Encoding UTF8
    Ok "D1 '$DbName' ya existía; wrangler.toml actualizado (uuid $dbId)"
  }
} else {
  Ok "D1 ya configurada (uuid $dbId)"
}

# ============================================================
# 4. Esquema de la base de datos
# ============================================================
Step '4/8 Aplicando esquema en D1 (remoto)'
npx wrangler d1 execute $DbName --remote --file='d1/schema.sql' 2>$null
Ok 'Esquema aplicado (tabla scores + índice)'

# ============================================================
# 5. Proyecto de Cloudflare Pages
# ============================================================
Step '5/8 Creando/verificando el proyecto Pages'
$projOut = npx wrangler pages project create $Project --production-branch main 2>$null | Out-String
if ($LASTEXITCODE -ne 0 -and $projOut -match 'already|exist') {
  Ok "Proyecto Pages '$Project' ya existía"
} else {
  Ok "Proyecto Pages '$Project' creado"
}

# ============================================================
# 6. Despliegue de estáticos + Functions
# ============================================================
Step '6/8 Desplegando a Cloudflare Pages'
npx wrangler pages deploy web --project-name $Project --branch main --commit-dirty
Ok 'Deploy de Pages completado'


# ============================================================
# 7. Dominio personalizado + DNS (opcional)
# ============================================================
if (-not $NoDomain) {
  Step '7/8 Configurando dominio personalizado y DNS'

  # Token principal (Pages/API): OAuth de wrangler o CLOUDFLARE_API_TOKEN
  $Token = ''
  if ($env:CLOUDFLARE_API_TOKEN) {
    $Token = $env:CLOUDFLARE_API_TOKEN
  } elseif ($WrConfig -and (Test-Path $WrConfig)) {
    $c = Get-Content $WrConfig -Raw
    if ($c -match 'oauth_token\s*=\s*"([^"]+)"') { $Token = $matches[1] }
  }

  # Token para DNS: prefiere el apiToken del túnel (cert.pem, con Zone:DNS:Edit)
  $DnsToken = $Token
  $certPem = Join-Path $env:USERPROFILE '.cloudflared\cert.pem'
  if (-not $env:CLOUDFLARE_API_TOKEN -and (Test-Path $certPem)) {
    try {
      $raw = Get-Content $certPem -Raw
      $b64 = ($raw -split '-----')[2].Trim()
      $decoded = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64))
      $obj = $decoded | ConvertFrom-Json
      if ($obj.apiToken) { $DnsToken = $obj.apiToken }
      Ok 'Token de DNS obtenido desde el cert del túnel'
    } catch {
      Warn 'No se pudo leer el token del túnel para DNS'
    }
  }

  if (-not $Token) {
    Warn 'No se pudo obtener un token para la API. Configura el dominio manualmente (dashboard de Pages).'
  } else {
    function Invoke-CF {
      param([string]$Method, [string]$Path, $Body, [string]$Bearer = $Token)
      $h = @{ Authorization = "Bearer $Bearer"; 'Content-Type' = 'application/json' }
      $p = @{ Uri = "https://api.cloudflare.com/client/v4$Path"; Method = $Method; Headers = $h; TimeoutSec = 30 }
      if ($Body) { $p.Body = ($Body | ConvertTo-Json -Depth 5 -Compress) }
      try {
        $r = Invoke-RestMethod @p
      } catch {
        throw "API Cloudflare error en $Method $Path : $($_.Exception.Message)"
      }
      if (-not $r.success) {
        $err = ($r.errors | ForEach-Object { $_.message }) -join '; '
        throw "API Cloudflare error en $Method $Path : $err"
      }
      return $r.result
    }

    # Zona
    $zones = Invoke-CF 'GET' "/zones?name=$Zone"
    if (-not $zones) { throw "Zona '$Zone' no encontrada en Cloudflare" }
    $zoneId = $zones[0].id
    Ok "Zona '$Zone' (id $zoneId)"

    # Quitar CNAME previo del subdominio si existiera (idempotente)
    $records = Invoke-CF 'GET' "/zones/$zoneId/dns_records?type=CNAME&name=$Domain" -Bearer $DnsToken
    foreach ($rec in $records) {
      Invoke-CF 'DELETE' "/zones/$zoneId/dns_records/$($rec.id)" -Bearer $DnsToken | Out-Null
      Ok "CNAME previo eliminado: $Domain"
    }

    # CNAME nuevo -> pages.dev (sin tocar otros subdominios)
    $newRec = Invoke-CF 'POST' "/zones/$zoneId/dns_records" @{
      type = 'CNAME'; name = $Domain; content = "$Project.pages.dev"; proxied = $true; ttl = 1
    } -Bearer $DnsToken
    Ok "CNAME creado: $Domain -> $Project.pages.dev"

    # Añadir dominio al proyecto Pages (habilita TLS automático) — idempotente
    $domains = Invoke-CF 'GET' "/accounts/$AccountId/pages/projects/$Project/domains" $null
    $domainObj = $domains | Where-Object { $_.name -eq $Domain }
    if (-not $domainObj) {
      Invoke-CF 'POST' "/accounts/$AccountId/pages/projects/$Project/domains" @{ name = $Domain } | Out-Null
      Ok "Dominio '$Domain' añadido al proyecto Pages"
    } else {
      Ok "El dominio '$Domain' ya estaba añadido (status: $($domainObj.status))"
    }

    # Esperar activación del dominio (TLS)
    $active = $false
    for ($i = 0; $i -lt 24; $i++) {
      Start-Sleep -Seconds 10
      $d = Invoke-CF 'GET' "/accounts/$AccountId/pages/projects/$Project/domains/$Domain"
      if ($d.status -eq 'active') { $active = $true; break }
    }
    if ($active) { Ok "Dominio activo: https://$Domain" }
    else { Warn 'El dominio aún se está activando (hasta 4 min). Revisa el dashboard de Pages.' }
  }
}

# ============================================================
# 8. Verificación final
# ============================================================
Step '8/8 Verificando el despliegue'
$base = if ($NoDomain) { "https://$Project.pages.dev" } else { "https://$Domain" }
foreach ($u in @("$base/healthz", "$base/api/health", "$base/api/scores", "$base/")) {
  try {
    $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 30
    Ok "$($r.StatusCode) -> $u"
  } catch {
    Warn "Fallo $u : $($_.Exception.Message)"
  }
}
$body = @{ playerName = 'DeployTest'; score = 100 } | ConvertTo-Json
try {
  $r = Invoke-WebRequest -Uri "$base/api/scores" -Method Post -Body $body `
    -ContentType 'application/json' -UseBasicParsing -TimeoutSec 30
  Ok "POST /api/scores: $($r.StatusCode) -> $($r.Content)"
} catch {
  Warn "POST /api/scores falló: $($_.Exception.Message)"
}

Write-Host ''
Write-Host 'Despliegue finalizado. Revisa también el dashboard de Cloudflare:'
Write-Host '  https://dash.cloudflare.com/?to=/:account/pages' -ForegroundColor Yellow

