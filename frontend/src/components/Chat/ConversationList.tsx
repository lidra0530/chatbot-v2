import React from 'react';
import { Conversations } from '@ant-design/x';
import { Space, Button, Modal, message } from 'antd';
import { 
  MessageOutlined, 
  MoreOutlined, 
  EditOutlined, 
  DeleteOutlined,
  PlusOutlined 
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import type { AppDispatch } from '../../store';
import { 
  createConversationAsync,
  setCurrentConversation 
} from '../../store/slices/chatSlice';
import type { Conversation } from '../../store/slices/chatSlice';

interface ConversationListProps {
  petId: string;
  onConversationSelect?: (conversation: Conversation) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({ 
  petId, 
  onConversationSelect 
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { conversations, currentConversation, isLoading } = useSelector(
    (state: RootState) => state.chat
  );

  // 格式化对话列表
  const formatConversations = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    return conversations.map((conv) => {
      const lastActivity = new Date(conv.lastActivity);
      let group = 'earlier';
      
      if (lastActivity >= today) {
        group = 'today';
      } else if (lastActivity >= yesterday) {
        group = 'yesterday';
      }

      return {
        key: conv.id,
        label: conv.title || `对话 ${conv.id.slice(-6)}`,
        timestamp: lastActivity.getTime(),
        group,
        icon: <MessageOutlined />,
        disabled: false,
      };
    });
  };

  // 创建新对话
  const handleCreateConversation = async () => {
    if (!petId) {
      message.error('请先选择宠物');
      return;
    }

    try {
      const result = await dispatch(createConversationAsync(petId));
      if (createConversationAsync.fulfilled.match(result)) {
        message.success('创建新对话成功');
        // 自动选择新创建的对话
        const newConversation = result.payload;
        dispatch(setCurrentConversation(newConversation));
        onConversationSelect?.(newConversation);
      }
    } catch (error) {
      message.error('创建对话失败');
    }
  };

  // 选择对话
  const handleConversationChange = (conversationId: string) => {
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (conversation) {
      dispatch(setCurrentConversation(conversation));
      onConversationSelect?.(conversation);
    }
  };

  // 删除对话
  const handleDeleteConversation = (conversationKey: string) => {
    Modal.confirm({
      title: '删除对话',
      content: '确定要删除这个对话吗？此操作不可恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        // TODO: 实现删除对话的API调用
        console.log('Delete conversation:', conversationKey);
        message.success('对话已删除');
      },
    });
  };

  // 重命名对话
  const handleRenameConversation = (conversationKey: string) => {
    // TODO: 实现重命名功能
    console.log('Rename conversation:', conversationKey);
    message.info('重命名功能开发中');
  };

  // 对话操作菜单
  const getConversationMenu = (conversation: any) => ({
    items: [
      {
        key: 'rename',
        label: '重命名',
        icon: <EditOutlined />,
        onClick: () => handleRenameConversation(conversation.key),
      },
      {
        type: 'divider' as const,
      },
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => handleDeleteConversation(conversation.key),
      },
    ],
  });

  const conversationItems = formatConversations();

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 头部 */}
      <div style={{ padding: '16px 12px 8px' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>对话历史</span>
          <Button 
            type="text" 
            icon={<PlusOutlined />}
            size="small"
            onClick={handleCreateConversation}
            loading={isLoading}
          >
            新对话
          </Button>
        </Space>
      </div>

      {/* 对话列表 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Conversations
          style={{ height: '100%' }}
          activeKey={currentConversation?.id || ''}
          items={conversationItems}
          onActiveChange={handleConversationChange}
          groupable={{
            sort: (a, b) => {
              const order = { today: 0, yesterday: 1, earlier: 2 };
              return (order[a as keyof typeof order] || 3) - (order[b as keyof typeof order] || 3);
            },
            title: (group) => {
              const titles = {
                today: '今天',
                yesterday: '昨天', 
                earlier: '更早'
              };
              return titles[group as keyof typeof titles] || group;
            }
          }}
          menu={(conversation) => ({
            ...getConversationMenu(conversation),
            trigger: (
              <Button
                type="text"
                icon={<MoreOutlined />}
                size="small"
                style={{ opacity: 0.6 }}
              />
            ),
          })}
        />
      </div>

      {/* 底部统计 */}
      {conversationItems.length > 0 && (
        <div style={{ 
          padding: '8px 12px', 
          borderTop: '1px solid #f0f0f0',
          fontSize: 12,
          color: '#999',
          textAlign: 'center'
        }}>
          共 {conversationItems.length} 个对话
        </div>
      )}
    </div>
  );
};

export default ConversationList;