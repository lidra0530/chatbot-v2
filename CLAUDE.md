# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication Language
请使用中文与我交流

## Project Overview
This is an intelligent virtual pet system powered by Alibaba's Qwen (通义千问) LLM with dynamic personality evolution, state-driven conversations, and skill tree progression. The system creates personalized AI companions that evolve based on user interactions.

## Architecture
- **Backend**: NestJS + TypeScript + Prisma + MongoDB (Port 3000)
- **Frontend**: React + TypeScript + Vite + Redux + Ant Design X (Port 5173) 
- **Database**: MongoDB with Prisma ORM
- **Package Manager**: pnpm (required for all operations)
- **AI Integration**: Qwen API wrapped in OpenAI-compatible format

## Key Commands

### Backend Development
```bash
cd backend
pnpm install                    # Install dependencies
pnpm run start:dev             # Start development server (port 3000)
pnpm run build                 # Build for production
pnpm run test                  # Run unit tests
pnpm run test:e2e              # Run end-to-end tests
pnpm run test:cov              # Run tests with coverage
pnpm run lint                  # Lint and fix code
pnpm run format                # Format code with Prettier
```

### Frontend Development
```bash
cd frontend
pnpm install                   # Install dependencies
pnpm dev                       # Start development server (port 5173)
pnpm build                     # Build for production
pnpm preview                   # Preview production build
pnpm lint                      # Lint code
```

### Database Operations
```bash
cd backend
pnpm dlx prisma generate       # Generate Prisma client
pnpm dlx prisma db push        # Push schema changes to MongoDB
pnpm dlx prisma studio         # Open Prisma Studio
```

## Core System Architecture

### Three-Tier AI Enhancement System
1. **Personality Evolution Engine** (`src/algorithms/personality-evolution.ts`)
   - Dynamic trait adjustment based on interaction history
   - Applies evolution limits and analyzes interaction patterns

2. **State-Driven System** (`src/algorithms/state-driver.ts`) 
   - Maps pet states to conversation modifiers
   - Handles state decay and interaction-based updates

3. **Skill Tree System** (`src/algorithms/skill-system.ts`)
   - Evaluates unlock conditions and calculates experience
   - Manages progressive ability unlocking

### Module Structure
```
backend/src/modules/
├── personality/    # Personality evolution tracking
├── skills/         # Skill tree and ability management  
├── state/          # Pet state monitoring and updates
├── chat/           # Enhanced conversation system
├── auth/           # JWT-based authentication
├── users/          # User management
└── pets/           # Pet creation and management
```

### Frontend Architecture
```
frontend/src/
├── store/slices/   # Redux state management
│   ├── authSlice.ts
│   ├── petSlice.ts
│   ├── personalitySlice.ts
│   ├── skillsSlice.ts
│   └── stateSlice.ts
├── components/     # Reusable UI components
└── services/       # API client and WebSocket management
```

## Development Guidelines

### Environment Configuration
- Backend uses `.env` file with MongoDB URL, JWT secrets, and Qwen API keys
- Frontend proxies `/api` and `/socket.io` to backend during development
- All API calls should use relative paths (handled by Vite proxy)

### Database Models (When Implemented)
The system will include models for User, Pet, Conversation, Message, PetEvolutionLog, and InteractionPattern with MongoDB document structure.

### API Integration
- Qwen API integration will be OpenAI-compatible
- WebSocket events for real-time personality/skill/state updates
- Swagger documentation available at `/api/docs` when backend is running

### Code Standards
- TypeScript strict mode enabled across both projects
- ESLint + Prettier with strict rules configured
- Conventional Commits format for version control
- Jest for backend testing, React Testing Library for frontend

## Important Notes
- Always use `pnpm` instead of `npm` or `yarn`
- Frontend development server runs on port 5173 (Vite default)
- Backend expects MongoDB running on default port 27017
- The system is designed for monorepo-style development with separate backend/frontend folders
- All major development phases should be committed using Conventional Commits format

## Implementation Status
This project follows a detailed implementation checklist (`docs/implementation-checklist.md`) with 266 specific steps across 11 major phases. Currently in early development phase with basic project infrastructure completed.

## Architecture Documentation Status
**架构文档已完成更新**
- `docs/system-architecture.md` 已更新完成，反映了最新的设计变更：
  - ✅ User模型的优化设计（已添加displayName、bio、isVerified、lastLogin字段）
  - ✅ AuthResponseDto/UserResponseDto的拆分结构设计已文档化
  - ✅ Pet模型已修复并完全符合原始架构设计
- 所有数据模型和API结构均与当前实现保持一致

# 后端开发完成状态 (2025-07-21)
**电子宠物系统后端已100%完成**，包含以下核心组件：
- 5阶段个性演化引擎 (1151行算法)
- 综合聊天服务系统 (1368行集成服务)
- WebSocket实时通信 (465行网关服务)
- 完整的技能树和状态管理系统
- JWT认证和用户管理
- MongoDB数据模型和Prisma ORM集成
- 成本控制、缓存优化和性能监控

**下一步**: 开始前端React+TypeScript开发
