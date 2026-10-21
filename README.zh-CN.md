# AI 浏览器标签页管理器

[![在 Chrome 应用商店安装](https://developer.chrome.com/static/docs/webstore/branding/image/206x58-chrome-web-bcb82d15b2486.png)](https://chromewebstore.google.com/detail/ai-%E6%B5%8F%E8%A7%88%E5%99%A8%E6%A0%87%E7%AD%BE%E9%A1%B5%E7%AE%A1%E7%90%86%E5%99%A8/pjkjljebedjkcnojgpjhpnppokicnnnl)

[中文文档](README.zh-CN.md) | [English Documentation](README.md)

智能的浏览器标签页分组扩展，基于AI大模型自动分类和管理您的浏览器标签页。

## 🚀 主要功能

- **智能分组**：使用AI大模型根据网页内容和标题自动分类标签页
- **兼容协议接入**：支持 OpenAI Chat Completions 和 Anthropic Messages，连接名称由用户自定义
- **自动触发**：当未分组标签页达到设定阈值时自动触发分组
- **手动分组**：随时可以手动触发标签页分组
- **配置保存**：每个连接的配置独立保存，可切换当前使用的连接
- **无意义分组过滤**：智能过滤掉"其他"、"杂项"等无意义的分组
- **标签页排序**：分组后自动将未分组标签页移动到最右侧

## 🤖 API 连接

用户自行添加并命名连接，选择 **OpenAI 兼容**或 **Anthropic 兼容**协议，填写完整端点 URL、API Key 和模型名。可保存多个连接，并选择其中一个用于分组。不内置厂商预设或模型目录。

端点路径示例为 `/v1/chat/completions` 和 `/v1/messages`。保存连接时，扩展仅申请访问该端点所在域名的权限。

## 📦 安装使用

### 从Chrome应用商店安装（推荐）
1. 访问Chrome应用商店中的[AI标签页管理器](https://chromewebstore.google.com/detail/ai-%E6%B5%8F%E8%A7%88%E5%99%A8%E6%A0%87%E7%AD%BE%E9%A1%B5%E7%AE%A1%E7%90%86%E5%99%A8/pjkjljebedjkcnojgpjhpnppokicnnnl)
2. 点击"添加到Chrome"
3. 确认安装权限

### 开发者模式安装
1. 下载源代码，运行 `npm ci` 和 `npm run build`
2. 打开Chrome浏览器，进入 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择生成的 `dist` 文件夹

## ⚙️ 配置说明

### 基本配置
1. 点击扩展图标打开设置页面
2. 添加连接并自行命名
3. 选择协议，填写完整端点 URL、API Key 和模型名
4. 保存并选择该连接

### 高级设置
- **自动分组阈值**：设置多少个未分组标签页时自动触发分组
- **最小分组大小**：设置每个分组最少包含多少个标签页
- **分组策略**：自定义分组规则和提示词

## 🔒 隐私与安全

- 所有配置信息仅存储在您的浏览器本地
- 标签页信息仅发送到您配置的AI服务提供商
- 不收集、存储或传输任何个人数据
- 遵循Chrome扩展最佳安全实践

## 🛠️ 技术实现

- **Manifest V3**：使用最新的Chrome扩展框架
- **Service Worker**：后台服务保证功能稳定运行
- **Storage API**：本地存储用户配置
- **Tabs API**：管理浏览器标签页
- **Tab Groups API**：创建和管理标签页分组

## 📋 更新日志

### v1.0.0
- 初始版本发布
- 支持多AI提供商
- 智能标签页分组功能
- 配置管理界面

## 🤝 贡献指南

欢迎提交Issue和Pull Request来帮助改进这个项目。

## 📄 许可证

本项目基于MIT许可证开源。

## 🔗 相关链接

- [Chrome应用商店页面](https://chromewebstore.google.com/detail/ai-%E6%B5%8F%E8%A7%88%E5%99%A8%E6%A0%87%E7%AD%BE%E9%A1%B5%E7%AE%A1%E7%90%86%E5%99%A8/pjkjljebedjkcnojgpjhpnppokicnnnl)
- [GitHub仓库](https://github.com/chamhaw/ai-tabs)
- [问题反馈](https://github.com/chamhaw/ai-tabs/issues)
