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

### 2.2 个性服务模块架构 (更新后)
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            Personality Module                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │   Evolution     │  │    Cache        │  │   Analytics     │                │
│  │   Service       │  │   Service       │  │   Service       │                │
│  │                 │  │                 │  │                 │                │
│  │ • 个性演化计算   │  │ • Redis缓存     │  │ • 趋势分析      │                │
│  │ • 分布式锁      │  │ • 内存回退      │  │ • 推荐生成      │                │
│  │ • 速率限制      │  │ • 失效策略      │  │ • 数据聚合      │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
│           │                     │                     │                       │
│           └─────────────────────┼─────────────────────┘                       │
│                                 │                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │   Concurrency   │  │   Database      │  │   Error         │                │
│  │   Control       │  │   Optimizer     │  │   Handler       │                │
│  │                 │  │                 │  │                 │                │
│  │ • 分布式锁      │  │ • 查询优化      │  │ • 异常分类      │                │
│  │ • 队列处理      │  │ • 并行查询      │  │ • 重试机制      │                │
│  │ • 速率限制      │  │ • 连接池管理    │  │ • 日志记录      │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
└─────────────────────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        PersonalityEvolutionEngine                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │   Interaction   │  │   Evolution     │  │   Config        │                │
│  │   Classifier    │  │   Pipeline      │  │   Manager       │                │
│  │                 │  │                 │  │                 │                │
│  │ • 事件分类      │  │ • 流水线处理    │  │ • 演化限制      │                │
│  │ • 深度评估      │  │ • 增量计算      │  │ • 权重配置      │                │
│  │ • 参与度分析    │  │ • 基线锚定      │  │ • 阈值管理      │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 服务依赖关系图
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Service Dependencies                              │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │  PersonalityModule  │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼───────┐    ┌─────────▼─────────┐    ┌───────▼───────┐
│  Evolution    │    │     Cache         │    │   Analytics   │
│   Service     │    │    Service        │    │   Service     │
└───────┬───────┘    └─────────┬─────────┘    └───────┬───────┘
        │                      │                      │
        │              ┌───────▼───────┐              │
        │              │ Redis Service │              │
        │              └───────────────┘              │
        │                                             │
        ├─────────────────────┬───────────────────────┤
        │                     │                       │
┌───────▼───────┐    ┌────────▼────────┐    ┌─────────▼─────────┐
│  Concurrency  │    │   Database      │    │  Evolution       │
│   Control     │    │   Optimizer     │    │  Engine          │
└───────┬───────┘    └────────┬────────┘    └─────────┬─────────┘
        │                     │                       │
        │                     │                       │
        └─────────────────────┼───────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Prisma Service   │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │    MongoDB        │
                    └───────────────────┘

External Dependencies:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Redis        │    │   通义千问API    │    │   Task Queue    │
│   (Caching)     │    │   (AI Model)    │    │  (Scheduling)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 2.4 技术架构层次
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
  "password": "string",
  "avatar": "string",
  "displayName": "string",
  "bio": "string",
  "isVerified": "boolean",
  "lastLogin": "Date",
  "createdAt": "Date",
  "updatedAt": "Date"
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

#### 3.1.5 pet_evolution_logs - 宠物演化日志 (更新后)
```json
{
  "_id": "ObjectId",
  "petId": "ObjectId",
  "userId": "ObjectId",
  "evolutionId": "string",
  "timestamp": "Date",
  "evolutionType": "personality",
  
  // 个性演化详细记录
  "personalityEvolution": {
    "beforeSnapshot": {
      "openness": 65,
      "conscientiousness": 70,
      "extraversion": 45,
      "agreeableness": 68,
      "neuroticism": 32
    },
    "afterSnapshot": {
      "openness": 67,
      "conscientiousness": 70,
      "extraversion": 45,
      "agreeableness": 70,
      "neuroticism": 30
    },
    "traitChanges": {
      "openness": 2,
      "agreeableness": 2,
      "neuroticism": -2
    },
    "triggerEvent": {
      "type": "conversation",
      "interactionType": "casual_chat",
      "engagementLevel": "high",
      "topicComplexity": 0.7,
      "emotionalIntensity": 0.8,
      "duration": 180
    },
    "analysisResult": {
      "confidence": 0.85,
      "reason": "积极的深度对话互动",
      "impactScore": 0.8,
      "algorithmVersion": "1.0.0"
    },
    "evolutionContext": {
      "recentPatterns": {
        "totalInteractions": 15,
        "averageEngagement": 0.7,
        "dominantTopics": ["literature", "creativity"]
      },
      "appliedLimits": {
        "dailyLimit": 5,
        "weeklyLimit": 15,
        "currentDailyUsage": 3,
        "currentWeeklyUsage": 8
      }
    }
  },
  
  // 处理元数据
  "processingMetadata": {
    "processingTime": 150,
    "cacheHit": false,
    "eventsProcessed": 3,
    "lockWaitTime": 50,
    "databaseQueryTime": 80
  }
}
```

