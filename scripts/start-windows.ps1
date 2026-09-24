# Build and start Prelegal at http://localhost:8000
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
docker build -t prelegal .
docker rm -f prelegal 2>$null
docker run -d --name prelegal -p 8000:8000 --env-file .env prelegal
Write-Host "Prelegal running at http://localhost:8000"
