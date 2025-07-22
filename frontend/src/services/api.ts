import { store } from '../store';

export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

class ApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = import.meta.env['VITE_API_BASE_URL'] || 'http://localhost:3000';
    this.timeout = parseInt(import.meta.env['VITE_API_TIMEOUT'] || '10000');
  }

  private getAuthHeaders(): Record<string, string> {
    const state = store.getState();
    const token = state.auth.token;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    let data: any;
    try {
      data = isJson ? await response.json() : await response.text();
    } catch (error: unknown) {
      throw createApiError({
        message: 'Failed to parse response',
        status: response.status,
        code: 'PARSE_ERROR'
      });
    }

    if (!response.ok) {
      const error: ApiError = {
        message: data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        code: data?.code || `HTTP_${response.status}`
      };
      throw error;
    }

    return {
      data,
      success: true,
      message: data?.message
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.getAuthHeaders();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return await this.handleResponse<T>(response);
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      
      if ((error as Error).name === 'AbortError') {
        throw createApiError({
          message: 'Request timeout',
          status: 408,
          code: 'TIMEOUT'
        });
      }

      if ((error as Error).message?.includes('fetch')) {
        throw createApiError({
          message: 'Network error',
          status: 0,
          code: 'NETWORK_ERROR'
        });
      }

      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'GET',
    });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : null,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : null,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : null,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'DELETE',
    });
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }
}

function createApiError(error: { message: string; status: number; code?: string }): Error {
  const err = new Error(error.message) as any;
  err.status = error.status;
  err.code = error.code;
  return err;
}

// Authentication API calls
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{token: string; user: any}>('/api/auth/login', { email, password }),
  
  register: (email: string, password: string, displayName: string) =>
    apiClient.post<{token: string; user: any}>('/api/auth/register', { email, password, displayName }),
  
  logout: () =>
    apiClient.post('/api/auth/logout'),
  
  refreshToken: () =>
    apiClient.post<{token: string}>('/api/auth/refresh'),
  
  getProfile: () =>
    apiClient.get<any>('/api/auth/profile'),
  
  updateProfile: (data: { displayName?: string; bio?: string }) =>
    apiClient.put<any>('/api/auth/profile', data)
};

// Pet management API calls
export const petApi = {
  getPets: () =>
    apiClient.get<any[]>('/api/pets'),
  
  createPet: (data: { name: string; species: string }) =>
    apiClient.post<any>('/api/pets', data),
  
  getPetById: (petId: string) =>
    apiClient.get<any>(`/api/pets/${petId}`),
  
  updatePet: (petId: string, data: any) =>
    apiClient.put<any>(`/api/pets/${petId}`, data),
  
  deletePet: (petId: string) =>
    apiClient.delete(`/api/pets/${petId}`),
  
  getPetState: (petId: string) =>
    apiClient.get<any>(`/api/pets/${petId}/state`),
  
  updatePetState: (petId: string, state: any) =>
    apiClient.put<any>(`/api/pets/${petId}/state`, state)
};

// Conversation API calls
export const chatApi = {
  getConversations: (petId?: string) =>
    apiClient.get<any[]>(`/api/conversations${petId ? `?petId=${petId}` : ''}`),
  
  createConversation: (petId: string) =>
    apiClient.post<any>('/api/conversations', { petId }),
  
  getConversationById: (conversationId: string) =>
    apiClient.get<any>(`/api/conversations/${conversationId}`),
  
  getConversationMessages: (conversationId: string) =>
    apiClient.get<any>(`/api/conversations/${conversationId}/messages`),
  
  sendMessage: (data: { petId: string; message: string; conversationId?: string }) =>
    apiClient.post<any>('/api/chat/completion', data),
  
  deleteConversation: (conversationId: string) =>
    apiClient.delete(`/api/conversations/${conversationId}`)
};

export const apiClient = new ApiClient();
export default apiClient;