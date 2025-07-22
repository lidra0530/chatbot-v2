# API版本升级指南

## 概述

我们的API客户端支持灵活的版本管理，当后端发布新版本时，你只需要简单的配置即可完成升级。

## 版本管理策略

### 1. 环境变量控制
```env
# .env 文件
VITE_API_VERSION=v2  # 从 v1 升级到 v2
```

### 2. 运行时切换
```typescript
import { apiClient } from '@/services/api';

// 动态切换到v2
apiClient.setApiVersion('v2');
```

### 3. 版本兼容性检查
```typescript
import { 
  isApiVersionSupported, 
  isApiVersionDeprecated,
  isFeatureAvailable 
} from '@/config/api.config';

// 检查版本支持
if (isApiVersionSupported('v2')) {
  apiClient.setApiVersion('v2');
}

// 检查功能可用性
if (isFeatureAvailable('v2', 'analytics')) {
  // 使用v2的新功能
}
```

## 版本升级步骤

### 从v1升级到v2

1. **更新环境变量**
```bash
# 更新 .env 文件
VITE_API_VERSION=v2
```

2. **检查API兼容性**
- 查看 `api.config.ts` 中的版本兼容性信息
- 确认新版本支持的功能

3. **测试API调用**
- 所有API路径自动适配新版本
- 无需修改具体的API调用代码

4. **处理新功能**
```typescript
// v2新增的功能示例
if (isFeatureAvailable('v2', 'analytics')) {
  const analytics = await personalityApi.getAdvancedAnalytics(petId);
}
```

## 版本共存

支持在同一应用中使用不同版本的API：

```typescript
import { ApiClient } from '@/services/api';

// 创建v1客户端
const v1Client = new ApiClient();
v1Client.setApiVersion('v1');

// 创建v2客户端  
const v2Client = new ApiClient();
v2Client.setApiVersion('v2');

// 使用v1 API
const pets = await v1Client.get('/pets');

// 使用v2 API
const analytics = await v2Client.get('/pets/analytics');
```

## 自动化迁移

可以创建迁移脚本自动处理版本升级：

```typescript
// scripts/migrate-api-version.ts
import { apiClient, isApiVersionSupported } from '@/services/api';

export function migrateToVersion(targetVersion: ApiVersion) {
  if (!isApiVersionSupported(targetVersion)) {
    throw new Error(`Unsupported version: ${targetVersion}`);
  }
  
  // 备份当前版本
  const currentVersion = apiClient.getApiVersion();
  console.log(`Migrating from ${currentVersion} to ${targetVersion}`);
  
  // 切换版本
  apiClient.setApiVersion(targetVersion);
  
  // 验证切换
  if (apiClient.getApiVersion() === targetVersion) {
    console.log('Migration successful!');
  } else {
    console.error('Migration failed!');
  }
}
```

## 注意事项

1. **向后兼容**: 新版本API通常向后兼容，但建议检查变更日志
2. **功能检查**: 使用新功能前先检查版本支持
3. **错误处理**: 妥善处理版本不兼容的情况
4. **测试覆盖**: 升级前充分测试API调用

## 版本废弃处理

当某个版本被废弃时：

```typescript
import { isApiVersionDeprecated } from '@/config/api.config';

if (isApiVersionDeprecated('v1')) {
  console.warn('API v1 is deprecated, please upgrade to v2');
  // 提示用户升级
}
```