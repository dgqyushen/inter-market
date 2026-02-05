import type { KLineData } from '../components/KLineChart'

// 开发模式下的直接调用配置（可选，用于本地调试）
// 生产环境统一使用 /api/analyze 后端代理
const DEV_AI_API_URL = import.meta.env.VITE_AI_API_URL || ''
const DEV_AI_API_KEY = import.meta.env.VITE_AI_API_KEY || ''
const DEV_AI_MODEL = import.meta.env.VITE_AI_MODEL || 'gpt-4o'

export interface AIAnalysisResult {
  success: boolean
  analysis?: string
  error?: string
}

/**
 * 检查是否有本地开发模式的 AI 配置
 */
function hasLocalDevConfig(): boolean {
  return Boolean(DEV_AI_API_URL && DEV_AI_API_KEY && DEV_AI_API_KEY !== 'your-api-key-here')
}

/**
 * 将K线数据转换为AI可理解的文本格式
 */
function formatKLineDataForAI(data: KLineData[], symbol: string, interval: string): string {
  if (data.length === 0) {
    return '无可用数据'
  }

  // 获取最近的数据点（最多取最近60个）
  const recentData = data.slice(-60)

  // 计算关键统计数据
  const latestPrice = recentData[recentData.length - 1].close
  const earliestPrice = recentData[0].close
  const priceChange = ((latestPrice - earliestPrice) / earliestPrice) * 100

  const highestPrice = Math.max(...recentData.map(d => d.high))
  const lowestPrice = Math.min(...recentData.map(d => d.low))

  // 计算简单移动平均
  const ma5 = calculateMA(recentData, 5)
  const ma10 = calculateMA(recentData, 10)
  const ma20 = calculateMA(recentData, 20)

  // 判断趋势
  const trend = latestPrice > ma20 ? '上涨趋势' : '下跌趋势'

  // 生成最近价格变化摘要
  const last5Days = recentData.slice(-5)
  const priceHistory = last5Days
    .map(d => {
      const date = new Date(d.timestamp).toLocaleDateString('zh-CN')
      return `${date}: 开${d.open.toFixed(4)} 高${d.high.toFixed(4)} 低${d.low.toFixed(4)} 收${d.close.toFixed(4)}`
    })
    .join('\n')

  const intervalLabel = interval === '1d' ? '日线' : interval === '1wk' ? '周线' : '月线'

  return `
交易对: ${symbol}
周期: ${intervalLabel}
数据范围: ${recentData.length} 个周期

当前价格: ${latestPrice.toFixed(4)}
期间涨跌幅: ${priceChange.toFixed(2)}%
最高价: ${highestPrice.toFixed(4)}
最低价: ${lowestPrice.toFixed(4)}

技术指标:
- MA5: ${ma5.toFixed(4)}
- MA10: ${ma10.toFixed(4)}
- MA20: ${ma20.toFixed(4)}
- 当前趋势: ${trend}
- 价格与MA20位置: ${latestPrice > ma20 ? '在均线上方' : '在均线下方'}

最近5个周期数据:
${priceHistory}
`.trim()
}

/**
 * 计算简单移动平均
 */
function calculateMA(data: KLineData[], period: number): number {
  if (data.length < period) {
    return data[data.length - 1]?.close || 0
  }
  const slice = data.slice(-period)
  const sum = slice.reduce((acc, d) => acc + d.close, 0)
  return sum / period
}

/**
 * 获取AI分析的系统和用户提示词
 */
function getPrompts(
  data: KLineData[],
  symbol: string,
  interval: string
): { systemPrompt: string; userPrompt: string } {
  const klineDescription = formatKLineDataForAI(data, symbol, interval)

  const systemPrompt = `你是一位专业的量化分析师和投资顾问。用户会给你提供交易对的K线数据和技术指标，请你基于这些数据进行专业分析，并给出投资建议。

分析要求：
1. 使用 Markdown 格式输出，包含标题、列表等
2. 简明扼要，重点突出
3. 包含趋势判断、支撑压力位分析
4. 给出明确的操作建议（买入/卖出/观望）
5. 提示潜在风险
6. 使用中文回复
7. 保持客观专业的语气

注意：这是资产比值分析，数值代表两种资产的相对价值关系。`

  const userPrompt = `请分析以下交易对的K线数据并给出投资建议：

${klineDescription}`

  return { systemPrompt, userPrompt }
}

/**
 * 流式调用AI接口进行分析
 * @param data K线数据
 * @param symbol 交易对符号
 * @param interval 时间间隔
 * @param onChunk 每次收到新内容时的回调
 * @param onComplete 完成时的回调
 * @param onError 错误时的回调
 */
export async function analyzeKLineWithAIStream(
  data: KLineData[],
  symbol: string,
  interval: string,
  onChunk: (chunk: string, fullText: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: string) => void
): Promise<void> {
  // if (!isAIConfigured()) {
  //   onError('请先在 .env 文件中配置 AI API (VITE_AI_API_URL, VITE_AI_API_KEY)')
  //   return
  // }

  if (data.length === 0) {
    onError('无可用数据进行分析')
    return
  }

  const { systemPrompt, userPrompt } = getPrompts(data, symbol, interval)
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  try {
    let response: Response

    // 优先检查是否有本地直连配置 (Local Dev)
    if (hasLocalDevConfig()) {
      response = await fetch(DEV_AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEV_AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: DEV_AI_MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 1500,
          stream: true,
        }),
      })
    } else {
      // 否则回退到后端代理 (Production / Cloudflare Functions)
      // 请求我们刚刚创建的 Function: /api/analyze
      response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
        }),
      })
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error('AI API Error:', errorText)
      onError(`API 请求失败: ${response.status} ${response.statusText}`)
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      onError('无法读取响应流')
      return
    }

    const decoder = new TextDecoder()
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()

          if (data === '[DONE]') {
            onComplete(fullText)
            return
          }

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content

            if (content) {
              fullText += content
              onChunk(content, fullText)
            }
          } catch {
            // 忽略解析错误（不完整的JSON等）
          }
        }
      }
    }

    // 如果没有收到 [DONE] 信号，也调用完成回调
    if (fullText) {
      onComplete(fullText)
    } else {
      onError('AI 返回内容为空')
    }
  } catch (err) {
    console.error('AI Analysis Error:', err)
    onError(err instanceof Error ? err.message : '分析请求失败')
  }
}

/**
 * 非流式调用AI接口进行分析（保留兼容性）
 * 注意：此函数仅在本地开发配置存在时可用
 */
export async function analyzeKLineWithAI(
  data: KLineData[],
  symbol: string,
  interval: string
): Promise<AIAnalysisResult> {
  if (!hasLocalDevConfig()) {
    return {
      success: false,
      error: '非流式分析需要本地 AI 配置，请使用流式分析或配置 VITE_AI_* 环境变量',
    }
  }

  if (data.length === 0) {
    return {
      success: false,
      error: '无可用数据进行分析',
    }
  }

  const { systemPrompt, userPrompt } = getPrompts(data, symbol, interval)

  try {
    const response = await fetch(DEV_AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEV_AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEV_AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('AI API Error:', errorText)
      return {
        success: false,
        error: `API 请求失败: ${response.status} ${response.statusText}`,
      }
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content

    if (!content) {
      return {
        success: false,
        error: 'AI 返回内容为空',
      }
    }

    return {
      success: true,
      analysis: content,
    }
  } catch (err) {
    console.error('AI Analysis Error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : '分析请求失败',
    }
  }
}
