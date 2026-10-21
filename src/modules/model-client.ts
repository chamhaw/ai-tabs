import { generateText, Output } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

interface ModelConfig {
  providerId: string;
  baseURL: string;
  apiKey: string;
  selectedModel: string;
  endpoint?: string;
}

export async function generateJson(config: ModelConfig, instructions: string, prompt: string): Promise<string> {
  const baseURL = config.baseURL.replace(/\/$/, '');
  const basePath = new URL(baseURL).pathname;
  const isGoogle = config.providerId === 'google';
  const isAnthropic = config.providerId === 'anthropic' || config.endpoint === '/messages' || basePath.endsWith('/messages');
  const endpoint = config.endpoint || (isAnthropic ? '/messages' : '/chat/completions');
  const requestURL = /\/(chat\/completions|messages)$/.test(basePath) ? baseURL : baseURL + endpoint;

  // SDKs may map "none" to low/minimal when a model cannot disable thinking.
  // Check the actual outbound request, so this policy never silently turns into low effort.
  const transport: typeof fetch = async (url, options) => {
    const body = JSON.parse(String(options?.body));
    const thinking = body.thinking;
    const googleThinking = body.generationConfig?.thinkingConfig;
    if ((thinking && thinking.type !== 'disabled') ||
        (isAnthropic && body.output_config?.effort && thinking?.type !== 'disabled') ||
        (googleThinking && (googleThinking.thinkingLevel || googleThinking.thinkingBudget > 0))) {
      throw new Error('This model cannot disable thinking. Choose a non-thinking model.');
    }
    return fetch(isGoogle ? url : requestURL, options);
  };
  const settings = { baseURL, apiKey: config.apiKey, fetch: transport };
  // Provider identity selects the wire protocol; SDK types stay inside this module.
  const model = isGoogle
    ? createGoogleGenerativeAI(settings)(config.selectedModel)
    : isAnthropic
      ? createAnthropic(settings)(config.selectedModel)
      : config.providerId === 'deepseek' || /deepseek/i.test(config.selectedModel)
        ? createDeepSeek(settings)(config.selectedModel)
        : createOpenAICompatible({ ...settings, name: 'custom' })(config.selectedModel);
  // These GPT models have no reasoning mode and reject reasoning_effort.
  // A generic compatible provider cannot infer that capability from its protocol.
  const nonReasoningGPT = /(?:^|\/)(?:gpt-(?:3\.5|4(?:\.1|\.5|o)?)(?:-|$)|chatgpt-4o(?:-|$))/i.test(config.selectedModel);
  const result = await generateText({
    model,
    instructions,
    prompt,
    reasoning: nonReasoningGPT ? undefined : 'none',
    output: Output.json(),
    maxRetries: 0,
    telemetry: { isEnabled: false }
  });
  if (result.reasoningText || (result.usage.outputTokenDetails.reasoningTokens ?? 0) > 0) {
    throw new Error('The provider did not disable thinking. Choose a non-thinking model.');
  }
  return JSON.stringify(result.output);
}
