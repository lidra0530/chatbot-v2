import React, { useEffect, useState } from 'react';
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
  Progress,
  Tag,
  Tooltip,
} from 'antd';
import {
  RobotOutlined,
  MessageOutlined,
  TrophyOutlined,
  HeartOutlined,
  StarOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  SmileOutlined,
  FireOutlined,
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
  const [dashboardLoading, setDashboardLoading] = useState(false);

  useEffect(() => {
    setDashboardLoading(true);
    dispatch(fetchPetsAsync(false)).finally(() => {
      setDashboardLoading(false);
    });
  }, [dispatch]);

  // 计算统计数据
  const stats = {
    totalPets: pets.length,
    activePets: pets.filter(pet => {
      // 假设7天内有互动的为活跃宠物
      const lastInteraction = pet.lastInteraction ? new Date(pet.lastInteraction) : null;
      return lastInteraction && (Date.now() - lastInteraction.getTime()) < 7 * 24 * 60 * 60 * 1000;
    }).length,
    totalSkills: pets.reduce((sum, pet) => sum + (pet.skills?.length || 0), 0),
    avgLevel: pets.length > 0 ? Math.round(pets.reduce((sum, pet) => sum + (pet.evolutionLevel || 1), 0) / pets.length * 10) / 10 : 0,
    healthyPets: pets.filter(pet => (pet.state?.health || 0) >= 70).length,
    avgPersonality: pets.length > 0 ? {
      openness: Math.round(pets.reduce((sum, pet) => sum + ((pet.personality?.openness || 0) * 100), 0) / pets.length),
      extraversion: Math.round(pets.reduce((sum, pet) => sum + ((pet.personality?.extraversion || 0) * 100), 0) / pets.length),
      conscientiousness: Math.round(pets.reduce((sum, pet) => sum + ((pet.personality?.conscientiousness || 0) * 100), 0) / pets.length)
    } : null
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
            <Card loading={dashboardLoading}>
              <Statistic
                title="宠物总数"
                value={stats.totalPets}
                prefix={<RobotOutlined style={{ color: '#1677ff' }} />}
                suffix="只"
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card loading={dashboardLoading}>
              <Statistic
                title="活跃宠物"
                value={stats.activePets}
                prefix={<FireOutlined style={{ color: '#ff4d4f' }} />}
                suffix={`/ ${stats.totalPets}`}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card loading={dashboardLoading}>
              <Statistic
                title="平均等级"
                value={stats.avgLevel}
                prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
                precision={1}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card loading={dashboardLoading}>
              <Statistic
                title="技能总数"
                value={stats.totalSkills}
                prefix={<StarOutlined style={{ color: '#722ed1' }} />}
                suffix="个"
              />
            </Card>
          </Col>
        </Row>

        {/* 宠物健康状况概览 */}
        {pets.length > 0 && (
          <Card title="宠物健康概览" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <div style={{ textAlign: 'center' }}>
                  <Progress
                    type="circle"
                    percent={Math.round((stats.healthyPets / stats.totalPets) * 100)}
                    format={() => `${stats.healthyPets}/${stats.totalPets}`}
                    strokeColor="#52c41a"
                  />
                  <Text style={{ display: 'block', marginTop: 8 }}>健康宠物比例</Text>
                </div>
              </Col>
              {stats.avgPersonality && (
                <>
                  <Col xs={8} sm={5}>
                    <div style={{ textAlign: 'center' }}>
                      <Progress
                        type="circle"
                        percent={stats.avgPersonality.openness}
                        size={80}
                        strokeColor="#13c2c2"
                        format={percent => `${percent}%`}
                      />
                      <Text style={{ display: 'block', marginTop: 8, fontSize: 12 }}>平均开放性</Text>
                    </div>
                  </Col>
                  <Col xs={8} sm={5}>
                    <div style={{ textAlign: 'center' }}>
                      <Progress
                        type="circle"
                        percent={stats.avgPersonality.extraversion}
                        size={80}
                        strokeColor="#1890ff"
                        format={percent => `${percent}%`}
                      />
                      <Text style={{ display: 'block', marginTop: 8, fontSize: 12 }}>平均外向性</Text>
                    </div>
                  </Col>
                  <Col xs={8} sm={6}>
                    <div style={{ textAlign: 'center' }}>
                      <Progress
                        type="circle"
                        percent={stats.avgPersonality.conscientiousness}
                        size={80}
                        strokeColor="#722ed1"
                        format={percent => `${percent}%`}
                      />
                      <Text style={{ display: 'block', marginTop: 8, fontSize: 12 }}>平均责任心</Text>
                    </div>
                  </Col>
                </>
              )}
            </Row>
          </Card>
        )}

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
                  {pets.map(pet => {
                    const healthStatus = (pet.state?.health || 0) >= 70 ? 'success' : 
                                      (pet.state?.health || 0) >= 40 ? 'warning' : 'error';
                    const isActive = pet.lastInteraction && 
                      (Date.now() - new Date(pet.lastInteraction).getTime()) < 7 * 24 * 60 * 60 * 1000;
                    
                    return (
                      <Col xs={24} sm={12} lg={8} key={pet.id}>
                        <Card
                          size="small"
                          hoverable
                          onClick={() => navigate(`/chat/${pet.id}`)}
                          style={{ cursor: 'pointer' }}
                          actions={[
                            <Tooltip title="查看个性分析" key="personality">
                              <HeartOutlined onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/personality/${pet.id}`);
                              }} />
                            </Tooltip>,
                            <Tooltip title="查看技能树" key="skills">
                              <TrophyOutlined onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/skills/${pet.id}`);
                              }} />
                            </Tooltip>,
                            <Tooltip title="状态监控" key="state">
                              <BarChartOutlined onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/state/${pet.id}`);
                              }} />
                            </Tooltip>
                          ]}
                        >
                          <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            <div style={{ textAlign: 'center' }}>
                              <Badge 
                                status={isActive ? 'success' : 'default'} 
                                offset={[-8, 8]}
                              >
                                <Avatar
                                  size={48}
                                  icon={<RobotOutlined />}
                                  style={{
                                    backgroundColor:
                                      pet.personality?.openness > 0.7 ? '#52c41a' :
                                      pet.personality?.extraversion > 0.7 ? '#1677ff' :
                                      pet.personality?.conscientiousness > 0.7 ? '#722ed1' : '#faad14',
                                  }}
                                />
                              </Badge>
                            </div>
                            
                            <div style={{ textAlign: 'center' }}>
                              <Title level={5} style={{ margin: 0 }}>
                                {pet.name}
                              </Title>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {pet.species || '默认物种'} • Lv.{pet.evolutionLevel || 1}
                              </Text>
                            </div>
                            
                            {/* 状态指示器 */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                              <Tooltip title={`健康: ${Math.round((pet.state?.health || 0) * 100)}%`}>
                                <Tag color={healthStatus} icon={<HeartOutlined />}>
                                  {Math.round((pet.state?.health || 0) * 100)}%
                                </Tag>
                              </Tooltip>
                              <Tooltip title={`精力: ${Math.round((pet.state?.energy || 0) * 100)}%`}>
                                <Tag color="blue" icon={<ThunderboltOutlined />}>
                                  {Math.round((pet.state?.energy || 0) * 100)}%
                                </Tag>
                              </Tooltip>
                              <Tooltip title={`快乐: ${Math.round((pet.state?.happiness || 0) * 100)}%`}>
                                <Tag color="orange" icon={<SmileOutlined />}>
                                  {Math.round((pet.state?.happiness || 0) * 100)}%
                                </Tag>
                              </Tooltip>
                            </div>
                            
                            <div style={{ fontSize: 11, color: '#999', textAlign: 'center' }}>
                              {pet.skills?.length || 0} 个技能 • 
                              {isActive ? ' 7天内活跃' : ' 非活跃状态'}
                            </div>
                          </Space>
                        </Card>
                      </Col>
                    );
                  })}
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
