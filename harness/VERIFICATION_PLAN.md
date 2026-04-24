# 验证方案

## 验证原则
- 先记录失败基线，再做修改。
- 每一步都要有可复现命令或明确观察项。
- 数据库验证与主生成功能验证分开记录。

## Phase 0: 环境与基线
### 目标
- 证明当前项目为何不能直接运行。
- 为后续修复提供最小可复现实验。

### 命令
```powershell
node -v
npm.cmd -v
if (Test-Path node_modules) { 'NODE_MODULES_PRESENT' } else { 'NODE_MODULES_MISSING' }
npm.cmd run build
```

### 判定
- `node` 存在。
- `npm.cmd` 可用。
- 若 `node_modules` 缺失或 `vite` 不可执行，记为基线阻断。

## Phase 1: 项目构建验证
### 命令
```powershell
npm.cmd install
npm.cmd run typecheck
npm.cmd run build
```

### 判定
- `typecheck` 通过。
- `build` 通过。

## Phase 2: API 单链路验证
### 命令
```powershell
npm.cmd run dev:vercel
```

另开终端发送请求：

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/lego-gemini -ContentType 'application/json' -Body '{"prompt":"cute voxel rabbit","systemContext":"You are a creative voxel generator.","mode":"fast","options":{"style":"cartoon","colorScheme":"pastel","size":"medium","symmetry":"bilateral"}}'
```

### 判定
- 正常请求返回 `success = true` 且 `voxels` 非空。
- 缺失 `prompt` 时返回结构化 400。
- AI 调用异常时返回结构化 500。

## Phase 3: 数据库链路验证
### 前提
- 已配置本地 Postgres 连接串。
- 已提供数据库健康检查与 recent logs 验证入口。

### 命令
```powershell
Invoke-RestMethod -Method Get -Uri http://localhost:3001/api/debug/db-health
Invoke-RestMethod -Method Get -Uri http://localhost:3001/api/debug/generation-logs
```

### 判定
- 数据库已连接且 schema 已准备。
- 生成一次后能读到最近一条 generation log。
- 人为断开数据库后，主 API 仍返回可解释结果。

## Phase 4: 前端端到端验证
### 操作
- 打开本地页面。
- 输入固定 prompt 发起生成。
- 观察场景是否更新，状态栏是否显示 metadata，错误态是否可见。

### 判定
- 成功时模型更新。
- 失败时 UI 明确提示错误。

## Phase 5: Vercel 对齐验证
### 检查点
- `vercel.json` 存在且与当前目录结构一致。
- 本地 `vercel dev` 路由与线上预期一致。
- 仅使用 `/api/*`，不依赖 Netlify 路径。
