-- Demo mall schema for Supabase Learn
-- 在 Supabase Dashboard > SQL Editor 中执行本文件，可创建 demo 所需表并写入测试数据。
-- 本项目 API 使用 service_role key 访问 demo_* 表；请不要把 service_role 暴露给前端。

create extension if not exists pgcrypto;

create table if not exists public.demo_users (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  phone text unique,
  email text unique,
  avatar_url text,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.demo_products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  description text,
  cover_url text,
  status text not null default 'on_sale' check (status in ('on_sale', 'off_sale')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.demo_skus (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.demo_products(id) on delete cascade,
  sku_name text not null,
  price numeric(10,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.demo_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  user_id uuid not null references public.demo_users(id),
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'shipped', 'completed', 'refund_requested', 'refunded', 'returned', 'cancelled')),
  total_amount numeric(10,2) not null default 0,
  receiver_name text,
  receiver_phone text,
  receiver_address text,
  remark text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.demo_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.demo_orders(id) on delete cascade,
  product_id uuid not null references public.demo_products(id),
  sku_id uuid not null references public.demo_skus(id),
  product_title text not null,
  sku_name text not null,
  price numeric(10,2) not null,
  quantity integer not null check (quantity > 0),
  amount numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_demo_skus_product_id on public.demo_skus(product_id);
create index if not exists idx_demo_orders_user_id on public.demo_orders(user_id);
create index if not exists idx_demo_orders_status on public.demo_orders(status);
create index if not exists idx_demo_order_items_order_id on public.demo_order_items(order_id);
create index if not exists idx_demo_order_items_product_id on public.demo_order_items(product_id);
create index if not exists idx_demo_order_items_sku_id on public.demo_order_items(sku_id);

create or replace function public.demo_touch_updated_at()
returns trigger
set search_path = public
as $
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_demo_users_updated_at on public.demo_users;
create trigger trg_demo_users_updated_at before update on public.demo_users for each row execute function public.demo_touch_updated_at();

drop trigger if exists trg_demo_products_updated_at on public.demo_products;
create trigger trg_demo_products_updated_at before update on public.demo_products for each row execute function public.demo_touch_updated_at();

drop trigger if exists trg_demo_skus_updated_at on public.demo_skus;
create trigger trg_demo_skus_updated_at before update on public.demo_skus for each row execute function public.demo_touch_updated_at();

drop trigger if exists trg_demo_orders_updated_at on public.demo_orders;
create trigger trg_demo_orders_updated_at before update on public.demo_orders for each row execute function public.demo_touch_updated_at();

alter table public.demo_users enable row level security;
alter table public.demo_products enable row level security;
alter table public.demo_skus enable row level security;
alter table public.demo_orders enable row level security;
alter table public.demo_order_items enable row level security;

drop policy if exists "demo service role users" on public.demo_users;
create policy "demo service role users" on public.demo_users for all to service_role using (true) with check (true);

drop policy if exists "demo public read products" on public.demo_products;
create policy "demo public read products" on public.demo_products for select to anon, authenticated using (status = 'on_sale');

drop policy if exists "demo service role products" on public.demo_products;
create policy "demo service role products" on public.demo_products for all to service_role using (true) with check (true);

drop policy if exists "demo public read skus" on public.demo_skus;
create policy "demo public read skus" on public.demo_skus for select to anon, authenticated using (status = 'active');

drop policy if exists "demo service role skus" on public.demo_skus;
create policy "demo service role skus" on public.demo_skus for all to service_role using (true) with check (true);

drop policy if exists "demo service role orders" on public.demo_orders;
create policy "demo service role orders" on public.demo_orders for all to service_role using (true) with check (true);

drop policy if exists "demo service role order items" on public.demo_order_items;
create policy "demo service role order items" on public.demo_order_items for all to service_role using (true) with check (true);
insert into public.demo_users (id, nickname, phone, email, status) values
  ('11111111-1111-1111-1111-111111111111', '小鹿', '13800000001', 'demo1@example.com', 'active'),
  ('22222222-2222-2222-2222-222222222222', '小海', '13800000002', 'demo2@example.com', 'active')
on conflict (id) do update set nickname = excluded.nickname, phone = excluded.phone, email = excluded.email, status = excluded.status;

insert into public.demo_products (id, title, subtitle, description, cover_url, status, sort_order) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Supabase 学习套装', '适合快速入门的全栈学习资料', '包含 Nuxt、Node.js、Supabase 实战 demo 与示例数据。', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80', 'on_sale', 10),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'H5 商城模板', '移动端商品浏览与订单流程模板', '内置欢迎页、注册引导、商品列表、详情页、下单和订单中心。', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80', 'on_sale', 20),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '后台管理模板', '用户、商品、订单管理后台', '为运营人员提供用户资料维护、SKU 库存维护、订单状态维护能力。', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80', 'on_sale', 30)
on conflict (id) do update set title = excluded.title, subtitle = excluded.subtitle, description = excluded.description, cover_url = excluded.cover_url, status = excluded.status, sort_order = excluded.sort_order;

