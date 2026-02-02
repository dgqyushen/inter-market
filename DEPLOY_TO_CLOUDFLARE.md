# 部署到 Cloudflare Pages 指南

这个项目是一个基于 Vite 的 React 单页应用 (SPA)，并使用 Cloudflare Functions 作为安全后端来代理 AI 请求，**解决 API Key 泄露问题**。

## 方案一：连接 GitHub 自动部署（推荐）

### 1. 准备工作
确保你的代码已经提交并推送到 GitHub 仓库。

### 2. 在 Cloudflare Dashboard 操作
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 进入 **Compute (Workers & Pages)** -> **Pages**。
3. 点击 **Connect to Git**。
4. 选择你的 GitHub 仓库。
5. 配置构建设置：
   - **Framework preset**: 选择 `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`

### 3. 配置环境变量 (关键步骤)
为了防止 API Key 泄露给前端用户，我们现在使用后端代理。
**不要** 在 Cloudflare 中配置以 `VITE_` 开头的 AI 变量。
请配置以下变量名（去掉 `VITE_` 前缀）：

| Variable Name | Value (Example) | Description |
|--------------|-----------------|-------------|
| `AI_API_KEY` | `sk-...` | **必须**。你的私密 API Key。现在它只存储在服务器端，很安全。|
| `AI_API_URL` | `https://qwen.deepthinks.org/v1/chat/completions` | AI API 地址 |
| `AI_MODEL` | `qwen3-max-2026-01-23` | 使用的模型名称 |

**普通的前端变量仍需保留 `VITE_` 前缀：**
| Variable Name | Value (Example) |
|--------------|-----------------|
| `VITE_TRADING_PAIRS` | `["QQQ/GLD", ...]` |
| `VITE_CN_BENCHMARK_ETFS` | `[...]` |

### 4. 完成
点击 **Save and Deploy**。

---

## 关于安全性改进
如果你查看了最新的代码，你会发现我们增加了一个 `functions/api/analyze.ts` 文件。这是 Cloudflare Serverless Function。

- **旧模式**：前端直接带 Key 请求 AI。Key 容易泄露。
- **新模式**：前端请求 `/api/analyze` -> Cloudflare 后端读取安全的 `AI_API_KEY` -> 请求 AI 厂商 -> 结果流式返回前端。

这意味着：
1. 访问者无法在浏览器 Network 面板或源码中看到你的 Key。
2. 你可以在 Cloudflare 后台随时更换 Key 而无需重新构建前端。

## 本地开发
在本地开发时 (`npm run dev`)：
- 如果你在 `.env` 中配置了 `VITE_AI_API_KEY`，前端会使用“兼容模式”直接请求，方便开发。
- 如果你没配置，前端会尝试请求 `/api/analyze`，这在纯 Vite 模式下会 404，除非你使用 `wrangler pages dev` 来运行本地环境。
- **建议**：本地开发保留 `VITE_AI_API_KEY`，但不要提交到 GitHub（已经被 .gitignore 忽略）。生产环境配置 `AI_API_KEY`。
