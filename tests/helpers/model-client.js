const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// Jest 27 predates ESM-only SDKs and native fetch. Load the real SDK with Node 24
// and use native Response streams, while the application's HTTP fetch stays mocked.
const nativeRequire = process.getBuiltinModule('module').createRequire(__filename);
const NativeResponse = process.getBuiltinModule('vm').runInThisContext('Response');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../../src/modules/model-client.ts'), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2015, module: ts.ModuleKind.CommonJS }
}).outputText;
const sourceModule = { exports: {} };
new Function('require', 'module', 'exports', code)(nativeRequire, sourceModule, sourceModule.exports);

function jsonResponse(body, status = 200) {
  return new NativeResponse(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json' }
  });
}

function chatResponse(content) {
  return jsonResponse({
    id: 'chat-test', object: 'chat.completion', created: 1, model: 'test-model',
    choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }],
    usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
  });
}

module.exports = { client: sourceModule.exports, jsonResponse, chatResponse };
