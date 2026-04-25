# 验证日志

## 2026-04-24 Phase 0 基线检查

### 执行目标
- 建立当前项目“为什么还跑不起来”的首轮证据。

### 已执行命令与结果
1. `node -v`
   - 结果：`v24.14.1`
   - 结论：Node.js 可用。

2. `npm -v`
   - 结果：失败，PowerShell 执行策略阻止 `npm.ps1`
   - 结论：后续在本项目中统一使用 `npm.cmd`，避免把执行策略误判为项目问题。

3. `if (Test-Path node_modules) { 'NODE_MODULES_PRESENT' } else { 'NODE_MODULES_MISSING' }`
   - 结果：`NODE_MODULES_MISSING`
   - 结论：当前依赖尚未安装。

4. `npm.cmd run build`
   - 结果：失败，报错 `'vite' is not recognized as an internal or external command`
   - 结论：构建失败的首要原因是依赖未安装，而不是先归因到业务代码。

5. `npm.cmd -v`
   - 结果：`11.11.0`
   - 结论：`npm.cmd` 可作为当前 Windows/PowerShell 环境下的稳定执行入口。

6. `Get-ChildItem harness | Select-Object Name`
   - 结果：确认已生成 `ENTRY.md`、`TASK_BOOK.md`、`VERIFICATION_PLAN.md`、`VERIFICATION_LOG.md`、`RESULT.md`
   - 结论：根目录 harness 已建立并开始承接执行记录。

### 当前基线判断
- 项目当前尚不具备进入 API/数据库/前端联调的最小前提。
- 下一步必须先补齐依赖，再继续 `typecheck`、`build` 与 `vercel dev`。
- harness 已进入执行状态，后续所有修复与复验都以该目录为准。

### 后续待执行
- `npm.cmd -v`
- `npm.cmd install`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npm.cmd run dev:vercel`

## 2026-04-24 Phase 1 构建前提修复

### 已执行命令与结果
1. `npm.cmd install`
   - 结果：成功，依赖已安装。
   - 备注：安装后出现若干 audit 告警，但当前不构成首轮运行阻断。

2. `npm.cmd run typecheck`
   - 首次结果：失败。
   - 发现：问题集中在 `tsconfig.json` 检查范围、`moduleResolution` 配置、遗留模块类型污染，以及数据库新类型适配。
   - 处理：收紧 `typecheck` 到当前主链路，修复 `api/lib/saveGeneration.ts` 类型转换，排除不再纳入目标的旧遗留模块。

3. `npm.cmd run typecheck`
   - 二次结果：通过。
   - 结论：当前主链路类型检查已通过。

4. `npm.cmd run build`
   - 结果：通过。
   - 结论：前端生产构建已恢复。
   - 备注：存在 chunk 体积偏大告警，但不阻断首轮本地验证。

5. `.\node_modules\.bin\vercel.cmd --version`
   - 结果：`Vercel CLI 41.7.8`
   - 结论：本地 `vercel dev` 所需 CLI 已就绪。

### 当前状态判断
- 已达到第一次本地验证前提：
  - 依赖已安装
  - `typecheck` 通过
  - `build` 通过
  - Vercel CLI 可用
- 下一步可进入：
  - `npm.cmd run dev:vercel`
  - 本地 `/api/lego-gemini` smoke test
  - `/api/debug/db-health` 与 `/api/debug/generation-logs` 验证

## 2026-04-24 Phase 2 本地联调验证

### 环境前提确认
1. `Get-Content -Raw .env.local`
   - 结果：`NO_ENV_LOCAL`
   - 结论：当前本地未配置 `GEMINI_API_KEY`，成功生成分支预期会被服务端密钥检查拦下。

2. `Get-Content -Raw .env.example`
   - 结果：包含 `GEMINI_API_KEY`、`DATABASE_URL`、`VITE_API_BASE_URL`
   - 结论：本地缺少的仅是实际 `.env.local` 配置，不是变量模板缺失。

### 服务启动与端口
3. 启动本地双服务：`npm.cmd run dev`
   - 结果：本地前端成功监听 `3000`，本地 API 成功监听 `3001`
   - 备注：重复启动时曾出现一次 `3001 EADDRINUSE`，说明旧的本地 API 实例仍在运行，但不影响当前联调。

4. `Get-NetTCPConnection -LocalPort 3000,3001`
   - 结果：`3000`、`3001` 均处于 `Listen`
   - 结论：前端与本地 API 都在监听。

5. `curl.exe -I http://localhost:3000`
   - 结果：`HTTP/1.1 200 OK`
   - 结论：首页可访问。

### API 与数据库验证
6. `GET /api/debug/db-health`
   - 结果：
     ```json
     {"ok":false,"mode":"noop","message":"No DATABASE_URL/POSTGRES_URL configured. Running without persistent logs."}
     ```
   - 结论：数据库调试接口可用，当前处于未配库的 graceful fallback 状态。

7. `GET /api/debug/generation-logs`
   - 结果：
     ```json
     {"success":true,"mode":"noop","count":0,"logs":[]}
     ```
   - 结论：读取验证接口可用，当前无持久化日志，行为与 `noop` 模式一致。

8. `POST /api/lego-gemini`，空 prompt
   - 结果：
     ```json
     {"success":false,"warnings":[],"error":"prompt is required","errorCode":"BAD_REQUEST","mode":"fast","usedTwoStage":false}
     ```
   - 结论：请求校验分支正确，返回结构稳定。

9. `POST /api/lego-gemini`，正常 prompt
   - 结果：
     ```json
     {"success":false,"warnings":["The backend request failed before a valid voxel result was produced."],"error":"Missing GEMINI_API_KEY for server-side Gemini calls.","errorCode":"GEMINI_GENERATION_FAILED","mode":"fast","usedTwoStage":false}
     ```
   - 结论：主 API 已走到真正业务逻辑，当前唯一首要阻断是缺少 `GEMINI_API_KEY`。

### 本轮判断
- 本地前后端联调链路已打通。
- API 路由、错误结构、数据库 fallback 与调试接口均工作。
- 当前无法完成“成功生成 voxels”和“真实写库”的原因不是路由或构建，而是本地缺少运行时环境变量：
  - `GEMINI_API_KEY`
  - 若需真实写库，还需 `DATABASE_URL`

## 2026-04-24 Phase 3 运行时环境补充验证

### Gemini 密钥接入
1. 新增本地 `.env.local`
   - 结果：本地 API 现已能读取 `GEMINI_API_KEY`
   - 处理：`scripts/local-api.ts` 已补充 `.env.local` 加载逻辑

2. 重启本地服务后再次调用 `POST /api/lego-gemini`
   - 结果：
     ```json
     {"success":false,"warnings":["The backend request failed before a valid voxel result was produced."],"error":"exception TypeError: fetch failed sending request","errorCode":"GEMINI_GENERATION_FAILED","mode":"fast","usedTwoStage":false}
     ```
   - 结论：服务端已通过“缺少密钥”阶段，失败点已推进到“向 Gemini 发真实请求”。

3. 本地 API 日志
   - 结果：日志记录了失败 generation event，`error_message` 为 `exception TypeError: fetch failed sending request`
   - 结论：失败发生在外部请求阶段，不是本地 JSON、路由或类型问题。

### Gemini 外部网络连通性
4. `curl.exe -I https://generativelanguage.googleapis.com`
   - 结果：`curl: (35) Recv failure: Connection was reset`

5. `curl.exe -s -o NUL -w "%{http_code}" https://generativelanguage.googleapis.com`
   - 结果：`000`

### 本轮判断
- 当前“成功生成 voxels”未完成的直接阻断已进一步定位为：
  - 本机到 `generativelanguage.googleapis.com` 的网络链路被 reset
- 当前这不是前后端主链路问题，主链路已工作到外部模型调用边界。

### 数据库环境补充检查
6. 本地数据库运行时检查
   - `psql`：未找到
   - Postgres 服务：未找到
   - Docker：未安装
   - 结论：当前机器缺少本地 Postgres 运行时，无法完成真实 `DATABASE_URL` 写库验证。
