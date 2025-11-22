$ErrorActionPreference = "Stop"

$ProjectId = "wgxbqtdkeqxjgcbycsob"
$FunctionName = "make-server-e097b8bf"
$Url = "https://$ProjectId.supabase.co/functions/v1/$FunctionName/health"

Write-Host "Verifying deployment at: $Url" -ForegroundColor Cyan

try {
    $Response = Invoke-RestMethod -Uri $Url -Method Get -ErrorAction Stop
    
    if ($Response.status -eq "ok") {
        Write-Host "Function is HEALTHY and responding!" -ForegroundColor Green
        $Json = $Response | ConvertTo-Json -Depth 1
        Write-Host "Response: $Json" -ForegroundColor Gray
    } else {
        Write-Host "Function responded but status is not 'ok'." -ForegroundColor Yellow
        $Json = $Response | ConvertTo-Json -Depth 1
        Write-Host "Response: $Json" -ForegroundColor Gray
    }
} catch {
    Write-Error "Failed to reach function. It might not be deployed yet or there is a network issue."
    Write-Host "Error details: $_" -ForegroundColor Red
}
