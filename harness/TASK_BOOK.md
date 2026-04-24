# 任务书

## 任务目标
- 收敛到 Vercel-first 架构，消除 Netlify 作为主运行路径的干扰。
- 修复本地无法运行的直接阻断项。
- 实现真实 Postgres generation log 写入、读取验证、健康检查与 graceful fallback。
- 建立前端到后端再到数据库的可重复验证链路。

## 最小改动原则
- 优先修入口与配置，不优先重写业务逻辑。
- 数据库改动局限在 `api/` 与必要的验证接口。
- 前端只修影响生成结果展示和错误可见性的部分。
- 保留旧目录作为历史遗留，但不再作为主链路依赖。

## 当前阻断项
- `node_modules` 缺失，导致 `vite` 无法执行。
- PowerShell 下 `npm` 别名受执行策略限制，应统一使用 `npm.cmd`。
- 当前后端数据库仅为 mock，无法验证真实写库。
- 当前仓库中同时存在多套运行痕迹，容易误导验证结论。

## 分阶段任务
### Phase 0: 基线与环境
- 安装依赖。
- 修正脚本与配置，确保 `build`、`typecheck`、`vercel dev` 可执行。
- 准备 `.env.example` 与本地环境变量模板。

### Phase 1: 单一 API 链路
- 以后端 `api/lego-gemini.ts` 为唯一入口。
- 修复 API 入口中的直接运行错误。
- 统一前端请求到 `/api/*`。

### Phase 2: 数据库链路
- 替换 mock `db.ts` 为真实 Postgres 适配。
- 支持建表、写入、读取验证、健康检查。
- 保证写库失败不阻断主响应。

### Phase 3: 前端联调
- 验证 `services/endpoints/api.ts -> services/generationApi.ts -> api/lego-gemini.ts -> VoxelEngine` 主链路。
- 保证成功时能换模型，失败时能看到明确错误。

### Phase 4: Vercel 对齐
- 新增并验证 `vercel.json`。
- 以 `vercel dev` 作为本地全链路验证入口。
- 形成可部署前检查清单。

## 产物要求
- `VERIFICATION_PLAN.md`：执行步骤与判定标准。
- `VERIFICATION_LOG.md`：时间顺序记录命令、结果、问题与复验。
- `RESULT.md`：最终结论、已解决项、剩余风险。
