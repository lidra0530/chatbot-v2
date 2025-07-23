import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { Card, Spin, Empty, Button, Space, Typography } from 'antd';
import { ReloadOutlined, FullscreenOutlined } from '@ant-design/icons';
import { PersonalityUtils, PERSONALITY_TRAIT_CONFIG } from './index';
import { getVisualizationTheme, initializeEChartsThemes } from '../../config/visualization';

const { Text } = Typography;

export interface PersonalityData {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  timestamp?: string;
}

export interface PersonalityRadarChartProps {
  data: PersonalityData;
  historicalData?: PersonalityData[];
  loading?: boolean;
  height?: number;
  theme?: 'light' | 'dark';
  showComparison?: boolean;
  onRefresh?: () => void;
  onFullscreen?: () => void;
  title?: string;
  realTimeUpdate?: boolean;
}

const PersonalityRadarChart: React.FC<PersonalityRadarChartProps> = ({
  data,
  historicalData = [],
  loading = false,
  height = 400,
  theme = 'light',
  showComparison = false,
  onRefresh,
  onFullscreen,
  title = '个性特征雷达图'
  // realTimeUpdate = true // TODO: 实现实时更新功能
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [initialized, setInitialized] = useState(false);

  // 初始化ECharts主题
  useEffect(() => {
    initializeEChartsThemes();
    setInitialized(true);
  }, []);

  // 创建图表
  useEffect(() => {
    if (!initialized || !chartRef.current || loading) return;

    if (chartInstance.current) {
      chartInstance.current.dispose();
    }

    chartInstance.current = echarts.init(
      chartRef.current, 
      getVisualizationTheme(theme === 'dark').echarts
    );

    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [initialized, theme, loading]);

  // 更新图表数据
  useEffect(() => {
    if (!chartInstance.current || loading || !data) return;

    const radarData = prepareRadarData(data, historicalData, showComparison);
    const option = createRadarOption(radarData, theme);
    
    chartInstance.current.setOption(option, true);
  }, [data, historicalData, showComparison, theme, loading]);

  // 处理窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 准备雷达图数据
  const prepareRadarData = (
    current: PersonalityData,
    historical: PersonalityData[],
    showHist: boolean
  ) => {
    const indicators = [
      { name: '开放性', max: 100, color: PERSONALITY_TRAIT_CONFIG.creativity.color },
      { name: '尽责性', max: 100, color: PERSONALITY_TRAIT_CONFIG.independence.color },
      { name: '外向性', max: 100, color: PERSONALITY_TRAIT_CONFIG.sociability.color },
      { name: '宜人性', max: 100, color: PERSONALITY_TRAIT_CONFIG.empathy.color },
      { name: '神经质', max: 100, color: PERSONALITY_TRAIT_CONFIG.energy.color }
    ];

    const currentValues = [
      Math.round(current.openness * 100),
      Math.round(current.conscientiousness * 100),
      Math.round(current.extraversion * 100),
      Math.round(current.agreeableness * 100),
      Math.round(current.neuroticism * 100)
    ];

    const series = [{
      name: '当前特征',
      type: 'radar',
      data: [{
        value: currentValues,
        name: '当前',
        itemStyle: {
          color: '#1890ff'
        },
        areaStyle: {
          color: 'rgba(24, 144, 255, 0.2)'
        }
      }]
    }];

    // 添加历史对比数据
    if (showHist && historical.length > 0) {
      const avgHistorical = calculateAveragePersonality(historical);
      const historicalValues = [
        Math.round(avgHistorical.openness * 100),
        Math.round(avgHistorical.conscientiousness * 100),
        Math.round(avgHistorical.extraversion * 100),
        Math.round(avgHistorical.agreeableness * 100),
        Math.round(avgHistorical.neuroticism * 100)
      ];

      series.push({
        name: '历史平均',
        type: 'radar',
        data: [{
          value: historicalValues,
          name: '历史平均',
          itemStyle: {
            color: '#52c41a'
          },
          areaStyle: {
            color: 'rgba(82, 196, 26, 0.1)'
          }
        }]
      });
    }

    return { indicators, series };
  };

  // 计算历史平均值
  const calculateAveragePersonality = (historical: PersonalityData[]): PersonalityData => {
    if (historical.length === 0) {
      return { openness: 0, conscientiousness: 0, extraversion: 0, agreeableness: 0, neuroticism: 0 };
    }

    const sum = historical.reduce((acc, item) => ({
      openness: acc.openness + item.openness,
      conscientiousness: acc.conscientiousness + item.conscientiousness,
      extraversion: acc.extraversion + item.extraversion,
      agreeableness: acc.agreeableness + item.agreeableness,
      neuroticism: acc.neuroticism + item.neuroticism
    }), { openness: 0, conscientiousness: 0, extraversion: 0, agreeableness: 0, neuroticism: 0 });

    return {
      openness: sum.openness / historical.length,
      conscientiousness: sum.conscientiousness / historical.length,
      extraversion: sum.extraversion / historical.length,
      agreeableness: sum.agreeableness / historical.length,
      neuroticism: sum.neuroticism / historical.length
    };
  };

  // 创建雷达图配置
  const createRadarOption = (radarData: any, currentTheme: string) => {
    const isDark = currentTheme === 'dark';
    
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: isDark ? '#2a2a2a' : '#ffffff',
        borderColor: isDark ? '#404040' : '#d9d9d9',
        textStyle: {
          color: isDark ? '#ffffff' : '#333333'
        },
        formatter: (params: any) => {
          const { name, value } = params;
          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${name}</div>
              <div>开放性: ${value[0]}%</div>
              <div>尽责性: ${value[1]}%</div>
              <div>外向性: ${value[2]}%</div>
              <div>宜人性: ${value[3]}%</div>
              <div>神经质: ${value[4]}%</div>
            </div>
          `;
        }
      },
      legend: {
        data: radarData.series.map((s: any) => s.name),
        bottom: 20,
        textStyle: {
          color: isDark ? '#ffffff' : '#333333'
        }
      },
      radar: {
        indicator: radarData.indicators.map((ind: any) => ({
          name: ind.name,
          max: ind.max,
          nameGap: 8
        })),
        center: ['50%', '50%'],
        radius: '70%',
        startAngle: 90,
        splitNumber: 5,
        shape: 'polygon',
        name: {
          formatter: '{value}',
          textStyle: {
            color: isDark ? '#ffffff' : '#333333',
            fontSize: 12
          }
        },
        splitLine: {
          lineStyle: {
            color: isDark ? '#404040' : '#f0f0f0'
          }
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: isDark 
              ? ['rgba(255, 255, 255, 0.02)', 'rgba(255, 255, 255, 0.05)']
              : ['rgba(0, 0, 0, 0.02)', 'rgba(0, 0, 0, 0.05)']
          }
        },
        axisLine: {
          lineStyle: {
            color: isDark ? '#404040' : '#d9d9d9'
          }
        }
      },
      series: radarData.series.map((s: any) => ({
        ...s,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 2
        },
        label: {
          show: true,
          formatter: '{c}%',
          fontSize: 10,
          color: isDark ? '#ffffff' : '#333333'
        }
      }))
    };
  };

  // 计算个性洞察
  const getPersonalityInsights = (personalityData: PersonalityData) => {
    const traits = {
      openness: personalityData.openness * 100,
      conscientiousness: personalityData.conscientiousness * 100,
      extraversion: personalityData.extraversion * 100,
      agreeableness: personalityData.agreeableness * 100,
      neuroticism: personalityData.neuroticism * 100
    };

    const dominant = PersonalityUtils.getDominantTraits(traits, 2);
    return dominant;
  };

  if (loading) {
    return (
      <Card title={title} style={{ height }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: height - 100 
        }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card title={title} style={{ height }}>
        <Empty description="暂无个性数据" />
      </Card>
    );
  }

  const insights = getPersonalityInsights(data);

  return (
    <Card
      title={title}
      style={{ height }}
      extra={
        <Space>
          {onRefresh && (
            <Button 
              icon={<ReloadOutlined />} 
              size="small" 
              onClick={onRefresh}
              type="text"
            />
          )}
          {onFullscreen && (
            <Button 
              icon={<FullscreenOutlined />} 
              size="small" 
              onClick={onFullscreen}
              type="text"
            />
          )}
        </Space>
      }
    >
      <div
        ref={chartRef}
        style={{ 
          width: '100%', 
          height: height - 120
        }}
      />
      
      {/* 个性洞察 */}
      <div style={{ 
        marginTop: 8, 
        padding: '8px 0',
        borderTop: '1px solid #f0f0f0'
      }}>
        <Space>
          <Text type="secondary">主要特征:</Text>
          {insights.map(({ trait, score }) => (
            <Text 
              key={trait}
              style={{ 
                color: PersonalityUtils.getTraitColor(trait),
                fontWeight: 500
              }}
            >
              {PersonalityUtils.getTraitDisplayName(trait)} ({Math.round(score)}%)
            </Text>
          ))}
        </Space>
      </div>
    </Card>
  );
};

export default PersonalityRadarChart;