import { ConnectionConfig, connectionEndpoint, connectionProtocol } from '../config/connections';

export async function generateJson(config: ConnectionConfig, instructions: string, prompt: string): Promise<string> {
  const anthropic = connectionProtocol(config) === 'anthropic';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let body: Record<string, unknown>;
  if (anthropic) {
    Object.assign(headers, {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    });
    body = {
      model: config.selectedModel, max_tokens: 4096, system: instructions,
      messages: [{ role: 'user', content: prompt }], thinking: { type: 'disabled' }
    };
  } else {
    headers.authorization = `Bearer ${config.apiKey}`;
    body = {
      model: config.selectedModel,
      messages: [{ role: 'system', content: instructions }, { role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    };
    // DeepSeek's compatible API uses a separate switch; effort alone does not turn thinking off.
    if (/deepseek/i.test(config.selectedModel)) body.thinking = { type: 'disabled' };
    else if (!/(?:^|\/)(?:gpt-(?:3\.5|4(?:\.1|\.5|o)?)(?:-|$)|chatgpt-4o(?:-|$))/i.test(config.selectedModel)) {
      body.reasoning_effort = 'none';
    }
  }
  const response = await fetch(connectionEndpoint(config), { method: 'POST', headers, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  const content = anthropic
    ? data.content?.filter((block: { type: string }) => block.type === 'text').map((block: { text: string }) => block.text).join('')
    : data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('Model returned no text');
  return content;
}
