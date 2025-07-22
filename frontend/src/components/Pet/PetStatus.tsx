import React from 'react';
import { Card, Progress, Row, Col, Statistic, Tag, Space, Tooltip } from 'antd';
import { 
  HeartOutlined, 
  SmileOutlined, 
  ThunderboltOutlined, 
  HomeOutlined, 
  TeamOutlined,
  TrophyOutlined,
  StarOutlined
} from '@ant-design/icons';

interface PetStatusProps {
  pet: {
    id: string;
    name: string;
    species: string;
    state: {
      health: number;
      happiness: number;
      energy: number;
      hunger: number;
      social: number;
    };
    evolutionLevel: number;
    totalSkillsUnlocked: number;
    totalExperience?: number;
  };
  loading?: boolean;
}

const PetStatus: React.FC<PetStatusProps> = ({ pet, loading = false }) => {
  const getStateColor = (value: number) => {
    if (value >= 80) return '#52c41a';
    if (value >= 60) return '#faad14';
    if (value >= 40) return '#fa8c16';
    return '#ff4d4f';
  };

  const getStateStatus = (value: number) => {
    if (value >= 80) return '优秀';
    if (value >= 60) return '良好';
    if (value >= 40) return '一般';
    return '需要关注';
  };

  const statusItems = [
    {
      key: 'health',
      label: '健康值',
      value: pet.state.health,
      icon: <HeartOutlined />,
      color: '#ff4d4f'
    },
    {
      key: 'happiness',
      label: '快乐值',
      value: pet.state.happiness,
      icon: <SmileOutlined />,
      color: '#faad14'
    },
    {
      key: 'energy',
      label: '精力值',
      value: pet.state.energy,
      icon: <ThunderboltOutlined />,
      color: '#52c41a'
    },
    {
      key: 'hunger',
      label: '饥饿值',
      value: pet.state.hunger,
      icon: <HomeOutlined />,
      color: '#722ed1'
    },
    {
      key: 'social',
      label: '社交值',
      value: pet.state.social,
      icon: <TeamOutlined />,
      color: '#1677ff'
    }
  ];

  return (
    <Card title={`${pet.name} 的状态监控`} loading={loading}>
      <Row gutter={[16, 16]}>
        {statusItems.map(item => (
          <Col xs={24} sm={12} md={8} lg={6} xl={4} key={item.key}>
            <Card size="small">
              <Statistic
                title={
                  <Space>
                    <span style={{ color: item.color }}>{item.icon}</span>
                    {item.label}
                  </Space>
                }
                value={item.value}
                suffix="%"
                valueStyle={{ color: getStateColor(item.value) }}
              />
              <Progress
                percent={item.value}
                strokeColor={getStateColor(item.value)}
                size="small"
                style={{ marginTop: 8 }}
              />
              <Tooltip title={`状态评价: ${getStateStatus(item.value)}`}>
                <Tag 
                  color={getStateColor(item.value)} 
                  style={{ marginTop: 4, fontSize: 10 }}
                >
                  {getStateStatus(item.value)}
                </Tag>
              </Tooltip>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title={
                <Space>
                  <StarOutlined style={{ color: '#faad14' }} />
                  进化等级
                </Space>
              }
              value={pet.evolutionLevel}
              suffix="级"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title={
                <Space>
                  <TrophyOutlined style={{ color: '#52c41a' }} />
                  已解锁技能
                </Space>
              }
              value={pet.totalSkillsUnlocked}
              suffix="项"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title={
                <Space>
                  <ThunderboltOutlined style={{ color: '#1677ff' }} />
                  总经验值
                </Space>
              }
              value={pet.totalExperience || 0}
              suffix="EXP"
            />
          </Card>
        </Col>
      </Row>
    </Card>
  );
};

export default PetStatus;