// API响应和请求类型定义

// 通用API响应结构
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

// 分页响应结构
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 认证相关类型
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: UserResponse;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  bio?: string;
  isVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

// 宠物相关类型
export interface CreatePetRequest {
  name: string;
  species: string;
}

export interface PetResponse {
  id: string;
  name: string;
  species: string;
  personality: PersonalityTraitsResponse;
  state: PetStateResponse;
  skills: SkillProgressResponse[];
  evolutionLevel: number;
  totalExperience: number;
  createdAt: string;
  lastInteraction: string;
  userId: string;
}

// 对话相关类型
export interface ConversationResponse {
  id: string;
  title?: string;
  petId: string;
  userId: string;
  lastActivity: string;
  createdAt: string;
  messages?: MessageResponse[];
}

export interface MessageResponse {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface ChatCompletionRequest {
  petId: string;
  content: string;
  conversationId?: string;
}

export interface ChatCompletionResponse {
  message: MessageResponse;
  petUpdates?: {
    personality?: PersonalityTraitsResponse;
    state?: PetStateResponse;
    skills?: SkillProgressResponse[];
  };
  evolutionEvents?: EvolutionEventResponse[];
}

// 个性系统类型
export interface PersonalityTraitsResponse {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface PersonalityEvolutionResponse {
  id: string;
  petId: string;
  oldTraits: PersonalityTraitsResponse;
  newTraits: PersonalityTraitsResponse;
  changes: PersonalityAdjustmentResponse;
  trigger: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface PersonalityAdjustmentResponse {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface PersonalityAnalyticsResponse {
  traits: PersonalityTraitsResponse;
  evolutionHistory: PersonalityEvolutionResponse[];
  trends: {
    trait: keyof PersonalityTraitsResponse;
    direction: 'increasing' | 'decreasing' | 'stable';
    confidence: number;
  }[];
  insights: string[];
}

// 技能系统类型
export interface SkillProgressResponse {
  skillId: string;
  name: string;
  category: string;
  experience: number;
  level: number;
  isUnlocked: boolean;
  unlockedAt?: string;
}

export interface SkillTreeResponse {
  categories: SkillCategoryResponse[];
  availableSkills: string[];
  nextUnlocks: SkillUnlockConditionResponse[];
}

export interface SkillCategoryResponse {
  id: string;
  name: string;
  description: string;
  skills: SkillResponse[];
}

export interface SkillResponse {
  id: string;
  name: string;
  description: string;
  category: string;
  maxLevel: number;
  prerequisites: string[];
  unlockConditions: SkillUnlockConditionResponse;
  effects: string[];
}

export interface SkillUnlockConditionResponse {
  type: 'level' | 'experience' | 'personality' | 'interaction';
  requirements: Record<string, any>;
  description: string;
}

export interface SkillUnlockEventResponse {
  id: string;
  petId: string;
  skillId: string;
  unlockedAt: string;
  trigger: string;
  metadata?: Record<string, any>;
}

// 状态系统类型
export interface PetStateResponse {
  health: number;
  happiness: number;
  energy: number;
  hunger: number;
  social: number;
  mood: string;
  curiosity: number;
  creativity: number;
  independence: number;
  lastUpdated: string;
}

export interface StateHistoryResponse {
  id: string;
  petId: string;
  state: PetStateResponse;
  changes: Partial<PetStateResponse>;
  trigger: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface StateMilestoneResponse {
  id: string;
  petId: string;
  type: string;
  description: string;
  achievedAt: string;
  metadata?: Record<string, any>;
}

export interface StateAnalyticsResponse {
  current: PetStateResponse;
  history: StateHistoryResponse[];
  trends: {
    state: keyof PetStateResponse;
    direction: 'increasing' | 'decreasing' | 'stable';
    rate: number;
  }[];
  milestones: StateMilestoneResponse[];
  recommendations: string[];
}

// 演化事件类型
export interface EvolutionEventResponse {
  id: string;
  petId: string;
  type: 'personality' | 'skill' | 'state';
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// WebSocket 事件类型
export interface WebSocketEvent<T = any> {
  type: string;
  payload: T;
  timestamp: string;
  petId?: string;
}

// 错误响应类型
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
}

// 请求配置类型
export interface ApiRequestConfig {
  timeout?: number;
  retries?: number;
  cache?: boolean;
  skipAuth?: boolean;
}

// 上传相关类型
export interface FileUploadResponse {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  uploadedAt: string;
}

export interface FileUploadRequest {
  file: File;
  category?: string;
  metadata?: Record<string, any>;
}