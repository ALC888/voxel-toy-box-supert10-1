# 🚀 立即行动指南

## 一键部署

### 步骤 1: 打开 PowerShell

```powershell
# 进入项目目录
cd "c:\Users\lyouy\Desktop\project\cs183\miec-lab-classroom-cs183-2026-voxel-toy-box-voxel_toy_box\voxel-toy-box-supert10-1"

# 允许脚本执行 (首次需要)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force

# 执行部署脚本
.\deploy-to-vercel.ps1
```

该脚本会自动:
- ✓ 检查环境 (git, npm, vercel)
- ✓ 验证代码状态
- ✓ 安装/更新 Vercel CLI
- ✓ 验证登录
- ✓ 执行部署到生产环境

### 步骤 2: 等待部署完成 (2-3 分钟)

部署过程中会显示进度。等待看到 ✅ 成功消息。

### 步骤 3: 验证部署

```powershell
# 在部署完成后运行验证脚本
.\verify-deployment.ps1
```

该脚本会自动测试:
- ✓ /api/debug/db-health
- ✓ /api/debug/db-feedback  
- ✓ /api/lego-kimi

---

## 如果脚本执行遇到问题

### 禁用执行策略限制

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

### 手动部署（备选方案）

```powershell
# 安装 Vercel CLI
npm.cmd install -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

### 手动验证（备选方案）

```powershell
# 测试 1
Invoke-RestMethod 'https://voxel-toy-box-supert10-1.vercel.app/api/debug/db-health'

# 测试 2
Invoke-RestMethod 'https://voxel-toy-box-supert10-1.vercel.app/api/debug/db-feedback'

# 测试 3
$body = @{prompt="test";mode="fast"} | ConvertTo-Json
Invoke-RestMethod -Method Post 'https://voxel-toy-box-supert10-1.vercel.app/api/lego-kimi' `
    -ContentType 'application/json' -Body $body
```

---

## 关键前置条件

✅ KIMI_API_KEY 已在 Vercel 环境变量中设置
✅ 所有代码已提交到 main 分支
✅ PowerShell v5.0+ 已安装
✅ 网络连接正常

---

## 故障排查

| 问题 | 解决 |
|------|------|
| "vercel: 无法识别的命令" | 安装: `npm.cmd install -g vercel` |
| "执行策略" 错误 | 运行: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force` |
| 部署失败 | 检查 KIMI_API_KEY 环境变量 |
| 端点仍返回 404 | 等待 5 分钟并重试验证 |

---

**所有代码已准备完毕，现在执行脚本即可恢复 Kimi 连接！**
