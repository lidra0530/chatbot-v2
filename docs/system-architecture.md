# 电子宠物系统架构设计文档

## 1. 项目概述

### 1.1 项目定位
基于阿里通义千问大模型的智能电子宠物系统，具备动态个性演变、状态驱动对话和技能成长系统，为用户提供个性化的AI陪伴体验。

### 1.2 技术栈选型
- **后端**: NestJS + TypeScript + Prisma + MongoDB + JWT
- **前端**: React + TypeScript + Redux + Ant Design X + Vite
- **包管理器**: pnpm
- **大模型**: 阿里通义千问（包装为OpenAI兼容格式）
- **实时通信**: WebSocket
- **部署**: Linux服务器，前后端分离部署

### 1.3 新功能特性
- **动态个性化演变**: 宠物性格根据用户互动动态调整
- **状态驱动对话**: 宠物状态影响对话内容和风格
- **技能树系统**: 宠物通过互动解锁新能力和对话风格

### 1.4 服务器环境
- 配置: 2G内存 + 1G带宽
- 操作系统: Linux
- 部署方式: 前后端分离，同服务器不同端口

## 2. 系统架构

### 2.1 整体架构图
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端 React    │    │   后端 NestJS   │    │   通义千问API   │
│   Port: 3000    │◄──►│   Port: 8000    │◄──►│                │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   MongoDB       │
                       │   Port: 27017   │
                       └─────────────────┘
```

### 2.2 新增核心模块
```
┌──────────────────────────────────────────────────────────────┐
│                        AI个性化引擎                            │
│  个性演变算法 + 状态对话映射 + 技能解锁逻辑                     │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│                        提示词动态生成                           │
│  个性特质转换 + 状态情感映射 + 技能能力注入                     │
└──────────────────────────────────────────────────────────────┘
```

### 2.3 技术架构层次
```
┌──────────────────────────────────────────────────────────────┐
│                        用户界面层                              │
│  React + TypeScript + Redux + Ant Design X                  │
└──────────────────────────────────────────────────────────────┘
                              │ HTTP/WebSocket
┌──────────────────────────────────────────────────────────────┐
│                        API网关层                              │
│  RESTful API + WebSocket + CORS + 限流 + 统一响应格式          │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│                        业务逻辑层                              │
│  用户管理 + 宠物管理 + 对话服务 + 个性演变 + 状态管理 + 技能系统 │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│                        数据访问层                              │
│  Prisma ORM + MongoDB Driver + 连接池管理                    │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│                        数据存储层                              │
│  MongoDB 数据库 + 文件存储                                    │
└──────────────────────────────────────────────────────────────┘
```

## 3. 数据库设计

### 3.1 MongoDB Collections

#### 3.1.1 users - 用户信息
```json
{
  "_id": "ObjectId",
  "username": "string",
  "email": "string", 
  "passwordHash": "string",
  "avatar": "string",
  "createdAt": "Date",
  "updatedAt": "Date",
  "isActive": "boolean"
}
```

#### 3.1.2 pets - 宠物信息 (重大更新)
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "name": "string",
  "avatar": "string",
  
  // 动态个性系统
  "personality": {
    "traits": {
      "openness": 50,        // 开放性 (0-100)
      "conscientiousness": 50, // 尽责性 (0-100)
      "extraversion": 50,     // 外向性 (0-100)
      "agreeableness": 50,    // 宜人性 (0-100)
      "neuroticism": 30       // 神经质 (0-100)
    },
    "evolutionHistory": [
      {
        "timestamp": "Date",
        "changes": {"agreeableness": 2},
        "trigger": "positive_feedback_sequence",
        "description": "用户连续夸奖提升了友好度"
      }
    ],
    "evolutionRate": 1.0,     // 演化敏感度 (0.5-2.0)
    "lastEvolutionCheck": "Date"
  },
  
  // 状态驱动系统
  "currentState": {
    "basic": {
      "mood": 70,           // 心情 (0-100)
      "energy": 80,         // 精力 (0-100)
      "hunger": 60,         // 饥饿度 (0-100)
      "health": 90          // 健康值 (0-100)
    },
    "advanced": {
      "curiosity": 65,      // 好奇心 (0-100)
      "socialDesire": 55,   // 社交欲 (0-100)
      "creativity": 60,     // 创造力 (0-100)
      "focusLevel": 70      // 专注度 (0-100)
    },
    "lastUpdate": "Date",
    "autoDecayEnabled": true,
    "decayRates": {
      "hunger": 0.5,        // 每小时衰减率
      "energy": 0.3,
      "mood": 0.1
    }
  },
  
  // 技能树系统
  "skills": {
    "totalExperience": 150,
    "skillPoints": 5,
    "categories": {
      "knowledge": {
        "level": 2,
        "experience": 45,
        "maxLevel": 10,
        "branches": {
          "literature": {
            "level": 1,
            "experience": 20,
            "unlockedAbilities": ["poetry_discussion"],
            "nextUnlock": {
              "ability": "creative_writing",
              "requiredExp": 40
            }
          },
          "science": {
            "level": 1,
            "experience": 15,
            "unlockedAbilities": ["basic_facts"],
            "nextUnlock": {
              "ability": "theory_discussion", 
              "requiredExp": 35
            }
          }
        }
      },
      "emotional": {
        "level": 1,
        "experience": 30,
        "branches": {
          "empathy": {
            "level": 1,
            "experience": 18,
            "unlockedAbilities": ["emotion_recognition"],
            "nextUnlock": {
              "ability": "deep_comfort",
              "requiredExp": 30
            }
          },
          "humor": {
            "level": 0,
            "experience": 12,
            "unlockedAbilities": [],
            "nextUnlock": {
              "ability": "light_jokes",
              "requiredExp": 20
            }
          }
        }
      },
      "creative": {
        "level": 1,
        "experience": 25,
        "branches": {
          "storytelling": {
            "level": 1,
            "experience": 15,
            "unlockedAbilities": ["simple_stories"],
            "nextUnlock": {
              "ability": "interactive_stories",
              "requiredExp": 30
            }
          },
          "games": {
            "level": 0,
            "experience": 10,
            "unlockedAbilities": [],
            "nextUnlock": {
              "ability": "word_games",
              "requiredExp": 25
            }
          }
        }
      }
    }
  },
  
  // 基础信息
  "level": 3,
  "totalInteractions": 156,
  "createdAt": "Date",
  "updatedAt": "Date",
  "isActive": "boolean"
}
```

