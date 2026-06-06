# 🦷 牙科诊所 AI 预约助手

将咨询用户转化为预约用户的 AI 聊天助手。基于小米 MiMo 大模型，模拟真人微信聊天风格，在对话中自动引导用户完成预约登记。

## ✨ 功能

- **AI 智能咨询** — 基于 MiMo 大模型，自然回答牙齿问题
- **自动引导预约** — 识别用户预约意图，3 轮内完成信息收集
- **信息收集流程** — 姓名 → 手机号 → 项目 → 到店时间，全自动引导
- **快捷话术** — 首页提供常见问题快捷按钮，降低用户输入成本
- **后台管理** — 密码登录，查看所有预约记录，支持状态筛选

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 15 + React 19 + TypeScript + Tailwind CSS 4 |
| 后端 | Next.js API Routes |
| 数据库 | PostgreSQL（本地 / 云数据库） |
| AI 模型 | 小米 MiMo V2.5 Pro（OpenAI 兼容接口） |
| 部署 | Vercel / 本地 |

## 📦 安装

```bash
git clone https://github.com/zyy0708/dental-agent.git
cd dental-agent
npm install
```

## ⚙️ 环境变量

复制 `.env.example` 为 `.env.local`，填入配置：

```env
# MiMo API
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://token-plan-cn.xiaomimimo.com/v1
OPENAI_MODEL=mimo-v2.5-pro

# PostgreSQL
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=dental_agent
DB_USER=dental
DB_PASSWORD=your_password

# Admin 后台密码
ADMIN_PASSWORD=your_password
```

## 🗄 数据库初始化

确保 PostgreSQL 已运行，创建数据库后执行初始化脚本：

```bash
# 创建数据库（如尚未创建）
createdb dental_agent

# 执行初始化 SQL（在 psql 或任意 SQL 客户端中运行）
psql -d dental_agent -f database.sql
```

`database.sql` 会创建 `appointments` 表及索引，并插入测试数据。

### 表结构

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| name | text | 患者姓名 |
| phone | text | 手机号 |
| service_type | text | 预约项目（洗牙/矫正/种植/补牙/牙痛/其他） |
| appointment_time | text | 希望到店时间 |
| status | text | 状态：pending / confirmed / cancelled |
| created_at | timestamp | 创建时间 |

## 🚀 启动

```bash
npm run dev
```

| 页面 | 地址 |
|------|------|
| 聊天首页 | http://localhost:3000 |
| 管理后台 | http://localhost:3000/admin |

## 📁 项目结构

```
dental-agent/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts          # AI 聊天 + 预约收集状态机
│   │   │   ├── appointment/route.ts    # 创建单条预约
│   │   │   └── appointments/route.ts   # 获取预约列表（需密码）
│   │   ├── admin/page.tsx              # 后台管理页面
│   │   ├── page.tsx                    # 聊天首页
│   │   ├── layout.tsx                  # 全局布局
│   │   └── globals.css                 # 全局样式
│   └── lib/
│       ├── openai.ts                   # OpenAI 客户端配置
│       └── db.ts                       # PostgreSQL 连接池
├── database.sql                        # 数据库初始化脚本
├── .env.example                        # 环境变量模板
├── package.json
└── tsconfig.json
```

## 🤖 聊天状态机

```
chatting ──(检测到预约意图)──→ collect_name
                                    │
                                    ↓
                              collect_phone
                                    │
                                    ↓
                             collect_service
                                    │
                                    ↓
                              collect_time ──→ 写入数据库 ──→ 回到 chatting
```

**设计规则：**
- 回答简短口语化（1-2 句），像微信聊天
- 用户说"好的""嗯"时继续引导，不卡住
- 用户直接发"姓名+手机号"时跳过收集步骤
- 禁止长篇科普、禁止诊断疾病
- 预约信息写入 PostgreSQL，后台可查看

## 🚢 部署

### 阿里云服务器（当前方案）

- **服务器**：阿里云轻量应用服务器，Ubuntu 24.04，2 核 2G
- **公网 IP**：`47.108.231.46`
- **Web 服务器**：Nginx 反向代理
- **进程管理**：PM2

```bash
# 1. 安装 Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# 2. 安装 PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql

# 3. 创建数据库和用户
sudo -u postgres psql
CREATE USER dental WITH PASSWORD 'your_password';
CREATE DATABASE dental_agent OWNER dental;
\q

# 4. 初始化数据库
psql -U dental -d dental_agent -f database.sql

# 5. 部署项目
git clone https://github.com/zyy0708/dental-agent.git
cd dental-agent
npm install
cp .env.example .env.local  # 编辑填入实际配置
npm run build

# 6. PM2 启动
npm install -g pm2
pm2 start npm --name dental-agent -- start
pm2 save
pm2 startup

# 7. Nginx 配置
sudo apt install -y nginx
```

Nginx 配置示例（`/etc/nginx/sites-available/dental-agent`）：

```nginx
server {
    listen 80;
    server_name 47.108.231.46;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/dental-agent /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 📝 License

MIT
