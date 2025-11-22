$ErrorActionPreference = "Stop"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneGJxdGRrZXF4amdjYnljc29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDQ4OTUsImV4cCI6MjA3OTI4MDg5NX0.QsZDSn-79p0MxrJtrUG_7EsZHS4LmTN3qzwiWgMpS9I"
$headers = @{ "Authorization" = "Bearer $anonKey" }

# 0. Signup (new user)
$signupUrl = "https://wgxbqtdkeqxjgcbycsob.supabase.co/functions/v1/make-server-e097b8bf/auth/signup-authority"
$signupBody = @{
    email    = "authority2@demo.com"
    password = "demo123"
    name     = "Hobli Officer 2"
    hobliId  = "HOB002"
    district = "Bangalore Rural"
    taluk    = "Devanahalli"
} | ConvertTo-Json

Write-Host "Signing up..."
try {
    Invoke-RestMethod -Uri $signupUrl -Method Post -Body $signupBody -ContentType "application/json" -Headers $headers
    Write-Host "Signup successful."
}
catch {
    Write-Host "Signup failed: $_"
}

# 1. Login to get token
$loginUrl = "https://wgxbqtdkeqxjgcbycsob.supabase.co/functions/v1/make-server-e097b8bf/auth/login"
$loginBody = @{
    email    = "authority2@demo.com"
    password = "demo123"
} | ConvertTo-Json

Write-Host "Logging in..."
try {
    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method Post -Body $loginBody -ContentType "application/json" -Headers $headers
    $token = $loginResponse.accessToken
    Write-Host "Login successful. Token obtained."
}
catch {
    Write-Error "Login failed: $_"
}

# 2. Test Ping route
$pingUrl = "https://wgxbqtdkeqxjgcbycsob.supabase.co/functions/v1/make-server-e097b8bf/ping"

Write-Host "Testing Ping route: $pingUrl"
try {
    $response = Invoke-WebRequest -Uri $pingUrl -Method Get -Headers $headers
    Write-Host "Ping request successful (Status: $($response.StatusCode))"
    Write-Host "Response: $($response.Content)"
}
catch {
    Write-Host "Ping request failed (Status: $($_.Exception.Response.StatusCode))"
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $responseBody = $reader.ReadToEnd()
    Write-Host "Response Body: $responseBody"
}
