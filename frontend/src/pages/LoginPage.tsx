import React, { useState, useEffect } from 'react';
import { Layout, Card, Space, Typography, Button, Tabs, App } from 'antd';
import { RobotOutlined, UserOutlined, UserAddOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { LoginForm, RegisterForm } from '../components/Auth';

const { Content } = Layout;
const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('login');
  const navigate = useNavigate();
  const location = useLocation();
  const { notification } = App.useApp();
  const { isAuthenticated, error } = useSelector((state: RootState) => state.auth);

  // 如果已经登录，重定向到首页
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // 显示认证错误
  useEffect(() => {
    if (error) {
      notification.error({
        message: '认证失败',
        description: error,
        placement: 'topRight',
      });
    }
  }, [error, notification]);

  // 处理切换到注册
  const handleSwitchToRegister = () => {
    setActiveTab('register');
  };

  // 处理切换到登录
  const handleSwitchToLogin = () => {
    setActiveTab('login');
  };

  const tabItems = [
    {
      key: 'login',
      label: (
        <span>
          <UserOutlined />
          登录
        </span>
      ),
      children: <LoginForm onSwitchToRegister={handleSwitchToRegister} />
    },
    {
      key: 'register',
      label: (
        <span>
          <UserAddOutlined />
          注册
        </span>
      ),
      children: <RegisterForm onSwitchToLogin={handleSwitchToLogin} />
    }
  ];

  return (
    <App>
      <Layout
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Content
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
          }}
        >
          <Card
            style={{
              width: '100%',
              maxWidth: 420,
              borderRadius: 16,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
              background: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(12px)',
            }}
            styles={{ body: { padding: '32px' } }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* 头部Logo和标题 */}
              <div style={{ textAlign: 'center' }}>
                <Space direction="vertical" size="middle">
                  <div style={{
                    width: 64,
                    height: 64,
                    margin: '0 auto',
                    background: 'linear-gradient(135deg, #1890ff, #722ed1)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
                  }}>
                    <RobotOutlined style={{ fontSize: 28, color: '#fff' }} />
                  </div>
                  <div>
                    <Title level={2} style={{ margin: 0, color: '#1f1f1f' }}>
                      AI宠物系统
                    </Title>
                    <Text type="secondary">智能虚拟宠物伴侣</Text>
                  </div>
                </Space>
              </div>

              {/* 登录/注册表单 */}
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                centered
                size="large"
              />

              {/* 底部信息 */}
              <div style={{ textAlign: 'center', paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                <Space direction="vertical" size="small">
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    体验个性化AI宠物的魅力
                  </Text>
                  <Space>
                    <Button type="link" size="small" onClick={() => navigate('/about')}>
                      关于我们
                    </Button>
                    <Button type="link" size="small" onClick={() => navigate('/help')}>
                      帮助中心
                    </Button>
                  </Space>
                </Space>
              </div>
            </Space>
          </Card>
        </Content>
      </Layout>
    </App>
  );
};

export default LoginPage;
