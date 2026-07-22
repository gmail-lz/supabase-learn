# supabase-learn

一个使用 **Nuxt 4 + Node.js/Express + Supabase** 的全栈商城 demo。

## 项目结构

```text
apps/
  web/        Nuxt 4 前端源码（H5 商城 + 管理后台页面）
  api/        Node.js/Express API 源码
packages/
  shared/     预留共享 TypeScript 类型/工具
supabase/
  schema.sql  Demo 数据库表结构与测试数据
```

`apps/web` 和 `apps/api` 目录只保留业务源码；配置统一放在项目根目录：`package.json`、`.env`、`nuxt.config.ts`、`tsconfig.json`、`pnpm-workspace.yaml`。

## 初始化

```bash
pnpm install
pnpm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000

如果根目录没有 `.env`，先复制 `.env.example`，并填写 Supabase Project URL、anon key、service role key。

## 创建 Supabase 表和测试数据

打开 Supabase Dashboard > SQL Editor，把 `supabase/schema.sql` 的内容粘贴执行。

> 说明：当前 `.env` 只有 Supabase URL/API key，没有 PostgreSQL 数据库连接串；service role key 不能直接执行 DDL 建表 SQL，所以建表需要通过 SQL Editor，或后续提供数据库连接串后用 `psql` 自动执行。

## Demo 页面

### H5 商城

- 欢迎页：`/`
- 注册/登录引导：`/register`
- 商品列表：`/products`
- 商品详情：`/products/:id`
- 我的订单：`/orders`
- 订单详情：`/orders/:id`

流程：用户可注册或跳过注册；游客能看商品但下单会跳登录；立即付款会创建已付款订单并跳转订单详情；稍后付款会创建/复用待付款订单并留在商品详情；我的订单可查看正常、待付款、退货/退款订单，并支持继续付款、催发货、申请退款等模拟操作。

### 管理后台

- 用户管理：`/admin/users`
- 商品 / SKU 管理：`/admin/products`
- 订单管理：`/admin/orders`

后台页面通过 Express API 使用 service role key 访问 Supabase，仅用于本地 demo。

## API 路由

```text
GET    /health
GET    /api/dashboard
GET    /api/products
GET    /api/dashboard
GET    /api/products/:id
POST   /api/users/register
POST   /api/users/login
GET    /api/users/:id
GET    /api/orders?userId=...
POST   /api/orders
GET    /api/orders/:id?userId=...
POST   /api/orders/:id/pay
POST   /api/orders/:id/remind
POST   /api/orders/:id/refund
GET    /api/admin/users
PATCH  /api/admin/users/:id
GET    /api/admin/products
POST   /api/admin/products
PATCH  /api/admin/products/:id
PATCH  /api/admin/skus/:id
GET    /api/admin/orders
PATCH  /api/admin/orders/:id
```

## Scripts

```bash
pnpm run dev             # 同时运行 web 和 api
pnpm run dev:web         # 只运行 Nuxt 前端
pnpm run dev:api         # 只运行 Node API
pnpm run build           # 构建 web 和 api
pnpm run typecheck       # 同时检查 web 和 api 类型
```

## 安全说明

- 前端只能使用 public anon key。
- 后端使用 service role key 执行受信任的数据操作。
- 永远不要把 `SUPABASE_SERVICE_ROLE_KEY` 暴露到浏览器，也不要提交到 Git 仓库。

