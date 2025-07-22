import React from 'react';
import { Layout, Card, Row, Col } from 'antd';

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
              title={
                <div style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold', color: '#1677ff' }}>
                  {title}
                </div>
              }
              style={{
                borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                border: 'none',
              }}
            >
              {children}
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default AuthLayout;