#### 3.1.6 personality_cache_entries - 个性缓存条目 (新增)
```json
{
  "_id": "ObjectId",
  "cacheKey": "string",
  "petId": "ObjectId",
  "cacheType": "analysis|trends|recommendations",
  "data": {
    // 根据cacheType存储不同类型的数据
    "personalityAnalysis": {...},
    "trends": {...},
    "recommendations": [...]
  },
  "metadata": {
    "version": "1.0.0",
    "algorithm": "evolution-engine",
    "computationTime": 250,
    "dataPoints": 100
  },
  "ttl": "number", // TTL in seconds
  "createdAt": "Date",
  "lastAccessed": "Date",
  "accessCount": "number"
}
```

#### 3.1.7 personality_settings - 个性演化设置 (新增)
```json
{
  "_id": "ObjectId",
  "petId": "ObjectId",
  "userId": "ObjectId",
  "settings": {
    "evolutionEnabled": true,
    "evolutionRate": 1.0,
    "stabilityThreshold": 0.1,
    "maxDailyChange": 5,
    "maxWeeklyChange": 15,
    "maxMonthlyChange": 30,
    "traitLimits": {
      "openness": {"min": 0, "max": 100},
      "conscientiousness": {"min": 0, "max": 100},
      "extraversion": {"min": 0, "max": 100},
      "agreeableness": {"min": 0, "max": 100},
      "neuroticism": {"min": 0, "max": 100}
    },
    "triggers": {
      "conversation": {"enabled": true, "weight": 1.0},
      "praise": {"enabled": true, "weight": 1.5},
      "criticism": {"enabled": true, "weight": 0.8},
      "silence": {"enabled": true, "weight": 0.3}
    },
    "anchoringStrength": 0.1
  },
  "version": "1.0.0",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

#### 3.1.8 personality_analytics_cache - 分析缓存表 (新增)
```json
{
  "_id": "ObjectId",
  "petId": "ObjectId",
  "analyticsType": "trends|stability|patterns|recommendations",
  "timeWindow": "daily|weekly|monthly",
  "data": {
    "trends": {
      "openness": {
        "direction": "increasing",
        "changeRate": 0.15,
        "significance": 0.8
      }
    },
    "stability": {
      "overall": 0.85,
      "individual": {
        "openness": 0.7,
        "conscientiousness": 0.9
      }
    },
    "patterns": [
      {
        "type": "conversation",
        "frequency": 5,
        "impact": 0.8
      }
    ],
    "recommendations": [
      {
        "type": "interaction",
        "priority": "high",
        "description": "增加创意类对话"
      }
    ]
  },
  "computationMetadata": {
    "algorithm": "personality-analytics-v1",
    "dataPoints": 150,
    "confidence": 0.88,
    "processingTime": 320
  },
  "expiresAt": "Date",
  "createdAt": "Date"
}
```

#### 3.1.9 interaction_patterns - 互动模式分析 (新增)
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

#### 4.2.3 个性演化管理 (更新后)
- `GET /api/v1/personality/pets/:id/traits` - 获取宠物个性特质
- `PUT /api/v1/personality/pets/:id/traits` - 更新宠物个性特质
- `GET /api/v1/personality/pets/:id/analysis` - 获取个性分析报告
- `GET /api/v1/personality/pets/:id/history` - 获取个性演化历史
- `POST /api/v1/personality/pets/:id/evolve` - 触发个性演化处理
- `GET /api/v1/personality/pets/:id/settings` - 获取演化设置
- `PUT /api/v1/personality/pets/:id/settings` - 更新演化设置
- `POST /api/v1/personality/batch/evolve` - 批量个性演化处理
- `GET /api/v1/personality/analytics/:id/trends` - 获取趋势分析
- `POST /api/v1/personality/cache/invalidate/:id` - 刷新个性缓存

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

#### 4.2.7 个性API详细示例

**获取个性特质：**
```http
GET /api/v1/personality/pets/{petId}/traits
Response:
{
  "success": true,
  "data": {
    "petId": "pet-123",
    "traits": {
      "openness": 68,
      "conscientiousness": 72,
      "extraversion": 45,
      "agreeableness": 80,
      "neuroticism": 25
    },
    "lastUpdated": "2025-07-17T01:30:00Z"
  }
}
```

**触发个性演化：**
```http
POST /api/v1/personality/pets/{petId}/evolve
Request:
{
  "interactionData": {
    "userMessage": "你今天心情如何？",
    "botResponse": "我很开心！谢谢你的关心。",
    "interactionType": "conversation",
    "duration": 120,
    "emotionalTone": "positive"
  }
}
Response:
{
  "success": true,
  "data": {
    "petId": "pet-123",
    "evolutionTriggered": true,
    "changesApplied": {
      "openness": 2,
      "agreeableness": 1
    },
    "newTraits": {
      "openness": 70,
      "conscientiousness": 72,
      "extraversion": 45,
      "agreeableness": 81,
      "neuroticism": 25
    },
    "confidence": 0.85,
    "reason": "积极的情感互动",
    "timestamp": "2025-07-17T01:35:00Z"
  }
}
```

**获取个性分析：**
```http
GET /api/v1/personality/pets/{petId}/analysis
Response:
{
  "success": true,
  "data": {
    "petId": "pet-123",
    "trends": {
      "openness": {
        "direction": "increasing",
        "changeRate": 0.15,
        "significance": 0.8
      }
    },
    "stability": {
      "overall": 0.85,
      "individual": {
        "openness": 0.7,
        "conscientiousness": 0.9
      }
    },
    "patterns": [
      {
        "type": "conversation",
        "frequency": 5,
        "impact": 0.8
      }
    ],
    "recommendations": [
      {
        "type": "interaction",
        "priority": "high",
        "description": "增加创意类对话以提升开放性"
      }
    ]
  }
}
```

#### 4.2.8 对话管理
- `POST /api/v1/conversations` - 创建对话会话
- `GET /api/v1/conversations` - 获取对话列表
- `GET /api/v1/conversations/:id/messages` - 获取对话历史

#### 4.2.9 分析和洞察
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

### 4.3 API响应结构设计

#### 4.3.1 认证响应DTO拆分设计
```typescript
// 认证响应DTO - 登录/注册时返回
interface AuthResponseDto {
  accessToken: string;
  user: UserResponseDto;
}

