import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '../../services/api';

export interface User {
  id: string;
  email: string;
  displayName: string;
  bio?: string;
  isVerified: boolean;
  lastLogin: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials {
  email: string;
  password: string;
  displayName: string;
}

interface AuthResponse {
  user: User;
  access_token: string;
}

export const loginAsync = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials.email, credentials.password);
      const data: AuthResponse = {
        access_token: response.data.token,
        user: response.data.user
      };
      localStorage.setItem('token', data.access_token);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const registerAsync = createAsyncThunk(
  'auth/register',
  async (credentials: RegisterCredentials, { rejectWithValue }) => {
    try {
      const response = await authApi.register(credentials.email, credentials.password, credentials.displayName);
      const data: AuthResponse = {
        access_token: response.data.token,
        user: response.data.user
      };
      localStorage.setItem('token', data.access_token);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

export const logoutAsync = createAsyncThunk(
  'auth/logout',
  async () => {
    try {
      await authApi.logout();
      localStorage.removeItem('token');
      return null;
    } catch (error: any) {
      // 即使API调用失败，也要清除本地token
      localStorage.removeItem('token');
      return null;
    }
  }
);

export const validateTokenAsync = createAsyncThunk(
  'auth/validateToken',
  async (token: string, { rejectWithValue }) => {
    try {
      // 验证token格式
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp <= Date.now() / 1000) {
        throw new Error('Token expired');
      }

      // 调用API验证token并获取用户信息
      const response = await authApi.getProfile();
      return {
        user: response.data,
        access_token: token
      };
    } catch (error: any) {
      localStorage.removeItem('token');
      return rejectWithValue(error.message || 'Token validation failed');
    }
  }
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action: PayloadAction<AuthResponse>) => {
      state.user = action.payload.user;
      state.token = action.payload.access_token;
      state.isAuthenticated = true;
      state.error = null;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('token');
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Register
      .addCase(registerAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(registerAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logoutAsync.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      // Validate Token
      .addCase(validateTokenAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(validateTokenAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(validateTokenAsync.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null; // 不显示token验证失败错误
      });
  },
});

export const { clearError, setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;