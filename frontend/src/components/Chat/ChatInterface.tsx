import React, { useState, useEffect } from 'react';
import { Bubble, Sender, Conversations } from '@ant-design/x';
import { Layout, Space, Spin, App } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import type { AppDispatch } from '../../store';
import { 
  sendMessageAsync, 
  fetchConversationsAsync, 
  createConversationAsync,
  fetchConversationMessagesAsync,
  setCurrentConversation 
} from '../../store/slices/chatSlice';
import { 
  updatePetPersonality,
  updatePetState,
  updateLastInteraction 
} from '../../store/slices/petSlice';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';

const { Sider, Content } = Layout;

interface ChatInterfaceProps {
  petId: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ petId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { message } = App.useApp();
  const { 
    conversations, 
    currentConversation, 
    isLoading, 
    isSending
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
        const newConvResult = await dispatch(createConversationAsync({ petId }));
        if (createConversationAsync.fulfilled.match(newConvResult)) {
          conversationId = newConvResult.payload.id;
        }
      }

      if (conversationId) {
        const result = await dispatch(sendMessageAsync({
          petId,
          content,
          conversationId
        }));
        
        // 如果发送成功，更新宠物的个性和状态数据
        if (sendMessageAsync.fulfilled.match(result)) {
          const { aiResponse } = result.payload;
          
          // 更新最后互动时间
          dispatch(updateLastInteraction(petId));
          
          // 如果AI响应包含个性影响，更新个性数据
          if (aiResponse.metadata?.personalityInfluence?.traitValues) {
            const traitValues = aiResponse.metadata.personalityInfluence.traitValues;
            // 将数值从百分比转换为0-1的小数
            const personalityUpdate = {
              openness: (traitValues.openness || 50) / 100,
              conscientiousness: (traitValues.conscientiousness || 50) / 100,
              extraversion: (traitValues.extraversion || 50) / 100,
              agreeableness: (traitValues.agreeableness || 50) / 100,
              neuroticism: (traitValues.neuroticism || 50) / 100,
            };
            dispatch(updatePetPersonality({ petId, personality: personalityUpdate }));
          }
          
          // 如果AI响应包含状态影响，更新状态数据
          if (aiResponse.metadata?.stateInfluence) {
            const stateInfluence = aiResponse.metadata.stateInfluence;
            const stateUpdate = {
              mood: (stateInfluence.currentMood || 'content') as any,
              energy: (stateInfluence.energyLevel || 80) / 100,
              health: stateInfluence.healthStatus === 'excellent' ? 0.9 : 
                     stateInfluence.healthStatus === 'good' ? 0.7 : 0.5,
              happiness: 0.75, // 默认值，可根据实际数据调整
              lastUpdated: new Date().toISOString()
            };
            dispatch(updatePetState({ petId, state: stateUpdate }));
          }
        }
        
        setInputValue('');
      }
    } catch {
      message.error('发送消息失败');
    }
  };

  // 选择对话
  const handleConversationChange = async (conversationId: string) => {
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (conversation) {
      // 先设置当前对话
      dispatch(setCurrentConversation(conversation));
      
      // 如果对话中没有消息或消息很少，则从服务器获取完整的消息历史
      if (!conversation.messages || conversation.messages.length === 0) {
        try {
          await dispatch(fetchConversationMessagesAsync(conversationId));
        } catch (error) {
          console.error('Failed to fetch conversation messages:', error);
          message.error('加载对话历史失败');
        }
      }
    }
  };

  // 创建新对话
  const handleNewConversation = async () => {
    if (!petId) return;
    
    try {
      const result = await dispatch(createConversationAsync({ petId }));
      if (createConversationAsync.fulfilled.match(result)) {
        message.success('创建新对话成功');
        // 重新获取对话列表确保同步
        dispatch(fetchConversationsAsync(petId));
      } else {
        message.error('创建对话失败');
      }
    } catch {
      message.error('创建对话失败');
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
            disabled={isSending}
            placeholder={
              !currentConversation 
                ? '选择或创建对话开始聊天...' 
                : isSending 
                  ? '发送中...'
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