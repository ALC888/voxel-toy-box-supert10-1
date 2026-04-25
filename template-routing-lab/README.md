# Template Routing Lab

这个工作区用于承接成员 4 的独立实现范围：

- 本地模板库
- 模板元数据 schema
- prompt 到模板的检索
- `reuse / adapt / free_generate` 路由
- 日志与轻量反馈闭环

## 当前目录约定
- `src/contracts/`
  放模块间共享的类型合同
- `src/templates/`
  放模板注册表、模板元数据与模板来源协议
- `src/retrieval/`
  放 prompt 规范化、召回、打分与候选排序
- `src/routing/`
  放 `reuse / adapt / free_generate` 决策逻辑
- `src/logging/`
  放结构化日志与反馈事件定义
- `src/legacy/`
  放从原项目复制来的参考实现，不纳入当前编译

## Legacy 种子
从原项目复制的参考文件：

- `src/legacy/types.ts`
- `src/legacy/utils/voxelGenerators.ts`
- `src/legacy/utils/voxelConstants.ts`

这些文件只作为模板种子和语义参考，后续新实现不要继续堆在这里。

## 当前进度
- 已建立 Harness 文档
- 已完成任务 1 的目录骨架与合同层
- 已完成任务 2 的首批种子模板注册
- 已完成任务 3 的 query 规范化与规则召回
- 已完成任务 4 的模板打分与排序基线
- 已完成任务 5 的路由决策基线
- 已完成任务 6 的日志事件与本地存储适配基线
- 测试尚未开始实现

## 实验脚本

在 `template-routing-lab` 目录下执行：

1. 内存模式 API 反馈回放（基线）

```powershell
npm.cmd run experiment:feedback:memory
```

1. 真实 Postgres 连通性检查

```powershell
npm.cmd run experiment:db:check
```

1. 内存模式 vs Postgres 模式对照回放

```powershell
npm.cmd run experiment:replay:compare
```

数据库环境变量支持：

- `DATABASE_URL`
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`

## Vercel 数据库接法

如果你要把模板路由实验也接到 Vercel Postgres，推荐流程是：

1. 在 Vercel 项目里添加 Postgres Storage。
2. 让 Vercel 注入 `DATABASE_URL` 或 `POSTGRES_URL`。
3. 把运行环境变量同步到对应部署环境（Preview / Production）。
4. 重新部署后先跑数据库健康检查，再跑回放脚本。
5. 如果没有真实数据库，可先用本地内存模式做开发验证，但最终上线前还是要切到 Vercel Postgres。

建议先检查：

```powershell
npm.cmd run experiment:db:check
npm.cmd run experiment:replay:compare
```
