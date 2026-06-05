# 🦷 牙科诊所 AI 预约助手 MVP

帮助牙科诊所将咨询用户转化为预约用户的 AI 聊天助手。

## ✨ 功能

- AI 聊天咨询（基于小米 MiMo 大模型）
- 自动识别咨询类型（洗牙、矫正、种植等）
- 3 轮内推进预约
- 用户信息收集（姓名、手机、项目、时间）
- 后台查看预约记录

## 🛠 技术栈

- **前端**：Next.js 15 + TypeScript + TailwindCSS
- **后端**：Next.js API Routes
- **数据库**：Supabase PostgreSQL
- **AI 模型**：小米 MiMo V2.5 Pro（OpenAI 兼容接口）
- **部署**：Vercel

## 📦 安装

```bash
# 克隆项目
git clone <your-repo>
cd dental-agent

# 安装依赖
npm install
```

## ⚙️ 环境变量

复制 `.env.example` 为 `.env.local`，填入以下内容：

```env
# MiMo API (OpenAI 兼容)
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://token-plan-cn.xiaomimimo.com/v1
OPENAI_MODEL=mimo-v2.5-pro

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Admin 密码
ADMIN_PASSWORD=your_password
```

## 🗄 数据库初始化

1. 登录 [Supabase](https://supabase.com)
2. 进入你的项目
3. 点击左侧菜单 **SQL Editor**
4. 执行 `database.sql` 中的 SQL

```sql
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  service_type text NOT NULL,
  appointment_time text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status);
```

## 🚀 启动

```bash
npm run dev
```

访问：
- 首页：http://localhost:3000
- 后台：http://localhost:3000/admin

## 📁 项目结构

```
dental-agent/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts        # AI 聊天 API
│   │   │   ├── appointment/route.ts  # 创建预约 API
│   │   │   └── appointments/route.ts # 获取预约列表 API
│   │   ├── admin/
│   │   │   └── page.tsx              # 后台管理页面
│   │   ├── page.tsx                  # 首页（聊天界面）
│   │   ├── layout.tsx                # 布局
│   │   └── globals.css               # 全局样式
│   └── lib/
│       ├── openai.ts                 # OpenAI 客户端配置
│       └── supabase.ts               # Supabase 客户端配置
├── database.sql                      # 数据库初始化 SQL
├── .env.local                        # 环境变量（不提交）
├── README.md                         # 项目文档
├── package.json
└── tsconfig.json
```

## 🤖 AI 行为规则

- 优先推动用户预约
- 简单回答（不超过 2 句话）
- 3 轮内推进预约
- 禁止长篇医学科普
- 禁止诊断疾病

## 📊 聊天状态机

```
normal → collect_name → collect_phone → collect_service → collect_time → completed
   ↑                                                                          │
   └──────────────────────────────────────────────────────────────────────────┘
```

## 🚢 部署到 Vercel

1. Push 代码到 GitHub
2. 登录 [Vercel](https://vercel.com)
3. Import 项目
4. 配置环境变量
5. Deploy

## 📝 License

MIT
