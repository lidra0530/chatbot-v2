import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { store } from './store';
import { ProtectedRoute } from './components/Route';
import { 
  LoginPage, 
  HomePage, 
  PetManagePage, 
  ChatPage, 
  SettingsPage 
} from './pages';

// Antd主题配置
const antdTheme = {
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 8,
    colorBgContainer: '#ffffff',
  },
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ConfigProvider 
        locale={zhCN}
        theme={antdTheme}
      >
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
      </ConfigProvider>
    </Provider>
  );
};

export default App;