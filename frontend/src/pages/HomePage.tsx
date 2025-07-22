import React, { useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Space,
  Typography,
  Statistic,
  Button,
  Avatar,
  Badge,
} from 'antd';
import {
  RobotOutlined,
  MessageOutlined,
  TrophyOutlined,
  HeartOutlined,
  StarOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../store';
import type { AppDispatch } from '../store';
import { fetchPetsAsync } from '../store/slices/petSlice';
import { MainLayout } from '../components/Layout';

const { Title, Text, Paragraph } = Typography;

const HomePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { pets, isLoading } = useSelector((state: RootState) => state.pet);

  useEffect(() => {
    dispatch(fetchPetsAsync(false));
  }, [dispatch]);

  // 统计数据
  const stats = {
    totalPets: pets.length,
    totalConversations: pets.length * 2, // 模拟数据
    totalMessages: pets.length * 10, // 模拟数据
    activePets: pets.length, // 假设所有宠物都是活跃的
  };

  // 最近活跃的宠物
  const recentPets = pets
    .sort(
      (a, b) =>
        new Date(b.lastInteraction || 0).getTime() -
        new Date(a.lastInteraction || 0).getTime()
    )
    .slice(0, 3);

  return (
    <MainLayout>
      <div style={{ padding: '24px' }}>
        {/* 欢迎区域 */}
        <div style={{ marginBottom: 32 }}>
          <Title level={2} style={{ margin: 0 }}>
            欢迎回来，{user?.displayName || user?.email?.split('@')[0]}！
          </Title>
          <Paragraph type="secondary" style={{ fontSize: 16, marginTop: 8 }}>
            今天想和哪个AI宠物聊天呢？
          </Paragraph>
        </div>

        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="宠物总数"
                value={stats.totalPets}
                prefix={<RobotOutlined style={{ color: '#1677ff' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="对话数量"
                value={stats.totalConversations}
                prefix={<MessageOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="消息总数"
                value={stats.totalMessages}
                prefix={<StarOutlined style={{ color: '#faad14' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="活跃宠物"
                value={stats.activePets}
                prefix={<HeartOutlined style={{ color: '#f5222d' }} />}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[24, 24]}>
          {/* 我的宠物 */}
          <Col xs={24} lg={16}>
            <Card
              title={
                <Space>
                  <RobotOutlined />
                  <span>我的宠物</span>
                </Space>
              }
              extra={
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/pets/create')}
                >
                  创建宠物
                </Button>
              }
              loading={isLoading}
            >
              {pets.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#999',
                  }}
                >
                  <RobotOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                  <div>还没有宠物</div>
                  <div style={{ marginTop: 8 }}>
                    <Button
                      type="primary"
                      onClick={() => navigate('/pets/create')}
                    >
                      创建第一个宠物
                    </Button>
                  </div>
                </div>
              ) : (
                <Row gutter={[16, 16]}>
                  {pets.map(pet => (
                    <Col xs={24} sm={12} lg={8} key={pet.id}>
                      <Card
                        size="small"
                        hoverable
                        onClick={() => navigate(`/chat/${pet.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <Space
                          direction="vertical"
                          size="small"
                          style={{ width: '100%' }}
                        >
                          <div style={{ textAlign: 'center' }}>
                            <Badge status="success" offset={[-8, 8]}>
                              <Avatar
                                size={48}
                                icon={<RobotOutlined />}
                                style={{
                                  backgroundColor:
                                    pet.personality?.openness > 0.7
                                      ? '#52c41a'
                                      : pet.personality?.extraversion > 0.7
                                        ? '#1677ff'
                                        : pet.personality?.conscientiousness >
                                            0.7
                                          ? '#722ed1'
                                          : '#faad14',
                                }}
                              />
                            </Badge>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <Title level={5} style={{ margin: 0 }}>
                              {pet.name}
                            </Title>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {pet.species || '默认物种'}
                            </Text>
                          </div>
                          <div style={{ fontSize: 12, color: '#999' }}>
                            <div>等级: {pet.evolutionLevel || 1}</div>
                            <div>
                              个性:{' '}
                              {pet.personality?.openness > 0.7
                                ? '开放'
                                : pet.personality?.extraversion > 0.7
                                  ? '外向'
                                  : pet.personality?.conscientiousness > 0.7
                                    ? '严谨'
                                    : '平衡'}
                            </div>
                          </div>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card>
          </Col>

          {/* 最近活动 */}
          <Col xs={24} lg={8}>
            <Card
              title={
                <Space>
                  <TrophyOutlined />
                  <span>最近活动</span>
                </Space>
              }
            >
              {recentPets.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '20px',
                    color: '#999',
                  }}
                >
                  <MessageOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                  <div>暂无活动记录</div>
                </div>
              ) : (
                <Space
                  direction="vertical"
                  size="middle"
                  style={{ width: '100%' }}
                >
                  {recentPets.map(pet => (
                    <div
                      key={pet.id}
                      style={{
                        padding: '12px',
                        border: '1px solid #f0f0f0',
                        borderRadius: 8,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onClick={() => navigate(`/chat/${pet.id}`)}
                    >
                      <Space>
                        <Avatar
                          size="small"
                          icon={<RobotOutlined />}
                          style={{ backgroundColor: '#1677ff' }}
                        />
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>
                            {pet.name}
                          </div>
                          <div style={{ fontSize: 12, color: '#999' }}>
                            {pet.lastInteraction
                              ? `${Math.floor((Date.now() - new Date(pet.lastInteraction).getTime()) / (1000 * 60 * 60))}小时前活跃`
                              : '首次互动'}
                          </div>
                        </div>
                      </Space>
                    </div>
                  ))}
                </Space>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </MainLayout>
  );
};

export default HomePage;
