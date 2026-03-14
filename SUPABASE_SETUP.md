# Supabase 云存储配置指南

## 第一步：创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com)
2. 注册/登录账号
3. 点击 "New Project" 创建新项目
4. 填写项目信息：
   - **Name**: 零碳项目收益评估
   - **Database Password**: 设置一个强密码并保存
   - **Region**: 选择 Southeast Asia (Singapore) 或 East Asia (Tokyo)
5. 等待项目创建完成（通常需要 1-2 分钟）

---

## 第二步：运行数据库初始化脚本

1. 在 Supabase 项目左侧菜单中，点击 **SQL Editor**
2. 点击 "New query"
3. 复制项目根目录下的 `supabase-setup.sql` 文件内容
4. 粘贴到 SQL 编辑器中
5. 点击 **Run** 执行脚本

---

## 第三步：获取 API 密钥

1. 在左侧菜单中，点击 **Project Settings** → **API**
2. 复制以下两个值：

   **Project URL**:
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```

   **anon public** (anonymous key):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

## 第四步：配置环境变量

### 方式一：本地开发

编辑 `.env` 文件，填入刚才复制的值：

```env
# Supabase 配置
VITE_SUPABASE_URL=https://你的项目ID.supabase.co
VITE_SUPABASE_ANON_KEY=你的anon密钥
```

### 方式二：Vercel 部署

1. 访问 Vercel 项目设置
2. 进入 **Environment Variables**
3. 添加以下环境变量：

   | 名称 | 值 | 环境 |
   |------|-----|------|
   | `VITE_SUPABASE_URL` | 你的 Supabase Project URL | All |
   | `VITE_SUPABASE_ANON_KEY` | 你的 anon key | All |

4. 重新部署项目

---

## 第五步：验证配置

1. 启动本地开发服务器：
   ```bash
   npm run dev
   ```

2. 打开应用，在左侧边栏应该能看到"云存储"切换器

3. 切换到"云端"模式

4. 保存一个项目，检查是否成功同步到 Supabase

5. 在 Supabase 的 **Table Editor** 中查看 `projects` 表，确认数据已保存

---

## 数据库表说明

### `projects` 表
存储项目数据

| 字段 | 类型 | 说明 |
|------|------|------|
| id | text | 项目唯一标识 |
| user_id | text | 用户 ID |
| name | text | 项目名称 |
| description | text | 项目描述 |
| data | jsonb | 项目完整数据（JSON 格式） |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

### `storage` 表
存储键值对数据

| 字段 | 类型 | 说明 |
|------|------|------|
| key | text | 存储键 |
| value | text | 存储值 |
| user_id | text | 用户 ID |
| updated_at | timestamp | 更新时间 |

### `project_list` 表
项目列表索引

| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | text | 用户 ID |
| project_id | text | 项目 ID |
| is_template | boolean | 是否为模板 |
| created_at | timestamp | 创建时间 |

---

## 生产环境安全配置

当前配置允许所有访问（便于开发）。生产环境应启用用户认证：

1. **启用用户注册/登录**：
   - 在 Supabase 的 **Authentication** → **Providers** 中启用 Email auth

2. **更新 RLS 策略**（限制用户只能访问自己的数据）：
   ```sql
   -- 替换之前的宽松策略
   drop policy "Enable all access for users" on public.projects;

   create policy "Users can manage their own projects" on public.projects
     for all using (auth.uid()::text = user_id)
     with check (auth.uid()::text = user_id);
   ```

3. **在应用中添加登录功能**

---

## 故障排除

### 云存储切换器不显示
- 检查 `.env` 中 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 是否已配置
- 确保环境变量以 `VITE_` 开头（Vite 要求）

### 数据保存失败
- 检查浏览器控制台的错误信息
- 确认 Supabase 项目的 RLS 策略允许写入
- 验证 anon key 是否正确

### 连接超时
- 检查 Supabase 项目区域选择
- 确认网络连接正常
- 尝试切换到更近的 Supabase 区域

---

## 相关链接

- [Supabase 文档](https://supabase.com/docs)
- [Supabase JavaScript 客户端](https://supabase.com/docs/reference/javascript)
- [Vite 环境变量](https://vitejs.dev/guide/env-and-mode.html)