insert into public.demo_skus (id, product_id, sku_name, price, stock, status) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '基础版', 99.00, 100, 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '进阶版', 199.00, 60, 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '单项目授权', 299.00, 50, 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '团队授权', 699.00, 20, 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb5', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '标准版', 399.00, 30, 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb6', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '旗舰版', 999.00, 10, 'active')
on conflict (id) do update set product_id = excluded.product_id, sku_name = excluded.sku_name, price = excluded.price, stock = excluded.stock, status = excluded.status;

insert into public.demo_orders (id, order_no, user_id, status, total_amount, receiver_name, receiver_phone, receiver_address, remark, paid_at, created_at) values
  ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'DEMO202607220001', '11111111-1111-1111-1111-111111111111', 'paid', 199.00, '小鹿', '13800000001', '上海市浦东新区 Demo 路 1 号', '测试已付款订单', now(), now() - interval '1 day'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'DEMO202607220002', '11111111-1111-1111-1111-111111111111', 'pending_payment', 299.00, '小鹿', '13800000001', '上海市浦东新区 Demo 路 1 号', '测试待付款订单', null, now() - interval '2 hours'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'DEMO202607220003', '22222222-2222-2222-2222-222222222222', 'returned', 399.00, '小海', '13800000002', '杭州市西湖区 Demo 路 2 号', '测试退货订单', now() - interval '3 days', now() - interval '4 days')
on conflict (id) do update set order_no = excluded.order_no, user_id = excluded.user_id, status = excluded.status, total_amount = excluded.total_amount, receiver_name = excluded.receiver_name, receiver_phone = excluded.receiver_phone, receiver_address = excluded.receiver_address, remark = excluded.remark, paid_at = excluded.paid_at;

insert into public.demo_order_items (id, order_id, product_id, sku_id, product_title, sku_name, price, quantity, amount) values
  ('dddddddd-dddd-dddd-dddd-ddddddddddd1', 'cccccccc-cccc-cccc-cccc-ccccccccccc1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'Supabase 学习套装', '进阶版', 199.00, 1, 199.00),
  ('dddddddd-dddd-dddd-dddd-ddddddddddd2', 'cccccccc-cccc-cccc-cccc-ccccccccccc2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 'H5 商城模板', '单项目授权', 299.00, 1, 299.00),
  ('dddddddd-dddd-dddd-dddd-ddddddddddd3', 'cccccccc-cccc-cccc-cccc-ccccccccccc3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb5', '后台管理模板', '标准版', 399.00, 1, 399.00)
on conflict (id) do update set order_id = excluded.order_id, product_id = excluded.product_id, sku_id = excluded.sku_id, product_title = excluded.product_title, sku_name = excluded.sku_name, price = excluded.price, quantity = excluded.quantity, amount = excluded.amount;
