/**
 * 可视化组件基础设施配置
 * ECharts和D3.js的全局配置和主题设置
 */

import * as echarts from 'echarts';

/**
 * ECharts暗色主题配置
 */
export const ECHARTS_DARK_THEME = {
  color: ['#1890ff', '#13c2c2', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#eb2f96', '#fa8c16'],
  backgroundColor: '#1f1f1f',
  textStyle: {
    color: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  title: {
    textStyle: {
      color: '#ffffff'
    }
  },
  line: {
    itemStyle: {
      borderWidth: 2
    },
    lineStyle: {
      width: 3
    },
    symbolSize: 6,
    symbol: 'circle',
    smooth: true
  },
  radar: {
    itemStyle: {
      borderWidth: 2
    },
    lineStyle: {
      width: 2
    },
    symbolSize: 6,
    symbol: 'circle',
    smooth: true
  },
  bar: {
    itemStyle: {
      barBorderWidth: 0,
      barBorderColor: 'transparent'
    }
  },
  pie: {
    itemStyle: {
      borderWidth: 0,
      borderColor: 'transparent'
    }
  },
  scatter: {
    itemStyle: {
      borderWidth: 0,
      borderColor: 'transparent'
    }
  },
  boxplot: {
    itemStyle: {
      borderWidth: 0,
      borderColor: 'transparent'
    }
  },
  parallel: {
    itemStyle: {
      borderWidth: 0,
      borderColor: 'transparent'
    }
  },
  sankey: {
    itemStyle: {
      borderWidth: 0,
      borderColor: 'transparent'
    }
  },
  funnel: {
    itemStyle: {
      borderWidth: 0,
      borderColor: 'transparent'
    }
  },
  gauge: {
    itemStyle: {
      borderWidth: 0,
      borderColor: 'transparent'
    }
  },
  candlestick: {
    itemStyle: {
      color: '#52c41a',
      color0: '#f5222d',
      borderColor: '#52c41a',
      borderColor0: '#f5222d',
      borderWidth: 2
    }
  },
  graph: {
    itemStyle: {
      borderWidth: 0,
      borderColor: 'transparent'
    },
    lineStyle: {
      width: 2,
      color: '#ffffff'
    },
    symbolSize: 6,
    symbol: 'circle',
    smooth: true,
    color: ['#1890ff', '#13c2c2', '#52c41a', '#faad14', '#f5222d', '#722ed1']
  },
  map: {
    itemStyle: {
      areaColor: '#2a2a2a',
      borderColor: '#404040',
      borderWidth: 1
    },
    label: {
      color: '#ffffff'
    },
    emphasis: {
      itemStyle: {
        areaColor: '#1890ff'
      },
      label: {
        color: '#ffffff'
      }
    }
  },
  geo: {
    itemStyle: {
      areaColor: '#2a2a2a',
      borderColor: '#404040',
      borderWidth: 1
    },
    label: {
      color: '#ffffff'
    },
    emphasis: {
      itemStyle: {
        areaColor: '#1890ff'
      },
      label: {
        color: '#ffffff'
      }
    }
  },
  categoryAxis: {
    axisLine: {
      show: true,
      lineStyle: {
        color: '#404040'
      }
    },
    axisTick: {
      show: true,
      lineStyle: {
        color: '#404040'
      }
    },
    axisLabel: {
      show: true,
      color: '#ffffff'
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: ['#404040']
      }
    },
    splitArea: {
      show: false,
      areaStyle: {
        color: ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']
      }
    }
  },
  valueAxis: {
    axisLine: {
      show: true,
      lineStyle: {
        color: '#404040'
      }
    },
    axisTick: {
      show: true,
      lineStyle: {
        color: '#404040'
      }
    },
    axisLabel: {
      show: true,
      color: '#ffffff'
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: ['#404040']
      }
    },
    splitArea: {
      show: false,
      areaStyle: {
        color: ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']
      }
    }
  },
  logAxis: {
    axisLine: {
      show: true,
      lineStyle: {
        color: '#404040'
      }
    },
    axisTick: {
      show: true,
      lineStyle: {
        color: '#404040'
      }
    },
    axisLabel: {
      show: true,
      color: '#ffffff'
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: ['#404040']
      }
    },
    splitArea: {
      show: false,
      areaStyle: {
        color: ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']
      }
    }
  },
  timeAxis: {
    axisLine: {
      show: true,
      lineStyle: {
        color: '#404040'
      }
    },
    axisTick: {
      show: true,
      lineStyle: {
        color: '#404040'
      }
    },
    axisLabel: {
      show: true,
      color: '#ffffff'
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: ['#404040']
      }
    },
    splitArea: {
      show: false,
      areaStyle: {
        color: ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']
      }
    }
  },
  toolbox: {
    iconStyle: {
      borderColor: '#ffffff'
    },
    emphasis: {
      iconStyle: {
        borderColor: '#1890ff'
      }
    }
  },
  legend: {
    textStyle: {
      color: '#ffffff'
    }
  },
  tooltip: {
    axisPointer: {
      lineStyle: {
        color: '#404040',
        width: 2
      },
      crossStyle: {
        color: '#404040',
        width: 2
      }
    }
  },
  timeline: {
    lineStyle: {
      color: '#404040',
      width: 2
    },
    itemStyle: {
      color: '#1890ff',
      borderWidth: 2
    },
    controlStyle: {
      color: '#ffffff',
      borderColor: '#404040',
      borderWidth: 2
    },
    checkpointStyle: {
      color: '#1890ff',
      borderColor: '#404040'
    },
    label: {
      color: '#ffffff'
    },
    emphasis: {
      itemStyle: {
        color: '#13c2c2'
      },
      controlStyle: {
        color: '#ffffff',
        borderColor: '#13c2c2',
        borderWidth: 2
      },
      label: {
        color: '#ffffff'
      }
    }
  },
  visualMap: {
    color: ['#1890ff', '#13c2c2']
  },
  dataZoom: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    dataBackgroundColor: 'rgba(24, 144, 255, 0.3)',
    fillerColor: 'rgba(24, 144, 255, 0.2)',
    handleColor: '#1890ff',
    handleSize: '100%',
    textStyle: {
      color: '#ffffff'
    }
  },
  markPoint: {
    label: {
      color: '#ffffff'
    },
    emphasis: {
      label: {
        color: '#ffffff'
      }
    }
  }
};

