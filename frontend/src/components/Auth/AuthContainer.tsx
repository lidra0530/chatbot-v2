import React, { useState } from 'react';
import { Tabs } from 'antd';
import { LoginOutlined, UserAddOutlined } from '@ant-design/icons';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { AuthLayout } from '../Layout';

const AuthContainer: React.FC = () => {
  const [activeTab, setActiveTab] = useState('login');

  const items = [
    {
      key: 'login',
      label: (
        <span>
          <LoginOutlined />
          登录
        </span>
      ),
      children: <LoginForm onSwitchToRegister={() => setActiveTab('register')} />,
    },
    {
      key: 'register',
      label: (
        <span>
          <UserAddOutlined />
          注册
        </span>
      ),
      children: <RegisterForm onSwitchToLogin={() => setActiveTab('login')} />,
    },
  ];

  return (
    <AuthLayout>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={items}
        centered
        size="large"
      />
    </AuthLayout>
  );
};

export default AuthContainer;