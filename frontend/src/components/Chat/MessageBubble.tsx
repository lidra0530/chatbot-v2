import React from 'react';
import { Bubble } from '@ant-design/x';
import { Avatar, Tag, Space, Tooltip } from 'antd';
import { UserOutlined, RobotOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { Message } from '../../store/slices/chatSlice';

interface MessageBubbleProps {
  message: Message;
  loading?: boolean;
  typing?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  loading = false, 
  typing = false 
}) => {
  const isUser = message.role === 'user';
  
  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // 渲染消息元数据
  const renderMetadata = () => {
    if (!message.metadata) return null;

    const { personalityScore, stateChanges, skillsGained, processingTime } = message.metadata;
    
    return (
      <Space size={4} style={{ marginTop: 4 }}>
        {personalityScore && (
          <Tooltip title={`个性分数: ${personalityScore}`}>
            <Tag color="blue" style={{ fontSize: 10 }}>
              个性 +{personalityScore}
            </Tag>
          </Tooltip>
        )}
        
        {stateChanges && Object.keys(stateChanges).length > 0 && (
          <Tooltip title={`状态变化: ${Object.entries(stateChanges).map(([key, value]) => `${key}: ${value > 0 ? '+' : ''}${value}`).join(', ')}`}>
            <Tag color="green" style={{ fontSize: 10 }}>
              状态变化
            </Tag>
          </Tooltip>
        )}
        
        {skillsGained && skillsGained.length > 0 && (
          <Tooltip title={`获得技能: ${skillsGained.join(', ')}`}>
            <Tag color="gold" style={{ fontSize: 10 }}>
              +{skillsGained.length} 技能
            </Tag>
          </Tooltip>
        )}
        
        {processingTime && (
          <Tooltip title={`处理时间: ${processingTime}ms`}>
            <Tag color="default" icon={<ClockCircleOutlined />} style={{ fontSize: 10 }}>
              {processingTime}ms
            </Tag>
          </Tooltip>
        )}
      </Space>
    );
  };

  // 渲染头部信息
  const renderHeader = () => (
    <Space size={8} style={{ fontSize: 12, color: '#999' }}>
      <span>{isUser ? '你' : 'AI助手'}</span>
      <span>{formatTime(message.timestamp)}</span>
    </Space>
  );

  // 渲染底部信息
  const renderFooter = () => {
    const metadata = renderMetadata();
    if (!metadata) return null;
    
    return (
      <div style={{ marginTop: 8 }}>
        {metadata}
      </div>
    );
  };

  return (
    <Bubble
      key={message.id}
      content={message.content}
      placement={isUser ? 'end' : 'start'}
      avatar={
        <Avatar 
          icon={isUser ? <UserOutlined /> : <RobotOutlined />}
          style={{ 
            backgroundColor: isUser ? '#1677ff' : '#52c41a' 
          }}
          size={32}
        />
      }
      header={renderHeader()}
      footer={renderFooter()}
      loading={loading}
      typing={typing}
      variant={isUser ? 'filled' : 'shadow'}
      shape="round"
      styles={{
        content: {
          backgroundColor: isUser ? '#1677ff' : '#f5f5f5',
          color: isUser ? '#fff' : '#333',
          maxWidth: '70%',
          wordBreak: 'break-word',
        },
        header: {
          padding: '4px 12px 0',
        },
        footer: {
          padding: '0 12px 4px',
        }
      }}
      classNames={{
        content: isUser ? 'user-message' : 'assistant-message'
      }}
    />
  );
};

export default MessageBubble;