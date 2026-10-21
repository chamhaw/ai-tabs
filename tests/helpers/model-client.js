const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../../src/modules/model-client.ts'), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2015, module: ts.ModuleKind.CommonJS }
}).outputText;
const sourceModule = { exports: {} };
new Function('require', 'module', 'exports', code)(id => {
  if (id === '../config/connections') {
    const configModule = { exports: {} };
    const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../../src/config/connections.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    new Function('module', 'exports', source)(configModule, configModule.exports);
    return configModule.exports;
  }
  return require(id);
}, sourceModule, sourceModule.exports);

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) };
}

function chatResponse(content) {
  return jsonResponse({
    id: 'chat-test', object: 'chat.completion', created: 1, model: 'test-model',
    choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }],
    usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
  });
}

module.exports = { client: sourceModule.exports, jsonResponse, chatResponse };
