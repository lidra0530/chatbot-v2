/**
 * 可视化组件通用工具函数
 * 为ECharts和D3.js提供统一的数据处理和配置接口
 */

import * as echarts from 'echarts';
import * as d3 from 'd3';

/**
 * 通用颜色主题配置
 */
export const VISUALIZATION_COLORS = {
  primary: ['#1890ff', '#13c2c2', '#52c41a', '#faad14', '#f5222d', '#722ed1'],
  personality: {
    happiness: '#52c41a',
    energy: '#faad14',
    curiosity: '#13c2c2',
    sociability: '#1890ff',
    creativity: '#722ed1',
    empathy: '#eb2f96',
    independence: '#fa8c16',
    playfulness: '#a0d911'
  },
  skills: {
    locked: '#d9d9d9',
    unlocked: '#52c41a',
    inProgress: '#faad14',
    mastered: '#1890ff'
  },
  states: {
    happy: '#52c41a',
    excited: '#faad14',
    curious: '#13c2c2',
    tired: '#722ed1',
    hungry: '#f5222d',
    playful: '#a0d911',
    lonely: '#eb2f96'
  }
} as const;

/**
 * ECharts通用配置
 */
export const getEChartsBaseConfig = (theme: 'light' | 'dark' = 'light'): echarts.EChartsOption => ({
  animation: true,
  animationDuration: 1000,
  backgroundColor: theme === 'dark' ? '#1f1f1f' : '#ffffff',
  textStyle: {
    color: theme === 'dark' ? '#ffffff' : '#333333',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  tooltip: {
    trigger: 'item',
    backgroundColor: theme === 'dark' ? '#2a2a2a' : '#ffffff',
    borderColor: theme === 'dark' ? '#404040' : '#d9d9d9',
    textStyle: {
      color: theme === 'dark' ? '#ffffff' : '#333333'
    }
  },
  legend: {
    textStyle: {
      color: theme === 'dark' ? '#ffffff' : '#333333'
    }
  }
});

/**
 * 个性特征雷达图配置生成器
 */
export const generatePersonalityRadarConfig = (
  traits: Record<string, number>,
  theme: 'light' | 'dark' = 'light'
): echarts.EChartsOption => {
  const traitNames = Object.keys(traits);
  const traitValues = Object.values(traits);

  return {
    ...getEChartsBaseConfig(theme),
    radar: {
      indicator: traitNames.map(name => ({
        name,
        max: 100,
        color: VISUALIZATION_COLORS.personality[name as keyof typeof VISUALIZATION_COLORS.personality] || '#1890ff'
      })),
      shape: 'polygon',
      splitArea: {
        areaStyle: {
          color: theme === 'dark' 
            ? ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)'] 
            : ['rgba(0, 0, 0, 0.05)', 'rgba(0, 0, 0, 0.02)']
        }
      }
    },
    series: [{
      name: '个性特征',
      type: 'radar',
      data: [{
        value: traitValues,
        name: '当前特征',
        areaStyle: {
          opacity: 0.3
        },
        lineStyle: {
          color: '#1890ff',
          width: 2
        }
      }]
    }]
  };
};

/**
 * 技能树进度环形图配置生成器
 */
export const generateSkillProgressConfig = (
  skills: Array<{ name: string; progress: number; status: string }>,
  theme: 'light' | 'dark' = 'light'
): echarts.EChartsOption => {
  const data = skills.map(skill => ({
    name: skill.name,
    value: skill.progress,
    itemStyle: {
      color: VISUALIZATION_COLORS.skills[skill.status as keyof typeof VISUALIZATION_COLORS.skills] || '#d9d9d9'
    }
  }));

  return {
    ...getEChartsBaseConfig(theme),
    series: [{
      name: '技能进度',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      label: {
        show: false,
        position: 'center'
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      labelLine: {
        show: false
      },
      data
    }]
  };
};

/**
 * 状态历史时间线配置生成器
 */
export const generateStateTimelineConfig = (
  stateHistory: Array<{ timestamp: string; state: string; intensity: number }>,
  theme: 'light' | 'dark' = 'light'
): echarts.EChartsOption => {
  const xData = stateHistory.map(item => new Date(item.timestamp).toLocaleTimeString());
  const yData = stateHistory.map(item => item.intensity);
  const stateColors = stateHistory.map(item => 
    VISUALIZATION_COLORS.states[item.state as keyof typeof VISUALIZATION_COLORS.states] || '#1890ff'
  );

  return {
    ...getEChartsBaseConfig(theme),
    xAxis: {
      type: 'category',
      data: xData,
      axisLine: {
        lineStyle: {
          color: theme === 'dark' ? '#ffffff' : '#333333'
        }
      }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLine: {
        lineStyle: {
          color: theme === 'dark' ? '#ffffff' : '#333333'
        }
      }
    },
    series: [{
      name: '状态强度',
      type: 'line',
      data: yData,
      smooth: true,
      lineStyle: {
        color: '#1890ff',
        width: 3
      },
      itemStyle: {
        color: (params: any) => stateColors[params.dataIndex]
      },
      areaStyle: {
        opacity: 0.3,
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
          { offset: 1, color: 'rgba(24, 144, 255, 0.05)' }
        ])
      }
    }]
  };
};

