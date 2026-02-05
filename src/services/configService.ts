/**
 * 应用配置服务
 * 统一管理从环境变量/API获取的配置
 * 本地开发: 优先使用 .env 中的 VITE_* 变量
 * 生产环境: 从 /api/config 获取配置
 */

export interface BenchmarkETF {
    symbol: string
    name: string
}

export interface AppConfig {
    cnBenchmarkEtfs: BenchmarkETF[]
}

// 默认配置
const DEFAULT_CONFIG: AppConfig = {
    cnBenchmarkEtfs: [
        { symbol: '510300.SS', name: '沪深300ETF' },
        { symbol: '510050.SS', name: '上证50ETF' },
        { symbol: '159949.SZ', name: '创业板50ETF' },
    ],
}

// 缓存配置
let cachedConfig: AppConfig | null = null
let configPromise: Promise<AppConfig> | null = null

/**
 * 从本地环境变量解析配置 (用于开发模式)
 */
function parseLocalConfig(): AppConfig | null {
    // 检查是否有本地 VITE_ 环境变量
    const cnBenchmarkEtfsEnv = import.meta.env.VITE_CN_BENCHMARK_ETFS

    if (!cnBenchmarkEtfsEnv) {
        return null
    }

    try {
        const cnBenchmarkEtfs = JSON.parse(cnBenchmarkEtfsEnv)
        if (Array.isArray(cnBenchmarkEtfs) && cnBenchmarkEtfs.length > 0) {
            return { cnBenchmarkEtfs }
        }
    } catch {
        console.warn('Failed to parse VITE_CN_BENCHMARK_ETFS')
    }

    return null
}

/**
 * 从 API 获取配置 (用于生产环境)
 */
async function fetchConfigFromAPI(): Promise<AppConfig> {
    try {
        const response = await fetch('/api/config')
        if (!response.ok) {
            throw new Error(`Config API failed: ${response.status}`)
        }
        const data = await response.json()
        return {
            cnBenchmarkEtfs: data.cnBenchmarkEtfs || DEFAULT_CONFIG.cnBenchmarkEtfs,
        }
    } catch (error) {
        console.error('Failed to fetch config from API:', error)
        return DEFAULT_CONFIG
    }
}

/**
 * 获取应用配置
 * - 开发模式: 优先使用本地 VITE_* 环境变量
 * - 生产模式: 从 /api/config 获取
 */
export async function getAppConfig(): Promise<AppConfig> {
    // 如果已经缓存，直接返回
    if (cachedConfig) {
        return cachedConfig
    }

    // 如果正在加载，等待加载完成
    if (configPromise) {
        return configPromise
    }

    configPromise = (async () => {
        // 先尝试本地配置 (开发模式)
        const localConfig = parseLocalConfig()
        if (localConfig) {
            cachedConfig = localConfig
            return localConfig
        }

        // 回退到 API 配置 (生产模式)
        cachedConfig = await fetchConfigFromAPI()
        return cachedConfig
    })()

    return configPromise
}

/**
 * 同步获取配置 (仅在配置已加载后使用)
 * 如果配置未加载，返回默认值
 */
export function getAppConfigSync(): AppConfig {
    return cachedConfig || DEFAULT_CONFIG
}

/**
 * 预加载配置 (应用启动时调用)
 */
export async function preloadConfig(): Promise<void> {
    await getAppConfig()
}

/**
 * 清除配置缓存 (用于测试或刷新配置)
 */
export function clearConfigCache(): void {
    cachedConfig = null
    configPromise = null
}
