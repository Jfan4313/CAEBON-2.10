-- ============================================
-- Supabase 数据库清理和重新初始化
-- ============================================

-- 警告：此脚本会删除现有表和数据！
-- 确保你了解后果后再执行

-- 1. 删除触发器
drop trigger if exists update_projects_updated_at on public.projects;
drop trigger if exists update_storage_updated_at on public.storage;

-- 2. 删除策略
drop policy if exists "Enable all access for users" on public.projects;
drop policy if exists "Enable all access for storage" on public.storage;
drop policy if exists "Enable all access for project list" on public.project_list;

-- 3. 删除表（按依赖顺序）
drop table if exists public.project_list cascade;
drop table if exists public.projects cascade;
drop table if exists public.storage cascade;
drop table if exists public.profiles cascade;

-- 4. 删除函数
drop function if exists update_updated_at_column();

-- 5. 删除扩展（可选）
-- drop extension if exists "uuid-ossp";

-- ============================================
-- 重新创建所有表
-- ============================================

-- 启用 UUID 扩展
create extension if not exists "uuid-ossp";

-- 创建项目表
create table public.projects (
  id text not null primary key,
  user_id text not null,
  name text not null,
  description text,
  data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 创建存储表
create table public.storage (
  key text not null primary key,
  value text,
  user_id text not null,
  updated_at timestamp with time zone default now()
);

-- 创建项目列表表
create table public.project_list (
  user_id text not null,
  project_id text not null references public.projects(id) on delete cascade,
  is_template boolean default false,
  created_at timestamp with time zone default now()
);

-- ============================================
-- 创建索引
-- ============================================
create index idx_projects_user_id on public.projects(user_id);
create index idx_projects_updated_at on public.projects(updated_at desc);
create index idx_storage_user_id on public.storage(user_id);
create index idx_storage_key on public.storage(key);
create index idx_project_list_user_id on public.project_list(user_id);

-- ============================================
-- 启用行级安全 (RLS)
-- ============================================
alter table public.projects enable row level security;
alter table public.storage enable row level security;
alter table public.project_list enable row level security;

-- ============================================
-- 创建 RLS 策略
-- ============================================

-- projects 表策略
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

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_projects_updated_at
  before update on public.projects
  for each row
  execute function update_updated_at_column();

create trigger update_storage_updated_at
  before update on public.storage
  for each row
  execute function update_updated_at_column();

-- ============================================
-- 授权
-- ============================================
grant usage on schema public to anon;
grant all on public.projects to anon;
grant all on public.storage to anon;
grant all on public.project_list to anon;
grant usage, select on all sequences in schema public to anon;

grant usage on schema public to authenticated;
grant all on public.projects to authenticated;
grant all on public.storage to authenticated;
grant all on public.project_list to authenticated;
grant usage, select on all sequences in schema public to authenticated;
