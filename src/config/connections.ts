export type Protocol = 'openai' | 'anthropic';

export interface ConnectionConfig {
  name?: string;
  protocol?: Protocol;
  baseURL: string;
  apiKey: string;
  selectedModel: string;
  endpoint?: string;
  providerId?: string;
}

// Existing saved connections keep their IDs so their encrypted keys remain usable.
export function connectionProtocol(config: ConnectionConfig, key = config.providerId): Protocol {
  if (config.protocol) return config.protocol;
  return key === 'anthropic' || config.endpoint === '/messages' || /\/messages\/?$/.test(new URL(config.baseURL).pathname)
    ? 'anthropic' : 'openai';
}

export function connectionEndpoint(config: ConnectionConfig): string {
  const url = new URL(config.baseURL.trim());
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Endpoint must use HTTP or HTTPS');
  if (config.endpoint !== '' && !/\/(chat\/completions|messages)\/?$/.test(url.pathname)) {
    url.pathname = url.pathname.replace(/\/$/, '') + (config.endpoint || (connectionProtocol(config) === 'anthropic' ? '/messages' : '/chat/completions'));
  }
  return url.toString();
}
