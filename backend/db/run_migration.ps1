<#
Run a SQL migration file against a Postgres database using psql.

Usage (PowerShell):
  $env:PG_CONN = "postgres://username:password@db-host:5432/postgres"
  .\run_migration.ps1 -File .\migrations\002_add_admin_columns.sql

If `psql` is not installed or `PG_CONN` is not set, the script prints exact SQL and instructions for running it in the Supabase SQL editor.
#>
param(
    [string]$File = "migrations\002_add_admin_columns.sql"
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$path = Join-Path $root $File
if (-Not (Test-Path $path)) {
    Write-Error "Migration file not found: $path"
    exit 2
}

$sql = Get-Content $path -Raw

if (-Not $env:PG_CONN) {
    Write-Host "PG_CONN not set. To run the migration, either set PG_CONN to a Postgres connection string and install psql, or paste the SQL into the Supabase SQL editor." -ForegroundColor Yellow
    Write-Host "--- SQL to run: ---" -ForegroundColor Cyan
    Write-Host $sql
    Write-Host "--- End SQL ---" -ForegroundColor Cyan
    Write-Host "Supabase SQL editor: https://app.supabase.com/project/<your-project>/sql"
    exit 0
}

# Check for psql
$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-Not $psql) {
    Write-Error "psql not found in PATH. Install psql (Postgres client) or run the SQL via Supabase SQL editor.";
    Write-Host "SQL below:" -ForegroundColor Cyan
    Write-Host $sql
    exit 3
}

# Run migration using psql. PG_CONN expected in URI form: postgres://user:pass@host:port/db
Write-Host "Running migration $path using PG_CONN..."
$env:PGPASSWORD = ""
try {
    # psql accepts connection string via --dbname
    & psql --dbname=$env:PG_CONN -v ON_ERROR_STOP=1 -q -f $path
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Migration applied successfully." -ForegroundColor Green
    } else {
        Write-Error "psql returned exit code $LASTEXITCODE"
    }
} catch {
    Write-Error "Failed to execute psql: $_"
}
