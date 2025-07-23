import React, { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { fetchPersonalityAnalysisAsync } from '../../store/slices/personalitySlice';
import { getVisualizationTheme } from '../../config/visualization';

/**
 * 个性趋势分析组件 - 预测性个性发展趋势和模式识别
 * 支持趋势预测、模式分析和智能洞察
 */

interface PersonalityTrendsProps {
  /** 宠物ID */
  petId: string;
  /** 图表高度 */
  height?: number;
  /** 主题模式 */
  theme?: 'light' | 'dark';
  /** 预测天数 */
  forecastDays?: number;
  /** 分析的特征列表 */
  analysisTraits?: string[];
  /** 是否显示置信区间 */
  showConfidenceInterval?: boolean;
  /** 自定义样式类名 */
  className?: string;
}

const PersonalityTrends: React.FC<PersonalityTrendsProps> = ({
  petId,
  height = 600,
  theme = 'light',
  forecastDays = 7,
  analysisTraits = ['happiness', 'energy', 'curiosity', 'sociability'],
  showConfidenceInterval = true,
  className
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [selectedMetric, setSelectedMetric] = useState<'trend' | 'volatility' | 'correlation'>('trend');
  const [isLoading, setIsLoading] = useState(false);

  // 从Redux获取个性分析数据
  const { 
    analysis,
    trends,
    predictions,
    isLoading: personalityLoading 
  } = useSelector((state: RootState) => state.personality);

  // 初始化加载分析数据
  useEffect(() => {
    if (petId) {
      setIsLoading(true);
      dispatch(fetchPersonalityAnalysisAsync({ 
        petId, 
        forecastDays,
        analysisType: 'comprehensive'
      }))
        .unwrap()
        .finally(() => setIsLoading(false));
    }
  }, [petId, forecastDays, dispatch]);

  // 特征配置
  const traitConfig = {
    happiness: { name: '快乐度', color: '#52c41a', icon: '😊' },
    energy: { name: '活力值', color: '#faad14', icon: '⚡' },
    curiosity: { name: '好奇心', color: '#13c2c2', icon: '🤔' },
    sociability: { name: '社交性', color: '#1890ff', icon: '👥' },
    creativity: { name: '创造力', color: '#722ed1', icon: '🎨' },
    empathy: { name: '同理心', color: '#eb2f96', icon: '❤️' },
    independence: { name: '独立性', color: '#fa8c16', icon: '🦅' },
    playfulness: { name: '玩耍性', color: '#a0d911', icon: '🎮' }
  };

  // 处理趋势数据
  const trendData = useMemo(() => {
    if (!trends?.trendAnalysis || !predictions?.forecast) return null;

    const selectedTraits = analysisTraits.filter(trait => 
      trends.trendAnalysis[trait] && traitConfig[trait as keyof typeof traitConfig]
    );

    return selectedTraits.map(trait => {
      const trendInfo = trends.trendAnalysis[trait];
      const forecast = predictions.forecast[trait] || [];
      const config = traitConfig[trait as keyof typeof traitConfig];
      
      // 历史数据点
      const historicalData = trendInfo.historicalPoints?.map((point: any) => [
        new Date(point.timestamp).getTime(),
        point.value
      ]) || [];

      // 预测数据点
      const forecastData = forecast.map((point: any) => [
        new Date(point.timestamp).getTime(),
        point.value
      ]);

      // 置信区间数据
      const confidenceData = showConfidenceInterval && forecast.length > 0 
        ? forecast.map((point: any) => [
            new Date(point.timestamp).getTime(),
            point.confidence?.lower || point.value - 5,
            point.confidence?.upper || point.value + 5
          ])
        : [];

      return {
        trait,
        config,
        trendInfo,
        historicalData,
        forecastData,
        confidenceData,
        trend: trendInfo.direction, // 'increasing', 'decreasing', 'stable'
        strength: trendInfo.strength, // 0-1
        volatility: trendInfo.volatility || 0
      };
    });
  }, [trends, predictions, analysisTraits, showConfidenceInterval, traitConfig]);

  // 生成趋势图表配置
  const getTrendChartOption = () => {
    if (!trendData) return null;

    const series: any[] = [];
    const legendData: string[] = [];

    trendData.forEach(({ trait, config, historicalData, forecastData, confidenceData }) => {
      // 历史数据线
      if (historicalData.length > 0) {
        series.push({
          name: `${config.name}(历史)`,
          type: 'line',
          data: historicalData,
          smooth: true,
          lineStyle: {
            color: config.color,
            width: 2,
            type: 'solid'
          },
          itemStyle: {
            color: config.color
          },
          showSymbol: false
        });
        legendData.push(`${config.name}(历史)`);
      }

      // 预测数据线
      if (forecastData.length > 0) {
        series.push({
          name: `${config.name}(预测)`,
          type: 'line',
          data: forecastData,
          smooth: true,
          lineStyle: {
            color: config.color,
            width: 2,
            type: 'dashed'
          },
          itemStyle: {
            color: config.color,
            borderWidth: 2,
            borderColor: '#ffffff'
          },
          symbol: 'diamond',
          symbolSize: 6
        });
        legendData.push(`${config.name}(预测)`);
      }

      // 置信区间
      if (showConfidenceInterval && confidenceData.length > 0) {
        series.push({
          name: `${config.name}(置信区间)`,
          type: 'line',
          data: confidenceData.map(([time, , upper]: any) => [time, upper]),
          lineStyle: {
            opacity: 0
          },
          stack: `confidence-${trait}`,
          symbol: 'none',
          silent: true
        });
        
        series.push({
          name: `${config.name}(置信区间下界)`,
          type: 'line',
          data: confidenceData.map(([time, lower]: any) => [time, lower]),
          lineStyle: {
            opacity: 0
          },
          areaStyle: {
            color: config.color,
            opacity: 0.1
          },
          stack: `confidence-${trait}`,
          symbol: 'none',
          silent: true
        });
      }
    });

    return {
      title: {
        text: '个性趋势分析',
        subtext: `预测未来${forecastDays}天的发展趋势`,
        textStyle: {
          color: theme === 'dark' ? '#ffffff' : '#333333'
        },
        subtextStyle: {
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
          const time = new Date(params[0].value[0]).toLocaleString();
          let content = `<div><strong>${time}</strong></div>`;
          params.forEach(param => {
            if (!param.seriesName.includes('置信区间')) {
              const value = param.value[1]?.toFixed(1) || '0.0';
              content += `
                <div style="margin-top: 4px;">
                  <span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${param.color}"></span>
                  ${param.seriesName}: ${value}
                </div>
              `;
            }
          });
          return content;
        }
      },
      legend: {
        data: legendData.filter(name => !name.includes('置信区间')),
        top: 40,
        textStyle: {
          color: theme === 'dark' ? '#ffffff' : '#333333'
        }
      },
      grid: {
        left: 60,
        right: 40,
        top: 80,
        bottom: 80
      },
      xAxis: {
        type: 'time',
        axisLabel: {
          color: theme === 'dark' ? '#ffffff' : '#333333',
          formatter: (value: number) => {
            return new Date(value).toLocaleDateString('zh-CN', {
              month: 'short',
              day: 'numeric'
            });
          }
        },
        axisLine: {
          lineStyle: {
            color: theme === 'dark' ? '#404040' : '#d9d9d9'
          }
        },
        splitLine: {
          lineStyle: {
            color: theme === 'dark' ? '#404040' : '#f0f0f0',
            type: 'dashed'
          }
        }
      },
      yAxis: {
        type: 'value',
        name: '特征值',
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
      series,
      dataZoom: [
        {
          type: 'slider',
          start: 70,
          end: 100,
          height: 20,
          bottom: 20
        }
      ],
      animation: true,
      animationDuration: 1500,
      animationEasing: 'cubicOut'
    };
  };

  // 生成波动性分析图表
  const getVolatilityChartOption = () => {
    if (!trendData) return null;

    const data = trendData.map(({ trait, config, volatility, trend, strength }) => ({
      name: config.name,
      value: [volatility * 100, strength * 100, trend],
      itemStyle: {
        color: config.color
      }
    }));

    return {
      title: {
        text: '个性波动性分析',
        textStyle: {
          color: theme === 'dark' ? '#ffffff' : '#333333'
        }
      },
      tooltip: {
        formatter: (params: any) => {
          const [volatility, strength, trend] = params.value;
          const trendMap = {
            increasing: '上升趋势',
            decreasing: '下降趋势',
            stable: '稳定'
          };
          return `
            <div><strong>${params.name}</strong></div>
            <div>波动性: ${volatility.toFixed(1)}%</div>
            <div>趋势强度: ${strength.toFixed(1)}%</div>
            <div>趋势方向: ${trendMap[trend as keyof typeof trendMap] || trend}</div>
          `;
        }
      },
      xAxis: {
        name: '波动性 (%)',
        nameTextStyle: {
          color: theme === 'dark' ? '#ffffff' : '#333333'
        },
        axisLabel: {
          color: theme === 'dark' ? '#ffffff' : '#333333'
        }
      },
      yAxis: {
        name: '趋势强度 (%)',
        nameTextStyle: {
          color: theme === 'dark' ? '#ffffff' : '#333333'
        },
        axisLabel: {
          color: theme === 'dark' ? '#ffffff' : '#333333'
        }
      },
      series: [{
        type: 'scatter',
        data,
        symbolSize: 20,
        emphasis: {
          focus: 'self'
        }
      }]
    };
  };

  // 生成相关性分析图表
  const getCorrelationChartOption = () => {
    if (!analysis?.correlationMatrix) return null;

    const traits = Object.keys(analysis.correlationMatrix);
    const data: any[] = [];
    
    traits.forEach((trait1, i) => {
      traits.forEach((trait2, j) => {
        const correlation = analysis.correlationMatrix[trait1][trait2] || 0;
        data.push([j, i, correlation]);
      });
    });

    return {
      title: {
        text: '个性特征相关性矩阵',
        textStyle: {
          color: theme === 'dark' ? '#ffffff' : '#333333'
        }
      },
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          const [x, y, correlation] = params.value;
          const trait1 = traitConfig[traits[y] as keyof typeof traitConfig]?.name || traits[y];
          const trait2 = traitConfig[traits[x] as keyof typeof traitConfig]?.name || traits[x];
          return `${trait1} - ${trait2}<br/>相关性: ${correlation.toFixed(3)}`;
        }
      },
      grid: {
        height: '50%',
        top: '10%'
      },
      xAxis: {
        type: 'category',
        data: traits.map(t => traitConfig[t as keyof typeof traitConfig]?.name || t),
        splitArea: {
          show: true
        },
        axisLabel: {
          color: theme === 'dark' ? '#ffffff' : '#333333'
        }
      },
      yAxis: {
        type: 'category',
        data: traits.map(t => traitConfig[t as keyof typeof traitConfig]?.name || t),
        splitArea: {
          show: true
        },
        axisLabel: {
          color: theme === 'dark' ? '#ffffff' : '#333333'
        }
      },
      visualMap: {
        min: -1,
        max: 1,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '15%',
        inRange: {
          color: ['#0052cc', '#ffffff', '#ff6b35']
        }
      },
      series: [{
        name: '相关性',
        type: 'heatmap',
        data,
        label: {
          show: true,
          formatter: (params: any) => params.value[2].toFixed(2)
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    };
  };

  const getChartOption = () => {
    switch (selectedMetric) {
      case 'trend':
        return getTrendChartOption();
      case 'volatility':
        return getVolatilityChartOption();
      case 'correlation':
        return getCorrelationChartOption();
      default:
        return getTrendChartOption();
    }
  };

  const chartOption = getChartOption();
  const isDataEmpty = !chartOption;
  const showLoadingState = isLoading || personalityLoading;

  return (
    <div className={`personality-trends ${className || ''}`}>
      {/* 分析类型选择器 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ 
          display: 'flex', 
          gap: 8, 
          padding: 4,
          backgroundColor: theme === 'dark' ? '#262626' : '#f5f5f5',
          borderRadius: 6,
          width: 'fit-content'
        }}>
          {[
            { key: 'trend', label: '趋势预测', icon: '📈' },
            { key: 'volatility', label: '波动分析', icon: '📊' },
            { key: 'correlation', label: '相关性', icon: '🔗' }
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setSelectedMetric(item.key as any)}
              style={{
                padding: '8px 12px',
                border: 'none',
                borderRadius: 4,
                backgroundColor: selectedMetric === item.key 
                  ? '#1890ff' 
                  : 'transparent',
                color: selectedMetric === item.key 
                  ? '#ffffff' 
                  : (theme === 'dark' ? '#ffffff' : '#333333'),
                cursor: 'pointer',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 图表展示区域 */}
      {isDataEmpty && !showLoadingState ? (
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
          暂无趋势分析数据
        </div>
      ) : (
        <ReactECharts
          option={chartOption}
          style={{ height, width: '100%' }}
          theme={getVisualizationTheme(theme === 'dark').echarts}
          showLoading={showLoadingState}
          loadingOption={{
            text: '分析趋势数据中...',
            color: '#1890ff',
            textColor: theme === 'dark' ? '#ffffff' : '#333333',
            maskColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.8)'
          }}
          opts={{
            renderer: 'canvas',
            // useDirtyRect: true // Not supported
          }}
        />
      )}

      {/* 洞察摘要 */}
      {trendData && (
        <div style={{ 
          marginTop: 16,
          padding: 16,
          backgroundColor: theme === 'dark' ? '#262626' : '#fafafa',
          borderRadius: 8
        }}>
          <h4 style={{ 
            margin: '0 0 12px 0',
            color: theme === 'dark' ? '#ffffff' : '#333333',
            fontSize: 14
          }}>
            🧠 智能洞察
          </h4>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            fontSize: 12,
            color: theme === 'dark' ? '#cccccc' : '#666666'
          }}>
            {trendData.slice(0, 4).map(({ trait, config, trend, strength, volatility }) => (
              <div key={trait} style={{ 
                padding: 8,
                backgroundColor: theme === 'dark' ? '#1f1f1f' : '#ffffff',
                borderRadius: 4,
                border: `2px solid ${config.color}20`
              }}>
                <div style={{ fontWeight: 'bold', color: config.color }}>
                  {config.icon} {config.name}
                </div>
                <div>趋势: {trend === 'increasing' ? '↗️ 上升' : trend === 'decreasing' ? '↘️ 下降' : '➡️ 稳定'}</div>
                <div>强度: {Math.round(strength * 100)}%</div>
                <div>波动: {Math.round(volatility * 100)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalityTrends;