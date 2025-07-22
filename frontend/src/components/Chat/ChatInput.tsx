import React, { useState, useRef } from 'react';
import { Sender } from '@ant-design/x';
import { message, Upload } from 'antd';
import { PaperClipOutlined, SendOutlined, StopOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onCancel,
  disabled = false,
  placeholder = '输入消息...'
}) => {
  const [inputValue, setInputValue] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const senderRef = useRef<any>(null);
  
  const { isSending, connectionStatus } = useSelector((state: RootState) => state.chat);

  // 发送消息
  const handleSubmit = (content: string) => {
    if (!content.trim()) return;
    
    if (connectionStatus !== 'connected') {
      message.error('连接已断开，请稍后重试');
      return;
    }

    onSendMessage(content);
    setInputValue('');
    setAttachments([]);
  };

  // 取消发送
  const handleCancel = () => {
    onCancel?.();
    setInputValue('');
  };

  // 文件上传处理
  const handleFileUpload = (file: File) => {
    // 检查文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      message.error('文件大小不能超过10MB');
      return false;
    }

    // 检查文件类型
    const allowedTypes = ['image/', 'text/', 'application/pdf'];
    const isAllowed = allowedTypes.some(type => file.type.startsWith(type));
    
    if (!isAllowed) {
      message.error('仅支持图片、文本和PDF文件');
      return false;
    }

    setAttachments(prev => [...prev, file]);
    message.success(`已添加文件: ${file.name}`);
    return false; // 阻止自动上传
  };

  // 移除附件
  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // 键盘快捷键处理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Enter 或 Cmd+Enter 发送
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(inputValue);
    }
    
    // Escape 取消
    if (e.key === 'Escape' && isSending) {
      e.preventDefault();
      handleCancel();
    }
  };

  // 自定义操作按钮
  const customActions = (_oriNode: React.ReactNode, { components }: any) => {
    const { SendButton } = components;
    
    return (
      <>
        {/* 附件上传 */}
        <Upload
          beforeUpload={handleFileUpload}
          showUploadList={false}
          multiple
        >
          <PaperClipOutlined 
            style={{ 
              fontSize: 16, 
              color: '#999',
              cursor: 'pointer',
              padding: '4px',
              marginRight: 8
            }} 
          />
        </Upload>
        
        {/* 发送/取消按钮 */}
        {isSending ? (
          <StopOutlined 
            onClick={handleCancel}
            style={{ 
              fontSize: 16, 
              color: '#ff4d4f',
              cursor: 'pointer',
              padding: '4px'
            }}
          />
        ) : (
          <SendButton 
            icon={<SendOutlined />}
            disabled={disabled || !inputValue.trim()}
          />
        )}
      </>
    );
  };

  // 渲染附件列表
  const renderAttachments = () => {
    if (attachments.length === 0) return null;

    return (
      <div style={{ 
        padding: '8px 0',
        borderTop: '1px solid #f0f0f0',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8
      }}>
        {attachments.map((file, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#f5f5f5',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 12
            }}
          >
            <PaperClipOutlined style={{ marginRight: 4 }} />
            <span>{file.name}</span>
            <span 
              onClick={() => handleRemoveAttachment(index)}
              style={{ 
                marginLeft: 8, 
                cursor: 'pointer',
                color: '#ff4d4f'
              }}
            >
              ×
            </span>
          </div>
        ))}
      </div>
    );
  };

  const isInputDisabled = disabled || 
    connectionStatus !== 'connected';

  const currentPlaceholder = connectionStatus === 'connecting' 
    ? '连接中...' 
    : connectionStatus !== 'connected'
    ? '连接已断开'
    : placeholder;

  return (
    <div>
      {renderAttachments()}
      <Sender
        ref={senderRef}
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        onCancel={isSending ? handleCancel : () => {}}
        onKeyDown={handleKeyDown}
        loading={isSending}
        disabled={isInputDisabled}
        placeholder={currentPlaceholder}
        autoSize={{ minRows: 1, maxRows: 6 }}
        actions={customActions}
        allowSpeech={false} // 暂时禁用语音输入
        style={{
          borderRadius: 8,
        }}
      />
    </div>
  );
};

export default ChatInput;