#### 3.1.3 conversations - 对话会话 (轻微更新)
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "petId": "ObjectId",
  "title": "string",
  "messageCount": "number",
  "lastMessageAt": "Date",
  "createdAt": "Date",
  "isActive": "boolean",
  
  // 新增：会话统计信息
  "sessionStats": {
    "totalDuration": 3600,        // 总时长(秒)
    "averageResponseTime": 2.5,   // 平均响应时间
    "emotionalTone": "positive",  // 整体情感基调
    "topicsDiscussed": ["literature", "daily_life", "games"],
    "skillsUsed": ["poetry_discussion", "empathy"],
    "personalityShifts": [
      {
        "trait": "openness",
        "change": 1,
        "trigger": "deep_discussion"
      }
    ]
  }
}
```

#### 3.1.4 messages - 消息记录 (重要更新)
```json
{
  "_id": "ObjectId",
  "conversationId": "ObjectId",
  "role": "user|assistant",
  "content": "string",
  
  // 扩展的元数据
  "metadata": {
    // AI相关
    "tokenUsage": 150,
    "responseTime": 1200,
    "modelUsed": "qwen-plus",
    
    // 状态快照
    "petStateSnapshot": {
      "mood": 75,
      "energy": 65,
      "curiosity": 80,
      "personalitySnapshot": {
        "openness": 68,
        "agreeableness": 72
      }
    },
    
    // 技能使用
    "skillsUsed": ["poetry_discussion", "empathy"],
    "abilitiesActivated": ["creative_writing", "emotional_validation"],
    
    // 互动分析
    "interactionAnalysis": {
      "sentiment": "positive",
      "emotionalIntensity": 0.7,
      "topicCategory": "literature", 
      "userEngagement": "high",
      "personalityTriggers": ["creativity_boost", "social_validation"]
    },
    
    // 系统生成的提示词记录（调试用）
    "promptGeneration": {
      "basePrompt": "你是一只可爱的AI宠物...",
      "personalityInjection": "你的性格偏向开放和友善...",
      "stateInjection": "你现在心情不错，充满好奇心...",
      "skillInjection": "你具备诗歌讨论和情感共鸣的能力..."
    }
  },
  
  "timestamp": "Date"
}
```

#### 3.1.5 pet_evolution_logs - 宠物演化日志 (新增)
```json
{
  "_id": "ObjectId",
  "petId": "ObjectId",
  "timestamp": "Date",
  "evolutionType": "personality|skill|state",
  
  "personalityEvolution": {
    "traitChanges": {
      "openness": {"from": 65, "to": 67, "change": 2},
      "agreeableness": {"from": 70, "to": 72, "change": 2}
    },
    "trigger": "positive_feedback_sequence",
    "triggerDetails": {
      "actionType": "praise",
      "frequency": 5,
      "timespan": "24h"
    }
  },
  
  "skillEvolution": {
    "category": "knowledge",
    "branch": "literature", 
    "experienceGained": 15,
    "newLevel": 2,
    "unlockedAbilities": ["creative_writing"],
    "trigger": "topic_depth_threshold",
    "triggerDetails": {
      "topic": "poetry",
      "discussionDepth": 8,
      "requiredDepth": 5
    }
  },
  
  "stateEvolution": {
    "stateChanges": {
      "curiosity": {"from": 60, "to": 75, "change": 15}
    },
    "trigger": "new_topic_introduction",
    "triggerDetails": {
      "newTopic": "science",
      "userInitiated": true
    }
  }
}
```

#### 3.1.6 interaction_patterns - 互动模式分析 (新增)
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "petId": "ObjectId",
  "analysisDate": "Date",
  "timeframe": "weekly|monthly",
  
  "patterns": {
    "communicationStyle": {
      "averageMessageLength": 45,
      "formalityLevel": 0.6,
      "emotionalExpression": 0.8,
      "questionFrequency": 0.3
    },
    
    "topicPreferences": {
      "literature": 0.4,
      "daily_life": 0.3,
      "science": 0.2,
      "games": 0.1
    },
    
    "interactionTiming": {
      "preferredHours": [9, 10, 14, 20, 21],
      "sessionDuration": 25.5,
      "frequency": "daily"
    },
    
    "feedbackPatterns": {
      "positiveRatio": 0.75,
      "praiseTriggers": ["creativity", "helpfulness"],
      "engagementIndicators": ["follow_up_questions", "topic_deepening"]
    }
  },
  
  "recommendations": {
    "personalityAdjustments": [
      {
        "trait": "openness",
        "suggestedChange": 3,
        "reason": "user_shows_high_creativity_interest"
      }
    ],
    "skillDevelopment": [
      {
        "category": "creative",
        "branch": "storytelling",
        "priority": "high",
        "reason": "user_engagement_pattern_match"
      }
    ]
  }
}
```

