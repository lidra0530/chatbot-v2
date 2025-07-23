/**
 * 状态监控组件导出文件
 * 统一导出所有状态相关的监控和可视化组件
 */

// 重建完成的组件
export { default as StateMonitorDashboard } from './StateMonitorDashboard';

// TODO: 重建以下组件
// export { default as StateHistoryChart } from './StateHistoryChart';
// export { default as StateAlerts } from './StateAlerts';
// export { default as StateTrends } from './StateTrends';

/**
 * 状态类型定义
 */
export interface PetState {
  health: number;      // 健康值 0-100
  happiness: number;   // 快乐值 0-100
  energy: number;      // 精力值 0-100
  hunger: number;      // 饥饿值 0-100
  social: number;      // 社交值 0-100
  lastUpdate: string;  // 最后更新时间
}

export interface StateHistory {
  timestamp: string;
  state: PetState;
}

export interface StateAlert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  stateName: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: string;
}

/**
 * 状态工具函数
 */
export const StateUtils = {
  /**
   * 获取状态等级
   */
  getStateLevel: (value: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' => {
    if (value >= 90) return 'excellent';
    if (value >= 70) return 'good';
    if (value >= 50) return 'fair';
    if (value >= 30) return 'poor';
    return 'critical';
  },

  /**
   * 获取状态颜色
   */
  getStateColor: (value: number): string => {
    if (value >= 90) return '#52c41a';  // 绿色
    if (value >= 70) return '#a0d911';  // 浅绿
    if (value >= 50) return '#faad14';  // 橙色
    if (value >= 30) return '#fa8c16';  // 深橙
    return '#ff4d4f';                   // 红色
  },

  /**
   * 格式化状态值
   */
  formatStateValue: (value: number): string => {
    return `${Math.round(value)}%`;
  },

  /**
   * 计算状态总体得分
   */
  calculateOverallScore: (state: PetState): number => {
    const weights = { health: 0.3, happiness: 0.25, energy: 0.2, hunger: 0.15, social: 0.1 };
    return (
      state.health * weights.health +
      state.happiness * weights.happiness +
      state.energy * weights.energy +
      (100 - state.hunger) * weights.hunger + // 饥饿值越低越好
      state.social * weights.social
    );
  },

  /**
   * 检查状态警告
   */
  checkStateAlerts: (state: PetState): StateAlert[] => {
    const alerts: StateAlert[] = [];
    const timestamp = new Date().toISOString();

    // 健康值警告
    if (state.health < 30) {
      alerts.push({
        id: `health-${Date.now()}`,
        type: 'danger',
        stateName: '健康值',
        value: state.health,
        threshold: 30,
        message: '宠物健康状况很差，需要立即关注！',
        timestamp
      });
    } else if (state.health < 50) {
      alerts.push({
        id: `health-${Date.now()}`,
        type: 'warning',
        stateName: '健康值',
        value: state.health,
        threshold: 50,
        message: '宠物健康状况不佳，建议增加护理。',
        timestamp
      });
    }

    // 快乐值警告
    if (state.happiness < 30) {
      alerts.push({
        id: `happiness-${Date.now()}`,
        type: 'danger',
        stateName: '快乐值',
        value: state.happiness,
        threshold: 30,
        message: '宠物情绪低落，需要更多陪伴和游戏！',
        timestamp
      });
    }

    // 精力值警告
    if (state.energy < 20) {
      alerts.push({
        id: `energy-${Date.now()}`,
        type: 'warning',
        stateName: '精力值',
        value: state.energy,
        threshold: 20,
        message: '宠物精力不足，建议让它休息。',
        timestamp
      });
    }

    // 饥饿值警告（饥饿值越高越危险）
    if (state.hunger > 80) {
      alerts.push({
        id: `hunger-${Date.now()}`,
        type: 'danger',
        stateName: '饥饿值',
        value: state.hunger,
        threshold: 80,
        message: '宠物非常饥饿，请立即喂食！',
        timestamp
      });
    } else if (state.hunger > 60) {
      alerts.push({
        id: `hunger-${Date.now()}`,
        type: 'warning',
        stateName: '饥饿值',
        value: state.hunger,
        threshold: 60,
        message: '宠物有些饿了，建议准备食物。',
        timestamp
      });
    }

    return alerts;
  },

  /**
   * 获取状态趋势
   */
  getStateTrend: (current: number, previous: number): 'up' | 'down' | 'stable' => {
    const difference = current - previous;
    if (Math.abs(difference) < 2) return 'stable';
    return difference > 0 ? 'up' : 'down';
  },

  /**
   * 计算状态变化率
   */
  calculateChangeRate: (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }
} as const;

/**
 * 状态配置常量
 */
export const STATE_CONFIG = {
  // 状态阈值
  thresholds: {
    critical: 20,
    warning: 40,
    good: 70,
    excellent: 90
  },

  // 状态名称映射
  stateNames: {
    health: '健康值',
    happiness: '快乐值',
    energy: '精力值',
    hunger: '饥饿值',
    social: '社交值'
  },

  // 状态图标
  stateIcons: {
    health: '❤️',
    happiness: '😊',
    energy: '⚡',
    hunger: '🍽️',
    social: '👥'
  },

  // 更新间隔
  updateIntervals: {
    realtime: 1000,    // 1秒
    normal: 5000,      // 5秒
    slow: 30000        // 30秒
  },

  // 图表配置
  chartConfig: {
    height: 300,
    animationDuration: 1000,
    showDataZoom: true,
    theme: 'light'
  }
} as const;