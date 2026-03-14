-- ============================================
-- Supabase 数据库更新脚本
-- 只更新缺失的部分，不删除现有数据
-- ============================================

-- 1. 启用 UUID 扩展（如果未启用）
create extension if not exists "uuid-ossp";

-- 2. 创建缺失的表

-- projects 表
create table if not exists public.projects (
  id text not null primary key,
  user_id text not null,
  name text not null,
  description text,
  data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- storage 表
create table if not exists public.storage (
  key text not null primary key,
  value text,
  user_id text not null,
  updated_at timestamp with time zone default now()
);

-- project_list 表
create table if not exists public.project_list (
  user_id text not null,
  project_id text not null,
  created_at timestamp with time zone default now()
);

-- 3. 添加缺失的列（如果表已存在但缺少某些列）

-- 为 projects 表添加 is_template 列（如果不存在）
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'projects' and column_name = 'is_template'
  ) then
    alter table public.projects add column is_template boolean default false;
  end if;
end $$;

-- 为 projects 表添加 data 列（如果不存在）
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'projects' and column_name = 'data'
  ) then
    alter table public.projects add column data jsonb default '{}'::jsonb;
  end if;
end $$;

-- 4. 创建缺失的索引
create index if not exists idx_projects_user_id on public.projects(user_id);
create index if not exists idx_projects_updated_at on public.projects(updated_at desc);
create index if not exists idx_storage_user_id on public.storage(user_id);
create index if not exists idx_storage_key on public.storage(key);
create index if not exists idx_project_list_user_id on public.project_list(user_id);

-- 5. 启用 RLS（如果未启用）
do $$
begin
  if not exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'projects' and rowsecurity = true
  ) then
    alter table public.projects enable row level security;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'storage' and rowsecurity = true
  ) then
    alter table public.storage enable row level security;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'project_list' and rowsecurity = true
  ) then
    alter table public.project_list enable row level security;
  end if;
end $$;

-- 6. 创建 RLS 策略（使用 DROP IF EXISTS 避免重复错误）
drop policy if exists "Enable all access for users" on public.projects;
create policy "Enable all access for users" on public.projects
  for all using (true)
  with check (true);

drop policy if exists "Enable all access for storage" on public.storage;
create policy "Enable all access for storage" on public.storage
  for all using (true)
  with check (true);

drop policy if exists "Enable all access for project list" on public.project_list;
create policy "Enable all access for project list" on public.project_list
  for all using (true)
  with check (true);

-- 7. 创建更新函数和触发器
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_projects_updated_at on public.projects;
create trigger update_projects_updated_at
  before update on public.projects
  for each row
  execute function update_updated_at_column();

drop trigger if exists update_storage_updated_at on public.storage;
create trigger update_storage_updated_at
  before update on public.storage
  for each row
  execute function update_updated_at_column();

-- 8. 授权
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
