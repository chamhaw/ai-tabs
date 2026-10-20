# AI Tab Manager

[中文文档](README.zh-CN.md) | [English Documentation](README.md)

An intelligent browser tab grouping extension powered by AI models for automatic tab categorization and management.

## 🚀 Key Features

- **Smart Grouping**: Uses AI models to automatically categorize tabs based on content and titles
- **Multi-Provider Support**: Supports 15+ AI providers including OpenAI, DeepSeek, Alibaba Cloud, Baidu, etc.
- **Auto-Trigger**: Automatically triggers grouping when ungrouped tabs reach a set threshold
- **Manual Grouping**: Manually trigger tab grouping at any time
- **Configuration Persistence**: Independent configuration saving for each AI provider with automatic restoration when switching
- **Meaningless Group Filtering**: Intelligently filters out meaningless groups like "Others", "Miscellaneous", etc.
- **Tab Sorting**: Automatically moves ungrouped tabs to the rightmost position after grouping

## 🤖 Supported AI Providers

### International Providers
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Google (Gemini)

### Chinese Providers
- DeepSeek
- Alibaba Cloud (Qwen)
- Baidu (ERNIE)
- Zhipu AI (ChatGLM)
- Moonshot AI (Kimi)
- 01.AI (Yi)
- MiniMax
- ByteDance (Doubao)
- iFlytek (Spark)
- SenseTime
- StepFun
- Tencent (Hunyuan)

## 📦 Installation & Usage

### Install from Chrome Web Store (Recommended)
1. Visit [AI Tab Manager in the Chrome Web Store](https://chromewebstore.google.com/detail/ai-%E6%B5%8F%E8%A7%88%E5%99%A8%E6%A0%87%E7%AD%BE%E9%A1%B5%E7%AE%A1%E7%90%86%E5%99%A8/pjkjljebedjkcnojgpjhpnppokicnnnl)
2. Click "Add to Chrome"
3. Confirm installation permissions

### Developer Mode Installation
1. Download source code locally
2. Open Chrome browser, go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked extension"
5. Select the project folder

## ⚙️ Configuration

### Basic Configuration
1. Click the extension icon to open settings page
2. Select your AI service provider
3. Enter API Key and related configuration
4. Choose the model to use

### Advanced Settings
- **Auto-group threshold**: Set how many ungrouped tabs trigger automatic grouping
- **Minimum group size**: Set minimum number of tabs per group
- **Grouping strategy**: Customize grouping rules and prompts

## 🔒 Privacy & Security

- All configuration information is stored locally in your browser
- Tab information is only sent to your configured AI service provider
- No collection, storage, or transmission of personal data
- Follows Chrome extension security best practices

## 🛠️ Technical Implementation

- **Manifest V3**: Uses the latest Chrome extension framework
- **Service Worker**: Background service ensures stable functionality
- **Storage API**: Local storage of user configuration
- **Tabs API**: Browser tab management
- **Tab Groups API**: Tab group creation and management

## 🌐 Internationalization

This extension supports multiple languages:
- **English**: Default for international users
- **Chinese (Simplified)**: 中文简体
- **Auto-detection**: Automatically detects browser language

## 📋 Changelog

### v1.0.0
- Initial release
- Multi-provider AI support
- Smart tab grouping functionality
- Configuration management interface
- Internationalization support

## 🤝 Contributing

Issues and Pull Requests are welcome to help improve this project.

## 📄 License

This project is open-sourced under the MIT License.

## 🔗 Links

- [Chrome Web Store](https://chromewebstore.google.com/detail/ai-%E6%B5%8F%E8%A7%88%E5%99%A8%E6%A0%87%E7%AD%BE%E9%A1%B5%E7%AE%A1%E7%90%86%E5%99%A8/pjkjljebedjkcnojgpjhpnppokicnnnl)
- [GitHub Repository](https://github.com/chamhaw/ai-tabs)
- [Issue Tracker](https://github.com/chamhaw/ai-tabs/issues)
