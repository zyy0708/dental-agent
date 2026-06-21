# Dental Agent — 牙科诊所 AI 智能助手

将咨询用户转化为预约的 AI 导诊 + 线索 CRM 系统。基于百川大模型，提供智能分诊、在线预约、患者档案管理、线索转化看板，支持中/英/日三语言。

## 功能

- **AI 智能导诊** — 分析症状，推荐科室，自然语言交互，不会生硬推销预约
- **在线预约** — 自动读取患者档案（姓名/电话/地区），跳过重复提问，确认即可
- **患者档案** — 14 个字段（年龄、性别、身高、体重、电话、邮箱、地区、地址、病史、过敏史），完整记录
- **线索 CRM 看板** — 管理后台查看待联系/已联系/已到诊/已成交/无效五列 Kanban
- **状态流转** — 修改状态、备注、下次跟进时间、成交金额，实时更新统计
- **统计看板** — 总线索、转化率、到诊率、成交金额汇总
- **Excel 导出** — 一键导出带样式（状态着色、隔行配色）的 .xlsx 文件
- **多语言** — 中文 / English / 日本語，登陆页和聊天页均支持
- **视频背景** — 首页/登录/聊天页统一医疗风格视频背景
- **管理后台** — 预约管理（确认/取消）、用户管理、CRM 看板三 Tab
- **会话管理** — 侧边栏列出历史会话，支持删除

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 |
| 后端 | Next.js API Routes（App Router） |
| 数据库 | PostgreSQL |
| AI 模型 | Baichuan3-Turbo-128k（OpenAI 兼容接口） |
| 部署 | 阿里云轻量服务器 + Nginx + PM2 |
| 图标 | Material Symbols |
| 字体 | Inter |

## 快速开始

```bash
git clone https://github.com/zyy0708/dental-agent.git
cd dental-agent
npm install
cp .env.example .env.local
# 编辑 .env.local 填入配置
npm run build
npm start
```

## 环境变量

```env
# Baichuan M3 API（OpenAI 兼容）
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://api.baichuan-ai.com/v1
OPENAI_MODEL=Baichuan3-Turbo-128k

# PostgreSQL
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=dental_agent
DB_USER=dental
DB_PASSWORD=your_password

# JWT 密钥（必填，用于登录认证）
JWT_SECRET=your_jwt_secret

# Admin 后台密码（用于旧版密码认证）
ADMIN_PASSWORD=your_password
```

## 数据库

### 表结构

**appointments** — 预约 + 线索 CRM

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | 主键 |
| name | text | 患者姓名 |
| phone | text | 手机号 |
| service_type | text | 预约项目 |
| appointment_time | text | 希望到店时间 |
| status | text | pending / confirmed / cancelled |
| lead_status | varchar(20) | 线索状态：pending_contact / contacted / visited / converted / invalid |
| lead_source | varchar(20) | 来源：chat / manual / website |
| follow_up_note | text | 跟进备注 |
| next_follow_up_at | timestamp | 下次跟进时间 |
| deal_amount | numeric | 成交金额 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 最后更新时间 |

**users** — 用户档案

| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial PK | 主键 |
| username | varchar(50) | 用户名 |
| password | text | bcrypt 哈希 |
| nickname | varchar(100) | 昵称 |
| role | varchar(20) | admin / user |
| phone | varchar(20) | 手机号 |
| region | varchar(100) | 地区 |
| age | integer | 年龄 |
| gender | varchar(10) | 性别 |
| height | varchar(20) | 身高 |
| weight | varchar(20) | 体重 |
| email | varchar(200) | 邮箱 |
| address | varchar(300) | 地址 |
| medical_history | text | 病史 |
| allergies | text | 过敏史 |
| created_at | timestamp | 注册时间 |
| last_login | timestamp | 最后登录 |

**chat_history** — 聊天记录

| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial PK | 主键 |
| user_id | integer FK | 用户 ID |
| session_id | text | 会话 ID |
| role | text | user / assistant |
| content | text | 消息内容 |
| created_at | timestamp | 发送时间 |

**hospitals** — 医院数据

| 字段 | 类型 | 说明 |
|------|------|------|
| id | serial PK | 主键 |
| name | text | 医院名称 |
| address | text | 地址 |
| phone | text | 电话 |
| specialties | jsonb | 专科列表 |
| rating | numeric | 评分 |
| city | text | 城市 |
| hours | text | 营业时间 |
| description | text | 描述 |

### 数据库初始化

