-- ============================================
-- 零碳项目收益评估软件 - Supabase 数据库设置
-- ============================================

-- 1. 启用 UUID 扩展
create extension if not exists "uuid-ossp";

-- 2. 创建用户表（可选，用于用户认证）
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. 创建项目表
create table if not exists public.projects (
  id text not null primary key,
  user_id text not null,
  name text not null,
  description text,
  data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 4. 创建存储表
create table if not exists public.storage (
  key text not null primary key,
  value text,
  user_id text not null,
  updated_at timestamp with time zone default now()
);

-- 5. 创建项目列表表
create table if not exists public.project_list (
  user_id text not null,
  project_id text not null references public.projects(id) on delete cascade,
  is_template boolean default false,
  created_at timestamp with time zone default now()
);

-- ============================================
-- 创建索引
-- ============================================
create index if not exists idx_projects_user_id on public.projects(user_id);
create index if not exists idx_projects_updated_at on public.projects(updated_at desc);
create index if not exists idx_storage_user_id on public.storage(user_id);
create index if not exists idx_storage_key on public.storage(key);
create index if not exists idx_project_list_user_id on public.project_list(user_id);

-- ============================================
-- 启用行级安全 (RLS)
-- ============================================
alter table public.projects enable row level security;
alter table public.storage enable row level security;
alter table public.project_list enable row level security;

-- ============================================
-- 创建 RLS 策略
-- ============================================

-- projects 表策略：任何人都可以读取和写入（演示用）
-- 生产环境应该根据 user_id 进行限制
create policy "Enable all access for users" on public.projects
  for all using (true)
  with check (true);

-- storage 表策略
create policy "Enable all access for storage" on public.storage
  for all using (true)
  with check (true);

-- project_list 表策略
create policy "Enable all access for project list" on public.project_list
  for all using (true)
  with check (true);

-- ============================================
-- 创建更新时间触发器
-- ============================================

-- 创建或替换更新函数
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 为 projects 表添加触发器
drop trigger if exists update_projects_updated_at on public.projects;
create trigger update_projects_updated_at
  before update on public.projects
  for each row
  execute function update_updated_at_column();

-- 为 storage 表添加触发器
drop trigger if exists update_storage_updated_at on public.storage;
create trigger update_storage_updated_at
  before update on public.storage
  for each row
  execute function update_updated_at_column();

-- ============================================
-- 插入示例数据（可选）
-- ============================================

-- 示例项目
insert into public.projects (id, user_id, name, description, data)
values (
  'demo-project-001',
  'demo-user',
  '演示项目',
  '这是一个演示项目，用于测试云存储功能',
  '{"projectBaseInfo": {"name": "演示项目", "type": "factory"}, "modules": {}}'::jsonb
)
on conflict (id) do nothing;

-- ============================================
-- 授权
-- ============================================
-- 授予匿名用户访问权限（用于开发环境）
grant usage on schema public to anon;
grant all on public.projects to anon;
grant all on public.storage to anon;
grant all on public.project_list to anon;
grant usage, select on all sequences in schema public to anon;

-- 授予认证用户访问权限
grant usage on schema public to authenticated;
grant all on public.projects to authenticated;
grant all on public.storage to authenticated;
grant all on public.project_list to authenticated;
grant usage, select on all sequences in schema public to authenticated;
