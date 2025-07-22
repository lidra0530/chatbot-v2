import React, { useState, useEffect } from 'react';
import { Bubble, Sender, Conversations } from '@ant-design/x';
import { Layout, Space, Spin, message as Message } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import type { AppDispatch } from '../../store';
import { 
  sendMessageAsync, 
  fetchConversationsAsync, 
  createConversationAsync,
  setCurrentConversation 
} from '../../store/slices/chatSlice';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';

const { Sider, Content } = Layout;

interface ChatInterfaceProps {
  petId: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ petId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { 
    conversations, 
    currentConversation, 
    isLoading, 
    isSending,
    connectionStatus 
  } = useSelector((state: RootState) => state.chat);
  
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (petId) {
      dispatch(fetchConversationsAsync(petId));
    }
  }, [dispatch, petId]);

  // 转换消息格式用于Bubble.List
  const bubbleItems = currentConversation?.messages?.map((msg) => ({
    key: msg.id,
    content: msg.content,
    placement: (msg.role === 'user' ? 'end' : 'start') as 'end' | 'start',
    avatar: msg.role === 'user' 
      ? { icon: <UserOutlined /> }
      : { icon: <RobotOutlined />, style: { backgroundColor: '#1677ff' } },
    loading: msg.role === 'assistant' && isSending,
    variant: (msg.role === 'user' ? 'filled' : 'shadow') as 'filled' | 'shadow',
    styles: {
      content: {
        backgroundColor: msg.role === 'user' ? '#1677ff' : '#f5f5f5',
        color: msg.role === 'user' ? '#fff' : '#333',
      }
    }
  })) || [];

  // 转换对话列表格式
  const conversationItems = conversations.map((conv) => ({
    key: conv.id,
    label: conv.title || `对话 ${conv.id.slice(-6)}`,
    timestamp: new Date(conv.lastActivity).getTime(),
    icon: <RobotOutlined />,
  }));

  // 发送消息
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !petId) return;

    try {
      let conversationId = currentConversation?.id;
      
      // 如果没有当前对话，创建新对话
      if (!conversationId) {
        const newConvResult = await dispatch(createConversationAsync(petId));
        if (createConversationAsync.fulfilled.match(newConvResult)) {
          conversationId = newConvResult.payload.id;
        }
      }

      if (conversationId) {
        await dispatch(sendMessageAsync({
          petId,
          content,
          conversationId
        }));
        setInputValue('');
      }
    } catch (error) {
      Message.error('发送消息失败');
    }
  };

  // 选择对话
  const handleConversationChange = (conversationId: string) => {
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (conversation) {
      dispatch(setCurrentConversation(conversation));
    }
  };

  // 创建新对话
  const handleNewConversation = async () => {
    if (!petId) return;
    
    try {
      await dispatch(createConversationAsync(petId));
      Message.success('创建新对话成功');
    } catch (error) {
      Message.error('创建对话失败');
    }
  };

  return (
    <Layout style={{ height: '600px', border: '1px solid #f0f0f0', borderRadius: 8 }}>
      <Sider 
        width={280} 
        theme="light" 
        style={{ 
          borderRight: '1px solid #f0f0f0',
          borderRadius: '8px 0 0 8px'
        }}
      >
        <div style={{ padding: '16px 12px 8px' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>对话历史</span>
            <a onClick={handleNewConversation} style={{ fontSize: 14 }}>
              + 新对话
            </a>
          </Space>
        </div>
        
        <Conversations
          style={{ height: 'calc(100% - 60px)' }}
          activeKey={currentConversation?.id || ''}
          items={conversationItems}
          onActiveChange={handleConversationChange}
          groupable={{
            sort: (a, b) => b.localeCompare(a),
            title: (group) => `${group === 'today' ? '今天' : group === 'yesterday' ? '昨天' : '更早'}`
          }}
        />
      </Sider>
      
      <Content style={{ 
        display: 'flex', 
        flexDirection: 'column',
        borderRadius: '0 8px 8px 0'
      }}>
        {/* 消息显示区域 */}
        <div style={{ 
          flex: 1, 
          padding: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {isLoading ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              height: '100%'
            }}>
              <Spin size="large" />
            </div>
          ) : currentConversation ? (
            <Bubble.List
              items={bubbleItems}
              autoScroll
              style={{ flex: 1 }}
            />
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              color: '#999'
            }}>
              <RobotOutlined style={{ fontSize: 48, marginBottom: 16 }} />
              <p>选择一个对话开始聊天，或创建新对话</p>
            </div>
          )}
        </div>
        
        {/* 输入区域 */}
        <div style={{ 
          padding: '0 16px 16px',
          borderTop: '1px solid #f0f0f0'
        }}>
          <Sender
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSendMessage}
            loading={isSending}
            disabled={connectionStatus !== 'connected'}
            placeholder={
              connectionStatus !== 'connected' 
                ? '连接中...' 
                : '输入消息...'
            }
            autoSize={{ minRows: 1, maxRows: 4 }}
          />
        </div>
      </Content>
    </Layout>
  );
};

export default ChatInterface;