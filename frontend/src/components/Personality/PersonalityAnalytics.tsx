import React, { useEffect, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { fetchPersonalityAnalysisAsync } from '../../store/slices/personalitySlice';
import { getVisualizationTheme } from '../../config/visualization';

/**
 * 个性分析仪表板组件 - 综合展示个性分析结果和统计数据
 * 包括多维度分析、统计指标和交互式探索功能
 */

interface PersonalityAnalyticsProps {
  /** 宠物ID */
  petId: string;
  /** 组件高度 */
  height?: number;
  /** 主题模式 */
  theme?: 'light' | 'dark';
  /** 分析时间范围(天) */
  analysisRange?: number;
  /** 显示的分析类型 */
  analysisTypes?: Array<'overview' | 'patterns' | 'insights' | 'recommendations'>;
  /** 自定义样式类名 */
  className?: string;
}

const PersonalityAnalytics: React.FC<PersonalityAnalyticsProps> = ({
  petId,
  height = 800,
  theme = 'light',
  analysisRange = 30,
  analysisTypes = ['overview', 'patterns', 'insights', 'recommendations'],
  className
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isLoading, setIsLoading] = useState(false);

  // 从Redux获取分析数据
  const { 
    analysis,
    interactionPatterns,
    personalityInsights,
    isLoading: personalityLoading 
  } = useSelector((state: RootState) => state.personality);

  // 初始化加载分析数据
  useEffect(() => {
    if (petId) {
      setIsLoading(true);
      dispatch(fetchPersonalityAnalysisAsync({ 
        petId, 
        analysisType: 'comprehensive',
        timeRange: analysisRange
      }))
        .unwrap()
        .finally(() => setIsLoading(false));
    }
  }, [petId, analysisRange, dispatch]);

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

  // 概览数据处理
  const overviewData = useMemo(() => {
    if (!analysis?.summary) return null;

    const summary = analysis.summary;
    
    return {
      dominantTraits: summary.dominantTraits?.slice(0, 3) || [],
      personalityType: summary.personalityType || 'unknown',
      stabilityScore: summary.stabilityScore || 0,
      diversityIndex: summary.diversityIndex || 0,
      averageValues: summary.averageValues || {},
      changeRate: summary.changeRate || 0
    };
  }, [analysis]);

  // 模式数据处理
  const patternsData = useMemo(() => {
    if (!interactionPatterns?.patterns) return null;

    const patterns = interactionPatterns.patterns;
    
    return {
      timePatterns: patterns.timeOfDay || {},
      activityPatterns: patterns.activities || {},
      emotionalPatterns: patterns.emotional || {},
      socialPatterns: patterns.social || {}
    };
  }, [interactionPatterns]);

  // 生成概览图表配置
  const getOverviewChartOption = () => {
    if (!overviewData) return null;

    const { dominantTraits, averageValues, stabilityScore, diversityIndex } = overviewData;

    // 主要特征饼图数据
    const pieData = dominantTraits.map((trait: any) => ({
      name: traitConfig[trait.trait as keyof typeof traitConfig]?.name || trait.trait,
      value: trait.score,
      itemStyle: {
        color: traitConfig[trait.trait as keyof typeof traitConfig]?.color || '#1890ff'
      }
    }));

    // 全特征雷达图数据
    const radarData = Object.entries(averageValues).map(([trait, value]) => ({
      name: traitConfig[trait as keyof typeof traitConfig]?.name || trait,
      value: value as number
    }));

    return {
      title: {
        text: '个性分析概览',
        textStyle: {
          fontSize: 16,
          color: theme === 'dark' ? '#ffffff' : '#333333'
        }
      },
      tooltip: {
        backgroundColor: theme === 'dark' ? '#2a2a2a' : '#ffffff',
        borderColor: theme === 'dark' ? '#404040' : '#d9d9d9',
        textStyle: {
          color: theme === 'dark' ? '#ffffff' : '#333333'
        }
      },
      legend: [
        {
          data: pieData.map(item => item.name),
          top: '15%',
          left: 'left',
          textStyle: {
            color: theme === 'dark' ? '#ffffff' : '#333333'
          }
        },
        {
          data: ['平均特征分布'],
          top: '15%',
          right: 'right',
          textStyle: {
            color: theme === 'dark' ? '#ffffff' : '#333333'
          }
        }
      ],
      series: [
        // 主导特征饼图
        {
          name: '主导特征',
          type: 'pie',
          radius: ['30%', '50%'],
          center: ['25%', '60%'],
          data: pieData,
          label: {
            formatter: '{b}\n{d}%'
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        },
        // 全特征雷达图
        {
          name: '特征分布',
          type: 'radar',
          center: ['75%', '60%'],
          radius: '30%',
          data: [{
            value: radarData.map(item => item.value),
            name: '平均特征分布',
            areaStyle: {
              opacity: 0.3,
              color: '#1890ff'
            }
          }],
          radar: {
            indicator: radarData.map(item => ({
              name: item.name,
              max: 100
            })),
            name: {
              textStyle: {
                color: theme === 'dark' ? '#ffffff' : '#333333',
                fontSize: 10
              }
            }
          }
        },
        // 稳定性指标
        {
          name: '稳定性',
          type: 'gauge',
          center: ['25%', '25%'],
          radius: '20%',
          data: [{
            value: Math.round(stabilityScore * 100),
            name: '稳定性'
          }],
          title: {
            fontSize: 10,
            color: theme === 'dark' ? '#ffffff' : '#333333'
          },
          detail: {
            fontSize: 12,
            color: theme === 'dark' ? '#ffffff' : '#333333'
          }
        },
        // 多样性指标
        {
          name: '多样性',
          type: 'gauge',
          center: ['75%', '25%'],
          radius: '20%',
          data: [{
            value: Math.round(diversityIndex * 100),
            name: '多样性'
          }],
          title: {
            fontSize: 10,
            color: theme === 'dark' ? '#ffffff' : '#333333'
          },
          detail: {
            fontSize: 12,
            color: theme === 'dark' ? '#ffffff' : '#333333'
          }
        }
      ]
    };
  };

  // 生成模式分析图表配置
  const getPatternsChartOption = () => {
    if (!patternsData) return null;

    const { timePatterns, activityPatterns } = patternsData;

    // 时间模式数据
    const timeData = Object.entries(timePatterns).map(([hour, intensity]) => [
      parseInt(hour),
      intensity as number
    ]);

    // 活动模式数据
    const activityData = Object.entries(activityPatterns).map(([activity, data]: [string, any]) => ({
      name: activity,
      value: data.frequency || 0,
      itemStyle: {
        color: data.associatedTrait ? 
          traitConfig[data.associatedTrait as keyof typeof traitConfig]?.color || '#1890ff' :
          '#1890ff'
      }
    }));

    return {
      title: {
        text: '行为模式分析',
        textStyle: {
          color: theme === 'dark' ? '#ffffff' : '#333333'
        }
      },
      tooltip: {
        backgroundColor: theme === 'dark' ? '#2a2a2a' : '#ffffff',
        borderColor: theme === 'dark' ? '#404040' : '#d9d9d9',
        textStyle: {
          color: theme === 'dark' ? '#ffffff' : '#333333'
        }
      },
      legend: {
        data: ['时间活跃度', '活动频率'],
        top: '10%',
        textStyle: {
          color: theme === 'dark' ? '#ffffff' : '#333333'
        }
      },
      grid: [
        {
          left: '5%',
          right: '55%',
          top: '20%',
          bottom: '10%'
        },
        {
          left: '55%',
          right: '5%',
          top: '20%',
          bottom: '10%'
        }
      ],
      xAxis: [
        {
          type: 'category',
          data: Array.from({ length: 24 }, (_, i) => `${i}:00`),
          gridIndex: 0,
          axisLabel: {
            color: theme === 'dark' ? '#ffffff' : '#333333',
            interval: 3
          }
        },
        {
          type: 'value',
          gridIndex: 1,
          axisLabel: {
            color: theme === 'dark' ? '#ffffff' : '#333333'
          }
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: '活跃度',
          gridIndex: 0,
          nameTextStyle: {
            color: theme === 'dark' ? '#ffffff' : '#333333'
          },
          axisLabel: {
            color: theme === 'dark' ? '#ffffff' : '#333333'
          }
        },
        {
          type: 'category',
          data: activityData.map(item => item.name),
          gridIndex: 1,
          axisLabel: {
            color: theme === 'dark' ? '#ffffff' : '#333333'
          }
        }
      ],
      series: [
        {
          name: '时间活跃度',
          type: 'line',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: timeData,
          smooth: true,
          areaStyle: {
            opacity: 0.3,
            color: '#1890ff'
          },
          lineStyle: {
            color: '#1890ff'
          }
        },
        {
          name: '活动频率',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: activityData,
          barWidth: '60%'
        }
      ]
    };
  };

  // 标签页配置
  const tabs = [
    { key: 'overview', label: '概览', icon: '📊' },
    { key: 'patterns', label: '模式', icon: '🔍' },
    { key: 'insights', label: '洞察', icon: '💡' },
    { key: 'recommendations', label: '建议', icon: '🎯' }
  ].filter(tab => analysisTypes.includes(tab.key as any));

  const getActiveChartOption = () => {
    switch (activeTab) {
      case 'overview':
        return getOverviewChartOption();
      case 'patterns':
        return getPatternsChartOption();
      default:
        return null;
    }
  };

  const chartOption = getActiveChartOption();
  const showLoadingState = isLoading || personalityLoading;

  return (
    <div className={`personality-analytics ${className || ''}`}>
      {/* 标签页导航 */}
      <div style={{ 
        display: 'flex', 
        marginBottom: 16,
        borderBottom: `1px solid ${theme === 'dark' ? '#404040' : '#d9d9d9'}`
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '12px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === tab.key 
                ? '#1890ff' 
                : (theme === 'dark' ? '#cccccc' : '#666666'),
              borderBottom: activeTab === tab.key ? '2px solid #1890ff' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div style={{ minHeight: height - 100 }}>
        {activeTab === 'overview' && (
          <div>
            {chartOption ? (
              <ReactECharts
                option={chartOption}
                style={{ height: height - 100, width: '100%' }}
                theme={getVisualizationTheme(theme === 'dark').echarts}
                showLoading={showLoadingState}
                loadingOption={{
                  text: '分析个性数据中...',
                  color: '#1890ff',
                  textColor: theme === 'dark' ? '#ffffff' : '#333333',
                  maskColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.8)'
                }}
              />
            ) : (
              <div style={{ 
                height: height - 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme === 'dark' ? '#ffffff' : '#666666'
              }}>
                {showLoadingState ? '加载分析数据中...' : '暂无分析数据'}
              </div>
            )}
          </div>
        )}

        {activeTab === 'patterns' && (
          <div>
            {chartOption ? (
              <ReactECharts
                option={chartOption}
                style={{ height: height - 100, width: '100%' }}
                theme={getVisualizationTheme(theme === 'dark').echarts}
                showLoading={showLoadingState}
              />
            ) : (
              <div style={{ 
                height: height - 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme === 'dark' ? '#ffffff' : '#666666'
              }}>
                暂无模式分析数据
              </div>
            )}
          </div>
        )}

        {activeTab === 'insights' && (
          <div style={{ padding: 20 }}>
            {personalityInsights?.insights?.length ? (
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 16
              }}>
                {personalityInsights.insights.map((insight: any, index: number) => (
                  <div
                    key={index}
                    style={{
                      padding: 16,
                      backgroundColor: theme === 'dark' ? '#262626' : '#fafafa',
                      borderRadius: 8,
                      borderLeft: `4px solid ${insight.severity === 'high' ? '#ff4d4f' : 
                        insight.severity === 'medium' ? '#faad14' : '#52c41a'}`
                    }}
                  >
                    <div style={{ 
                      fontWeight: 'bold',
                      color: theme === 'dark' ? '#ffffff' : '#333333',
                      marginBottom: 8
                    }}>
                      {insight.type === 'trend' ? '📈' : 
                       insight.type === 'anomaly' ? '⚠️' : 
                       insight.type === 'pattern' ? '🔍' : '💡'} 
                      {insight.title}
                    </div>
                    <div style={{
                      color: theme === 'dark' ? '#cccccc' : '#666666',
                      fontSize: 14,
                      lineHeight: 1.5
                    }}>
                      {insight.description}
                    </div>
                    {insight.confidence && (
                      <div style={{
                        marginTop: 8,
                        fontSize: 12,
                        color: theme === 'dark' ? '#999999' : '#999999'
                      }}>
                        置信度: {Math.round(insight.confidence * 100)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center',
                color: theme === 'dark' ? '#666666' : '#999999',
                paddingTop: 40
              }}>
                暂无个性洞察数据
              </div>
            )}
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div style={{ padding: 20 }}>
            {personalityInsights?.recommendations?.length ? (
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 16
              }}>
                {personalityInsights.recommendations.map((rec: any, index: number) => (
                  <div
                    key={index}
                    style={{
                      padding: 16,
                      backgroundColor: theme === 'dark' ? '#262626' : '#fafafa',
                      borderRadius: 8,
                      border: `1px solid ${theme === 'dark' ? '#404040' : '#d9d9d9'}`
                    }}
                  >
                    <div style={{ 
                      fontWeight: 'bold',
                      color: theme === 'dark' ? '#ffffff' : '#333333',
                      marginBottom: 8
                    }}>
                      🎯 {rec.title}
                    </div>
                    <div style={{
                      color: theme === 'dark' ? '#cccccc' : '#666666',
                      fontSize: 14,
                      lineHeight: 1.5,
                      marginBottom: 8
                    }}>
                      {rec.description}
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 12
                    }}>
                      <span style={{ color: theme === 'dark' ? '#999999' : '#999999' }}>
                        优先级: {rec.priority === 'high' ? '🔴 高' : 
                                rec.priority === 'medium' ? '🟡 中' : '🟢 低'}
                      </span>
                      {rec.expectedImpact && (
                        <span style={{ color: '#52c41a' }}>
                          预期影响: +{Math.round(rec.expectedImpact * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center',
                color: theme === 'dark' ? '#666666' : '#999999',
                paddingTop: 40
              }}>
                暂无个性建议数据
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalityAnalytics;