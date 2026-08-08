$envFile = Join-Path $PSScriptRoot '.env'
if (-not (Test-Path -LiteralPath $envFile)) {
    Write-Error "Missing $envFile. Copy .env.example to .env and fill in your local values."
    exit 1
}

Get-Content -LiteralPath $envFile | Where-Object { $_ -match '^\s*[^#;]' } | ForEach-Object {
    $kv = $_ -split '=', 2
    if ($kv.Length -eq 2 -and $kv[0].Trim()) {
        Set-Item -Path "env:$($kv[0].Trim())" -Value $kv[1].Trim()
    }
}

./mvnw spring-boot:run
