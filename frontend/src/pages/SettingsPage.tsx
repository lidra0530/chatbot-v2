import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Form,
  Input,
  Switch,
  Button,
  Space,
  Typography,
  Select,
  Slider,
  App,
  Modal,
  Alert,
} from 'antd';
import {
  UserOutlined,
  BellOutlined,
  SecurityScanOutlined,
  DeleteOutlined,
  ExportOutlined,
  ImportOutlined,
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import type { AppDispatch } from '../store';
import { logoutAsync } from '../store/slices/authSlice';
import { MainLayout } from '../components/Layout';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface UserSettings {
  displayName: string;
  email: string;
  bio: string;
  notifications: {
    petUpdates: boolean;
    systemMessages: boolean;
    emailNotifications: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private';
    dataCollection: boolean;
  };
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: 'zh-CN' | 'en-US';
    chatSpeed: number;
    autoSave: boolean;
  };
}

const SettingsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // 初始化表单数据
  const initialValues: UserSettings = {
    displayName: user?.displayName || '',
    email: user?.email || '',
    bio: user?.bio || '',
    notifications: {
      petUpdates: true,
      systemMessages: true,
      emailNotifications: false,
    },
    privacy: {
      profileVisibility: 'private',
      dataCollection: true,
    },
    preferences: {
      theme: 'light',
      language: 'zh-CN',
      chatSpeed: 50,
      autoSave: true,
    },
  };

  // 保存设置
  const handleSaveSettings = async (values: UserSettings) => {
    setLoading(true);
    try {
      // TODO: 实现更新用户信息API
      message.success('设置保存成功！');
      // 这里可以保存其他偏好设置到localStorage或后端
      localStorage.setItem(
        'userPreferences',
        JSON.stringify({
          notifications: values.notifications,
          privacy: values.privacy,
          preferences: values.preferences,
        })
      );
    } catch (error) {
      message.error('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 删除账户
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== user?.email) {
      message.error('邮箱地址不匹配');
      return;
    }

    try {
      // 这里应该调用删除账户的API
      message.success('账户删除成功');
      dispatch(logoutAsync());
    } catch (error) {
      message.error('删除失败，请重试');
    }
  };

  // 导出数据
  const handleExportData = () => {
    // 模拟导出数据
    const userData = {
      profile: user,
      settings: form.getFieldsValue(),
      exportDate: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(userData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `chatbot-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    message.success('数据导出成功');
  };

  return (
    <MainLayout>
      <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
        <Title level={2}>账户设置</Title>
        <Paragraph type="secondary">
          管理您的个人信息、隐私设置和应用偏好
        </Paragraph>

        <Form
          form={form}
          layout="vertical"
          initialValues={initialValues}
          onFinish={handleSaveSettings}
        >
          {/* 个人信息 */}
          <Card
            title={
              <Space>
                <UserOutlined />
                <span>个人信息</span>
              </Space>
            }
            style={{ marginBottom: 24 }}
          >
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="displayName"
                  label="显示名称"
                  rules={[
                    { required: true, message: '请输入显示名称' },
                    { max: 50, message: '名称不能超过50个字符' },
                  ]}
                >
                  <Input placeholder="输入显示名称" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="email"
                  label="邮箱地址"
                  rules={[
                    { required: true, message: '请输入邮箱地址' },
                    { type: 'email', message: '请输入有效的邮箱地址' },
                  ]}
                >
                  <Input placeholder="输入邮箱地址" disabled />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="bio" label="个人简介">
              <Input.TextArea
                placeholder="介绍一下自己（可选）"
                rows={3}
                maxLength={200}
                showCount
              />
            </Form.Item>
          </Card>

          {/* 通知设置 */}
          <Card
            title={
              <Space>
                <BellOutlined />
                <span>通知设置</span>
              </Space>
            }
            style={{ marginBottom: 24 }}
          >
            <Form.Item
              name={['notifications', 'petUpdates']}
              valuePropName="checked"
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div>宠物状态更新</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    当宠物升级、解锁新技能时通知您
                  </Text>
                </div>
                <Switch />
              </div>
            </Form.Item>

            <Form.Item
              name={['notifications', 'systemMessages']}
              valuePropName="checked"
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div>系统消息</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    接收系统维护、功能更新等消息
                  </Text>
                </div>
                <Switch />
              </div>
            </Form.Item>

            <Form.Item
              name={['notifications', 'emailNotifications']}
              valuePropName="checked"
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div>邮件通知</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    通过邮件接收重要通知
                  </Text>
                </div>
                <Switch />
              </div>
            </Form.Item>
          </Card>

          {/* 隐私设置 */}
          <Card
            title={
              <Space>
                <SecurityScanOutlined />
                <span>隐私与安全</span>
              </Space>
            }
            style={{ marginBottom: 24 }}
          >
            <Form.Item
              name={['privacy', 'profileVisibility']}
              label="个人资料可见性"
            >
              <Select>
                <Option value="public">公开</Option>
                <Option value="private">仅自己可见</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name={['privacy', 'dataCollection']}
              valuePropName="checked"
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div>数据收集与分析</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    允许收集匿名使用数据以改善服务
                  </Text>
                </div>
                <Switch />
              </div>
            </Form.Item>
          </Card>

          {/* 应用偏好 */}
          <Card title="应用偏好" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name={['preferences', 'theme']} label="主题">
                  <Select>
                    <Option value="light">浅色</Option>
                    <Option value="dark">深色</Option>
                    <Option value="auto">跟随系统</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name={['preferences', 'language']} label="语言">
                  <Select>
                    <Option value="zh-CN">中文（简体）</Option>
                    <Option value="en-US">English</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name={['preferences', 'chatSpeed']} label="对话速度">
              <Slider
                min={10}
                max={100}
                marks={{
                  10: '慢',
                  50: '中等',
                  100: '快',
                }}
              />
            </Form.Item>

            <Form.Item
              name={['preferences', 'autoSave']}
              valuePropName="checked"
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div>自动保存对话</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    自动保存聊天记录到云端
                  </Text>
                </div>
                <Switch />
              </div>
            </Form.Item>
          </Card>

          {/* 数据管理 */}
          <Card title="数据管理" style={{ marginBottom: 24 }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Button icon={<ExportOutlined />} onClick={handleExportData}>
                  导出我的数据
                </Button>
                <Text type="secondary" style={{ marginLeft: 16 }}>
                  下载包含个人信息和宠物数据的JSON文件
                </Text>
              </div>

              <div>
                <Button icon={<ImportOutlined />} disabled>
                  导入数据
                </Button>
                <Text type="secondary" style={{ marginLeft: 16 }}>
                  从备份文件恢复数据（开发中）
                </Text>
              </div>
            </Space>
          </Card>

          {/* 危险操作 */}
          <Card title="危险操作" style={{ marginBottom: 24 }}>
            <Alert
              message="警告"
              description="以下操作将永久删除您的账户和所有相关数据，且无法恢复。"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => setDeleteModalVisible(true)}
            >
              删除账户
            </Button>
          </Card>

          {/* 保存按钮 */}
          <div style={{ textAlign: 'center' }}>
            <Space size="large">
              <Button onClick={() => form.resetFields()}>重置</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                保存设置
              </Button>
            </Space>
          </div>
        </Form>

        {/* 删除账户确认弹窗 */}
        <Modal
          title="删除账户确认"
          open={deleteModalVisible}
          onCancel={() => {
            setDeleteModalVisible(false);
            setDeleteConfirmText('');
          }}
          onOk={handleDeleteAccount}
          okText="确认删除"
          cancelText="取消"
          okType="danger"
        >
          <Alert
            message="此操作无法撤销"
            description="删除账户将永久移除您的所有数据，包括宠物、对话记录和个人设置。"
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Text>请输入您的邮箱地址确认删除：</Text>
          <Input
            placeholder={user?.email}
            value={deleteConfirmText}
            onChange={e => setDeleteConfirmText(e.target.value)}
            style={{ marginTop: 8 }}
          />
        </Modal>
      </div>
    </MainLayout>
  );
};

export default SettingsPage;