// 用户信息响应DTO - 用户数据返回
interface UserResponseDto {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatar?: string;
  isVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 4.3.2 宠物相关响应DTO
```typescript
interface PetResponseDto {
  id: string;
  name: string;
  breed: string;
  description?: string;
  avatarUrl?: string;
  level: number;
  experience: number;
  personality: PersonalityTraits;
  currentState: PetState;
  skillTree: SkillTree;
  evolutionStage: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.4 安全机制
- JWT Token认证
- API限流 (Redis + 滑动窗口)
- CORS跨域配置
- 请求参数校验
- SQL注入防护

## 5. 核心算法设计

### 5.1 个性演化算法 (流水线架构)

#### 5.1.1 PersonalityEvolutionEngine 核心接口
```typescript
interface PersonalityEvolutionEngine {
  // 1. 分析近期互动模式
  analyzeInteractionPatterns(
    evolutionHistory: EvolutionEvent[],
    timeWindowDays: number = 7
  ): InteractionPattern;
  
  // 2. 基于模式计算原始调整值
  calculateRawAdjustment(
    pattern: InteractionPattern,
    currentTraits: PersonalityTraits
  ): RawPersonalityAdjustment;
  
  // 3. 应用基线锚定效果
  applyBaselineAnchoring(
    rawAdjustment: RawPersonalityAdjustment,
    currentTraits: PersonalityTraits,
    baselineTraits: PersonalityTraits,
    anchoringStrength: number = 0.1
  ): PersonalityAdjustment;
  
  // 4. 应用阶梯式限制
  applyEvolutionLimits(
    adjustment: PersonalityAdjustment,
    limits: EvolutionLimits
  ): FinalPersonalityAdjustment;
  
