# 🔒 AI Tabs 安全性说明

## 概览

AI Tabs 扩展已实施多层安全措施来保护您的 API 密钥和个人数据。本文档详细说明了我们的安全实施方案。

## 🛡️ API 密钥安全存储

### 当前安全措施

1. **加密存储**
   - API 密钥使用设备特定的加密密钥进行 XOR 加密
   - 加密后的密钥使用 Base64 编码存储
   - 密钥存储在 `chrome.storage.local` 中，不会同步到其他设备

2. **设备特定加密**
   - 加密密钥基于浏览器指纹生成（UserAgent、语言、时区等）
   - 每台设备的加密密钥都是唯一的
   - 即使密文被盗取，在其他设备上也无法解密

3. **本地存储隔离**
   - 使用 `chrome.storage.local` 替代 `chrome.storage.sync`
   - 密钥不会同步到云端或其他设备
   - 减少了攻击面和数据泄露风险

### 自动迁移机制

- 扩展会自动检测旧的明文存储密钥
- 将其迁移到新的加密存储系统
- 迁移完成后删除明文密钥
- 用户会收到迁移成功的通知

## 🔐 安全架构

### 加密流程

```
用户输入密钥 → 设备指纹生成 → XOR加密 → Base64编码 → 本地存储
```

### 解密流程

```
本地存储读取 → Base64解码 → 设备指纹验证 → XOR解密 → 返回明文密钥
```

### 密钥生成算法

```javascript
// 设备指纹组成
const fingerprint = userAgent + language + timezone + 'ai-tabs-salt'

// 简单哈希算法
let hash = 0
for (let i = 0; i < fingerprint.length; i++) {
  const char = fingerprint.charCodeAt(i)
  hash = ((hash << 5) - hash) + char
  hash = hash & hash // 转换为32位整数
}

const deviceKey = Math.abs(hash).toString(16)
```

## ⚠️ 安全限制与注意事项

### 当前实施的安全级别

- **轻量级加密**: 使用 XOR 加密，适合浏览器环境
- **非军事级**: 不适用于极高安全要求的场景
- **设备绑定**: 密钥与特定设备绑定，提高安全性

### 安全建议

1. **定期更换密钥**: 建议定期更换 API 密钥
2. **设备安全**: 保持设备安全，避免恶意软件感染
3. **权限管理**: 仅授予必要的 API 权限
4. **监控使用**: 定期检查 API 使用情况

## 🔍 隐私保护

### 数据收集

- **不收集个人数据**: 扩展不收集任何个人身份信息
- **本地处理**: 所有数据处理都在本地进行
- **不发送遥测**: 不向开发者发送使用统计或错误报告

### 数据存储

- **仅存储必要数据**: 只存储扩展功能所需的配置信息
- **用户控制**: 用户可以随时删除存储的数据
- **透明性**: 所有存储的数据类型都在此文档中说明

## 🛠️ 技术实现

### 安全模块结构

```
scripts/security.js
├── SimpleEncryption 类
│   ├── getDeviceKey() - 生成设备特定密钥
│   ├── encrypt() - 加密函数
│   └── decrypt() - 解密函数
└── SecureStorage 类
    ├── setApiKey() - 安全存储密钥
    ├── getApiKey() - 安全获取密钥
    ├── migrateFromPlaintext() - 迁移旧密钥
    └── isApiKeyValid() - 验证密钥有效性
```

### 存储位置

- **加密密钥**: `chrome.storage.local.encryptedApiKey`
- **其他配置**: `chrome.storage.local` (统一使用本地存储)
- **语言设置**: `chrome.storage.local.userLanguage`

## 📋 安全检查清单

- [x] API 密钥加密存储
- [x] 设备特定加密密钥
- [x] 本地存储隔离
- [x] 自动迁移旧密钥
- [x] 删除明文存储
- [x] 用户通知机制
- [x] 错误处理和回退
- [x] 代码安全审查

## 🚨 安全事件响应

如果您发现安全漏洞或有安全相关的问题：

1. **不要公开披露**: 请不要在公开渠道发布安全漏洞
2. **联系开发者**: 通过私有渠道联系项目维护者
3. **提供详细信息**: 包括复现步骤和影响范围
4. **等待响应**: 我们会尽快响应并修复问题

## 📚 相关资源

- [Chrome Extension Security Best Practices](https://developer.chrome.com/docs/extensions/mv3/security/)
- [Web Cryptography API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)

---

**注意**: 虽然我们已经实施了多层安全措施，但没有任何系统是100%安全的。请根据您的安全需求评估是否适合使用此扩展。 