```bash
createdb dental_agent
psql -U dental -d dental_agent -f database/database.sql
# 运行 /api/migrate 以添加 CRM 字段
curl -X POST http://localhost:3000/api/migrate
```

## 项目结构

```
dental-agent/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # 首页（视频背景 + 功能卡片）
│   │   ├── layout.tsx               # 根布局（字体 + 图标）
│   │   ├── globals.css              # 全局样式（设计系统）
│   │   ├── login/page.tsx           # 登录页
│   │   ├── register/page.tsx        # 注册页
│   │   ├── chat/page.tsx            # 聊天页（i18n + 档案 + 会话）
│   │   └── admin/page.tsx           # 管理后台（预约 + 用户 + CRM 看板）
│   │   └── api/
│   │       ├── chat/route.ts        # AI 导诊 + 预约状态机 + 子代理
│   │       ├── auth/                # 登录/注册/登出/修改密码/档案
│   │       └── admin/               # 管理 API
│   │           ├── appointments/    # 预约列表
│   │           ├── users/           # 用户列表
│   │           └── leads/           # CRM 线索 API
│   │               ├── route.ts     # GET 列表（过滤/搜索）
│   │               ├── stats/       # GET 统计
│   │               ├── [id]/        # PATCH 更新
│   │               └── export/      # GET Excel 导出
│   └── lib/
│       ├── db.ts                    # PostgreSQL 连接池
│       ├── auth.ts                  # JWT 认证 + bcrypt
│       ├── openai.ts                # OpenAI 客户端（Baichuan）
│       ├── rate-limit.ts            # 登录限流
│       └── sub-agent.ts             # AI 子代理（摘要/意图/追问）
├── database/                        # SQL 文件
├── docs/
│   ├── AI_POLICY.md                 # AI 行为约束策略
│   └── SUB_AGENT_GUIDE.md           # 子代理开发指南
├── scripts/                         # 工具脚本
├── public/background.mp4            # 视频背景
└── .env.example
```

## AI 导诊流程

```
用户描述症状
    ↓
AI 分析症状 + 给出建议（自然语言）
    ↓
用户追问 或 表达预约意向
    ↓
用患者档案信息（姓名/电话/地区）自动填充
    ↓
选择医院 → 确认信息 → 选择时间 → 写入数据库
```

状态机：`triage → post_triage → collect_city → recommend_hospital → collect_name → collect_phone → collect_time`

## CRM 线索状态流转

```
pending_contact ─→ contacted ─→ visited ─→ converted
       │               │           │
       └──→ invalid    └──→ invalid └──→ invalid
```

- 新预约默认 `pending_contact`（来源 `chat`）
- 管理员可自由切换状态
- 流转为 `converted` 时可填写成交金额
- 流转为 `invalid` 时可填写无效原因

## 页面地址

| 页面 | 地址 |
|------|------|
| 首页 / 落地页 | `/` |
| AI 导诊聊天 | `/chat` |
| 登录 | `/login` |
| 注册 | `/register` |
| 管理后台 | `/admin` |

## API 接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/chat` | AI 导诊聊天 | 登录 |
| GET | `/api/chat` | 聊天历史 | 登录 |
| DELETE | `/api/chat` | 删除会话 | 登录 |
| POST | `/api/auth/login` | 登录 | 公开 |
| POST | `/api/auth/register` | 注册 | 公开 |
| GET | `/api/auth/me` | 当前用户 | 登录 |
| POST | `/api/auth/update-profile` | 更新档案 | 登录 |
| POST | `/api/auth/change-password` | 修改密码 | 登录 |
| GET | `/api/admin/appointments` | 预约列表 | 管理员 |
| GET | `/api/admin/users` | 用户列表 | 管理员 |
| GET | `/api/admin/leads` | 线索列表（过滤） | 管理员 |
| GET | `/api/admin/leads/stats` | 线索统计 | 管理员 |
| PATCH | `/api/admin/leads/[id]` | 更新线索 | 管理员 |
| GET | `/api/admin/leads/export` | 导出 Excel | 管理员 |
| POST | `/api/migrate` | 数据库迁移 | 公开 |

## 部署

### 阿里云服务器（当前）

- IP：`47.108.231.46`
- Ubuntu 24.04，2 核 2G
- Nginx 反向代理 + PM2 进程管理

```bash
# 部署
scp -i your_key.pem -r dist/* root@47.108.231.46:/opt/dental-agent/
ssh -i your_key.pem root@47.108.231.46 "cd /opt/dental-agent && npm run build && pm2 restart dental-agent"
```

## License

MIT
