import React from 'react';
import { Form, Input, Select, Button, Modal, message, Upload } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { createPetAsync } from '../../store/slices/petSlice';
import type { AppDispatch } from '../../store';

const { Option } = Select;

interface PetFormValues {
  name: string;
  species: string;
  avatar?: string;
}

interface PetFormProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
}

const PetForm: React.FC<PetFormProps> = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading } = useSelector((state: RootState) => state.pet);

  const speciesOptions = [
    { value: 'cat', label: '猫咪' },
    { value: 'dog', label: '小狗' },
    { value: 'rabbit', label: '兔子' },
    { value: 'bird', label: '小鸟' },
    { value: 'fish', label: '小鱼' },
    { value: 'dragon', label: '小龙' },
  ];

  const onFinish = async (values: PetFormValues) => {
    try {
      const result = await dispatch(createPetAsync(values));
      if (createPetAsync.fulfilled.match(result)) {
        message.success('宠物创建成功！');
        form.resetFields();
        onSuccess?.();
        onCancel();
      } else {
        message.error('创建失败，请稍后重试');
      }
    } catch (err) {
      message.error('创建过程中发生错误');
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="创建新宠物"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        autoComplete="off"
      >
        <Form.Item
          name="name"
          label="宠物名称"
          rules={[
            { required: true, message: '请输入宠物名称!' },
            { min: 2, message: '名称至少2个字符!' },
            { max: 20, message: '名称最多20个字符!' }
          ]}
        >
          <Input placeholder="给你的宠物起个名字" />
        </Form.Item>

        <Form.Item
          name="species"
          label="宠物种类"
          rules={[{ required: true, message: '请选择宠物种类!' }]}
        >
          <Select placeholder="选择宠物种类">
            {speciesOptions.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="avatar"
          label="宠物头像"
        >
          <Upload
            name="avatar"
            listType="picture-card"
            maxCount={1}
            beforeUpload={() => false}
          >
            <div>
              <PlusOutlined />
              <div style={{ marginTop: 8 }}>上传头像</div>
            </div>
          </Upload>
        </Form.Item>

        <Form.Item>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={handleCancel}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={isLoading}>
              创建宠物
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PetForm;