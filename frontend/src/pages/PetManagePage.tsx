import React, { useEffect, useState } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Button, 
  Table, 
  Tag, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message,
  Avatar,
  Tooltip,
  Progress,
  Typography
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  RobotOutlined,
  MessageOutlined,
  SettingOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../store';
import type { AppDispatch } from '../store';
import { 
  fetchUserPetsAsync, 
  createPetAsync, 
  updatePetAsync, 
  deletePetAsync 
} from '../store/slices/petSlice';
import { MainLayout } from '../components/Layout';
import type { Pet } from '../store/slices/petSlice';

const { Title, Text } = Typography;
const { Option } = Select;

interface PetFormData {
  name: string;
  species: string;
  personality: string;
  description?: string;
}

const PetManagePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { pets, isLoading } = useSelector((state: RootState) => state.pet);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchUserPetsAsync(user.id));
    }
  }, [dispatch, user?.id]);

  // 创建宠物
  const handleCreatePet = async (values: PetFormData) => {
    try {
      const petData = {
        ...values,
        userId: user!.id,
        status: 'active' as const,
        level: 1,
        experience: 0
      };
      
      const result = await dispatch(createPetAsync(petData));
      if (createPetAsync.fulfilled.match(result)) {
        message.success('宠物创建成功！');
        setCreateModalVisible(false);
        form.resetFields();
      }
    } catch (error) {
      message.error('创建失败，请重试');
    }
  };

  // 编辑宠物
  const handleEditPet = async (values: PetFormData) => {
    if (!editingPet) return;

    try {
      const result = await dispatch(updatePetAsync({
        id: editingPet.id,
        ...values
      }));
      
      if (updatePetAsync.fulfilled.match(result)) {
        message.success('宠物信息更新成功！');
        setEditModalVisible(false);
        setEditingPet(null);
        form.resetFields();
      }
    } catch (error) {
      message.error('更新失败，请重试');
    }
  };

  // 删除宠物
  const handleDeletePet = (pet: Pet) => {
    Modal.confirm({
      title: '删除宠物',
      content: `确定要删除宠物 "${pet.name}" 吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await dispatch(deletePetAsync(pet.id));
          if (deletePetAsync.fulfilled.match(result)) {
            message.success('宠物已删除');
          }
        } catch (error) {
          message.error('删除失败，请重试');
        }
      },
    });
  };

  // 打开编辑弹窗
  const openEditModal = (pet: Pet) => {
    setEditingPet(pet);
    form.setFieldsValue({
      name: pet.name,
      species: pet.species,
      personality: pet.personality?.dominantTrait,
      description: pet.description
    });
    setEditModalVisible(true);
  };

  // 表格列定义
  const columns = [
    {
      title: '宠物',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Pet) => (
        <Space>
          <Avatar 
            icon={<RobotOutlined />}
            style={{ 
              backgroundColor: record.personality?.dominantTrait === 'friendly' ? '#52c41a' :
                               record.personality?.dominantTrait === 'curious' ? '#1677ff' :
                               record.personality?.dominantTrait === 'calm' ? '#722ed1' : '#faad14'
            }}
          />
          <div>
            <div style={{ fontWeight: 500 }}>{name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.species || '默认物种'}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: number) => (
        <Tag color="blue">Lv.{level || 1}</Tag>
      ),
    },
    {
      title: '经验值',
      dataIndex: 'experience',
      key: 'experience',
      width: 120,
      render: (experience: number, record: Pet) => {
        const currentExp = experience || 0;
        const nextLevelExp = (record.level || 1) * 100;
        const progress = (currentExp / nextLevelExp) * 100;
        
        return (
          <Tooltip title={`${currentExp}/${nextLevelExp}`}>
            <Progress 
              percent={progress} 
              size="small" 
              format={() => `${currentExp}`}
            />
          </Tooltip>
        );
      },
    },
    {
      title: '个性',
      dataIndex: 'personality',
      key: 'personality',
      render: (personality: any) => {
        const trait = personality?.dominantTrait || '平衡';
        const colors = {
          friendly: 'green',
          curious: 'blue',
          calm: 'purple',
          playful: 'orange',
          平衡: 'default'
        };
        return (
          <Tag color={colors[trait as keyof typeof colors] || 'default'}>
            {trait}
          </Tag>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status === 'active' ? '活跃' : '休眠'}
        </Tag>
      ),
    },
    {
      title: '最后互动',
      dataIndex: 'lastInteraction',
      key: 'lastInteraction',
      render: (lastInteraction: string) => {
        if (!lastInteraction) return <Text type="secondary">从未</Text>;
        
        const hours = Math.floor((Date.now() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60));
        return (
          <Text type="secondary">
            {hours < 1 ? '刚刚' : 
             hours < 24 ? `${hours}小时前` : 
             `${Math.floor(hours / 24)}天前`}
          </Text>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record: Pet) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => navigate(`/pets/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="开始对话">
            <Button 
              type="text" 
              icon={<MessageOutlined />} 
              onClick={() => navigate(`/chat/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => handleDeletePet(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <MainLayout>
      <div style={{ padding: '24px' }}>
        {/* 头部 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 24 
        }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              宠物管理
            </Title>
            <Text type="secondary">
              管理您的AI宠物，查看成长状态和互动记录
            </Text>
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建新宠物
          </Button>
        </div>

        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1677ff' }}>
                  {pets.length}
                </div>
                <div style={{ color: '#999' }}>总宠物数</div>
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                  {pets.filter(pet => pet.status === 'active').length}
                </div>
                <div style={{ color: '#999' }}>活跃宠物</div>
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>
                  {Math.round(pets.reduce((sum, pet) => sum + (pet.level || 1), 0) / pets.length) || 0}
                </div>
                <div style={{ color: '#999' }}>平均等级</div>
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>
                  {pets.reduce((sum, pet) => sum + (pet.conversationCount || 0), 0)}
                </div>
                <div style={{ color: '#999' }}>总对话数</div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 宠物列表 */}
        <Card>
          <Table
            columns={columns}
            dataSource={pets}
            loading={isLoading}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 个宠物`,
            }}
          />
        </Card>

        {/* 创建宠物弹窗 */}
        <Modal
          title="创建新宠物"
          open={createModalVisible}
          onCancel={() => {
            setCreateModalVisible(false);
            form.resetFields();
          }}
          onOk={() => form.submit()}
          okText="创建"
          cancelText="取消"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreatePet}
          >
            <Form.Item
              name="name"
              label="宠物名称"
              rules={[
                { required: true, message: '请输入宠物名称' },
                { max: 20, message: '名称不能超过20个字符' }
              ]}
            >
              <Input placeholder="给您的宠物起个名字" />
            </Form.Item>

            <Form.Item
              name="species"
              label="物种类型"
              rules={[{ required: true, message: '请选择物种类型' }]}
            >
              <Select placeholder="选择宠物物种">
                <Option value="cat">猫咪</Option>
                <Option value="dog">小狗</Option>
                <Option value="rabbit">兔子</Option>
                <Option value="bird">小鸟</Option>
                <Option value="dragon">小龙</Option>
                <Option value="custom">自定义</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="personality"
              label="初始个性"
              rules={[{ required: true, message: '请选择初始个性' }]}
            >
              <Select placeholder="选择宠物的初始个性倾向">
                <Option value="friendly">友好型</Option>
                <Option value="curious">好奇型</Option>
                <Option value="calm">冷静型</Option>
                <Option value="playful">活泼型</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="description"
              label="描述"
            >
              <Input.TextArea 
                placeholder="描述您的宠物特点（可选）"
                rows={3}
                maxLength={200}
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* 编辑宠物弹窗 */}
        <Modal
          title="编辑宠物信息"
          open={editModalVisible}
          onCancel={() => {
            setEditModalVisible(false);
            setEditingPet(null);
            form.resetFields();
          }}
          onOk={() => form.submit()}
          okText="保存"
          cancelText="取消"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleEditPet}
          >
            <Form.Item
              name="name"
              label="宠物名称"
              rules={[
                { required: true, message: '请输入宠物名称' },
                { max: 20, message: '名称不能超过20个字符' }
              ]}
            >
              <Input placeholder="给您的宠物起个名字" />
            </Form.Item>

            <Form.Item
              name="species"
              label="物种类型"
              rules={[{ required: true, message: '请选择物种类型' }]}
            >
              <Select placeholder="选择宠物物种">
                <Option value="cat">猫咪</Option>
                <Option value="dog">小狗</Option>
                <Option value="rabbit">兔子</Option>
                <Option value="bird">小鸟</Option>
                <Option value="dragon">小龙</Option>
                <Option value="custom">自定义</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="description"
              label="描述"
            >
              <Input.TextArea 
                placeholder="描述您的宠物特点（可选）"
                rows={3}
                maxLength={200}
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </MainLayout>
  );
};

export default PetManagePage;