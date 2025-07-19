# Chrome 扩展安装指南

## 开发者模式安装

1. **构建扩展**
   ```bash
   npm run build
   ```
   这将在 `dist/` 目录生成所有必要的文件。

2. **打开 Chrome 扩展管理页面**
   - 在 Chrome 地址栏输入：`chrome://extensions/`
   - 或者：Chrome 菜单 → 更多工具 → 扩展程序

3. **启用开发者模式**
   - 在页面右上角打开"开发者模式"开关

4. **加载扩展**
   - 点击"加载已解压的扩展程序"
   - 选择项目根目录下的 `dist` 文件夹
   - 点击"选择文件夹"

5. **验证安装**
   - 扩展应该出现在扩展列表中
   - 浏览器工具栏应该出现 AI Tab Manager 图标
   - 点击图标可以打开弹出界面

## 功能测试

1. **配置 AI 提供商**
   - 右键点击扩展图标 → 选项
   - 选择 AI 提供商（如 OpenAI、DeepSeek 等）
   - 输入 API Key 和相关配置

2. **测试智能分组**
   - 打开多个不同类型的网页标签
   - 点击扩展图标
   - 点击"智能分组"按钮

## 故障排除

### 扩展无法加载
- 检查 `dist` 目录是否包含所有必要文件
- 确保 `manifest.json` 格式正确
- 查看 Chrome 扩展页面的错误信息

### 功能不工作
- 打开 Chrome 开发者工具 → Console 查看错误
- 检查 AI API 配置是否正确
- 确保网络连接正常

### 重新构建
如果遇到问题，可以重新构建：
```bash
rm -rf dist
npm run build
```

## 项目结构

```
dist/                    # 构建输出目录（Chrome 扩展文件）
├── manifest.json        # 扩展清单
├── background.js        # 后台服务脚本
├── popup.html          # 弹出界面
├── popup.js            # 弹出界面逻辑
├── options.html        # 设置页面
├── options.js          # 设置页面逻辑
├── icons/              # 图标文件
├── _locales/           # 国际化文件
└── scripts/            # 安全脚本
``` 