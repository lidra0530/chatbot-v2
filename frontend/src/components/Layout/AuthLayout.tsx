import React from 'react';
import { Layout, Card, Row, Col, Space } from 'antd';
import { RobotOutlined } from '@ant-design/icons';

const { Content } = Layout;

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title = 'AI宠物系统' }) => {
  return (
    <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '50px' }}>
        <Row justify="center" style={{ width: '100%' }}>
          <Col xs={22} sm={16} md={12} lg={8} xl={6}>
            <Card
              style={{
                borderRadius: 16,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                background: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(12px)',
                border: 'none',
              }}
              styles={{ body: { padding: '40px 32px' } }}
            >
              {/* 应用Logo和标题 */}
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <Space direction="vertical" size="large">
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
                    <RobotOutlined style={{ 
                      fontSize: 28, 
                      color: '#fff' 
                    }} />
                  </div>
                  <div>
                    <h1 style={{ 
                      margin: 0, 
                      fontSize: 24, 
                      fontWeight: 600,
                      color: '#1f1f1f'
                    }}>
                      {title}
                    </h1>
                    <p style={{ 
                      margin: '4px 0 0 0', 
                      color: '#666',
                      fontSize: 14
                    }}>
                      智能虚拟宠物伴侣
                    </p>
                  </div>
                </Space>
              </div>
              
              {/* 认证表单内容 */}
              {children}
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default AuthLayout;