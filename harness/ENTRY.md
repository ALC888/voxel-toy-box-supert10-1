# Harness 入口

## 目标
- 将 `voxel-toy-box-supert10-1` 收敛为 Vercel-first 的单一运行架构。
- 先确认阻断问题，再做最小改动，使项目可本地运行并基本可部署到 Vercel。
- 将数据库补成可验证的真实日志链路，且数据库异常不阻断主生成流程。

## 工作边界
- 仅以当前项目根目录为目标，不处理 `template-routing-lab` 的功能实现。
- 不再以 Netlify 作为运行或部署目标。
- 优先最小改动，不做大规模重构。
- harness 文档只记录技术目标、验证步骤、验证日志与结果。

## 当前已确认事实
- 前端调用统一走 `/api/lego-gemini`。
- `api/lego-gemini.ts` 是应收敛的唯一后端入口。
- `api/lib/db.ts` 目前仍是 mock，数据库未真实接通。
- 当前本地基础依赖未就绪，`node_modules` 缺失。
- 当前 PowerShell 环境下 `npm` 受执行策略影响，应使用 `npm.cmd`。

## 执行顺序
1. 建立并维护本 `harness/` 目录，作为唯一任务与验证落点。
2. 记录基线失败项，避免在无证据情况下改代码。
3. 收敛运行架构、数据库链路与验证接口。
4. 按验证方案逐步复验，并将结果写回日志与结果文档。

## 首次本地测试到部署的建议顺序
1. 先完成本地最小可运行验证，再考虑 Vercel 部署验证。
2. 本地验证优先使用 `npm.cmd run dev`，确认前后端链路可达。
3. 完成 `npm.cmd run typecheck` 与 `npm.cmd run build`，再进入 `npm.cmd run dev:vercel`。
4. 仅在本地链路与静态检查通过后，进入 Vercel 环境变量与部署步骤。

## Gemini 网络前置（本机状态）
- 本机到 Google Gemini 的网络传输层阻断已解除。
- 若报错为 `fetch failed sending request`，优先按 `PROXY_GUIDE.md` 检查代理进程与端口。
- 若报错为 `API_KEY_INVALID`，说明网络路径可用，当前阻断点是密钥有效性而非网络。
- 后续联调时，重点从密钥权限、配额与账单状态继续排查。

## 文档索引
- [TASK_BOOK.md](./TASK_BOOK.md)
- [VERIFICATION_PLAN.md](./VERIFICATION_PLAN.md)
- [VERIFICATION_LOG.md](./VERIFICATION_LOG.md)
- [RESULT.md](./RESULT.md)
