import React, { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { store } from './store';
import type { AppDispatch } from './store';
import { validateTokenAsync } from './store/slices/authSlice';
import { ProtectedRoute } from './components/Route';
import {
  LoginPage,
  HomePage,
  PetManagePage,
  ChatPage,
  SettingsPage,
} from './pages';

// Antd主题配置
const antdTheme = {
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 8,
    colorBgContainer: '#ffffff',
  },
};

// 内部组件用于处理token恢复
const AppContent: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // 在应用启动时从localStorage恢复token
    const token = localStorage.getItem('token');
    if (token) {
      dispatch(validateTokenAsync(token));
    }
  }, [dispatch]);

  return (
    <Router>
      <Routes>
        {/* 公开路由 */}
        <Route
          path="/login"
          element={
            <ProtectedRoute requireAuth={false}>
              <LoginPage />
            </ProtectedRoute>
          }
        />

        {/* 受保护的路由 */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pets"
          element={
            <ProtectedRoute>
              <PetManagePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat/:petId"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* 404重定向 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ConfigProvider locale={zhCN} theme={antdTheme}>
        <AntApp>
          <AppContent />
        </AntApp>
      </ConfigProvider>
    </Provider>
  );
};

export default App;
