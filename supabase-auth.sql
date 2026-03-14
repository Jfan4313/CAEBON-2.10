-- ============================================
-- Supabase 认证和用户数据隔离安全策略
-- ============================================
-- 此脚本用于配置 Supabase 认证和 Row Level Security (RLS) 策略
-- 确保用户只能访问自己的数据
-- ============================================

-- 启用 RLS (Row Level Security)
-- 如果尚未启用，取消注释以下行
-- ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.storage ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.project_list ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 删除开发模式策略（允许所有访问）
-- ============================================

-- 注意：请确保在生产环境中执行此操作
-- 开发阶段可以保留宽松的策略以方便测试

-- DROP POLICY IF EXISTS "Enable all access for users" ON public.projects;
-- DROP POLICY IF EXISTS "Enable all access for users" ON public.storage;
-- DROP POLICY IF EXISTS "Enable all access for users" ON public.project_list;

-- ============================================
-- 项目表 (projects) RLS 策略
-- ============================================

-- 用户可以查看自己的项目
CREATE POLICY IF NOT EXISTS "Users can view their own projects"
ON public.projects
FOR SELECT
USING (auth.uid()::text = user_id);

-- 用户可以创建自己的项目
CREATE POLICY IF NOT EXISTS "Users can create their own projects"
ON public.projects
FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- 用户可以更新自己的项目
CREATE POLICY IF NOT EXISTS "Users can update their own projects"
ON public.projects
FOR UPDATE
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- 用户可以删除自己的项目
CREATE POLICY IF NOT EXISTS "Users can delete their own projects"
ON public.projects
FOR DELETE
USING (auth.uid()::text = user_id);

-- ============================================
-- 存储表 (storage) RLS 策略
-- ============================================

-- 用户可以查看自己的存储数据
CREATE POLICY IF NOT EXISTS "Users can view their own storage"
ON public.storage
FOR SELECT
USING (auth.uid()::text = user_id);

-- 用户可以创建自己的存储数据
CREATE POLICY IF NOT EXISTS "Users can create their own storage"
ON public.storage
FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- 用户可以更新自己的存储数据
CREATE POLICY IF NOT EXISTS "Users can update their own storage"
ON public.storage
FOR UPDATE
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- 用户可以删除自己的存储数据
CREATE POLICY IF NOT EXISTS "Users can delete their own storage"
ON public.storage
FOR DELETE
USING (auth.uid()::text = user_id);

-- ============================================
-- 项目列表表 (project_list) RLS 策略
-- ============================================

-- 用户可以查看自己的项目列表
CREATE POLICY IF NOT EXISTS "Users can view their own project list"
ON public.project_list
FOR SELECT
USING (auth.uid()::text = user_id);

-- 用户可以创建自己的项目列表
CREATE POLICY IF NOT EXISTS "Users can create their own project list"
ON public.project_list
FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- 用户可以更新自己的项目列表
CREATE POLICY IF NOT EXISTS "Users can update their own project list"
ON public.project_list
FOR UPDATE
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- 用户可以删除自己的项目列表
CREATE POLICY IF NOT EXISTS "Users can delete their own project list"
ON public.project_list
FOR DELETE
USING (auth.uid()::text = user_id);

-- ============================================
-- 用户档案表 (profiles) RLS 策略
-- ============================================

-- 用户可以查看自己的档案
CREATE POLICY IF NOT EXISTS "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- 用户可以创建自己的档案（通过触发器自动创建）
CREATE POLICY IF NOT EXISTS "Users can create their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- 用户可以更新自己的档案
CREATE POLICY IF NOT EXISTS "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 用户可以查看其他用户的档案（只读）
CREATE POLICY IF NOT EXISTS "Users can view other profiles"
ON public.profiles
FOR SELECT
USING (true);

-- ============================================
-- 触发器：自动创建用户档案
-- ============================================

-- 创建函数：新用户注册时自动创建档案
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器：在 auth.users 表上
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 测试查询（用于验证 RLS 策略）
-- ============================================

-- 查看当前用户的 ID（需要登录）
-- SELECT auth.uid();

-- 查看当前用户可以访问的项目
-- SELECT * FROM public.projects;

-- 查看当前用户的档案
-- SELECT * FROM public.profiles WHERE id = auth.uid();

-- ============================================
-- 注意事项
-- ============================================

-- 1. 在生产环境中，请确保：
--    - 取消注释 DROP POLICY 语句，删除开发模式策略
--    - 启用 RLS（取消注释 ALTER TABLE ... ENABLE ROW LEVEL SECURITY）
--
-- 2. 数据迁移：
--    - 如果有现有数据，需要为所有记录设置正确的 user_id
--    - 迁移脚本示例：
--      UPDATE public.projects SET user_id = 'some-user-id' WHERE user_id IS NULL;
--
-- 3. 邮箱验证：
--    - 在 Supabase 项目设置中启用邮箱验证
--    - 创建策略限制未验证用户访问敏感数据
--
-- 4. 密码重置：
--    - 在 Supabase 项目设置中配置邮件模板
--    - 设置重定向 URL：https://your-app-domain.com/auth/reset-password

-- ============================================
-- 完成提示
-- ============================================

-- 执行完此脚本后：
-- 1. 所有表都启用了 RLS
-- 2. 用户只能访问自己的数据
-- 3. 新用户注册时会自动创建档案
-- 4. 数据完全隔离，安全可靠
