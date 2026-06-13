# Push this clean project to GitHub
# Usage:
# powershell -ExecutionPolicy Bypass -File .\PUSH_TO_GITHUB.ps1 -RepoUrl "https://github.com/YOUR_USERNAME/YOUR_REPO.git"

param(
  [Parameter(Mandatory=$true)]
  [string]$RepoUrl
)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

if(!(Test-Path -LiteralPath '.git')){
  git init
}

git branch -M main

git add .
git commit -m "Initial SuperSender Pro clean import" 2>$null

$remote = git remote 2>$null
if($remote -contains 'origin'){
  git remote set-url origin $RepoUrl
}else{
  git remote add origin $RepoUrl
}

git push -u origin main
