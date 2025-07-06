# AI Tabs 单元测试

这个目录包含了AI Tabs Chrome扩展的完整单元测试套件。使用Jest测试框架和Chrome API的mock来确保代码质量和功能正确性。

## 测试结构

```
tests/
├── setup.js                   # Jest环境设置
├── mocks/
│   └── chrome-mocks.js        # Chrome API的mock helper
├── security.test.js           # 安全模块测试
├── i18n.test.js              # 国际化模块测试
├── options-provider.test.js   # 选项页面供应商配置测试
├── background.test.js         # 后台脚本测试
├── popup.test.js             # 弹窗脚本测试
├── key-corruption-fix.test.js # API密钥损坏修复功能测试
└── README.md                 # 本文档
```

## 安装依赖

首先安装测试依赖：

```bash
npm install
```

## 运行测试

### 运行所有测试
```bash
npm test
```

### 监听模式运行测试
```bash
npm run test:watch
```

### 生成覆盖率报告
```bash
npm run test:coverage
```

### CI环境运行测试
```bash
npm run test:ci
```

## 测试覆盖范围

### 1. 安全模块 (`security.test.js`)
- ✅ API密钥加密/解密功能
- ✅ 设备指纹生成
- ✅ 加密往返测试
- ✅ 错误处理
- ✅ 边界情况测试

### 2. 国际化模块 (`i18n.test.js`)
- ✅ 多语言支持 (中文/英文)
- ✅ 自动语言检测
- ✅ 消息参数替换
- ✅ 回退机制
- ✅ 初始化流程

### 3. 供应商配置 (`options-provider.test.js`)
- ✅ 多供应商配置管理
- ✅ API密钥加密存储
- ✅ 模型列表加载
- ✅ 配置验证
- ✅ 错误处理

### 4. 后台脚本 (`background.test.js`)
- ✅ 标签页智能分组
- ✅ Chrome消息处理
- ✅ AI API调用
- ✅ 窗口类型验证
- ✅ 错误恢复

### 5. 弹窗脚本 (`popup.test.js`)
- ✅ 用户界面状态管理
- ✅ 分组操作控制
- ✅ 设置检查
- ✅ 错误显示

### 6. API密钥损坏修复测试 (`key-corruption-fix.test.js`)
- ✅ `getMessageWithParams` 函数修复测试
- ✅ 参数替换功能
- ✅ 错误边界情况
- ✅ API密钥验证逻辑测试
- ✅ 解密后密钥验证测试
- ✅ 完整密钥处理流程
- ✅ 国际化消息处理

## Mock说明

### Chrome API Mock
测试环境提供了完整的Chrome API mock，包括：
- `chrome.storage.local` - 本地存储
- `chrome.tabs` - 标签页管理
- `chrome.windows` - 窗口管理
- `chrome.runtime` - 运行时API
- `chrome.i18n` - 国际化API

### 安全存储Mock
模拟了真实的加密/解密功能，使用简单的Base64编码来测试加密流程。

### Fetch API Mock
提供了HTTP请求的mock，支持自定义响应来测试不同的API场景。

## 测试数据

### 模拟供应商配置
```javascript
{
  openai: {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    apiKey: 'test-api-key',
    selectedModel: 'gpt-3.5-turbo'
  }
}
```

### 模拟标签页数据
```javascript
[
  {
    id: 1,
    url: 'https://github.com/user/repo',
    title: 'GitHub Repository',
    windowId: 1,
    groupId: -1
  }
]
```

## 最佳实践

### 1. 测试隔离
每个测试用例都是独立的，使用`beforeEach`来重置mock状态。

### 2. 异步测试
使用`async/await`处理异步操作，确保测试的可靠性。

### 3. 错误场景
每个模块都包含了错误处理的测试用例。

### 4. 边界测试
测试了各种边界情况，如空数据、无效输入等。

## 调试测试

### 查看详细输出
```bash
npm test -- --verbose
```

### 运行特定测试文件
```bash
npm test -- security.test.js
```

### 运行特定测试用例
```bash
npm test -- --testNamePattern="应该能够加密非空字符串"
```

## 持续集成

测试配置支持CI环境：
- 使用`--ci`标志禁用监听模式
- 生成覆盖率报告
- 适合GitHub Actions等CI工具

## 贡献指南

### 添加新测试

1. 在相应的测试文件中添加新的测试用例
2. 使用描述性的测试名称
3. 确保测试覆盖正常流程和异常情况
4. 运行测试确保通过

### 测试命名规范

- 使用中文描述测试内容
- 格式：`应该 + 预期行为`
- 例如：`应该能够加密非空字符串`

### Mock数据管理

新的mock数据应该添加到`mocks/chrome-mocks.js`中，保持测试数据的一致性。

## 性能考虑

- 测试运行时间应该保持在合理范围内
- 避免真实的网络请求，使用mock代替
- 定期清理不再需要的测试数据

## 故障排除

### 常见问题

1. **Chrome API undefined**
   - 确保`jest-chrome`正确安装
   - 检查`setup.js`中的mock配置

2. **异步测试超时**
   - 使用`async/await`而不是回调
   - 适当增加Jest超时时间

3. **Mock没有重置**
   - 检查`beforeEach`中的mock重置逻辑
   - 确保每个测试都是独立的

### 获取帮助

如果遇到测试问题，请：
1. 检查Jest官方文档
2. 查看现有测试用例的实现
3. 在项目issues中提问 