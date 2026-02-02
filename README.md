# Inter-Market 交易对比分析

这是一个基于 React 19 + TypeScript + Vite 7 开发的前端项目，用于展示和比较不同交易对（如 QQQ/GLD, IBIT/GLD, IBIT/QQQ）的对比值及 K 线走势，帮助用户分析市场间的相对强度。

## 🚀 主要功能

- **实时价格监控**：展示 QQQ、GLD、IBIT 等资产的最新价格及涨跌幅。
- **交易对对比分析**：
  - QQQ / GLD (纳指 / 黄金)
  - IBIT / GLD (比特币 ETF / 黄金)
  - IBIT / QQQ (比特币 ETF / 纳指)
- **交互式 K 线图**：集成 `lightweight-charts`，支持多周期（1H, 4H, 1D, 1W）切换及历史趋势查看。
- **响应式设计**：完美适配桌面端与移动端。
- **深色/浅色模式**：支持根据系统设置或手动切换主题。

## 🛠️ 技术栈

- **框架**: React 19
- **构建工具**: Vite 7
- **制图库**: lightweight-charts (TradingView)
- **状态管理**: React Hooks
- **样式**: CSS (Glassmorphism 磨砂玻璃风格)
- **数据源**: Yahoo Finance API

## 📦 快速开始

### 1. 环境准备

确保你已安装 [Node.js](https://nodejs.org/) (建议 v18+)。

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

本项目支持 **本地开发** 和 **Cloudflare Pages 安全部署** 两种模式。

#### 环境变量说明

| 变量名 | 说明 | 本地配置 (.env) | 生产环境 (Cloudflare) |
|--------|------|-----------------|---------------------|
| `VITE_TRADING_PAIRS` | 美股交易对配置 (JSON) | ⚪ 可选 (有默认值) | ⚪ 可选 (有默认值) |
| `VITE_CN_BENCHMARK_ETFS` | A股基准ETF配置 (JSON) | ⚪ 可选 (有默认值) | ⚪ 可选 (有默认值) |
| `VITE_AI_API_URL` | AI API 接口地址 | ✅ 需要 | ❌ 不需要 |
| `VITE_AI_MODEL` | AI 模型名称 | ✅ 需要 | ❌ 不需要 |
| `VITE_AI_API_KEY` | **本地开发用** API Key | ✅ 可选 (调试用) | ❌ **禁止配置** (防泄露) |
| `AI_API_KEY` | **生产环境用** 安全 Key | ❌ 不需要 | ✅ **必须配置** (后端专用) |
| `AI_API_URL` | 后端用 API 地址 | ❌ 不需要 | ✅ **必须配置** |
| `AI_MODEL` | 后端用 模型名称 | ❌ 不需要 | ✅ **必须配置** |

详细部署指南请参考 [DEPLOY_TO_CLOUDFLARE.md](./DEPLOY_TO_CLOUDFLARE.md)。

**本地开发示例 (.env):**
```ini
VITE_TRADING_PAIRS=["QQQ/GLD","IBIT/GLD","IBIT/QQQ"]
VITE_AI_API_URL=https://qwen.deepthinks.org/v1/chat/completions
VITE_AI_API_KEY=sk-your-key-here
VITE_AI_MODEL=qwen3-max-2026-01-23
```

**Cloudflare 生产环境配置:**
*   请在 Cloudflare Dashboard 项目设置中配置 `AI_API_KEY` (无 VITE 前缀)，这样 Key 不会暴露给前端用户。
*   同时配置 `AI_API_URL` 和 `AI_MODEL` 供后端函数使用。


### 4. 启动开发服务器

```bash
npm run dev
```

### 5. 构建生产版本

```bash
npm run build
```

## 📜 脚本说明

- `npm run dev`: 启动本地开发服务器。
- `npm run build`: 构建生产环境包。
- `npm run preview`: 预览构建后的生产版本。
- `npm run lint`: 代码风格检查。
- `npm run format`: 使用 Prettier 格式化代码。

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 开源协议

MIT License
