import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { 
  Card, 
  Row, 
  Col, 
  Progress, 
  Space, 
  Typography, 
  Alert, 
  Button, 
  Statistic,
  Tag,
  Tooltip,
  Empty,
  Spin
} from 'antd';
import {
  ReloadOutlined,
  FullscreenOutlined,
  RiseOutlined,
  FallOutlined,
  MinusOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { StateUtils, STATE_CONFIG } from './index';
import type { PetState, StateHistory, StateAlert } from './index';
import { getVisualizationTheme, initializeEChartsThemes } from '../../config/visualization';

const { Text } = Typography;

export interface StateMonitorDashboardProps {
  currentState: PetState;
  historicalData?: StateHistory[];
  alerts?: StateAlert[];
  loading?: boolean;
  height?: number;
  theme?: 'light' | 'dark';
  onRefresh?: () => void;
  onFullscreen?: () => void;
  title?: string;
  realTimeUpdate?: boolean;
}

const StateMonitorDashboard: React.FC<StateMonitorDashboardProps> = ({
  currentState,
  historicalData = [],
  alerts = [],
  loading = false,
  height = 600,
  theme = 'light',
  onRefresh,
  onFullscreen,
  title = '状态监控面板',
  realTimeUpdate = true
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
    if (!chartInstance.current || loading || historicalData.length === 0) return;

    const option = createStateHistoryChart(historicalData, theme);
    chartInstance.current.setOption(option, true);
  }, [historicalData, theme, loading]);

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

  // 创建状态历史图表配置
  const createStateHistoryChart = (data: StateHistory[], currentTheme: string) => {
    const isDark = currentTheme === 'dark';
    
    // 准备时间轴数据
    const timeData = data.map(item => 
      new Date(item.timestamp).toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    );

    // 准备各状态数据
    const stateKeys = ['health', 'happiness', 'energy', 'hunger', 'social'] as const;
    const series = stateKeys.map(key => ({
      name: STATE_CONFIG.stateNames[key],
      type: 'line',
      data: data.map(item => item.state[key]),
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: {
        width: 2
      },
      itemStyle: {
        color: StateUtils.getStateColor(
          data.length > 0 ? data[data.length - 1].state[key] : 0
        )
      }
    }));

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#2a2a2a' : '#ffffff',
        borderColor: isDark ? '#404040' : '#d9d9d9',
        textStyle: {
          color: isDark ? '#ffffff' : '#333333'
        },
        formatter: (params: any) => {
          let html = `<div style="padding: 8px;">`;
          html += `<div style="font-weight: bold; margin-bottom: 8px;">时间: ${params[0].name}</div>`;
          params.forEach((param: any) => {
            html += `<div style="margin-bottom: 4px;">`;
            html += `<span style="color: ${param.color};">●</span> `;
            html += `${param.seriesName}: ${param.value}%`;
            html += `</div>`;
          });
          html += `</div>`;
          return html;
        }
      },
      legend: {
        data: stateKeys.map(key => STATE_CONFIG.stateNames[key]),
        bottom: 10,
        textStyle: {
          color: isDark ? '#ffffff' : '#333333'
        }
      },
      grid: {
        top: 40,
        left: 50,
        right: 30,
        bottom: 60,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: timeData,
        axisLine: {
          lineStyle: {
            color: isDark ? '#404040' : '#d9d9d9'
          }
        },
        axisLabel: {
          color: isDark ? '#ffffff' : '#333333'
        }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLine: {
          lineStyle: {
            color: isDark ? '#404040' : '#d9d9d9'
          }
        },
        axisLabel: {
          color: isDark ? '#ffffff' : '#333333',
          formatter: '{value}%'
        },
        splitLine: {
          lineStyle: {
            color: isDark ? '#404040' : '#f0f0f0'
          }
        }
      },
      series,
      dataZoom: [{
        type: 'slider',
        start: Math.max(0, 100 - (30 / data.length) * 100), // 显示最近30个数据点
        end: 100,
        height: 20,
        bottom: 30
      }]
    };
  };

  // 渲染状态进度条
  const renderStateProgress = (stateName: Exclude<keyof PetState, 'lastUpdate'>, value: number) => {
    const level = StateUtils.getStateLevel(value);
    const color = StateUtils.getStateColor(value);
    const icon = STATE_CONFIG.stateIcons[stateName];
    const displayName = STATE_CONFIG.stateNames[stateName];

    // 计算趋势（如果有历史数据）
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let changeRate = 0;
    if (historicalData.length >= 2) {
      const previous = historicalData[historicalData.length - 2].state[stateName];
      trend = StateUtils.getStateTrend(value, previous);
      changeRate = StateUtils.calculateChangeRate(value, previous);
    }

    const TrendIcon = trend === 'up' ? RiseOutlined : 
                     trend === 'down' ? FallOutlined : MinusOutlined;

    return (
      <Card size="small" key={stateName}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 18, marginRight: 8 }}>{icon}</span>
          <Text strong>{displayName}</Text>
          <div style={{ marginLeft: 'auto' }}>
            <Space>
              <Tag color={
                level === 'excellent' ? 'green' :
                level === 'good' ? 'blue' :
                level === 'fair' ? 'orange' :
                level === 'poor' ? 'red' : 'red'
              }>
                {level === 'excellent' ? '优秀' :
                 level === 'good' ? '良好' :
                 level === 'fair' ? '一般' :
                 level === 'poor' ? '较差' : '危险'}
              </Tag>
              {realTimeUpdate && historicalData.length >= 2 && (
                <Tooltip title={`变化率: ${changeRate > 0 ? '+' : ''}${changeRate.toFixed(1)}%`}>
                  <TrendIcon style={{ 
                    color: trend === 'up' ? '#52c41a' : 
                           trend === 'down' ? '#ff4d4f' : '#999',
                    fontSize: 14
                  }} />
                </Tooltip>
              )}
            </Space>
          </div>
        </div>
        <Progress
          percent={value}
          strokeColor={color}
          size="small"
          format={(percent) => `${Math.round(percent || 0)}%`}
        />
      </Card>
    );
  };

  // 计算总体得分和统计
  const overallScore = StateUtils.calculateOverallScore(currentState);
  const criticalAlerts = alerts.filter(alert => alert.type === 'danger').length;
  const warningAlerts = alerts.filter(alert => alert.type === 'warning').length;

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

  if (!currentState) {
    return (
      <Card title={title} style={{ height }}>
        <Empty description="暂无状态数据" />
      </Card>
    );
  }

  return (
    <div style={{ height }}>
      {/* 顶部概览卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总体状态得分"
              value={overallScore}
              precision={1}
              suffix="分"
              valueStyle={{ 
                color: StateUtils.getStateColor(overallScore),
                fontSize: 28,
                fontWeight: 'bold'
              }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="紧急警告"
              value={criticalAlerts}
              suffix="个"
              prefix={<WarningOutlined />}
              valueStyle={{ 
                color: criticalAlerts > 0 ? '#ff4d4f' : '#52c41a',
                fontSize: 28,
                fontWeight: 'bold'
              }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="一般提醒"
              value={warningAlerts}
              suffix="个"
              valueStyle={{ 
                color: warningAlerts > 0 ? '#faad14' : '#52c41a',
                fontSize: 28,
                fontWeight: 'bold'
              }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* 左侧：状态进度条 */}
        <Col xs={24} lg={8}>
          <Card
            title="当前状态"
            extra={
              <Space>
                {onRefresh && (
                  <Button icon={<ReloadOutlined />} size="small" onClick={onRefresh} type="text" />
                )}
              </Space>
            }
            style={{ height: height - 120 }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {renderStateProgress('health', currentState.health)}
              {renderStateProgress('happiness', currentState.happiness)}
              {renderStateProgress('energy', currentState.energy)}
              {renderStateProgress('hunger', currentState.hunger)}
              {renderStateProgress('social', currentState.social)}
            </Space>
          </Card>
        </Col>

        {/* 右侧：历史趋势图和警告 */}
        <Col xs={24} lg={16}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* 历史趋势图 */}
            <Card
              title="状态趋势"
              extra={
                onFullscreen && (
                  <Button icon={<FullscreenOutlined />} size="small" onClick={onFullscreen} type="text" />
                )
              }
              style={{ height: (height - 120) * 0.7 }}
            >
              {historicalData.length > 0 ? (
                <div
                  ref={chartRef}
                  style={{
                    width: '100%',
                    height: (height - 120) * 0.7 - 80
                  }}
                />
              ) : (
                <Empty description="暂无历史数据" />
              )}
            </Card>

            {/* 警告面板 */}
            <Card
              title={`状态警告 (${alerts.length})`}
              style={{ height: (height - 120) * 0.3 }}
            >
              <div style={{ 
                maxHeight: (height - 120) * 0.3 - 80,
                overflowY: 'auto'
              }}>
                {alerts.length > 0 ? (
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    {alerts.map(alert => (
                      <Alert
                        key={alert.id}
                        message={alert.stateName}
                        description={alert.message}
                        type={alert.type === 'danger' ? 'error' : 'warning'}
                        showIcon
                        action={
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </Text>
                        }
                      />
                    ))}
                  </Space>
                ) : (
                  <Empty 
                    description="暂无警告" 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    style={{ marginTop: 20 }}
                  />
                )}
              </div>
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default StateMonitorDashboard;