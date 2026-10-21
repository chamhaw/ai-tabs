// Run the bridge and real provider SDKs; replace only the HTTP boundary.
const { client: { generateJson }, jsonResponse: httpResponse, chatResponse } = require('./helpers/model-client');
const result = { groups: [{ name: 'Articles', tabIds: [1, 2] }] };
const content = JSON.stringify(result);
const config = {
  providerId: 'custom-123', baseURL: 'https://provider.example/v1',
  apiKey: 'test-key', selectedModel: 'custom-model'
};

test('an OpenAI-compatible custom endpoint returns JSON through the uniform non-thinking call', async () => {
  fetch.mockResolvedValue(chatResponse(content));
  expect(JSON.parse(await generateJson({ ...config, endpoint: '/custom/completions' }, 'Group tabs as JSON.', '[]'))).toEqual(result);
  const [url, options] = fetch.mock.calls[0];
  expect(String(url)).toBe('https://provider.example/v1/custom/completions');
  expect(options.headers).toMatchObject({ authorization: 'Bearer test-key' });
  expect(JSON.parse(options.body)).toMatchObject({
    model: 'custom-model', reasoning_effort: 'none', response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: 'Group tabs as JSON.' }, { role: 'user', content: '[]' }]
  });
});

test('a DeepSeek model alias uses the SDK to disable thinking and preserves a complete endpoint URL', async () => {
  fetch.mockResolvedValue(chatResponse(content));
  expect(JSON.parse(await generateJson({
    ...config, selectedModel: 'pub-deepseek-v4-flash', baseURL: 'https://provider.example/chat/completions?route=fast'
  }, 'Group tabs as JSON.', '[]'))).toEqual(result);
  expect(String(fetch.mock.calls[0][0])).toBe('https://provider.example/chat/completions?route=fast');
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
    model: 'pub-deepseek-v4-flash', thinking: { type: 'disabled' }
  });
});

test('ordinary non-reasoning OpenAI models do not receive an unsupported reasoning parameter', async () => {
  fetch.mockResolvedValue(chatResponse(content));
  expect(JSON.parse(await generateJson({ ...config, providerId: 'openai', selectedModel: 'gpt-4o-mini' }, 'Return JSON.', '[]'))).toEqual(result);
  expect(JSON.parse(fetch.mock.calls[0][1].body).reasoning_effort).toBeUndefined();
});

test('reported reasoning is rejected if a compatible service ignores the disable request', async () => {
  fetch.mockResolvedValue(httpResponse({
    id: 'chat-test', object: 'chat.completion', created: 1, model: 'test-model',
    choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content, reasoning_content: 'Thinking despite none.' } }],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30, completion_tokens_details: { reasoning_tokens: 10 } }
  }));
  await expect(generateJson(config, 'Return JSON.', '[]')).rejects.toThrow(/did not disable thinking/i);
});

test('Anthropic messages protocol is translated and its text is normalized', async () => {
  fetch.mockResolvedValue(httpResponse({
    id: 'msg-test', type: 'message', role: 'assistant', model: 'claude-sonnet-4-5',
    content: [{ type: 'text', text: content }], stop_reason: 'end_turn', stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 10 }
  }));
  expect(JSON.parse(await generateJson({
    ...config, providerId: 'anthropic', selectedModel: 'claude-sonnet-4-5', endpoint: '/messages'
  }, 'Group tabs as JSON.', '[]'))).toEqual(result);
  const [url, options] = fetch.mock.calls[0];
  expect(String(url)).toBe('https://provider.example/v1/messages');
  expect(JSON.parse(options.body)).toMatchObject({
    thinking: { type: 'disabled' }, messages: [{ role: 'user', content: [{ type: 'text', text: '[]' }] }]
  });
});

test('Google generateContent protocol disables its thinking budget and normalizes its response', async () => {
  fetch.mockResolvedValue(httpResponse({
    candidates: [{ content: { role: 'model', parts: [{ text: content }] }, finishReason: 'STOP' }],
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10, totalTokenCount: 20 }
  }));
  expect(JSON.parse(await generateJson({
    ...config, providerId: 'google', selectedModel: 'gemini-2.5-flash', baseURL: 'https://provider.example/v1beta'
  }, 'Group tabs as JSON.', '[]'))).toEqual(result);
  const [url, options] = fetch.mock.calls[0];
  expect(String(url)).toBe('https://provider.example/v1beta/models/gemini-2.5-flash:generateContent');
  expect(JSON.parse(options.body)).toMatchObject({
    generationConfig: { responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } }
  });
});

test.each([
  ['anthropic', 'claude-opus-5-5'],
  ['google', 'gemini-3-pro-preview']
])('a model that cannot disable thinking is rejected before HTTP, without silently using low effort: %s/%s', async (providerId, selectedModel) => {
  await expect(generateJson({ ...config, providerId, selectedModel }, 'Group tabs as JSON.', '[]'))
    .rejects.toThrow(/cannot disable thinking/i);
  expect(fetch).not.toHaveBeenCalled();
});

test('provider errors propagate without retries or switching models', async () => {
  fetch.mockResolvedValue(httpResponse({ error: { message: 'Provider unavailable' } }, 503));
  await expect(generateJson(config, 'Group tabs as JSON.', '[]')).rejects.toThrow('Provider unavailable');
  expect(fetch).toHaveBeenCalledTimes(1);
});
