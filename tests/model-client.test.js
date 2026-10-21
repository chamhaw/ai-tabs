// Exercise the application's protocol client at the HTTP boundary.
const { client: { generateJson }, jsonResponse: httpResponse, chatResponse } = require('./helpers/model-client');
const result = { groups: [{ name: 'Articles', tabIds: [1, 2] }] };
const content = JSON.stringify(result);
const config = {
  protocol: 'openai', baseURL: 'https://provider.example/v1',
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

test('a user-supplied complete endpoint is sent exactly, including a custom path and query', async () => {
  fetch.mockResolvedValue(chatResponse(content));
  const baseURL = 'https://provider.example/proxy/inference?route=fast';
  expect(JSON.parse(await generateJson({ ...config, baseURL, endpoint: '' }, 'Return JSON.', '[]'))).toEqual(result);
  expect(fetch.mock.calls[0][0]).toBe(baseURL);
});

test('a DeepSeek model alias disables thinking and preserves a complete endpoint URL', async () => {
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

test('Anthropic protocol is selected explicitly, regardless of model name', async () => {
  fetch.mockResolvedValue(httpResponse({ content: [{ type: 'text', text: content }] }));
  expect(JSON.parse(await generateJson({
    ...config, protocol: 'anthropic', selectedModel: 'my-model', endpoint: '/messages'
  }, 'Group tabs as JSON.', '[]'))).toEqual(result);
  const [url, options] = fetch.mock.calls[0];
  expect(String(url)).toBe('https://provider.example/v1/messages');
  expect(options.headers).toMatchObject({ 'x-api-key': 'test-key', 'anthropic-version': '2023-06-01' });
  expect(JSON.parse(options.body)).toMatchObject({
    model: 'my-model', system: 'Group tabs as JSON.', max_tokens: 4096,
    thinking: { type: 'disabled' }, messages: [{ role: 'user', content: '[]' }]
  });
});

test('a model vendor name does not change the selected OpenAI protocol', async () => {
  fetch.mockResolvedValue(chatResponse(content));
  expect(JSON.parse(await generateJson({ ...config, selectedModel: 'gemini-example' }, 'Return JSON.', '[]'))).toEqual(result);
  expect(String(fetch.mock.calls[0][0])).toBe('https://provider.example/v1/chat/completions');
  expect(JSON.parse(fetch.mock.calls[0][1].body).messages[0].role).toBe('system');
});

test('provider errors propagate without retries or switching models', async () => {
  fetch.mockResolvedValue(httpResponse({ error: { message: 'Provider unavailable' } }, 503));
  await expect(generateJson(config, 'Group tabs as JSON.', '[]')).rejects.toThrow('Provider unavailable');
  expect(fetch).toHaveBeenCalledTimes(1);
});
