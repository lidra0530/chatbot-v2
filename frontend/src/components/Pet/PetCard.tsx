import React from 'react';
import { Card, Avatar, Tag, Progress, Space, Button, Tooltip } from 'antd';
import { HeartOutlined, ThunderboltOutlined, SmileOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

export interface PetCardProps {
  pet: {
    id: string;
    name: string;
    species: string;
    avatarUrl?: string;
    state: {
      health: number;
      happiness: number;
      energy: number;
      hunger: number;
      social: number;
    };
    evolutionLevel: number;
    totalSkillsUnlocked: number;
    createdAt: string;
  };
  onEdit?: (petId: string) => void;
  onDelete?: (petId: string) => void;
  onSelect?: (petId: string) => void;
}

const PetCard: React.FC<PetCardProps> = ({ pet, onEdit, onDelete, onSelect }) => {
  const getStateColor = (value: number) => {
    if (value >= 80) return '#52c41a';
    if (value >= 60) return '#faad14';
    if (value >= 40) return '#fa8c16';
    return '#ff4d4f';
  };

  const getEvolutionBadge = (level: number) => {
    const levels = ['初级', '成长', '进化', '高级', '传说'];
    const colors = ['default', 'blue', 'green', 'gold', 'purple'];
    return { text: levels[Math.min(level - 1, 4)] || '初级', color: colors[Math.min(level - 1, 4)] };
  };

  const evolutionBadge = getEvolutionBadge(pet.evolutionLevel);

  return (
    <Card
      hoverable
      style={{ marginBottom: 16 }}
      actions={[
        <Tooltip title="编辑">
          <EditOutlined key="edit" onClick={() => onEdit?.(pet.id)} />
        </Tooltip>,
        <Tooltip title="删除">
          <DeleteOutlined key="delete" onClick={() => onDelete?.(pet.id)} />
        </Tooltip>,
        <Button type="primary" size="small" onClick={() => onSelect?.(pet.id)}>
          选择
        </Button>,
      ]}
    >
      <Card.Meta
        avatar={
          <Avatar 
            size={64} 
            src={pet.avatarUrl} 
            style={{ backgroundColor: '#1677ff' }}
          >
            {pet.name.charAt(0)}
          </Avatar>
        }
        title={
          <Space>
            <span>{pet.name}</span>
            <Tag color={evolutionBadge.color}>{evolutionBadge.text}</Tag>
          </Space>
        }
        description={
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Tag color="blue">{pet.species}</Tag>
              <Tag>{pet.totalSkillsUnlocked} 项技能</Tag>
            </div>
            
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <HeartOutlined style={{ color: '#ff4d4f' }} />
                <span style={{ minWidth: 40, fontSize: 12 }}>健康</span>
                <Progress 
                  percent={pet.state.health} 
                  size="small" 
                  strokeColor={getStateColor(pet.state.health)}
                  showInfo={false}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: 12, minWidth: 30 }}>{pet.state.health}%</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SmileOutlined style={{ color: '#faad14' }} />
                <span style={{ minWidth: 40, fontSize: 12 }}>快乐</span>
                <Progress 
                  percent={pet.state.happiness} 
                  size="small" 
                  strokeColor={getStateColor(pet.state.happiness)}
                  showInfo={false}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: 12, minWidth: 30 }}>{pet.state.happiness}%</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ThunderboltOutlined style={{ color: '#52c41a' }} />
                <span style={{ minWidth: 40, fontSize: 12 }}>精力</span>
                <Progress 
                  percent={pet.state.energy} 
                  size="small" 
                  strokeColor={getStateColor(pet.state.energy)}
                  showInfo={false}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: 12, minWidth: 30 }}>{pet.state.energy}%</span>
              </div>
            </Space>
          </Space>
        }
      />
    </Card>
  );
};

export default PetCard;