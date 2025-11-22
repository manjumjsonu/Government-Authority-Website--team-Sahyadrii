# Script to create GitHub repository and push changes
# Make sure you're authenticated with GitHub CLI first: gh auth login

$repoName = "Government-Authority-Website-teamSahyadri"
$description = "Government Authority Website teamSahyadri"
$username = "manjumjsonu"

Write-Host "Creating GitHub repository: $repoName" -ForegroundColor Green

# Create the repository using GitHub CLI
gh repo create $repoName --public --description $description --source=. --remote=origin --push

if ($LASTEXITCODE -eq 0) {
    Write-Host "Repository created and changes pushed successfully!" -ForegroundColor Green
} else {
    Write-Host "Failed to create repository. Please ensure you're authenticated:" -ForegroundColor Yellow
    Write-Host "Run: gh auth login" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or create the repository manually at:" -ForegroundColor Yellow
    Write-Host "https://github.com/new" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Repository name: $repoName" -ForegroundColor Yellow
    Write-Host "Then run: git push -u origin main" -ForegroundColor Yellow
}

