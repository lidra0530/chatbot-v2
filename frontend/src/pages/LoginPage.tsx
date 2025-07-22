import React from 'react';
import { Layout, Card, Space, Typography } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { LoginForm } from '../components/Auth';

const { Content } = Layout;
const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  return (
    <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Content style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px'
      }}>
        <Card 
          style={{ 
            width: '100%',
            maxWidth: 400,
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
          }}
          bodyStyle={{ padding: '40px 32px' }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 头部 */}
            <div style={{ textAlign: 'center' }}>
              <Space direction="vertical" size="middle">
                <RobotOutlined style={{ fontSize: 48, color: '#1677ff' }} />
                <Title level={2} style={{ margin: 0, color: '#262626' }}>
                  智能宠物助手
                </Title>
                <Text type="secondary">
                  欢迎来到个性化AI宠物世界
                </Text>
              </Space>
            </div>

            {/* 登录表单 */}
            <LoginForm />

            {/* 底部提示 */}
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                还没有账户？ 
                <a href="/register" style={{ marginLeft: 4 }}>
                  立即注册
                </a>
              </Text>
            </div>
          </Space>
        </Card>
      </Content>
    </Layout>
  );
};

export default LoginPage;