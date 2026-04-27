#!/usr/bin/env pwsh
# Vercel 部署后验证脚本
# 用途: 自动验证所有关键端点

$baseUrl = "https://voxel-toy-box-supert10-1.vercel.app"
$timeout = 10

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Kimi API - Vercel 部署后验证" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "基础 URL: $baseUrl" -ForegroundColor Yellow
Write-Host "超时: ${timeout}s" -ForegroundColor Yellow
Write-Host ""

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Uri,
        [string]$Method = "Get",
        [object]$Body = $null,
        [hashtable]$Headers = @{"Content-Type" = "application/json"}
    )
    
    Write-Host "📡 测试: $Name" -ForegroundColor Cyan
    Write-Host "   URI: $Uri" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = $Uri
            Method = $Method
            TimeoutSec = $timeout
            ErrorAction = "Stop"
        }
        
        if ($Headers) {
            $params["Headers"] = $Headers
        }
        
        if ($Body) {
            $params["Body"] = $Body
        }
        
        $response = Invoke-WebRequest @params
        
        Write-Host "   ✓ 状态码: $($response.StatusCode)" -ForegroundColor Green
        
        if ($response.Content) {
            try {
                $json = $response.Content | ConvertFrom-Json
                
                # 检查关键字段
                if ($json.databaseReport) {
                    Write-Host "   ✓ 包含 databaseReport" -ForegroundColor Green
                    if ($json.databaseReport.health) {
                        Write-Host "   ✓ 数据库健康: $($json.databaseReport.health.ok)" -ForegroundColor Green
                        Write-Host "   ✓ 数据库模式: $($json.databaseReport.health.mode)" -ForegroundColor Green
                    }
                }
                
                if ($json.success -ne $null) {
                    Write-Host "   ✓ Success: $($json.success)" -ForegroundColor Green
                }
                
                Write-Host "   📋 响应 (前 200 字):" -ForegroundColor Gray
                Write-Host "      $($response.Content.Substring(0, [Math]::Min(200, $response.Content.Length)))" -ForegroundColor Gray
            } catch {
                Write-Host "   📋 响应: $($response.Content.Substring(0, 100))" -ForegroundColor Gray
            }
        }
        
        Write-Host ""
        return $true
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        $statusDescription = $_.Exception.Response.StatusDescription
        
        Write-Host "   ✗ 错误: HTTP $statusCode - $statusDescription" -ForegroundColor Red
        
        if ($_.Exception.Response.Content) {
            try {
                $errorContent = [System.IO.StreamReader]::new($_.Exception.Response.Content).ReadToEnd()
                Write-Host "   📋 错误响应: $($errorContent.Substring(0, [Math]::Min(150, $errorContent.Length)))" -ForegroundColor Gray
            } catch { }
        }
        
        Write-Host ""
        return $false
    }
}

# 测试序列
$results = @()

Write-Host "🔍 开始端点验证..." -ForegroundColor Yellow
Write-Host ""

# 1. 数据库健康检查
$results += @{
    name = "db-health"
    passed = Test-Endpoint -Name "数据库健康检查" -Uri "$baseUrl/api/debug/db-health"
}

# 2. 数据库反馈 (新端点)
$results += @{
    name = "db-feedback"
    passed = Test-Endpoint -Name "数据库反馈" -Uri "$baseUrl/api/debug/db-feedback"
}

# 3. Kimi 生成
$kimiBody = @{
    prompt = "cute little red bird"
    mode = "fast"
} | ConvertTo-Json

$results += @{
    name = "lego-kimi"
    passed = Test-Endpoint -Name "Kimi 生成" -Uri "$baseUrl/api/lego-kimi" -Method "Post" -Body $kimiBody
}

# 总结
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  验证总结" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$passCount = ($results | Where-Object { $_.passed }).Count
$totalCount = $results.Count

foreach ($result in $results) {
    $status = if ($result.passed) { "✓ PASS" } else { "✗ FAIL" }
    $color = if ($result.passed) { "Green" } else { "Red" }
    Write-Host "$status - $($result.name)" -ForegroundColor $color
}

Write-Host ""
Write-Host "结果: $passCount/$totalCount 通过" -ForegroundColor $(if ($passCount -eq $totalCount) { "Green" } else { "Yellow" })

if ($passCount -eq $totalCount) {
    Write-Host ""
    Write-Host "✅ 所有测试通过！Kimi API 已成功部署到 Vercel" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "⚠️  部分测试失败，请检查 KIMI_API_KEY 是否正确设置" -ForegroundColor Yellow
    Write-Host "参考: KIMI_DEPLOYMENT_TROUBLESHOOTING.md" -ForegroundColor Yellow
    exit 1
}
