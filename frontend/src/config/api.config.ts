/**
 * API版本管理配置
 */

// 支持的API版本
export const SUPPORTED_API_VERSIONS = ['v1', 'v2'] as const;
export type ApiVersion = typeof SUPPORTED_API_VERSIONS[number];

// 默认API版本
export const DEFAULT_API_VERSION: ApiVersion = 'v1';

// API版本兼容性映射
export const API_VERSION_COMPATIBILITY = {
  v1: {
    deprecated: false,
    supportedUntil: '2025-12-31',
    features: ['auth', 'pets', 'chat', 'personality', 'skills', 'state']
  },
  v2: {
    deprecated: false,
    supportedUntil: null, // 当前版本
    features: ['auth', 'pets', 'chat', 'personality', 'skills', 'state', 'analytics']
  }
} as const;

/**
 * 检查API版本是否受支持
 */
export function isApiVersionSupported(version: string): version is ApiVersion {
  return SUPPORTED_API_VERSIONS.includes(version as ApiVersion);
}

/**
 * 获取API版本兼容性信息
 */
export function getApiVersionInfo(version: ApiVersion) {
  return API_VERSION_COMPATIBILITY[version];
}

/**
 * 检查API版本是否已弃用
 */
export function isApiVersionDeprecated(version: ApiVersion): boolean {
  const info = getApiVersionInfo(version);
  return info.deprecated;
}

/**
 * 检查功能是否在指定版本中可用
 */
export function isFeatureAvailable(version: ApiVersion, feature: string): boolean {
  const info = getApiVersionInfo(version);
  return info.features.includes(feature as any);
}