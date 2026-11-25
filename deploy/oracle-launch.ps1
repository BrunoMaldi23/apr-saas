param(
  [Parameter(Mandatory = $true)]
  [string]$TenancyId,

  [string]$Region = 'us-chicago-1',
  [string]$DisplayName = 'apr',
  [string]$SshKeyPath = "$env:USERPROFILE\.ssh\apr_oracle.pub",
  [int]$Ocpus = 1,
  [int]$MemoryGb = 6,
  [int]$MaxAttempts = 100
)

$ErrorActionPreference = 'Stop'

function Invoke-Oci {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$OciArgs)

  $output = & oci @OciArgs 2>&1
  if ($LASTEXITCODE -ne 0) {
    return [pscustomobject]@{ Ok = $false; Output = ($output -join "`n") }
  }
  return [pscustomobject]@{ Ok = $true; Output = ($output -join "`n") }
}

function Get-OciId {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$OciArgs)

  $result = Invoke-Oci @OciArgs
  if (-not $result.Ok) { throw $result.Output }
  return ($result.Output -split "`n")[0].Trim().Trim('"')
}

if (-not (Test-Path $SshKeyPath)) {
  throw "No existe la llave pública SSH en: $SshKeyPath"
}

Write-Host "Región: $Region | Shape: $Ocpus OCPU / $MemoryGb GB"

$vcnId = Get-OciId network vcn create `
  --compartment-id $TenancyId `
  --display-name 'apr-vcn' `
  --cidr-block '10.0.0.0/16' `
  --region $Region `
  --query 'data.id' -r

$igwId = Get-OciId network internet-gateway create `
  --compartment-id $TenancyId `
  --vcn-id $vcnId `
  --display-name 'apr-igw' `
  --is-enabled true `
  --region $Region `
  --query 'data.id' -r

$subnetId = Get-OciId network subnet create `
  --compartment-id $TenancyId `
  --vcn-id $vcnId `
  --display-name 'apr-public' `
  --cidr-block '10.0.1.0/24' `
  --region $Region `
  --query 'data.id' -r

$routeTableId = Get-OciId network route-table list `
  --compartment-id $TenancyId `
  --vcn-id $vcnId `
  --region $Region `
  --query 'data[0].id' -r

$routeRules = "[{`"destination`":`"0.0.0.0/0`",`"networkEntityId`":`"$igwId`"}]"
$routeResult = Invoke-Oci network route-table update `
  --rt-id $routeTableId `
  --route-rules $routeRules `
  --force `
  --region $Region
if (-not $routeResult.Ok) { throw $routeResult.Output }

$imageResult = Invoke-Oci compute image list `
  --compartment-id $TenancyId `
  --operating-system 'Canonical Ubuntu' `
  --operating-system-version '24.04 Minimal aarch64' `
  --shape 'VM.Standard.A1.Flex' `
  --region $Region `
  --query 'data[0].id' -r

$imageId = $null
if ($imageResult.Ok) {
  $imageId = ($imageResult.Output -split "`n")[0].Trim().Trim('"')
}

if (-not $imageId) {
  $fallbackQuery = "data[?contains(display-name,'24.04') && contains(display-name,'aarch64')].id | [0]"
  $imageId = Get-OciId compute image list `
    --compartment-id $TenancyId `
    --region $Region `
    --query $fallbackQuery -r
}

if (-not $imageId) {
  throw 'No encontré imagen Ubuntu 24.04 aarch64 en esta región.'
}

$adsResult = Invoke-Oci iam availability-domain list `
  --compartment-id $TenancyId `
  --region $Region `
  --query 'data[].name' -r
if (-not $adsResult.Ok) { throw $adsResult.Output }

$ads = @($adsResult.Output -split "`n" | Where-Object { $_.Trim() } | ForEach-Object { $_.Trim().Trim('"') })

if ($ads.Count -eq 0) {
  throw 'No hay availability domains disponibles.'
}

$shapeConfig = '{"OCPUs":' + $Ocpus + ',"MemoryInGBs":' + $MemoryGb + '}'
$instanceId = $null
$attempt = 0

while (-not $instanceId -and $attempt -lt $MaxAttempts) {
  $attempt++
  foreach ($ad in $ads) {
    Write-Host "Intento $attempt / $MaxAttempts - AD: $ad"

    $result = Invoke-Oci compute instance launch `
      --compartment-id $TenancyId `
      --availability-domain $ad `
      --display-name $DisplayName `
      --shape 'VM.Standard.A1.Flex' `
      --shape-config $shapeConfig `
      --image-id $imageId `
      --subnet-id $subnetId `
      --assign-public-ip true `
      --ssh-authorized-keys-file $SshKeyPath `
      --region $Region

    if ($result.Ok) {
      $instanceId = ($result.Output | ConvertFrom-Json).data.id
      Write-Host "Instancia creada: $instanceId"
      break
    }

    $msg = $result.Output
    if ($msg -match 'Out of capacity') {
      Write-Host 'Sin capacidad en este AD; probando el siguiente.'
    }
    elseif ($msg -match 'Too many requests') {
      Write-Host 'Rate limit de Oracle; esperando 60 s.'
      Start-Sleep -Seconds 60
    }
    else {
      Write-Host $msg
    }
  }

  if (-not $instanceId) {
    Start-Sleep -Seconds 30
  }
}

if (-not $instanceId) {
  throw "No se pudo crear la instancia después de $MaxAttempts intentos."
}

$publicIp = Get-OciId compute instance list-vnics `
  --instance-id $instanceId `
  --region $Region `
  --query 'data[0].public-ip' -r

Write-Host ''
Write-Host "INSTANCE_ID=$instanceId"
Write-Host "IP_PUBLICA=$publicIp"
