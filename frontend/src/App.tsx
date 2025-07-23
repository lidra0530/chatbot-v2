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
    console.log('App startup - token from localStorage:', token);
    
    // 检查token是否有效（不是'undefined'字符串且有实际值）
    if (token && token !== 'undefined' && token !== 'null') {
      dispatch(validateTokenAsync(token));
    } else {
      // 清理无效的token
      localStorage.removeItem('token');
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

        {/* 聊天相关路由 */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Navigate to="/pets" replace />
            </ProtectedRoute>
          }
        />

        {/* 个性分析路由 */}
        <Route
          path="/personality"
          element={
            <ProtectedRoute>
              <Navigate to="/pets" replace />
            </ProtectedRoute>
          }
        />

        {/* 技能树路由 */}
        <Route
          path="/skills"
          element={
            <ProtectedRoute>
              <Navigate to="/pets" replace />
            </ProtectedRoute>
          }
        />

        {/* 状态监控路由 */}
        <Route
          path="/state"
          element={
            <ProtectedRoute>
              <Navigate to="/pets" replace />
            </ProtectedRoute>
          }
        />

        {/* 个人资料路由 */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Navigate to="/settings" replace />
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
