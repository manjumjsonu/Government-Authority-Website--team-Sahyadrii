$ErrorActionPreference = "Stop"

Write-Host "Starting Edge Function Deployment..." -ForegroundColor Cyan

# Check if Supabase CLI is installed (local or global)
if (-not (Get-Command "supabase" -ErrorAction SilentlyContinue)) {
    Write-Host "Supabase CLI not found globally. Using local npx..." -ForegroundColor Yellow
}

# Define paths
$SourceDir = "src/supabase/functions/server"
$TargetDir = "supabase/functions/make-server-e097b8bf"
$FunctionFiles = @("index.tsx", "kv_store.tsx", "routes.tsx", "twilio.tsx")

# Create target directory
if (-not (Test-Path $TargetDir)) {
    Write-Host "Creating function directory: $TargetDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
}

# Copy files
Write-Host "Copying function files..." -ForegroundColor Yellow
foreach ($File in $FunctionFiles) {
    $SourcePath = Join-Path $SourceDir $File
    $TargetPath = Join-Path $TargetDir $File
    
    if (Test-Path $SourcePath) {
        Copy-Item -Path $SourcePath -Destination $TargetPath -Force
        Write-Host "   Copied $File" -ForegroundColor Green
    } else {
        Write-Error "   Missing source file: $SourcePath"
        exit 1
    }
}

# Deploy function
Write-Host "Deploying function to Supabase..." -ForegroundColor Cyan
try {
    npx supabase functions deploy make-server-e097b8bf --no-verify-jwt
    Write-Host "Deployment command executed successfully!" -ForegroundColor Green
} catch {
    Write-Error "Deployment failed. Please check the error message above."
    Write-Host "Tip: Make sure you are logged in with 'npx supabase login' and linked to the project." -ForegroundColor Yellow
    exit 1
}

Write-Host "Function deployed! You can now test it with the SMS button." -ForegroundColor Green
