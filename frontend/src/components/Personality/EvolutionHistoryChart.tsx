import React, { useEffect, useRef, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchEvolutionHistoryAsync } from '../../store/slices/personalitySlice';
import { getVisualizationTheme, VISUALIZATION_CONFIG } from '../../config/visualization';

/**
 * 个性演化历史图表组件 - 时间线显示个性特征的演化过程
 * 支持多特征对比、时间范围筛选和交互式分析
 */

interface EvolutionHistoryChartProps {
  /** 宠物ID */
  petId: string;
  /** 图表高度 */
  height?: number;
  /** 主题模式 */
  theme?: 'light' | 'dark';
  /** 显示的时间范围(天) */
  timeRange?: number;
  /** 要显示的特征列表，空数组表示显示所有特征 */
  selectedTraits?: string[];
  /** 是否显示趋势线 */
  showTrendLine?: boolean;
  /** 是否启用数据缩放 */
  enableDataZoom?: boolean;
  /** 自定义样式类名 */
  className?: string;
}

const EvolutionHistoryChart: React.FC<EvolutionHistoryChartProps> = ({
  petId,
  height = 500,
  theme = 'light',
  timeRange = 7, // 默认显示7天
  selectedTraits = [],
  showTrendLine = true,
  enableDataZoom = true,
  className
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const chartRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chartOption, setChartOption] = useState<any>(null);

  // 从Redux获取演化历史数据
  const { 
    evolutionHistory,
    isLoading: personalityLoading,
    lastUpdated 
  } = useSelector((state: RootState) => state.personality);

  // 初始化加载演化历史数据
  useEffect(() => {
    if (petId && evolutionHistory.length === 0) {
      setIsLoading(true);
      dispatch(fetchEvolutionHistoryAsync({ petId, days: timeRange }))
        .unwrap()
        .finally(() => setIsLoading(false));
    }
  }, [petId, dispatch, timeRange, evolutionHistory.length]);

  // 时间范围变化时重新加载数据
  useEffect(() => {
    if (petId) {
      dispatch(fetchEvolutionHistoryAsync({ petId, days: timeRange }));
    }
  }, [petId, timeRange, dispatch]);

  // 特征颜色配置
  const traitColors = {
    happiness: '#52c41a',
    energy: '#faad14',
    curiosity: '#13c2c2',
    sociability: '#1890ff',
    creativity: '#722ed1',
    empathy: '#eb2f96',
    independence: '#fa8c16',
    playfulness: '#a0d911'
  };

  // 特征名称映射
  const traitNameMap: Record<string, string> = {
    happiness: '快乐度',
    energy: '活力值',
    curiosity: '好奇心',
    sociability: '社交性',
    creativity: '创造力',
    empathy: '同理心',
    independence: '独立性',
    playfulness: '玩耍性'
  };

  // 处理和过滤数据
  const processedData = useMemo(() => {
    if (!evolutionHistory.length) return null;

    // 过滤时间范围
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeRange);
    
    const filteredHistory = evolutionHistory.filter(record => 
      new Date(record.timestamp) >= cutoffDate
    );

    if (!filteredHistory.length) return null;

    // 提取所有可用的特征
    const allTraits = Object.keys(filteredHistory[0]?.traits || {});
    const traitsToShow = selectedTraits.length > 0 ? selectedTraits : allTraits;

    // 构建时间轴数据
    const timeData = filteredHistory.map(record => 
      new Date(record.timestamp).toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    );

    // 构建每个特征的数据系列
    const seriesData = traitsToShow.map(trait => ({
      name: traitNameMap[trait] || trait,
      type: 'line',
      data: filteredHistory.map(record => record.traits[trait] || 0),
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: {
        width: 2,
        color: traitColors[trait as keyof typeof traitColors] || '#1890ff'
      },
      itemStyle: {
        color: traitColors[trait as keyof typeof traitColors] || '#1890ff'
      },
      areaStyle: showTrendLine ? {
        opacity: 0.1,
        color: traitColors[trait as keyof typeof traitColors] || '#1890ff'
      } : undefined,
      markLine: {
        data: [
          {
            type: 'average',
            name: '平均值',
            lineStyle: {
              type: 'dashed',
              opacity: 0.5
            }
          }
        ]
      }
    }));

    return {
      timeData,
      seriesData,
      traitsToShow
    };
  }, [evolutionHistory, timeRange, selectedTraits, showTrendLine, traitColors, traitNameMap]);

  // 生成图表配置
  useEffect(() => {
    if (!processedData) {
      setChartOption(null);
      return;
    }

    const { timeData, seriesData } = processedData;

    const option = {
      title: {
        text: '个性演化历史',
        subtext: `最近${timeRange}天的变化趋势`,
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
      tooltip: {
        trigger: 'axis',
        backgroundColor: theme === 'dark' ? '#2a2a2a' : '#ffffff',
        borderColor: theme === 'dark' ? '#404040' : '#d9d9d9',
        textStyle: {
          color: theme === 'dark' ? '#ffffff' : '#333333'
        },
        formatter: (params: any[]) => {
          let content = `<div><strong>${params[0]?.axisValue}</strong></div>`;
          params.forEach(param => {
            const value = param.value?.toFixed(1) || '0.0';
            const color = param.color;
            content += `
              <div style="margin-top: 4px;">
                <span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${color}"></span>
                ${param.seriesName}: ${value}
              </div>
            `;
          });
          return content;
        }
      },
      legend: {
        data: seriesData.map(s => s.name),
        top: 40,
        textStyle: {
          color: theme === 'dark' ? '#ffffff' : '#333333'
        }
      },
      grid: {
        left: 60,
        right: 40,
        top: 80,
        bottom: enableDataZoom ? 80 : 60,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: timeData,
        axisLabel: {
          color: theme === 'dark' ? '#ffffff' : '#333333',
          rotate: 45,
          fontSize: 11
        },
        axisLine: {
          lineStyle: {
            color: theme === 'dark' ? '#404040' : '#d9d9d9'
          }
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: theme === 'dark' ? '#404040' : '#f0f0f0',
            type: 'dashed'
          }
        }
      },
      yAxis: {
        type: 'value',
        name: '特征数值',
        nameTextStyle: {
          color: theme === 'dark' ? '#ffffff' : '#333333'
        },
        axisLabel: {
          color: theme === 'dark' ? '#ffffff' : '#333333'
        },
        axisLine: {
          lineStyle: {
            color: theme === 'dark' ? '#404040' : '#d9d9d9'
          }
        },
        splitLine: {
          lineStyle: {
            color: theme === 'dark' ? '#404040' : '#f0f0f0'
          }
        },
        min: 0,
        max: 100
      },
      series: seriesData,
      dataZoom: enableDataZoom ? [
        {
          type: 'slider',
          show: true,
          start: 0,
          end: 100,
          height: 20,
          bottom: 20,
          textStyle: {
            color: theme === 'dark' ? '#ffffff' : '#333333'
          },
          borderColor: theme === 'dark' ? '#404040' : '#d9d9d9',
          fillerColor: 'rgba(24, 144, 255, 0.2)',
          handleStyle: {
            color: '#1890ff'
          }
        },
        {
          type: 'inside',
          start: 0,
          end: 100
        }
      ] : undefined,
      toolbox: {
        feature: {
          dataZoom: {
            yAxisIndex: 'none'
          },
          restore: {},
          saveAsImage: {
            name: `personality-evolution-${petId}-${new Date().toISOString().split('T')[0]}`
          }
        },
        iconStyle: {
          borderColor: theme === 'dark' ? '#ffffff' : '#333333'
        }
      },
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut'
    };

    setChartOption(option);
  }, [processedData, theme, enableDataZoom, timeRange, petId]);

  // 图表事件处理
  const handleChartEvents = {
    click: (params: any) => {
      console.log('Evolution chart clicked:', params);
    },
    legendselectchanged: (params: any) => {
      console.log('Legend selection changed:', params);
    },
    datazoom: (params: any) => {
      console.log('Data zoom changed:', params);
    }
  };

  const isDataEmpty = !chartOption;
  const showLoadingState = isLoading || personalityLoading;

  return (
    <div className={`evolution-history-chart ${className || ''}`}>
      {isDataEmpty && !showLoadingState ? (
        <div 
          style={{ 
            height, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 16,
            color: theme === 'dark' ? '#ffffff' : '#666666',
            backgroundColor: theme === 'dark' ? '#1f1f1f' : '#f5f5f5',
            borderRadius: 8
          }}
        >
          <div>暂无演化历史数据</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            该时间范围内没有找到个性演化记录
          </div>
        </div>
      ) : (
        <ReactECharts
          ref={chartRef}
          option={chartOption}
          style={{ height, width: '100%' }}
          theme={getVisualizationTheme(theme === 'dark').echarts}
          onEvents={handleChartEvents}
          showLoading={showLoadingState}
          loadingOption={{
            text: '加载演化历史中...',
            color: '#1890ff',
            textColor: theme === 'dark' ? '#ffffff' : '#333333',
            maskColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.8)',
            zlevel: 0
          }}
          opts={{
            renderer: 'canvas',
            useDirtyRect: true,
            width: 'auto',
            height: 'auto'
          }}
        />
      )}
      
      {/* 数据统计信息 */}
      {processedData && (
        <div 
          style={{ 
            marginTop: 12,
            padding: 12,
            backgroundColor: theme === 'dark' ? '#262626' : '#fafafa',
            borderRadius: 6,
            fontSize: 12,
            color: theme === 'dark' ? '#cccccc' : '#666666'
          }}
        >
          <div>数据点数量: {processedData.timeData.length}</div>
          <div>显示特征: {processedData.traitsToShow.map(t => traitNameMap[t] || t).join(', ')}</div>
          {lastUpdated && (
            <div>最后更新: {new Date(lastUpdated).toLocaleString()}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default EvolutionHistoryChart;