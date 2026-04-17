# 日志持久化说明

## 当前支持
- `MemoryLogStorage`
  用于单元测试和本地内存验证
- `LocalStorageLogStorage`
  用于浏览器本地开发
- `VercelPostgresLogRepository`
  用于后续接入 Vercel Marketplace Postgres 数据库

## 为什么要分成两层
当前日志体系拆成两层：

1. `LogStorageAdapter`
   面向同步、本地使用方式
2. `LogEventRepository`
   面向异步、数据库持久化方式

这样可以保证：
- 前端本地日志不依赖数据库
- 后续部署到 Vercel 时可直接切换到数据库仓库
- 不需要重写日志事件结构

## Vercel 数据库准备建议
当前建议使用 Vercel Marketplace 中的 Postgres 集成，而不是旧的 Vercel Postgres 产品。

推荐准备项：
- 在 Vercel 项目中安装 Marketplace Postgres 集成
- 让平台自动注入数据库连接环境变量
- 后端函数中初始化 `SqlClientLike`
- 将日志事件表统一写入 `template_routing_log_events`

## 建议表结构
```sql
create table if not exists template_routing_log_events (
  id bigserial primary key,
  event_type text not null,
  created_at timestamptz not null,
  payload_json jsonb not null
);

create index if not exists idx_template_routing_log_events_type
  on template_routing_log_events (event_type);

create index if not exists idx_template_routing_log_events_created_at
  on template_routing_log_events (created_at desc);
```

## 环境变量建议
不要在本仓库里写死具体数据库厂商变量名。  
在接入层统一读取，例如：

- `DATABASE_URL`
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`

由部署环境决定实际注入哪一个。
