import { store } from '../store';
import { 
  DEFAULT_API_VERSION, 
  isApiVersionSupported, 
  type ApiVersion 
} from '../config/api.config';

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
  private apiVersion: ApiVersion;

  constructor() {
    this.baseUrl = import.meta.env['VITE_API_BASE_URL'] || 'http://localhost:3000';
    this.timeout = parseInt(import.meta.env['VITE_API_TIMEOUT'] || '10000');
    
    const envVersion = import.meta.env['VITE_API_VERSION'] || DEFAULT_API_VERSION;
    this.apiVersion = isApiVersionSupported(envVersion) ? envVersion : DEFAULT_API_VERSION;
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

  private buildApiUrl(endpoint: string): string {
    // 如果endpoint已经包含完整路径，直接使用
    if (endpoint.startsWith('/api/')) {
      return `${this.baseUrl}${endpoint}`;
    }
    // 否则自动添加API版本前缀
    return `${this.baseUrl}/api/${this.apiVersion}${endpoint}`;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = this.buildApiUrl(endpoint);
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

  setApiVersion(version: ApiVersion): void {
    if (isApiVersionSupported(version)) {
      this.apiVersion = version;
      console.log(`API version switched to ${version}`);
    } else {
      console.warn(`Unsupported API version: ${version}. Using ${this.apiVersion}`);
    }
  }

  getApiVersion(): ApiVersion {
    return this.apiVersion;
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
    apiClient.post<{token: string; user: any}>('/auth/login', { email, password }),
  
  register: (email: string, password: string, displayName: string) =>
    apiClient.post<{token: string; user: any}>('/auth/register', { email, password, displayName }),
  
  logout: () =>
    apiClient.post('/auth/logout'),
  
  refreshToken: () =>
    apiClient.post<{token: string}>('/auth/refresh'),
  
  getProfile: () =>
    apiClient.get<any>('/auth/profile'),
  
  updateProfile: (data: { displayName?: string; bio?: string }) =>
    apiClient.put<any>('/auth/profile', data)
};

// Pet management API calls
export const petApi = {
  getPets: () =>
    apiClient.get<any[]>('/pets'),
  
  createPet: (data: { name: string; species: string }) =>
    apiClient.post<any>('/pets', data),
  
  getPetById: (petId: string) =>
    apiClient.get<any>(`/pets/${petId}`),
  
  updatePet: (petId: string, data: any) =>
    apiClient.put<any>(`/pets/${petId}`, data),
  
  deletePet: (petId: string) =>
    apiClient.delete(`/pets/${petId}`),
  
  getPetState: (petId: string) =>
    apiClient.get<any>(`/pets/${petId}/state`),
  
  updatePetState: (petId: string, state: any) =>
    apiClient.put<any>(`/pets/${petId}/state`, state)
};

// Conversation API calls
export const chatApi = {
  getConversations: (petId?: string) =>
    apiClient.get<any[]>(`/conversations${petId ? `?petId=${petId}` : ''}`),
  
  createConversation: (petId: string) =>
    apiClient.post<any>('/conversations', { petId }),
  
  getConversationById: (conversationId: string) =>
    apiClient.get<any>(`/conversations/${conversationId}`),
  
  getConversationMessages: (conversationId: string) =>
    apiClient.get<any>(`/conversations/${conversationId}/messages`),
  
  sendMessage: (data: { petId: string; message: string; conversationId?: string }) =>
    apiClient.post<any>('/chat/completion', data),
  
  deleteConversation: (conversationId: string) =>
    apiClient.delete(`/conversations/${conversationId}`)
};

// Personality system API calls
export const personalityApi = {
  getPersonality: (petId: string) =>
    apiClient.get<any>(`/personality/${petId}`),
  
  getEvolutionHistory: (petId: string) =>
    apiClient.get<any[]>(`/personality/${petId}/evolution`),
  
  getPersonalityAnalytics: (petId: string) =>
    apiClient.get<any>(`/personality/${petId}/analytics`),
  
  triggerEvolution: (petId: string) =>
    apiClient.post<any>(`/personality/${petId}/trigger-evolution`),
  
  updateEvolutionSettings: (petId: string, settings: any) =>
    apiClient.put<any>(`/personality/${petId}/evolution-settings`, settings),
  
  getEvolutionLogs: (petId: string, limit?: number) =>
    apiClient.get<any[]>(`/personality/${petId}/logs${limit ? `?limit=${limit}` : ''}`),
  
  analyzeInteractionPatterns: (petId: string) =>
    apiClient.get<any>(`/personality/${petId}/interaction-patterns`)
};

// Skills system API calls
export const skillsApi = {
  getSkillTree: (petId: string) =>
    apiClient.get<any>(`/skills/${petId}`),
  
  getAvailableSkills: (petId: string) =>
    apiClient.get<any[]>(`/skills/${petId}/available`),
  
  unlockSkill: (petId: string, skillId: string) =>
    apiClient.post<any>(`/skills/${petId}/unlock`, { skillId }),
  
  addExperience: (petId: string, skillId: string, amount: number) =>
    apiClient.post<any>(`/skills/${petId}/experience`, { skillId, amount }),
  
  getCurrentAbilities: (petId: string) =>
    apiClient.get<string[]>(`/skills/${petId}/abilities`),
  
  getSkillProgress: (petId: string, skillId: string) =>
    apiClient.get<any>(`/skills/${petId}/progress/${skillId}`),
  
  getUnlockHistory: (petId: string) =>
    apiClient.get<any[]>(`/skills/${petId}/unlock-history`),
  
  evaluateUnlockConditions: (petId: string) =>
    apiClient.post<any>(`/skills/${petId}/evaluate-conditions`)
};

// State system API calls
export const stateApi = {
  getCurrentState: (petId: string) =>
    apiClient.get<any>(`/state/${petId}`),
  
  updateState: (petId: string, stateUpdate: any) =>
    apiClient.put<any>(`/state/${petId}`, stateUpdate),
  
  processInteraction: (petId: string, interactionType: string, intensity: number) =>
    apiClient.post<any>(`/state/${petId}/interact`, { interactionType, intensity }),
  
  getStateHistory: (petId: string, limit?: number) =>
    apiClient.get<any[]>(`/state/${petId}/history${limit ? `?limit=${limit}` : ''}`),
  
  getStateMilestones: (petId: string) =>
    apiClient.get<any[]>(`/state/${petId}/milestones`),
  
  getStateAnalytics: (petId: string) =>
    apiClient.get<any>(`/state/${petId}/analytics`),
  
  triggerStateDecay: (petId: string) =>
    apiClient.post<any>(`/state/${petId}/decay`),
  
  updateStateSettings: (petId: string, settings: any) =>
    apiClient.put<any>(`/state/${petId}/settings`, settings)
};

export const apiClient = new ApiClient();
export default apiClient;