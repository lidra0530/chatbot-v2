import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Row,
  Col,
  Card,
  Space,
  Typography,
  Avatar,
  Tag,
  Button,
  Spin,
  App,
} from 'antd';
import {
  ArrowLeftOutlined,
  RobotOutlined,
  SettingOutlined,
  TrophyOutlined,
  HeartOutlined,
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import type { AppDispatch } from '../store';
import { fetchPetDetailsAsync, selectPet } from '../store/slices/petSlice';
import { ChatInterface } from '../components/Chat';
import { MainLayout } from '../components/Layout';

const { Title, Text } = Typography;

// 辅助函数：获取个性特征值，处理各种可能的数据格式
const getPersonalityValue = (pet: any, trait: string): number => {
  const personality = pet?.personality;
  if (!personality) return 50;
  
  // 处理可能的嵌套格式 (如 personality.traits.openness)
  const traitValue = personality.traits ? personality.traits[trait] : personality[trait];
  
  if (traitValue == null) return 50;
  
  // 如果是0-1范围的小数，转为百分比；如果已经是0-100，直接使用
  return traitValue > 1 ? traitValue : traitValue * 100;
};

// 辅助函数：获取状态值，处理各种可能的数据格式
const getStateValue = (pet: any, stateName: string): number => {
  const state = pet?.state;
  if (!state) return 50;
  
  // 处理可能的嵌套格式 (如 state.basic.energy)
  const stateValue = state.basic ? state.basic[stateName] : state[stateName];
  
  if (stateValue == null) return 50;
  
  // 如果是0-1范围的小数，转为百分比；如果已经是0-100，直接使用
  return stateValue > 1 ? stateValue : stateValue * 100;
};

const ChatPage: React.FC = () => {
  const { petId } = useParams<{ petId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { message } = App.useApp();

  const { currentPet, isLoading } = useSelector(
    (state: RootState) => state.pet
  );
  const [chatHeight, setChatHeight] = useState(600);

  useEffect(() => {
    if (petId) {
      // First select the pet, then fetch details
      dispatch(selectPet(petId));
      dispatch(fetchPetDetailsAsync(petId));
    }
  }, [dispatch, petId]);

  // 调试：输出当前宠物数据
  useEffect(() => {
    if (currentPet) {
      console.log('Current Pet Data:', {
        name: currentPet.name,
        personality: currentPet.personality,
        state: currentPet.state,
        rawData: currentPet
      });
    }
  }, [currentPet]);

  useEffect(() => {
    // 动态计算聊天界面高度
    const updateHeight = () => {
      const windowHeight = window.innerHeight;
      const headerHeight = 64; // MainLayout header高度
      const padding = 48; // 上下padding
      const petInfoHeight = 120; // 宠物信息区域高度
      const calculatedHeight =
        windowHeight - headerHeight - padding - petInfoHeight;
      setChatHeight(Math.max(400, calculatedHeight));
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  if (isLoading || !currentPet) {
    return (
      <MainLayout>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '50vh',
          }}
        >
          <Spin size="large" />
        </div>
      </MainLayout>
    );
  }

  if (!petId) {
    message.error('宠物ID不能为空');
    navigate('/pets');
    return null;
  }

  return (
    <MainLayout>
      <div style={{ padding: '24px' }}>
        {/* 返回按钮和宠物信息 */}
        <Card style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space size="large">
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={() => navigate('/pets')}
                >
                  返回
                </Button>

                <Space size="middle">
                  <Avatar
                    size={48}
                    icon={<RobotOutlined />}
                    style={{
                      backgroundColor:
                        currentPet.personality?.openness > 0.7
                          ? '#52c41a'
                          : currentPet.personality?.extraversion > 0.7
                            ? '#1677ff'
                            : currentPet.personality?.conscientiousness > 0.7
                              ? '#722ed1'
                              : '#faad14',
                    }}
                  />
                  <div>
                    <Title level={3} style={{ margin: 0 }}>
                      {currentPet.name}
                    </Title>
                    <Space size="small">
                      <Text type="secondary">
                        {currentPet.species || '默认物种'}
                      </Text>
                      <Tag color="blue">
                        Lv.{currentPet.evolutionLevel || 1}
                      </Tag>
                      <Tag color="green">愉快</Tag>
                    </Space>
                  </div>
                </Space>
              </Space>
            </Col>

            <Col>
              <Space>
                <Button
                  icon={<TrophyOutlined />}
                  onClick={() => navigate(`/pets/${petId}/skills`)}
                >
                  技能树
                </Button>
                <Button
                  icon={<HeartOutlined />}
                  onClick={() => navigate(`/pets/${petId}/personality`)}
                >
                  个性分析
                </Button>
                <Button
                  icon={<SettingOutlined />}
                  onClick={() => navigate(`/pets/${petId}/settings`)}
                >
                  设置
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 聊天界面 */}
        <Row gutter={16}>
          <Col xs={24} lg={18}>
            <div style={{ height: chatHeight }}>
              <ChatInterface petId={petId} />
            </div>
          </Col>

          {/* 右侧信息面板 */}
          <Col xs={24} lg={6}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {/* 宠物状态 */}
              <Card title="当前状态" size="small">
                <Space
                  direction="vertical"
                  size="small"
                  style={{ width: '100%' }}
                >
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <Text>心情</Text>
                    <Tag color="green">愉快</Tag>
                  </div>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <Text>能量</Text>
                    <Text strong>
                      {Math.round(getStateValue(currentPet, 'energy'))}%
                    </Text>
                  </div>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <Text>满足度</Text>
                    <Text strong>
                      {Math.round(getStateValue(currentPet, 'happiness'))}%
                    </Text>
                  </div>
                </Space>
              </Card>

              {/* 个性特征 */}
              <Card title="个性特征" size="small">
                <Space
                  direction="vertical"
                  size="small"
                  style={{ width: '100%' }}
                >
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <Text>开放性</Text>
                    <Text strong>
                      {Math.round(getPersonalityValue(currentPet, 'openness'))}%
                    </Text>
                  </div>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <Text>外向性</Text>
                    <Text strong>
                      {Math.round(getPersonalityValue(currentPet, 'extraversion'))}%
                    </Text>
                  </div>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <Text>责任心</Text>
                    <Text strong>
                      {Math.round(getPersonalityValue(currentPet, 'conscientiousness'))}%
                    </Text>
                  </div>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <Text>宜人性</Text>
                    <Text strong>
                      {Math.round(getPersonalityValue(currentPet, 'agreeableness'))}%
                    </Text>
                  </div>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <Text>神经质</Text>
                    <Text strong>
                      {Math.round(getPersonalityValue(currentPet, 'neuroticism'))}%
                    </Text>
                  </div>
                </Space>
              </Card>

              {/* 最近解锁的技能 */}
              <Card title="最新技能" size="small">
                <div style={{ color: '#999', textAlign: 'center' }}>
                  <Text>暂无新技能</Text>
                </div>
              </Card>
            </Space>
          </Col>
        </Row>
      </div>
    </MainLayout>
  );
};

export default ChatPage;
