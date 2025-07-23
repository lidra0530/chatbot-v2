import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { chatApi } from '../../services/api';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  metadata?: {
    personalityScore?: number;
    stateChanges?: Record<string, number>;
    skillsGained?: string[];
    processingTime?: number;
    read?: boolean;
  };
}

export interface Conversation {
  id: string;
  petId: string;
  messages: Message[];
  createdAt: string;
  lastActivity: string;
  title?: string;
}

export interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}

const initialState: ChatState = {
  conversations: [],
  currentConversation: null,
  isLoading: false,
  isSending: false,
  error: null,
  connectionStatus: 'disconnected',
};

interface SendMessageRequest {
  petId: string;
  content: string;
  conversationId?: string;
}


export const fetchConversationsAsync = createAsyncThunk(
  'chat/fetchConversations',
  async (petId: string, { rejectWithValue }) => {
    try {
      const response = await chatApi.getConversations(petId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch conversations');
    }
  }
);

export const sendMessageAsync = createAsyncThunk(
  'chat/sendMessage',
  async (messageData: SendMessageRequest, { rejectWithValue }) => {
    try {
      const requestData: { petId: string; message: string; conversationId?: string } = {
        petId: messageData.petId,
        message: messageData.content,
      };
      if (messageData.conversationId) {
        requestData.conversationId = messageData.conversationId;
      }
      
      // 创建用户消息对象
      const userMessage: Message = {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        content: messageData.content,
        role: 'user',
        timestamp: new Date().toISOString(),
        metadata: {
          read: false
        }
      };
      
      const response = await chatApi.sendMessage(requestData);
      
      // 返回用户消息和AI响应
      return {
        userMessage,
        aiResponse: response.data,
        conversationId: messageData.conversationId || response.data.conversationId
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to send message');
    }
  }
);

export const createConversationAsync = createAsyncThunk(
  'chat/createConversation',
  async ({ petId, title }: { petId: string; title?: string }, { rejectWithValue }) => {
    try {
      const response = await chatApi.createConversation(petId, title);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create conversation');
    }
  }
);

export const fetchConversationMessagesAsync = createAsyncThunk(
  'chat/fetchConversationMessages',
  async (conversationId: string, { rejectWithValue }) => {
    try {
      const response = await chatApi.getConversationMessages(conversationId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch conversation messages');
    }
  }
);

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentConversation: (state, action: PayloadAction<Conversation>) => {
      state.currentConversation = action.payload;
    },
    addMessage: (state, action: PayloadAction<{ conversationId: string; message: Message }>) => {
      const { conversationId, message } = action.payload;
      
      if (state.currentConversation && state.currentConversation.id === conversationId) {
        state.currentConversation.messages.push(message);
        state.currentConversation.lastActivity = message.timestamp;
      }
      
      const conversationIndex = state.conversations.findIndex(conv => conv.id === conversationId);
      if (conversationIndex !== -1) {
        state.conversations[conversationIndex].messages.push(message);
        state.conversations[conversationIndex].lastActivity = message.timestamp;
      }
    },
    updateConnectionStatus: (state, action: PayloadAction<'connected' | 'disconnected' | 'connecting'>) => {
      state.connectionStatus = action.payload;
    },
    clearCurrentConversation: (state) => {
      state.currentConversation = null;
    },
    markMessageAsRead: (state, action: PayloadAction<{ conversationId: string; messageId: string }>) => {
      const { conversationId, messageId } = action.payload;
      
      if (state.currentConversation && state.currentConversation.id === conversationId) {
        const message = state.currentConversation.messages.find(msg => msg.id === messageId);
        if (message) {
          message.metadata = { ...message.metadata, read: true };
        }
      }
    },
    updateConversationTitle: (state, action: PayloadAction<{ conversationId: string; title: string }>) => {
      const { conversationId, title } = action.payload;
      
      if (state.currentConversation && state.currentConversation.id === conversationId) {
        state.currentConversation.title = title;
      }
      
      const conversationIndex = state.conversations.findIndex(conv => conv.id === conversationId);
      if (conversationIndex !== -1) {
        state.conversations[conversationIndex].title = title;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch conversations
      .addCase(fetchConversationsAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchConversationsAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.conversations = action.payload;
      })
      .addCase(fetchConversationsAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Send message
      .addCase(sendMessageAsync.pending, (state) => {
        state.isSending = true;
        state.error = null;
      })
      .addCase(sendMessageAsync.fulfilled, (state, action) => {
        state.isSending = false;
        // action.payload包含用户消息和AI响应
        const { userMessage, aiResponse, conversationId } = action.payload;
        
        // 转换AI响应为前端期望的消息格式
        const personalityScore = aiResponse.metadata?.personalityInfluence ? 
          Object.values(aiResponse.metadata.personalityInfluence.traitValues || {}).reduce((sum: number, val: any) => sum + val, 0) / 5 : undefined;
        
        const aiMessage: Message = {
          id: aiResponse.id,
          content: aiResponse.message,
          role: 'assistant',
          timestamp: aiResponse.timestamp,
          metadata: {
            ...(personalityScore !== undefined && { personalityScore }),
            ...(aiResponse.metadata?.stateInfluence && { stateChanges: aiResponse.metadata.stateInfluence }),
            ...(aiResponse.metadata?.skillsAffected && { skillsGained: aiResponse.metadata.skillsAffected }),
            ...(aiResponse.metadata?.processingTime && { processingTime: aiResponse.metadata.processingTime }),
            read: false
          }
        };
        
        // 添加用户消息和AI回复到当前对话
        if (state.currentConversation && state.currentConversation.id === conversationId) {
          state.currentConversation.messages.push(userMessage);
          state.currentConversation.messages.push(aiMessage);
          state.currentConversation.lastActivity = aiMessage.timestamp;
        }
        
        // 添加消息到对话列表中的对应对话
        const conversationIndex = state.conversations.findIndex(conv => conv.id === conversationId);
        if (conversationIndex !== -1) {
          state.conversations[conversationIndex].messages.push(userMessage);
          state.conversations[conversationIndex].messages.push(aiMessage);
          state.conversations[conversationIndex].lastActivity = aiMessage.timestamp;
        }
        
      })
      .addCase(sendMessageAsync.rejected, (state, action) => {
        state.isSending = false;
        state.error = action.payload as string;
      })
      // Create conversation
      .addCase(createConversationAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createConversationAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.conversations.push(action.payload);
        state.currentConversation = action.payload;
      })
      .addCase(createConversationAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch conversation messages
      .addCase(fetchConversationMessagesAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchConversationMessagesAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        // action.payload是消息数组，需要转换格式并更新到当前对话的messages中
        if (state.currentConversation) {
          // 转换API数据格式为前端期望的格式
          const formattedMessages = action.payload.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            role: msg.role,
            timestamp: msg.metadata?.timestamp || msg.createdAt || new Date().toISOString(),
            metadata: {
              personalityScore: msg.personalitySnapshot ? 
                Object.values(msg.personalitySnapshot).reduce((sum: number, val: any) => sum + val, 0) / 5 : undefined,
              stateChanges: msg.stateSnapshot?.basic,
              skillsGained: msg.skillsSnapshot,
              processingTime: msg.processingTime,
              read: false
            }
          }));
          
          state.currentConversation.messages = formattedMessages;
          state.currentConversation.lastActivity = formattedMessages.length > 0 
            ? formattedMessages[formattedMessages.length - 1].timestamp 
            : state.currentConversation.lastActivity;
          
          // 同时更新conversations数组中的对应对话
          const conversationIndex = state.conversations.findIndex(conv => conv.id === state.currentConversation!.id);
          if (conversationIndex !== -1) {
            state.conversations[conversationIndex].messages = formattedMessages;
            state.conversations[conversationIndex].lastActivity = state.currentConversation.lastActivity;
          }
        }
      })
      .addCase(fetchConversationMessagesAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  clearError, 
  setCurrentConversation, 
  addMessage, 
  updateConnectionStatus, 
  clearCurrentConversation,
  markMessageAsRead,
  updateConversationTitle
} = chatSlice.actions;

export default chatSlice.reducer;