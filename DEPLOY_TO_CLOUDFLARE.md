# 部署到 Cloudflare Pages 指南

这个项目使用 **统一的环境变量配置**，本地开发和生产环境使用相同的变量名（只是前缀不同）。

## 配置变量对照表

| 功能 | 本地开发 (.env) | Cloudflare Pages |
|------|----------------|------------------|
| A股基准ETF | `VITE_CN_BENCHMARK_ETFS` | `CN_BENCHMARK_ETFS` |
| AI API 地址 | `VITE_AI_API_URL` | `AI_API_URL` |
| AI API 密钥 | `VITE_AI_API_KEY` | `AI_API_KEY` |
| AI 模型 | `VITE_AI_MODEL` | `AI_MODEL` |

**核心区别**：
- 本地开发：使用 `VITE_` 前缀，前端直接读取
- 生产环境：不带前缀，通过 Cloudflare Functions 安全读取

---

## 快速部署

### 1. 推送代码到 GitHub

```bash
git add .
git commit -m "chore: update deployment config"
git push origin main
```

### 2. 在 Cloudflare Dashboard 创建项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** -> **Pages** -> **Connect to Git**
3. 选择你的 GitHub 仓库
4. 配置构建设置：

| 设置项 | 值 |
|--------|-----|
| Framework preset | `Vite` |
| Build command | `npm run build` |
| Build output directory | `dist` |

### 3. 配置环境变量

在 **Settings** -> **Environment variables** 中添加：

```
CN_BENCHMARK_ETFS = [{"symbol":"510300.SS","name":"沪深300ETF"},{"symbol":"510050.SS","name":"上证50ETF"},{"symbol":"159949.SZ","name":"创业板50ETF"}]
AI_API_KEY = sk-你的密钥
AI_API_URL = https://api.openai.com/v1/chat/completions
AI_MODEL = gpt-4o
```

### 4. 部署

点击 **Save and Deploy**。

---

## 本地开发

### 方式一：标准开发 (推荐)

1. 复制配置模板：
```bash
cp .env.example .env
```

2. 编辑 `.env`，填入真实值：
```env
VITE_CN_BENCHMARK_ETFS=[{"symbol":"510300.SS","name":"沪深300ETF"}]
VITE_AI_API_URL=https://api.openai.com/v1/chat/completions
VITE_AI_API_KEY=sk-你的密钥
VITE_AI_MODEL=gpt-4o
```

3. 启动开发服务器：
```bash
npm run dev
```

### 方式二：模拟生产环境 (使用 Wrangler)

如果你想在本地测试 Cloudflare Functions：

1. 安装并配置：
```bash
npm install -g wrangler
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars 填入服务端变量
```

2. 构建并运行：
```bash
npm run build
wrangler pages dev dist
```

---

## 安全架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户浏览器                               │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  React App                                              │   │
│   │  - 本地开发: 读取 VITE_* 变量                            │   │
│   │  - 生产环境: 从 /api/config 获取配置                     │   │
│   │  - AI 请求: 走 /api/analyze 代理                        │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages Functions                    │
│                                                                  │
│  /api/config      → 返回 CN_BENCHMARK_ETFS 等配置               │
│  /api/analyze     → 代理 AI 请求 (注入 AI_API_KEY)              │
│  /api/yahoo/*     → 代理 Yahoo Finance Chart API                │
│  /api/yahoo-search/* → 代理 Yahoo Finance Search API            │
│                                                                  │
│  服务端变量 (安全存储，不暴露给前端):                            │
│  - AI_API_KEY                                                    │
│  - AI_API_URL                                                    │
│  - AI_MODEL                                                      │
│  - CN_BENCHMARK_ETFS                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 常见问题

### Q: 为什么本地用 VITE_，生产用不带前缀？

Vite 只会将 `VITE_` 前缀的环境变量暴露给前端代码。
生产环境中，我们通过 Cloudflare Functions 读取不带前缀的变量，
这样敏感信息（如 API Key）不会暴露到前端。

### Q: 可以完全不用 VITE_ 前缀吗？

可以！使用 `wrangler pages dev` 运行本地环境，
配置 `.dev.vars` 文件，就可以完全模拟生产环境。

### Q: 如何更换 API Key？

直接在 Cloudflare Dashboard 修改 `AI_API_KEY`，
无需重新构建或部署。

### Q: .env 文件会上传到 GitHub 吗？

不会！`.env` 和 `.dev.vars` 都在 `.gitignore` 中。
只有 `.env.example` 和 `.dev.vars.example` 会上传。
