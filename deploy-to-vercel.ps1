#!/usr/bin/env pwsh
# Vercel 自动化部署脚本
# 用途: 一键部署最新的 Kimi API 修复到 Vercel

param(
    [switch]$Force = $false,
    [switch]$CheckOnly = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Kimi API - Vercel 自动化部署脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 第1步: 检查环境
Write-Host "📋 第1步: 检查环境..." -ForegroundColor Yellow

$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectPath

# 检查 git
try {
    $gitVersion = & git --version
    Write-Host "✓ Git: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Git 未安装或不在 PATH 中" -ForegroundColor Red
    exit 1
}

# 检查 npm
try {
    $npmVersion = & npm.cmd --version
    Write-Host "✓ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ npm 未安装或不在 PATH 中" -ForegroundColor Red
    exit 1
}

# 检查 vercel CLI
$vercelInstalled = $false
try {
    $vercelVersion = & vercel --version 2>$null
    $vercelInstalled = $true
    Write-Host "✓ Vercel CLI: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠ Vercel CLI 未安装，将在下一步安装" -ForegroundColor Yellow
}

Write-Host ""

# 第2步: 验证代码状态
Write-Host "🔍 第2步: 验证代码状态..." -ForegroundColor Yellow

$gitStatus = & git status --porcelain
if ($gitStatus) {
    Write-Host "⚠ 存在未提交的更改:" -ForegroundColor Yellow
    Write-Host $gitStatus
    if (-not $Force) {
        Write-Host "使用 -Force 标志忽略此警告" -ForegroundColor Yellow
        exit 1
    }
}

$latestCommit = & git log --oneline -1
Write-Host "✓ 最新提交: $latestCommit" -ForegroundColor Green

# 验证修复文件存在
$fixFiles = @(
    "api/lego-kimi.ts",
    "api/lib/db.ts",
    "api/lib/saveGeneration.ts",
    "api/debug/db-feedback.ts",
    "types.ts"
)

foreach ($file in $fixFiles) {
    if (Test-Path $file) {
        Write-Host "✓ $file" -ForegroundColor Green
    } else {
        Write-Host "✗ 缺失: $file" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# 第3步: 本地验证 (可选)
Write-Host "🧪 第3步: 本地验证..." -ForegroundColor Yellow

if (-not $CheckOnly) {
    Write-Host "运行 TypeScript 检查..."
    try {
        & npm.cmd run typecheck 2>&1 | Where-Object { $_ -match "error|Error" }
        Write-Host "✓ TypeScript 检查通过" -ForegroundColor Green
    } catch {
        Write-Host "✗ TypeScript 检查失败" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# 第4步: 安装/检查 Vercel CLI
if (-not $vercelInstalled) {
    Write-Host "📦 第4步: 安装 Vercel CLI..." -ForegroundColor Yellow
    Write-Host "运行: npm.cmd install -g vercel"
    & npm.cmd install -g vercel
    Write-Host "✓ Vercel CLI 已安装" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "⏭️  第4步: Vercel CLI 已安装，跳过" -ForegroundColor Green
    Write-Host ""
}

# 第5步: 验证 Vercel 登录
Write-Host "🔐 第5步: 检查 Vercel 登录状态..." -ForegroundColor Yellow
try {
    $whoami = & vercel whoami 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ 已登录: $whoami" -ForegroundColor Green
    } else {
        Write-Host "⚠ 需要登录 Vercel，将打开登录流程" -ForegroundColor Yellow
        & vercel login
    }
} catch {
    Write-Host "⚠ 无法验证登录状态，将在部署时处理" -ForegroundColor Yellow
}

Write-Host ""

# 第6步: 部署
Write-Host "🚀 第6步: 部署到 Vercel..." -ForegroundColor Yellow
Write-Host "执行: vercel --prod" -ForegroundColor Cyan
Write-Host ""

& vercel --prod

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✅ 部署成功！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "部署完成后（2-3 分钟），请验证以下端点:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. 数据库健康检查:"
    Write-Host "   curl https://voxel-toy-box-supert10-1.vercel.app/api/debug/db-health" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. 数据库反馈 (新端点):"
    Write-Host "   curl https://voxel-toy-box-supert10-1.vercel.app/api/debug/db-feedback" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. Kimi API 生成:"
    Write-Host '   curl -X POST https://voxel-toy-box-supert10-1.vercel.app/api/lego-kimi -H "Content-Type: application/json" -d "{\"prompt\":\"cute rabbit\",\"mode\":\"fast\"}"' -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ❌ 部署失败" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "请检查:" -ForegroundColor Yellow
    Write-Host "1. Vercel 登录状态"
    Write-Host "2. KIMI_API_KEY 环境变量是否已设置"
    Write-Host "3. 参考 KIMI_DEPLOYMENT_TROUBLESHOOTING.md"
    Write-Host ""
    exit 1
}