  // 5. 主控制器方法 - 增量计算模式
  processPersonalityEvolution(
    petId: string,
    triggerType: "scheduled" | "interaction" | "manual"
  ): Promise<EvolutionResult>;
}
```

#### 5.1.2 数据结构设计
```typescript
// 混合式事件记录结构
interface EvolutionEvent {
  timestamp: Date;
  eventType: "chat_completion" | "praise" | "deep_discussion" | "silence_period";
  impact: {
    traits: {
      openness: number;
      conscientiousness: number;
      extraversion: number;
      agreeableness: number;
      neuroticism: number;
    };
    intensity: number;    // 0.1-2.0，基于互动深度/频率调整
    confidence: number;   // 0-1，算法对这次判断的置信度
  };
  context: {
    sessionDuration?: number;
    messageCount?: number;
    topicDepth?: number;
    userEngagement?: "low" | "medium" | "high";
  };
}

// 互动模式分析结果
interface InteractionPattern {
  totalEvents: number;
  averageIntensity: number;
  dominantEventTypes: string[];
  engagementLevel: "low" | "medium" | "high";
  topicDiversity: number;
  temporalDistribution: {
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  };
}

// 演化限制配置
interface EvolutionLimits {
  daily: { max: number; min: number };
  weekly: { max: number; min: number };
  monthly: { max: number; min: number };
  absolute: { max: number; min: number };
  anchoringStrength: number;
}
```

#### 5.1.3 核心计算原理
- **增量计算机制**: 仅处理自`lastEvolutionCheck`以来的新事件，基于当前`personality.traits`快照进行计算
- **权重驱动调整**: 使用预配置的互动权重表，根据事件类型和上下文修饰符计算特质影响
- **时间窗口滤波**: 主要分析最近7天的互动模式，使用指数衰减降低远期事件影响
- **基线锚定控制**: 温和的拉力机制防止个性过度偏离初始设定，保持角色一致性
- **阶梯式边界**: 多层次限制机制（日/周/月）确保个性变化在合理范围内

#### 5.1.4 配置系统设计
```typescript
// 互动权重配置表
interface InteractionWeights {
  chat_completion: {
    base: TraitAdjustment;
    modifiers: {
      highEngagement: TraitAdjustment;
      deepTopic: TraitAdjustment;
      longSession: TraitAdjustment;
    };
  };
  praise: {
    base: TraitAdjustment;
  };
  silence_period: {
    base: TraitAdjustment;
  };
}

// 特质调整结构
interface TraitAdjustment {
  openness?: number;
  conscientiousness?: number;
  extraversion?: number;
  agreeableness?: number;
  neuroticism?: number;
}

// 演化结果类型
interface EvolutionResult {
  petId: string;
  evolutionTriggered: boolean;
  traitChanges: TraitAdjustment;
  newTraits: PersonalityTraits;
  evolutionReason: string;
  nextEvolutionCheck: Date;
}
```

#### 5.1.5 互动事件捕获系统
```typescript
// 互动分类器接口
interface InteractionClassifier {
  // 分析原始互动并转换为演化事件
  classifyInteraction(
    rawInteraction: RawInteraction,
    contextHistory: Message[],
    petContext: PetContext
  ): EvolutionEvent;
  
  // 评估互动深度
  evaluateInteractionDepth(
    messageContent: string,
    sessionContext: SessionContext
  ): number;
  
  // 评估用户参与度
  evaluateUserEngagement(
    responseTime: number,
    messageLength: number,
    interactionFrequency: number
  ): "low" | "medium" | "high";
}

// 原始互动数据
interface RawInteraction {
  type: "message" | "praise" | "silence" | "system_action";
  content?: string;
  timestamp: Date;
  sessionDuration: number;
  responseTime?: number;
  metadata: Record<string, any>;
}
```

#### 5.1.6 性能优化策略
- **快照机制**: `personality.traits`作为当前状态快照，避免重复计算历史数据
- **批处理计算**: 定时任务模式处理大量宠物的个性更新
- **缓存中间结果**: 互动模式分析结果缓存30分钟
- **分层触发**: 轻微调整实时计算，重大分析定时批处理
- **增量处理**: 仅计算自`lastEvolutionCheck`以来的新事件
- **实时分类**: 互动事件实时分类并记录到演化历史

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

**文档版本**: v2.2  
**创建时间**: 2025-07-11  
**最后更新**: 2025-07-15  
**新增功能**: 动态个性演变、状态驱动对话、技能树系统  
**核心算法增强**: 个性演化算法采用流水线架构，支持增量计算和性能优化  
**技术变更**: npm → pnpm, Create React App → Vite