/**
 * D3.js力导向图工具函数
 */
export const createForceDirectedGraph = (
  container: HTMLElement,
  nodes: Array<{ id: string; group: number; name: string }>,
  links: Array<{ source: string; target: string; value: number }>,
  options: {
    width?: number;
    height?: number;
    theme?: 'light' | 'dark';
  } = {}
) => {
  const { width = 800, height = 600, theme = 'light' } = options;
  
  // 清空容器
  d3.select(container).selectAll('*').remove();
  
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .style('background-color', theme === 'dark' ? '#1f1f1f' : '#ffffff');

  const simulation = d3.forceSimulation(nodes as any)
    .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2));

  const link = svg.append('g')
    .attr('stroke', theme === 'dark' ? '#666' : '#999')
    .attr('stroke-opacity', 0.6)
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke-width', (d: any) => Math.sqrt(d.value));

  const node = svg.append('g')
    .attr('stroke', theme === 'dark' ? '#fff' : '#000')
    .attr('stroke-width', 1.5)
    .selectAll('circle')
    .data(nodes)
    .join('circle')
    .attr('r', 8)
    .attr('fill', (d: any) => VISUALIZATION_COLORS.primary[d.group % VISUALIZATION_COLORS.primary.length])
    .call(d3.drag<any, any>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }));

  node.append('title')
    .text((d: any) => d.name);

  simulation.on('tick', () => {
    link
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y);

    node
      .attr('cx', (d: any) => d.x)
      .attr('cy', (d: any) => d.y);
  });

  return { svg, simulation };
};

/**
 * 数据预处理工具函数
 */
export const preprocessVisualizationData = {
  /**
   * 格式化个性特征数据
   */
  formatPersonalityTraits: (traits: Record<string, number>) => {
    return Object.entries(traits).map(([key, value]) => ({
      name: key,
      value: Math.round(value * 100) / 100,
      color: VISUALIZATION_COLORS.personality[key as keyof typeof VISUALIZATION_COLORS.personality] || '#1890ff'
    }));
  },

  /**
   * 格式化技能树数据
   */
  formatSkillTreeData: (skills: any[]) => {
    return skills.map(skill => ({
      ...skill,
      statusColor: VISUALIZATION_COLORS.skills[skill.status as keyof typeof VISUALIZATION_COLORS.skills] || '#d9d9d9'
    }));
  },

  /**
   * 格式化状态历史数据
   */
  formatStateHistory: (history: Array<{ timestamp: string; states: Record<string, number> }>) => {
    const formattedData: Record<string, Array<{ time: string; value: number }>> = {};
    
    Object.keys(VISUALIZATION_COLORS.states).forEach(state => {
      formattedData[state] = history.map(item => ({
        time: new Date(item.timestamp).toLocaleTimeString(),
        value: item.states[state] || 0
      }));
    });

    return formattedData;
  }
};

/**
 * 响应式配置工具
 */
export const createResponsiveConfig = (baseConfig: echarts.EChartsOption, containerWidth: number) => {
  const isMobile = containerWidth < 768;

  return {
    ...baseConfig,
    grid: {
      left: isMobile ? '10%' : '5%',
      right: isMobile ? '10%' : '5%',
      top: isMobile ? '15%' : '10%',
      bottom: isMobile ? '15%' : '10%'
    },
    legend: {
      ...((baseConfig as any).legend || {}),
      orient: isMobile ? 'horizontal' : 'vertical',
      top: isMobile ? 'top' : 'center',
      left: isMobile ? 'center' : 'right'
    }
  };
};