### 3.2 数据一致性策略
- **强一致性**: 用户认证、宠物创建、核心状态更新
- **弱一致性**: 对话记录、状态历史、统计数据

## 4. API设计

### 4.1 RESTful API 规范
- 基础路径: `/api/v1`
- 统一响应格式:
```json
{
  "success": true,
  "data": {},
  "message": "string",
  "timestamp": "Date",
  "requestId": "string"
}
```

### 4.2 主要API端点

#### 4.2.1 用户管理
- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/refresh` - Token刷新
- `GET /api/v1/users/profile` - 获取用户信息
- `PUT /api/v1/users/profile` - 更新用户信息

#### 4.2.2 宠物管理
- `POST /api/v1/pets` - 创建宠物
- `GET /api/v1/pets` - 获取用户宠物列表
- `GET /api/v1/pets/:id` - 获取宠物详情
- `PUT /api/v1/pets/:id` - 更新宠物信息
- `DELETE /api/v1/pets/:id` - 删除宠物

#### 4.2.3 个性演化管理
- `GET /api/v1/pets/:id/personality` - 获取宠物个性详情
- `GET /api/v1/pets/:id/personality/history` - 获取个性演化历史
- `POST /api/v1/pets/:id/personality/analyze` - 触发个性分析和调整
- `PUT /api/v1/pets/:id/personality/settings` - 调整演化设置

#### 4.2.4 状态管理系统
- `GET /api/v1/pets/:id/state` - 获取宠物当前状态
- `PUT /api/v1/pets/:id/state` - 更新宠物状态
- `POST /api/v1/pets/:id/state/interact` - 状态交互(喂食/游戏等)
- `GET /api/v1/pets/:id/state/history` - 获取状态变化历史

#### 4.2.5 技能系统管理
- `GET /api/v1/pets/:id/skills` - 获取技能树信息
- `GET /api/v1/pets/:id/skills/available` - 获取可解锁技能
- `POST /api/v1/pets/:id/skills/unlock` - 解锁新技能
- `GET /api/v1/pets/:id/skills/abilities` - 获取当前能力列表

#### 4.2.6 增强对话接口
- `POST /api/v1/chat/completions` - OpenAI兼容对话接口 (增强版)
  - 请求参数新增:
    ```json
    {
      "pet_id": "string",
      "include_state": true,
      "include_personality": true,
      "include_skills": true,
      "interaction_context": {
        "action_type": "chat|feed|play|learn",
        "topic_hint": "string"
      }
    }
    ```
  - 响应新增:
    ```json
    {
      "choices": [...],
      "pet_context": {
        "personality_influence": {...},
        "state_influence": {...},
        "skills_used": [...],
        "evolution_triggered": "boolean"
      }
    }
    ```

#### 4.2.7 对话管理
- `POST /api/v1/conversations` - 创建对话会话
- `GET /api/v1/conversations` - 获取对话列表
- `GET /api/v1/conversations/:id/messages` - 获取对话历史

#### 4.2.8 分析和洞察
- `GET /api/v1/pets/:id/analytics` - 获取宠物成长分析
- `GET /api/v1/pets/:id/recommendations` - 获取互动建议
- `GET /api/v1/users/:id/interaction-patterns` - 获取用户互动模式分析

#### 4.2.9 WebSocket事件扩展
- `connection` - 建立连接
- `join_conversation` - 加入对话
- `message` - 发送消息
- `pet_state_update` - 宠物状态更新
- `personality_evolution` - 个性演化通知
- `skill_unlocked` - 技能解锁通知
- `state_milestone` - 状态里程碑达成
- `evolution_opportunity` - 演化机会提醒
- `disconnect` - 断开连接

### 4.3 安全机制
- JWT Token认证
- API限流 (Redis + 滑动窗口)
- CORS跨域配置
- 请求参数校验
- SQL注入防护

## 5. 核心算法设计

### 5.1 个性演化算法
```typescript
interface PersonalityEvolution {
  calculateTraitAdjustment(
    currentTraits: PersonalityTraits,
    interactionHistory: InteractionEvent[],
    timeWindow: number
  ): PersonalityChange[];
  
