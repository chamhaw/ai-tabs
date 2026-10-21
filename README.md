# AI Tab Manager

[![Available in the Chrome Web Store](https://developer.chrome.com/static/docs/webstore/branding/image/206x58-chrome-web-bcb82d15b2486.png)](https://chromewebstore.google.com/detail/ai-%E6%B5%8F%E8%A7%88%E5%99%A8%E6%A0%87%E7%AD%BE%E9%A1%B5%E7%AE%A1%E7%90%86%E5%99%A8/pjkjljebedjkcnojgpjhpnppokicnnnl)

[中文文档](README.zh-CN.md) | [English Documentation](README.md)

An intelligent browser tab grouping extension powered by AI models for automatic tab categorization and management.

## 🚀 Key Features

- **Smart Grouping**: Uses AI models to automatically categorize tabs based on content and titles
- **Compatible APIs**: OpenAI Chat Completions and Anthropic Messages protocols with user-named connections.
- **Auto-Trigger**: Automatically triggers grouping when ungrouped tabs reach a set threshold
- **Manual Grouping**: Manually trigger tab grouping at any time
- **Configuration Persistence**: Save named connections independently and switch the active connection
- **Meaningless Group Filtering**: Intelligently filters out meaningless groups like "Others", "Miscellaneous", etc.
- **Tab Sorting**: Automatically moves ungrouped tabs to the rightmost position after grouping

## 🤖 API Connections

Add a connection with your own name, choose **OpenAI compatible** or **Anthropic compatible**, and enter the full endpoint URL, API key, and model name. You can save multiple connections and select one for grouping. There are no built-in vendor presets or model catalogs.

Examples of endpoint paths are `/v1/chat/completions` and `/v1/messages`. The extension requests access only to the endpoint you configure when saving a connection.

## 📦 Installation & Usage

### Install from Chrome Web Store (Recommended)
1. Visit [AI Tab Manager in the Chrome Web Store](https://chromewebstore.google.com/detail/ai-%E6%B5%8F%E8%A7%88%E5%99%A8%E6%A0%87%E7%AD%BE%E9%A1%B5%E7%AE%A1%E7%90%86%E5%99%A8/pjkjljebedjkcnojgpjhpnppokicnnnl)
2. Click "Add to Chrome"
3. Confirm installation permissions

### Developer Mode Installation
1. Download the source code. Run `npm ci` and `npm run build`.
2. Open Chrome browser, go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked extension"
5. Select the generated `dist` folder

## ⚙️ Configuration

### Basic Configuration
1. Click the extension icon to open settings page
2. Add and name a connection
3. Choose its protocol and enter the full endpoint URL, API key, and model name
4. Save and select the connection

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
