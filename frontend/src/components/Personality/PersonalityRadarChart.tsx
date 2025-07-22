import React, { useEffect, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchPersonalityAsync } from '../../store/slices/personalitySlice';
import { generatePersonalityRadarConfig } from '../../utils/visualization';
import { getVisualizationTheme } from '../../config/visualization';

/**
 * 个性雷达图组件 - 实时显示宠物的个性特征分布
 * 支持自动刷新、主题切换和动画效果
 */

interface PersonalityRadarChartProps {
  /** 宠物ID */
  petId: string;
  /** 图表高度 */
  height?: number;
  /** 主题模式 */
  theme?: 'light' | 'dark';
  /** 是否启用实时更新 */
  realTimeUpdate?: boolean;
  /** 更新间隔(毫秒) */
  updateInterval?: number;
  /** 是否显示详细标签 */
  showLabels?: boolean;
  /** 自定义样式类名 */
  className?: string;
}

const PersonalityRadarChart: React.FC<PersonalityRadarChartProps> = ({
  petId,
  height = 400,
  theme = 'light',
  realTimeUpdate = true,
  updateInterval = 30000,
  showLabels = true,
  className
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const chartRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previousTraits, setPreviousTraits] = useState<Record<string, number>>({});
  
  // 从Redux获取个性数据
  const { 
    traits, 
    evolutionHistory, 
    isLoading: personalityLoading,
    lastUpdated 
  } = useSelector((state: RootState) => state.personality);

  // 初始化加载个性数据
  useEffect(() => {
    if (petId && Object.keys(traits).length === 0) {
      setIsLoading(true);
      dispatch(fetchPersonalityAsync(petId))
        .unwrap()
        .finally(() => setIsLoading(false));
    }
  }, [petId, dispatch, traits]);

  // 实时更新定时器
  useEffect(() => {
    if (!realTimeUpdate || !petId) return;

    const timer = setInterval(() => {
      dispatch(fetchPersonalityAsync(petId));
    }, updateInterval);

    return () => clearInterval(timer);
  }, [realTimeUpdate, updateInterval, petId, dispatch]);

  // 生成图表配置
  const getChartOption = () => {
    if (Object.keys(traits).length === 0) return null;

    const baseConfig = generatePersonalityRadarConfig(traits, theme);
    
    // 增强配置
    const enhancedConfig = {
      ...baseConfig,
      title: {
        text: '个性特征雷达图',
        subtext: lastUpdated ? `更新时间: ${new Date(lastUpdated).toLocaleString()}` : '',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
          color: theme === 'dark' ? '#ffffff' : '#333333'
        },
        subtextStyle: {
          fontSize: 12,
          color: theme === 'dark' ? '#cccccc' : '#666666'
        }
      },
      radar: {
        ...baseConfig.radar,
        indicator: Object.keys(traits).map(trait => ({
          name: getTraitDisplayName(trait),
          max: 100,
          min: 0,
          color: theme === 'dark' ? '#ffffff' : '#333333'
        })),
        name: {
          textStyle: {
            color: theme === 'dark' ? '#ffffff' : '#333333',
            fontSize: showLabels ? 12 : 0
          }
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: theme === 'dark' 
              ? ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']
              : ['rgba(0, 0, 0, 0.05)', 'rgba(0, 0, 0, 0.02)']
          }
        },
        splitLine: {
          lineStyle: {
            color: theme === 'dark' ? '#404040' : '#d9d9d9'
          }
        },
        axisLine: {
          lineStyle: {
            color: theme === 'dark' ? '#404040' : '#d9d9d9'
          }
        }
      },
      series: [{
        name: '个性特征',
        type: 'radar',
        data: [
          {
            value: Object.values(traits),
            name: '当前特征',
            areaStyle: {
              opacity: 0.3,
              color: {
                type: 'radial',
                x: 0.5,
                y: 0.5,
                r: 0.5,
                colorStops: [
                  { offset: 0, color: 'rgba(24, 144, 255, 0.4)' },
                  { offset: 1, color: 'rgba(24, 144, 255, 0.1)' }
                ]
              }
            },
            lineStyle: {
              color: '#1890ff',
              width: 2,
              type: 'solid'
            },
            itemStyle: {
              color: '#1890ff',
              borderColor: '#ffffff',
              borderWidth: 2
            },
            symbol: 'circle',
            symbolSize: 6
          },
          // 显示历史对比数据(如果有)
          ...(previousTraits && Object.keys(previousTraits).length > 0 ? [{
            value: Object.values(previousTraits),
            name: '之前状态',
            lineStyle: {
              color: '#d9d9d9',
              width: 1,
              type: 'dashed'
            },
            itemStyle: {
              color: '#d9d9d9'
            },
            symbol: 'circle',
            symbolSize: 4
          }] : [])
        ],
        // 添加动画配置
        animationDuration: 1000,
        animationEasing: 'cubicOut',
        animationDelay: (idx: number) => idx * 100
      }],
      tooltip: {
        trigger: 'item',
        backgroundColor: theme === 'dark' ? '#2a2a2a' : '#ffffff',
        borderColor: theme === 'dark' ? '#404040' : '#d9d9d9',
        textStyle: {
          color: theme === 'dark' ? '#ffffff' : '#333333'
        },
        formatter: (params: any) => {
          const trait = Object.keys(traits)[params.dataIndex];
          const value = params.value;
          const percentage = Math.round(value);
          return `
            <div>
              <strong>${getTraitDisplayName(trait)}</strong><br/>
              数值: ${value.toFixed(1)}<br/>
              百分比: ${percentage}%<br/>
              ${getTraitDescription(trait)}
            </div>
          `;
        }
      }
    };

    return enhancedConfig;
  };

  // 特征名称映射
  const getTraitDisplayName = (trait: string): string => {
    const nameMap: Record<string, string> = {
      happiness: '快乐度',
      energy: '活力值',
      curiosity: '好奇心',
      sociability: '社交性',
      creativity: '创造力',
      empathy: '同理心',
      independence: '独立性',
      playfulness: '玩耍性'
    };
    return nameMap[trait] || trait;
  };

  // 特征描述
  const getTraitDescription = (trait: string): string => {
    const descMap: Record<string, string> = {
      happiness: '表示宠物的整体快乐程度',
      energy: '反映宠物的精力和活跃度',
      curiosity: '衡量宠物对新事物的探索欲望',
      sociability: '显示宠物的社交互动倾向',
      creativity: '体现宠物的创新和想象能力',
      empathy: '反映宠物的情感理解能力',
      independence: '表示宠物的自主性程度',
      playfulness: '衡量宠物的游戏和娱乐倾向'
    };
    return descMap[trait] || '';
  };

  // 更新前一状态数据
  useEffect(() => {
    if (Object.keys(traits).length > 0) {
      // 延迟更新，以便显示对比
      const timer = setTimeout(() => {
        setPreviousTraits(traits);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [traits]);

  // 图表点击事件处理
  const handleChartClick = (params: any) => {
    const trait = Object.keys(traits)[params.dataIndex];
    console.log('点击特征:', trait, '数值:', params.value);
    // 可以在这里添加详细信息模态框或跳转逻辑
  };

  // 图表就绪事件
  const handleChartReady = (echartsInstance: any) => {
    // 可以在这里进行图表实例的额外配置
    console.log('个性雷达图已就绪');
  };

  const chartOption = getChartOption();
  const isDataEmpty = !chartOption || Object.keys(traits).length === 0;
  const showLoadingState = isLoading || personalityLoading;

  return (
    <div className={`personality-radar-chart ${className || ''}`}>
      {isDataEmpty ? (
        <div 
          style={{ 
            height, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: theme === 'dark' ? '#ffffff' : '#666666',
            backgroundColor: theme === 'dark' ? '#1f1f1f' : '#f5f5f5',
            borderRadius: 8
          }}
        >
          {showLoadingState ? '加载个性数据中...' : '暂无个性数据'}
        </div>
      ) : (
        <ReactECharts
          ref={chartRef}
          option={chartOption}
          style={{ height, width: '100%' }}
          theme={getVisualizationTheme(theme === 'dark').echarts}
          onChartReady={handleChartReady}
          onEvents={{
            click: handleChartClick
          }}
          showLoading={showLoadingState}
          loadingOption={{
            text: '加载中...',
            color: '#1890ff',
            textColor: theme === 'dark' ? '#ffffff' : '#333333',
            maskColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.8)',
            zlevel: 0
          }}
          opts={{
            renderer: 'canvas',
            useDirtyRect: true // 性能优化
          }}
        />
      )}
    </div>
  );
};

export default PersonalityRadarChart;