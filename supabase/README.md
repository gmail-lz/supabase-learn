# Supabase setup

## 1. 创建项目并复制 API 配置

在 [Supabase Dashboard](https://supabase.com/dashboard/projects) 创建项目，然后打开 **Project Settings > API**，复制：

- Project URL
- anon public key
- service_role key（只能放后端/本地 `.env`，不要暴露到浏览器）

## 2. 配置根目录 `.env`

本项目已经把 web/api 配置统一到项目根目录，不再在 `apps/web` 或 `apps/api` 下放 `.env`。

```bash
NODE_ENV=development
PORT=4000
CORS_ORIGIN=http://localhost:3000
NUXT_PUBLIC_API_BASE=http://localhost:4000
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NUXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 3. 创建 demo 表和测试数据

打开 Supabase Dashboard > SQL Editor，把 `supabase/schema.sql` 全部内容粘贴并执行。

会创建这些表：

- `demo_users`
- `demo_products`
- `demo_skus`
- `demo_orders`
- `demo_order_items`

同时会插入 H5 商城和管理后台所需测试数据。

> 当前项目没有 PostgreSQL 数据库连接串，service role key 不能直接执行 DDL 建表 SQL，所以自动建表需要你额外提供数据库连接串，或者使用 Supabase SQL Editor 执行本 SQL 文件。
