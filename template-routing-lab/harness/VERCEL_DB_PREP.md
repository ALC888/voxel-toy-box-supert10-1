# Vercel 数据库接入准备

## 目标
为模板检索日志、路由日志和反馈事件准备可部署到 Vercel 的数据库落盘方案。

## 当前约束
- 不在前端直接写数据库
- 不把数据库 SDK 硬编码进当前模板检索核心模块
- 先固定事件 schema，再接数据库
- 先支持本地内存和浏览器存储，再支持服务端数据库仓库

## 当前技术判断
根据 Vercel 官方文档，旧的 `Vercel Postgres` 产品已停止提供；当前推荐方式是通过 Vercel Marketplace 安装 Postgres 集成，Vercel 会自动向项目注入数据库环境变量。

参考：
- [Postgres on Vercel](https://vercel.com/docs/postgres)
- [Storage on Vercel Marketplace](https://vercel.com/docs/marketplace-storage)

## 推荐落地方式
### 阶段 1：事件模型先固定
当前已完成：
- `TemplateRoutingLogEvent`
- `RetrievalLogEvent`
- `RouteLogEvent`
- `FeedbackLogEvent`

### 阶段 2：数据库仓库接口固定
当前已完成：
- `LogEventRepository`
- `VercelPostgresLogRepository` 占位实现

### 阶段 3：部署时接入实际数据库客户端
后续在后端函数中完成：
- 初始化 SQL 客户端
- 执行建表 SQL
- 将日志事件写入数据库

## 表设计
建议最小表结构：

```sql
create table if not exists template_routing_log_events (
  id bigserial primary key,
  event_type text not null,
  created_at timestamptz not null,
  payload_json jsonb not null
);
```

为什么采用 `jsonb`：
- 事件结构在早期仍会迭代
- 避免每次字段调整都改表
- 便于离线分析和回放原始事件

## 接入原则
- 检索模块不直接依赖数据库
- 路由模块不直接依赖数据库
- 由后端函数或服务端 action 调用日志仓库
- 失败时日志落盘不能阻塞主生成链路

## 后续实施清单
- 在 Vercel 项目里安装 Postgres Marketplace 集成
- 确认环境变量名
- 在服务端注入 SQL client
- 执行建表迁移
- 将日志写入切到 `VercelPostgresLogRepository`
- 对数据库写失败做 graceful fallback
