import React from 'react';
import { Form, Input, Button, Space, App } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { registerAsync } from '../../store/slices/authSlice';
import type { AppDispatch } from '../../store';

interface RegisterFormValues {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);
  const { message } = App.useApp();

  const onFinish = async (values: RegisterFormValues) => {
    try {
      const { email, password, displayName } = values;
      const result = await dispatch(registerAsync({ email, password, displayName }));
      if (registerAsync.fulfilled.match(result)) {
        message.success('注册成功！');
      } else {
        message.error(error || '注册失败，请稍后重试');
      }
    } catch {
      message.error('注册过程中发生错误');
    }
  };

  return (
    <Form
      form={form}
      name="register"
      onFinish={onFinish}
      autoComplete="off"
      layout="vertical"
      size="large"
    >
      <Form.Item
        name="displayName"
        label="昵称"
        rules={[
          { required: true, message: '请输入昵称!' },
          { min: 2, message: '昵称至少2个字符!' },
          { max: 20, message: '昵称最多20个字符!' }
        ]}
      >
        <Input 
          prefix={<UserOutlined />} 
          placeholder="请输入昵称" 
        />
      </Form.Item>

      <Form.Item
        name="email"
        label="邮箱"
        rules={[
          { required: true, message: '请输入邮箱地址!' },
          { type: 'email', message: '请输入有效的邮箱地址!' }
        ]}
      >
        <Input 
          prefix={<MailOutlined />} 
          placeholder="请输入邮箱地址" 
        />
      </Form.Item>

      <Form.Item
        name="password"
        label="密码"
        rules={[
          { required: true, message: '请输入密码!' },
          { min: 6, message: '密码至少6位字符!' },
          { pattern: /^(?=.*[a-zA-Z])(?=.*\d)/, message: '密码必须包含字母和数字!' }
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="请输入密码"
        />
      </Form.Item>

      <Form.Item
        name="confirmPassword"
        label="确认密码"
        dependencies={['password']}
        rules={[
          { required: true, message: '请确认密码!' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('两次输入的密码不一致!'));
            },
          }),
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="请再次输入密码"
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
          注册
        </Button>
        
        {onSwitchToLogin && (
          <Space style={{ width: '100%', justifyContent: 'center' }}>
            <span>已有账号？</span>
            <Button type="link" onClick={onSwitchToLogin} style={{ padding: 0 }}>
              立即登录
            </Button>
          </Space>
        )}
      </Form.Item>
    </Form>
  );
};

export default RegisterForm;