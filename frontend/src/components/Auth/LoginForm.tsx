import React from 'react';
import { Form, Input, Button, Space, App } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { loginAsync } from '../../store/slices/authSlice';
import type { AppDispatch } from '../../store';

interface LoginFormValues {
  email: string;
  password: string;
}

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);
  const { message } = App.useApp();

  const onFinish = async (values: LoginFormValues) => {
    try {
      const result = await dispatch(loginAsync(values));
      if (loginAsync.fulfilled.match(result)) {
        message.success('登录成功！');
      } else {
        message.error(error || '登录失败，请检查用户名和密码');
      }
    } catch {
      message.error('登录过程中发生错误');
    }
  };

  return (
    <Form
      form={form}
      name="login"
      onFinish={onFinish}
      autoComplete="off"
      layout="vertical"
      size="large"
    >
      <Form.Item
        name="email"
        label="邮箱"
        rules={[
          { required: true, message: '请输入邮箱地址!' },
          { type: 'email', message: '请输入有效的邮箱地址!' }
        ]}
      >
        <Input 
          prefix={<UserOutlined />} 
          placeholder="请输入邮箱地址" 
        />
      </Form.Item>

      <Form.Item
        name="password"
        label="密码"
        rules={[
          { required: true, message: '请输入密码!' },
          { min: 6, message: '密码至少6位字符!' }
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="请输入密码"
        />
      </Form.Item>

      <Form.Item>
        <Button 
          type="primary" 
          htmlType="submit" 
          loading={isLoading}
          block
          style={{ marginBottom: 16 }}
        >
          登录
        </Button>
        
        {onSwitchToRegister && (
          <Space style={{ width: '100%', justifyContent: 'center' }}>
            <span>还没有账号？</span>
            <Button type="link" onClick={onSwitchToRegister} style={{ padding: 0 }}>
              立即注册
            </Button>
          </Space>
        )}
      </Form.Item>
    </Form>
  );
};

export default LoginForm;