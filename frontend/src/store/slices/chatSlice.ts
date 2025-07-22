import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

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

interface ChatCompletionResponse {
  id: string;
  message: Message;
  conversationId: string;
  personalityUpdate?: Record<string, number>;
  stateUpdate?: Record<string, number>;
  skillsUpdate?: string[];
}

export const fetchConversationsAsync = createAsyncThunk(
  'chat/fetchConversations',
  async (petId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const response = await fetch(`/api/conversations?petId=${petId}`, {
        headers: {
          Authorization: `Bearer ${state.auth.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const conversations: Conversation[] = await response.json();
      return conversations;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch conversations');
    }
  }
);

export const sendMessageAsync = createAsyncThunk(
  'chat/sendMessage',
  async (messageData: SendMessageRequest, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const response = await fetch('/api/chat/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.auth.token}`,
        },
        body: JSON.stringify({
          petId: messageData.petId,
          message: messageData.content,
          conversationId: messageData.conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const result: ChatCompletionResponse = await response.json();
      return result;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to send message');
    }
  }
);

export const createConversationAsync = createAsyncThunk(
  'chat/createConversation',
  async (petId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.auth.token}`,
        },
        body: JSON.stringify({ petId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const conversation: Conversation = await response.json();
      return conversation;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create conversation');
    }
  }
);

export const fetchConversationMessagesAsync = createAsyncThunk(
  'chat/fetchConversationMessages',
  async (conversationId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        headers: {
          Authorization: `Bearer ${state.auth.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversation messages');
      }

      const conversation: Conversation = await response.json();
      return conversation;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch conversation messages');
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
        const { message, conversationId } = action.payload;
        
        if (state.currentConversation && state.currentConversation.id === conversationId) {
          state.currentConversation.messages.push(message);
          state.currentConversation.lastActivity = message.timestamp;
        }
        
        const conversationIndex = state.conversations.findIndex(conv => conv.id === conversationId);
        if (conversationIndex !== -1) {
          state.conversations[conversationIndex].messages.push(message);
          state.conversations[conversationIndex].lastActivity = message.timestamp;
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
        state.currentConversation = action.payload;
        const conversationIndex = state.conversations.findIndex(conv => conv.id === action.payload.id);
        if (conversationIndex !== -1) {
          state.conversations[conversationIndex] = action.payload;
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