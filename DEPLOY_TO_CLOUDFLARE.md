# 部署到 Cloudflare Pages 指南

这个项目是一个基于 Vite 的 React 单页应用 (SPA)，使用 Cloudflare Pages Functions 作为后端代理来：
1. **保护 API Key** - AI 相关密钥只存储在服务端
2. **代理 Yahoo Finance API** - 解决浏览器 CORS 限制

## 快速开始

### 1. 推送代码到 GitHub

```bash
git add .
git commit -m "chore: prepare for cloudflare deployment"
git push origin main
```

### 2. 在 Cloudflare Dashboard 创建项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Compute (Workers & Pages)** -> **Pages**
3. 点击 **Connect to Git**
4. 授权并选择你的 GitHub 仓库
5. 配置构建设置：

| 设置项 | 值 |
|--------|-----|
| Framework preset | `Vite` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` (默认) |

### 3. 配置环境变量 ⚠️ 重要

在 **Settings** -> **Environment variables** 中添加以下变量：

#### 前端变量 (需要 VITE_ 前缀)

这些变量会被打包到前端代码中：

| 变量名 | 示例值 | 说明 |
|--------|--------|------|
| `VITE_TRADING_PAIRS` | `["QQQ/GLD","IBIT/GLD","IBIT/QQQ"]` | 交易对配置 |
| `VITE_CN_BENCHMARK_ETFS` | `[{"symbol":"510300.SS","name":"沪深300ETF"}]` | A股基准ETF |

#### 服务端变量 (不带 VITE_ 前缀) 🔐

这些变量**只在服务端使用**，不会暴露给前端：

| 变量名 | 示例值 | 说明 |
|--------|--------|------|
| `AI_API_KEY` | `sk-xxxxx` | **必须** - AI API 密钥 |
| `AI_API_URL` | `https://api.openai.com/v1/chat/completions` | AI API 地址 |
| `AI_MODEL` | `gpt-4o` | 使用的模型 |

### 4. 部署

点击 **Save and Deploy**，等待构建完成即可。

---

## 安全架构说明

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户浏览器                               │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  React App (dist/)                                      │   │
│   │  - 读取 VITE_* 环境变量 (构建时注入)                      │   │
│   │  - 不包含任何 API Key                                    │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                              │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Functions (functions/)                                  │   │
│   │                                                          │   │
│   │  /api/analyze     → 代理 AI 请求 (注入 AI_API_KEY)        │   │
│   │  /api/yahoo/*     → 代理 Yahoo Chart API                 │   │
│   │  /api/yahoo-search/* → 代理 Yahoo Search API             │   │
│   │                                                          │   │
│   │  服务端变量 (安全存储):                                    │   │
│   │  - AI_API_KEY                                            │   │
│   │  - AI_API_URL                                            │   │
│   │  - AI_MODEL                                              │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────┴────────────────────┐
         ▼                                         ▼
┌─────────────────────┐                 ┌─────────────────────┐
│   AI Provider       │                 │   Yahoo Finance     │
│   (OpenAI/其他)     │                 │   API               │
└─────────────────────┘                 └─────────────────────┘
```

---

## 本地开发

### 方式一：纯 Vite 模式 (推荐日常开发)

```bash
npm run dev
```

在 `.env` 文件中配置 `VITE_AI_API_KEY`，前端会直接使用它调用 AI。
Yahoo Finance API 请求会通过 Vite 的开发服务器代理。

### 方式二：完整 Cloudflare 模拟

如果你想在本地测试 Cloudflare Functions：

```bash
# 安装 wrangler
npm install -g wrangler

# 构建项目
npm run build

# 使用 wrangler 运行
wrangler pages dev dist
```

然后在 `.dev.vars` 文件中配置服务端变量：

```
AI_API_KEY=sk-xxxxx
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_MODEL=gpt-4o
```

---

## 常见问题

### Q: 为什么我的 AI 分析功能不工作？

检查以下几点：
1. 确保在 Cloudflare Dashboard 中配置了 `AI_API_KEY`（不带 VITE_ 前缀）
2. 检查 `AI_API_URL` 是否正确
3. 查看 Cloudflare Pages 的 Functions 日志

### Q: 部署后 Yahoo Finance 数据加载不出来？

项目已经包含了 Yahoo Finance API 的代理函数，应该可以正常工作。
如果有问题，检查 Cloudflare Functions 的日志。

### Q: 如何更换 API Key？

直接在 Cloudflare Dashboard 中修改 `AI_API_KEY` 环境变量，
无需重新部署前端代码。

### Q: .env 文件会被上传到 GitHub 吗？

不会，`.env` 已经在 `.gitignore` 中被排除。
只有 `.env.example` 会被上传作为模板参考。
