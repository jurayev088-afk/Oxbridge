# Oxbridge CRM — PostgreSQL o'rnatish va ishga tushirish (Windows)
# PowerShell ni Administrator sifatida oching va ishga tushiring:
#   Set-ExecutionPolicy -Scope Process Bypass -Force
#   .\scripts\setup-postgres.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== Oxbridge CRM PostgreSQL setup ===" -ForegroundColor Cyan

# 1) Docker mavjud bo'lsa
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "Docker topildi — PostgreSQL konteyner ishga tushirilmoqda..." -ForegroundColor Green
    Set-Location (Split-Path $PSScriptRoot -Parent)
    docker compose up -d
    Start-Sleep -Seconds 5
    Write-Host "Tayyor! DATABASE_URL: postgresql://postgres:postgres@localhost:5432/crm_demo"
    exit 0
}

# 2) Chocolatey orqali o'rnatish
if (Get-Command choco -ErrorAction SilentlyContinue) {
    $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $pgService) {
        Write-Host "PostgreSQL o'rnatilmoqda (Chocolatey)..." -ForegroundColor Yellow
        choco install postgresql -y --params "/Password:postgres /Port:5432"
    }
}

# 3) Xizmatni ishga tushirish
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($pgService) {
    if ($pgService.Status -ne "Running") {
        Write-Host "PostgreSQL xizmati ishga tushirilmoqda: $($pgService.Name)" -ForegroundColor Green
        Start-Service $pgService.Name
    } else {
        Write-Host "PostgreSQL allaqachon ishlayapti: $($pgService.Name)" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "PostgreSQL topilmadi!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Quyidagilardan birini o'rnating:" -ForegroundColor Yellow
    Write-Host "  A) Docker Desktop: https://www.docker.com/products/docker-desktop/"
    Write-Host "     Keyin: npm run db:up"
    Write-Host ""
    Write-Host "  B) PostgreSQL (Windows): https://www.postgresql.org/download/windows/"
    Write-Host "     Parol: postgres | Port: 5432"
    Write-Host "     O'rnatgandan keyin bu skriptni qayta ishga tushiring."
    Write-Host ""
    Write-Host "  C) Admin PowerShell:" -ForegroundColor Yellow
    Write-Host '     choco install postgresql -y --params "/Password:postgres /Port:5432"'
    exit 1
}

# 4) crm_demo bazasini yaratish
$psql = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\psql.exe" -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
if ($psql) {
    $env:PGPASSWORD = "postgres"
    & $psql.FullName -U postgres -h localhost -p 5432 -tc "SELECT 1 FROM pg_database WHERE datname = 'crm_demo'" | Out-Null
    $exists = & $psql.FullName -U postgres -h localhost -p 5432 -tAc "SELECT 1 FROM pg_database WHERE datname = 'crm_demo'"
    if ($exists -ne "1") {
        Write-Host "crm_demo bazasi yaratilmoqda..." -ForegroundColor Green
        & $psql.FullName -U postgres -h localhost -p 5432 -c "CREATE DATABASE crm_demo;"
    } else {
        Write-Host "crm_demo bazasi mavjud." -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== Tayyor ===" -ForegroundColor Cyan
Write-Host "server/.env da DATABASE_URL=postgresql://postgres:postgres@localhost:5432/crm_demo"
Write-Host "Serverni qayta ishga tushiring: npm run dev"