/**
 * ECharts亮色主题配置
 */
export const ECHARTS_LIGHT_THEME = {
  color: ['#1890ff', '#13c2c2', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#eb2f96', '#fa8c16'],
  backgroundColor: '#ffffff',
  textStyle: {
    color: '#333333',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  title: {
    textStyle: {
      color: '#333333'
    }
  },
  line: {
    itemStyle: {
      borderWidth: 2
    },
    lineStyle: {
      width: 3
    },
    symbolSize: 6,
    symbol: 'circle',
    smooth: true
  },
  radar: {
    itemStyle: {
      borderWidth: 2
    },
    lineStyle: {
      width: 2
    },
    symbolSize: 6,
    symbol: 'circle',
    smooth: true
  },
  categoryAxis: {
    axisLine: {
      show: true,
      lineStyle: {
        color: '#d9d9d9'
      }
    },
    axisTick: {
      show: true,
      lineStyle: {
        color: '#d9d9d9'
      }
    },
    axisLabel: {
      show: true,
      color: '#333333'
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: ['#f0f0f0']
      }
    }
  },
  valueAxis: {
    axisLine: {
      show: true,
      lineStyle: {
        color: '#d9d9d9'
      }
    },
    axisTick: {
      show: true,
      lineStyle: {
        color: '#d9d9d9'
      }
    },
    axisLabel: {
      show: true,
      color: '#333333'
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: ['#f0f0f0']
      }
    }
  },
  legend: {
    textStyle: {
      color: '#333333'
    }
  }
};

/**
 * D3.js配置常量
 */
export const D3_CONFIG = {
  colors: {
    light: {
      primary: '#1890ff',
      secondary: '#13c2c2',
      success: '#52c41a',
      warning: '#faad14',
      error: '#f5222d',
      background: '#ffffff',
      text: '#333333'
    },
    dark: {
      primary: '#1890ff',
      secondary: '#13c2c2',
      success: '#52c41a',
      warning: '#faad14',
      error: '#f5222d',
      background: '#1f1f1f',
      text: '#ffffff'
    }
  },
  animation: {
    duration: 750,
    ease: 'cubic-in-out'
  },
  dimensions: {
    margin: { top: 20, right: 30, bottom: 40, left: 40 },
    defaultWidth: 800,
    defaultHeight: 600
  }
};

/**
 * 可视化组件全局配置
 */
export const VISUALIZATION_CONFIG = {
  /**
   * 图表默认尺寸
   */
  defaultSize: {
    width: 400,
    height: 300
  },
  
  /**
   * 响应式断点
   */
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1200
  },
  
  /**
   * 动画配置
   */
  animation: {
    duration: 1000,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  },
  
  /**
   * 数据更新间隔(毫秒)
   */
  updateInterval: {
    realtime: 1000,     // 实时数据
    frequent: 5000,     // 频繁更新
    normal: 30000,      // 常规更新
    slow: 300000        // 缓慢更新
  }
};

/**
 * 初始化ECharts主题
 */
export const initializeEChartsThemes = () => {
  // 注册暗色主题
  echarts.registerTheme('dark', ECHARTS_DARK_THEME);
  
  // 注册亮色主题
  echarts.registerTheme('light', ECHARTS_LIGHT_THEME);
};

/**
 * 获取当前主题配置
 */
export const getVisualizationTheme = (isDark: boolean) => {
  return {
    echarts: isDark ? 'dark' : 'light',
    d3: isDark ? D3_CONFIG.colors.dark : D3_CONFIG.colors.light
  };
};