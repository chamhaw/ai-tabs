/**
 * Centralized AI Provider Configuration
 * Single source of truth for all provider metadata and URLs
 */

export interface ProviderMetadata {
  id: string;
  name: string;
  baseURL: string;
  defaultEndpoint: string;
  domains: string[];
  category: 'international' | 'chinese';
  models?: string[];
  description?: string;
}

/**
 * Centralized provider configuration - single source of truth
 * All provider URLs, domains, and metadata managed here
 */
export const PROVIDERS: Record<string, ProviderMetadata> = {
  // International Providers
  openai: {
    id: 'openai',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    defaultEndpoint: '/chat/completions',
    domains: ['https://api.openai.com/*'],
    category: 'international',
    description: 'GPT-4, GPT-3.5 and other OpenAI models'
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    defaultEndpoint: '/chat/completions',
    domains: ['https://api.deepseek.com/*'],
    category: 'international',
    description: 'DeepSeek reasoning and coding models'
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    defaultEndpoint: '/messages',
    domains: ['https://api.anthropic.com/*'],
    category: 'international',
    description: 'Claude models by Anthropic'
  },
  google: {
    id: 'google',
    name: 'Google AI',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    defaultEndpoint: '/chat/completions',
    domains: ['https://generativelanguage.googleapis.com/*'],
    category: 'international',
    description: 'Gemini models by Google'
  },

  // Chinese Providers
  alibaba: {
    id: 'alibaba',
    name: 'Alibaba Qwen',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultEndpoint: '/chat/completions',
    domains: ['https://dashscope.aliyuncs.com/*'],
    category: 'chinese',
    description: 'Qwen models by Alibaba Cloud'
  },
  baidu: {
    id: 'baidu',
    name: 'Baidu Wenxin',
    baseURL: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1',
    defaultEndpoint: '/chat/completions',
    domains: ['https://aip.baidubce.com/*'],
    category: 'chinese',
    description: 'ERNIE models by Baidu'
  },
  zhipu: {
    id: 'zhipu',
    name: 'ZhipuAI',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    defaultEndpoint: '/chat/completions',
    domains: ['https://open.bigmodel.cn/*'],
    category: 'chinese',
    description: 'ChatGLM models by ZhipuAI'
  },
  moonshot: {
    id: 'moonshot',
    name: 'Moonshot AI',
    baseURL: 'https://api.moonshot.cn/v1',
    defaultEndpoint: '/chat/completions',
    domains: ['https://api.moonshot.cn/*'],
    category: 'chinese',
    description: 'Kimi models by Moonshot AI'
  },
  '01ai': {
    id: '01ai',
    name: 'Yi (01.AI)',
    baseURL: 'https://api.lingyiwanwu.com/v1',
    defaultEndpoint: '/chat/completions',
    domains: ['https://api.lingyiwanwu.com/*'],
    category: 'chinese',
    description: 'Yi models by 01.AI'
  },
  minimax: {
    id: 'minimax',
    name: 'MiniMax',
    baseURL: 'https://api.minimax.chat/v1',
    defaultEndpoint: '/chat/completions',
    domains: ['https://api.minimax.chat/*'],
    category: 'chinese',
    description: 'MiniMax conversational AI'
  },
  doubao: {
    id: 'doubao',
    name: 'Doubao',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultEndpoint: '/chat/completions',
    domains: ['https://ark.cn-beijing.volces.com/*'],
    category: 'chinese',
    description: 'Doubao models by ByteDance'
  },
  xunfei: {
    id: 'xunfei',
    name: 'iFlytek Spark',
    baseURL: 'https://spark-api-open.xf-yun.com/v1',
    defaultEndpoint: '/chat/completions',
    domains: ['https://spark-api-open.xf-yun.com/*'],
    category: 'chinese',
    description: 'Spark models by iFlytek'
  },
  sensetime: {
    id: 'sensetime',
    name: 'SenseTime',
    baseURL: 'https://api.sensenova.cn/v1',
    defaultEndpoint: '/chat/completions',
    domains: ['https://api.sensenova.cn/*'],
    category: 'chinese',
    description: 'SenseNova models by SenseTime'
  },
  stepfun: {
    id: 'stepfun',
    name: 'StepFun',
    baseURL: 'https://api.stepfun.com/v1',
    defaultEndpoint: '/chat/completions',
    domains: ['https://api.stepfun.com/*'],
    category: 'chinese',
    description: 'Step models by StepFun'
  },
  tencent: {
    id: 'tencent',
    name: 'Tencent Hunyuan',
    baseURL: 'https://hunyuan.tencentcloudapi.com',
    defaultEndpoint: '/chat/completions',
    domains: ['https://hunyuan.tencentcloudapi.com/*'],
    category: 'chinese',
    description: 'Hunyuan models by Tencent'
  },

  // Custom provider template
  custom: {
    id: 'custom',
    name: 'Custom',
    baseURL: '',
    defaultEndpoint: '/chat/completions',
    domains: [],
    category: 'international',
    description: 'Custom AI provider configuration'
  }
};

/**
 * Get all provider IDs
 */
export function getProviderIds(): string[] {
  return Object.keys(PROVIDERS);
}

/**
 * Get provider metadata by ID
 */
export function getProvider(id: string): ProviderMetadata | null {
  return PROVIDERS[id] || null;
}

/**
 * Get all providers by category
 */
export function getProvidersByCategory(category: 'international' | 'chinese'): ProviderMetadata[] {
  return Object.values(PROVIDERS).filter(provider => provider.category === category);
}

/**
 * Get all provider domains for permissions
 */
export function getAllProviderDomains(): string[] {
  return Object.values(PROVIDERS)
    .filter(provider => provider.id !== 'custom')
    .flatMap(provider => provider.domains);
}

/**
 * Get domains for a specific provider
 */
export function getProviderDomains(providerId: string): string[] {
  const provider = PROVIDERS[providerId];
  return provider ? provider.domains : [];
}

/**
 * Check if provider ID is valid
 */
export function isValidProvider(id: string): boolean {
  return id in PROVIDERS;
}

/**
 * Create provider config template
 */
export function createProviderConfig(providerId: string) {
  const provider = getProvider(providerId);
  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  return {
    name: provider.name,
    baseURL: provider.baseURL,
    endpoint: provider.defaultEndpoint,
    apiKey: '',
    selectedModel: '',
    models: provider.models || [],
    configured: false
  };
}