  applyEvolutionLimits(
    changes: PersonalityChange[],
    evolutionRate: number,
    traitBounds: TraitBounds
  ): PersonalityChange[];
}
```

### 5.2 状态驱动算法
```typescript
interface StateDriver {
  generatePromptModifiers(
    personality: PersonalityTraits,
    currentState: PetState,
    activeSkills: Skill[]
  ): PromptModifiers;
  
  calculateStateDecay(
    currentState: PetState,
    timeSinceLastUpdate: number,
    decayRates: DecayRates
  ): PetState;
}
```

### 5.3 技能解锁算法
```typescript
interface SkillSystem {
  evaluateUnlockConditions(
    pet: Pet,
    recentInteractions: InteractionEvent[],
    skillRequirements: SkillRequirement[]
  ): UnlockOpportunity[];
  
  calculateExperienceGain(
    interactionType: string,
    topicDepth: number,
    userEngagement: number,
    personalityAlignment: number
  ): ExperienceGain;
}
```

## 6. 系统功能模块

### 6.1 第一期核心功能
1. **用户认证系统** (无变化)
2. **基础宠物管理** (无变化)
3. **简化个性系统**
   - 5个核心特质的基础演化
   - 简单的正负反馈机制
4. **基础状态系统**
   - 4个基础状态 + 4个高级状态
   - 状态对对话的基础影响
5. **入门技能树**
   - 3个技能分类，每类2-3个基础分支
   - 经验获取和技能解锁机制

### 6.2 可扩展功能模块
- 高级个性分析和预测
- 复杂状态互动系统
- 深度技能树和专业化
- 社交化宠物互动
- 用户行为洞察系统

## 7. 性能优化策略

### 7.1 复杂度管理
- **个性计算缓存**: 个性分析结果缓存30分钟
- **状态更新批处理**: 状态变化每5分钟批量处理
- **技能检查节流**: 技能解锁检查每次对话最多1次
- **数据预加载**: 宠物基础信息和技能树预加载

### 7.2 数据库优化
```javascript
// 关键索引
pets: [
  { "userId": 1, "isActive": 1 },
  { "_id": 1, "personality.lastEvolutionCheck": 1 },
  { "_id": 1, "skills.totalExperience": 1 }
]

