import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Space } from 'antd';
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined, 
  UserOutlined, 
  LogoutOutlined, 
  SettingOutlined,
  HomeOutlined,
  RobotOutlined,
  MessageOutlined,
  HeartOutlined,
  TrophyOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import type { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';

const { Header, Sider, Content } = Layout;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  // 根据当前路径确定选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path.startsWith('/pets')) return 'pets';
    if (path.startsWith('/chat')) return 'chat';
    if (path.startsWith('/personality')) return 'personality';
    if (path.startsWith('/skills')) return 'skills';
    if (path.startsWith('/state')) return 'state';
    if (path.startsWith('/settings')) return 'settings';
    return 'home';
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: '首页',
      onClick: () => navigate('/'),
    },
    {
      key: 'pets',
      icon: <RobotOutlined />,
      label: '我的宠物',
      onClick: () => navigate('/pets'),
    },
    {
      key: 'chat',
      icon: <MessageOutlined />,
      label: '对话聊天',
      onClick: () => navigate('/chat'),
    },
    {
      key: 'personality',
      icon: <HeartOutlined />,
      label: '个性分析',
      onClick: () => navigate('/personality'),
    },
    {
      key: 'skills',
      icon: <TrophyOutlined />,
      label: '技能树',
      onClick: () => navigate('/skills'),
    },
    {
      key: 'state',
      icon: <BarChartOutlined />,
      label: '状态监控',
      onClick: () => navigate('/state'),
    },
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => dispatch(logout()),
    },
  ];

  if (!isAuthenticated) {
    return <div>{children}</div>;
  }

  return (
    <Layout style={{ minHeight: '100vh', width: '100vw' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light">
        <div style={{ 
          height: 32, 
          margin: 16, 
          background: 'rgba(0, 0, 0, 0.1)', 
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#1677ff'
        }}>
          {collapsed ? 'AI' : 'AI宠物'}
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{ 
          padding: '0 16px', 
          background: '#fff', 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
          <Space>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <span>{user?.displayName || user?.email}</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: '#fff',
            borderRadius: 8,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;