messages: [
  { "conversationId": 1, "timestamp": -1 },
  { "metadata.interactionAnalysis.topicCategory": 1, "timestamp": -1 }
]

pet_evolution_logs: [
  { "petId": 1, "timestamp": -1 },
  { "evolutionType": 1, "timestamp": -1 }
]
```

### 7.3 API响应优化
- 分页加载历史记录
- 个性和技能数据按需加载
- WebSocket推送关键变化事件

## 8. 部署架构

### 8.1 项目结构
```
chatbot/
├── backend/                 # NestJS后端项目
│   ├── src/
│   │   ├── modules/
│   │   │   ├── personality/     # 个性演化模块
│   │   │   ├── skills/         # 技能系统模块
│   │   │   ├── state/          # 状态管理模块
│   │   │   └── analytics/      # 分析模块
│   │   ├── algorithms/         # 核心算法
│   │   └── utils/              # 工具函数
├── frontend/               # React前端项目
│   ├── src/
│   │   ├── components/
│   │   │   ├── personality/    # 个性展示组件
│   │   │   ├── skills/         # 技能树组件
│   │   │   └── state/          # 状态展示组件
│   │   └── store/             # Redux状态管理
└── docs/                   # 项目文档
    ├── api/               # API文档
    └── algorithms/        # 算法说明
```

### 8.2 端口分配
- 前端开发服务器: 5173 (Vite默认)
- 前端生产构建: 3001
- 后端API服务: 8000
- MongoDB数据库: 27017

### 8.3 环境变量扩展
```bash
# 数据库配置
DATABASE_URL=mongodb://localhost:27017/chatbot
MONGODB_URI=mongodb://localhost:27017/chatbot

# JWT配置
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# 通义千问API配置
QWEN_API_KEY=your-qwen-api-key
QWEN_API_BASE=https://dashscope.aliyuncs.com/api/v1

# 服务配置
PORT=8000
NODE_ENV=production
CORS_ORIGIN=http://localhost:5173

# 新增个性化功能配置
PERSONALITY_EVOLUTION_ENABLED=true
PERSONALITY_EVOLUTION_RATE=1.0
PERSONALITY_MAX_CHANGE_PER_DAY=5

# 状态系统配置
STATE_AUTO_DECAY_ENABLED=true
STATE_UPDATE_INTERVAL=300000  # 5分钟

# 技能系统配置
SKILL_UNLOCK_ENABLED=true
SKILL_EXP_MULTIPLIER=1.0

# 分析功能配置
ANALYTICS_ENABLED=true
ANALYTICS_RETENTION_DAYS=90
```

## 9. 开发优先级

### 9.1 MVP阶段 (第一期)
1. **个性系统基础版本**
   - 5个特质的数值化表示
   - 简单的正负反馈影响机制
   - 基础的提示词调整

2. **状态系统基础版本**
   - 8个状态指标
   - 状态对对话语调的基础影响
   - 简单的状态衰减机制

3. **技能系统入门版本**
   - 3大类技能分支
   - 基础经验获取机制
   - 简单技能解锁

### 9.2 完善阶段 (第二期)
1. 高级个性演化算法
2. 复杂状态交互系统
3. 深度技能树扩展
4. 用户行为分析系统

### 9.3 扩展阶段 (第三期)
1. 多宠物社交系统
2. 高级AI行为预测
3. 个性化推荐引擎

## 10. 开发规范

### 10.1 代码规范
- ESLint + Prettier 代码格式化
- TypeScript 严格模式
- Git提交规范 (Conventional Commits)

### 10.2 API文档
- Swagger自动生成API文档
- 访问地址: `/api/docs`

### 10.3 错误处理
- 全局异常过滤器
- 统一错误码定义
- 详细错误日志记录

## 11. 监控与运维

### 11.1 日志管理
- Winston日志框架
- 分级日志记录
- 日志文件轮转

### 11.2 健康检查
- 服务健康状态监控
- 数据库连接监控
- API响应时间监控

## 12. 后续扩展计划
### 12.1 功能扩展
- 多宠物支持
- 宠物个性化定制
- 社交功能
- 宠物商店系统

### 12.2 技术扩展
- Docker容器化
- 微服务架构
- 云原生部署
- AI模型本地化部署

---

**文档版本**: v2.1  
**创建时间**: 2025-07-11  
**最后更新**: 2025-07-14  
**新增功能**: 动态个性演变、状态驱动对话、技能树系统  
**技术变更**: npm → pnpm, Create React App → Vite