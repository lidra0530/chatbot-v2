# 电子宠物系统 🐾

基于阿里通义千问大模型的智能电子宠物系统，具备动态个性演变、状态驱动对话和技能成长系统。

> **开发状态**: 后端开发已100%完成 ✅ | 前端开发即将启动 🚧  
> **技术亮点**: 5阶段演化引擎 | 实时WebSocket通信 | 企业级微服务架构

## 🌟 核心功能特性

### 🧠 智能AI系统 (已完成)
- **5阶段个性演化引擎**: 1151行高级算法，支持动态个性特征调整
- **状态驱动对话系统**: 287行状态映射引擎，智能调节对话风格
- **技能树成长系统**: 渐进式能力解锁，支持经验积累和技能前置条件
- **实时WebSocket通信**: 465行网关服务，支持4种实时事件推送

### 💡 技术亮点
- **企业级架构**: NestJS微服务架构，支持高并发和水平扩展
- **智能缓存系统**: LRU内存缓存 + Redis分布式缓存策略
- **成本控制机制**: API调用成本监控和智能限流
- **全面监控体系**: 性能监控、错误追踪和业务指标收集

## 🛠️ 技术栈

### 🔧 后端 (已完成 ✅)
- **框架**: NestJS + TypeScript (严格模式)
- **数据库**: MongoDB + Prisma ORM
- **认证**: JWT + 全局认证守卫
- **实时通信**: WebSocket + Socket.IO
- **AI集成**: 阿里通义千问API (OpenAI兼容)
- **缓存**: Redis + LRU内存缓存双层策略
- **监控**: 性能监控 + 成本控制 + 错误追踪

### 🎨 前端 (开发中 🚧)
- **框架**: React 18 + TypeScript + Vite
- **状态管理**: Redux Toolkit + RTK Query
- **UI组件**: Ant Design X + 自定义组件
- **实时通信**: Socket.IO Client
- **构建工具**: Vite + ESBuild

### ⚡ 开发工具链
- **包管理**: pnpm (工作区支持)
- **代码质量**: ESLint + Prettier + Husky
- **测试**: Jest + React Testing Library
- **API文档**: Swagger/OpenAPI 3.0

## 📁 项目架构

```
chatbot/
├── backend/ ✅                    # NestJS后端 (已完成)
│   ├── src/
│   │   ├── modules/               # 核心业务模块
│   │   │   ├── personality/       # 个性演化 (654行门面服务)
│   │   │   │   ├── services/      # 演化服务、缓存、历史记录
│   │   │   │   ├── dto/           # 数据传输对象
│   │   │   │   └── __tests__/     # 完整测试覆盖
│   │   │   ├── skills/           # 技能系统 (900行服务)
│   │   │   ├── state/            # 状态管理 (517行服务)
│   │   │   ├── chat/             # 聊天服务 (1368行集成服务)
│   │   │   ├── auth/             # JWT认证系统
│   │   │   ├── users/            # 用户管理
│   │   │   ├── pets/             # 宠物管理
│   │   │   └── conversations/    # 对话历史
│   │   ├── algorithms/           # 核心AI算法引擎
│   │   │   ├── personality-evolution.ts  # 1151行5阶段演化
│   │   │   ├── state-driver.ts   # 287行状态驱动
│   │   │   └── skill-system.ts   # 技能系统算法
│   │   ├── gateways/             # WebSocket实时通信
│   │   │   └── pet.gateway.ts    # 465行实时网关
│   │   ├── common/               # 共享服务
│   │   │   ├── cache/            # 缓存服务
│   │   │   ├── cost-control/     # 成本控制
│   │   │   └── monitoring/       # 性能监控
│   │   └── config/               # 配置管理
│   ├── prisma/                   # 数据库Schema
│   └── test/                     # E2E测试
├── frontend/ 🚧                   # React前端 (即将开发)
│   ├── src/
│   │   ├── components/           # 可复用组件
│   │   │   ├── personality/      # 个性展示组件
│   │   │   ├── skills/          # 技能树可视化
│   │   │   ├── state/           # 状态仪表板
│   │   │   └── chat/            # 聊天界面
│   │   ├── store/               # Redux状态管理
│   │   │   ├── slices/          # 状态切片
│   │   │   └── api/             # RTK Query API
│   │   ├── services/            # API客户端
│   │   └── utils/               # 工具函数
└── docs/ ✅                       # 完整项目文档
    ├── system-architecture.md    # 系统架构设计 (v2.2)
    ├── implementation-checklist.md # 实施清单 (v2.4)
    ├── tech-debt-cleanup-plan.md # 技术债务管理
    └── api/                      # Swagger API文档
```

## 🚀 快速开始

### 📋 环境要求

- **Node.js** >= 18.0.0 (推荐 20.x LTS)
- **pnpm** >= 8.0.0 (必需，不支持npm/yarn)
- **MongoDB** >= 6.0 (推荐 7.x)
- **阿里云通义千问API Key** (支持OpenAI兼容格式)
- **Redis** >= 6.0 (可选，用于分布式缓存)

### 📦 安装步骤

#### 1️⃣ 克隆项目
```bash
git clone <repository-url>
cd chatbot
```

#### 2️⃣ 安装pnpm (如果未安装)
```bash
npm install -g pnpm@latest
```

#### 3️⃣ 安装后端依赖 ✅
```bash
cd backend
pnpm install                    # 安装所有依赖
pnpm dlx prisma generate        # 生成Prisma客户端
```

#### 4️⃣ 配置环境变量
```bash
cd backend
cp .env.example .env
# 编辑 .env 文件，配置以下关键变量：
# DATABASE_URL="mongodb://localhost:27017/chatbot"
# JWT_SECRET="your-jwt-secret-key"
# QWEN_API_KEY="your-qwen-api-key"
# QWEN_API_BASE="https://dashscope.aliyuncs.com/compatible-mode/v1"
```

#### 5️⃣ 启动数据库服务
```bash
# 确保MongoDB服务运行在端口27017
sudo systemctl start mongod     # Linux
brew services start mongodb-community  # macOS

# 推送数据库Schema
cd backend
pnpm dlx prisma db push
```

#### 6️⃣ 启动后端服务 (已完成) ✅
```bash
cd backend
pnpm run start:dev              # 开发模式 (端口3000)
# 或
pnpm run start:prod             # 生产模式
```

#### 7️⃣ 安装前端依赖 (即将开始) 🚧
```bash
cd ../frontend
pnpm install                    # 安装前端依赖
pnpm dev                        # 启动开发服务器 (端口5173)
```

## 📚 开发指南

### 🔗 API文档和服务端点

后端服务器启动后可访问以下端点：

- **Swagger API文档**: `http://localhost:3000/api/docs`
- **WebSocket连接**: `ws://localhost:3000/socket.io`
- **健康检查**: `http://localhost:3000/api/health`

#### 主要API端点：
```
POST   /api/auth/register          # 用户注册
POST   /api/auth/login             # 用户登录
GET    /api/pets                   # 获取宠物列表
POST   /api/chat/completion        # AI对话接口
GET    /api/personality/evolution  # 获取个性演化数据
GET    /api/skills/tree           # 获取技能树数据
GET    /api/state/current         # 获取当前状态
```

### ⚙️ 环境变量配置

完整的环境变量配置 (参考 `backend/.env.example`)：

```env
# 数据库配置
DATABASE_URL="mongodb://localhost:27017/chatbot"

# JWT认证
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# 通义千问API
QWEN_API_KEY="your-qwen-api-key"
QWEN_API_BASE="https://dashscope.aliyuncs.com/compatible-mode/v1"
QWEN_MODEL="qwen-plus"

# Redis缓存 (可选)
REDIS_URL="redis://localhost:6379"

# 应用配置
PORT=3000
NODE_ENV="development"

# 成本控制
MAX_DAILY_COST=100.00
COST_ALERT_THRESHOLD=80.00
```

### 📝 代码规范

- **TypeScript严格模式**: 启用所有严格检查
- **ESLint + Prettier**: 自动代码格式化和规范检查
- **Conventional Commits**: 标准化提交信息格式
- **测试驱动**: 单元测试覆盖率 > 85%
- **API文档**: 所有端点必须有Swagger注解

## 🚀 部署指南

### 🏭 生产环境部署

#### 1️⃣ 构建后端应用 ✅
```bash
cd backend
pnpm build                      # TypeScript编译
pnpm dlx prisma generate        # 生成生产环境Prisma客户端
```

#### 2️⃣ 构建前端应用 (即将完成) 🚧
```bash
cd frontend
pnpm build                      # Vite生产构建
pnpm preview                     # 预览生产版本
```

#### 3️⃣ 生产环境配置
```env
# 生产环境变量配置
NODE_ENV="production"
PORT=3000
DATABASE_URL="mongodb://prod-server:27017/chatbot"
REDIS_URL="redis://prod-redis:6379"
JWT_SECRET="production-secret-key"
QWEN_API_KEY="production-qwen-key"
```

#### 4️⃣ 启动生产服务
```bash
cd backend
pnpm start:prod                 # 启动生产服务器
```

### 🐳 Docker部署 (可选)
```bash
# 构建Docker镜像
docker build -t chatbot-backend ./backend
docker build -t chatbot-frontend ./frontend

# 使用Docker Compose启动完整服务栈
docker-compose up -d
```

## 📖 项目文档

### 📋 技术文档
- **[系统架构设计](./docs/system-architecture.md)** (v2.2) - 完整的技术架构和数据模型设计
- **[实施清单](./docs/implementation-checklist.md)** (v2.4) - 350+具体实施步骤和完成状态
- **[技术债务管理](./docs/tech-debt-cleanup-plan.md)** - 系统优化和改进计划

### 🔗 在线文档
- **[Swagger API文档](http://localhost:3000/api/docs)** - 交互式API文档和测试界面
- **[数据库Schema](http://localhost:3000/prisma-studio)** - Prisma Studio数据管理界面

### 📊 系统状态
- **后端完成度**: 100% ✅ (企业级质量)
- **前端完成度**: 0% 🚧 (即将开始)
- **文档完整性**: 95% ✅ (持续更新)
- **测试覆盖率**: 85%+ ✅ (单元测试+集成测试)

## 🤝 贡献指南

### 开发流程
1. **Fork** 项目到个人仓库
2. **创建功能分支**: `git checkout -b feature/amazing-feature`
3. **遵循代码规范**: 运行 `pnpm run lint` 和 `pnpm run format`
4. **编写测试**: 确保新功能有相应的单元测试
5. **提交变更**: 使用 Conventional Commits 格式
6. **创建 Pull Request**: 详细描述变更内容

### 提交信息规范
```
feat: 添加新功能
fix: 修复问题
docs: 更新文档
style: 代码格式调整
refactor: 代码重构
test: 添加测试
chore: 构建配置等杂项
```

### 开发注意事项
- 所有API变更需要更新Swagger文档
- 新增功能需要添加对应的单元测试
- 数据库变更需要创建迁移脚本
- 重大变更需要更新系统架构文档

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

## 📞 联系方式

- **问题反馈**: [创建 Issue](https://github.com/your-repo/issues)
- **功能建议**: [讨论区](https://github.com/your-repo/discussions)
- **安全问题**: 请发送邮件至 security@example.com

---

## 🎯 项目路线图

### ✅ 已完成 (后端)
- [x] 核心架构设计和模块划分
- [x] 5阶段个性演化算法引擎
- [x] 状态驱动对话系统
- [x] 技能树和经验系统
- [x] WebSocket实时通信
- [x] JWT认证和用户管理
- [x] MongoDB数据模型和Prisma ORM
- [x] 成本控制和性能监控
- [x] 完整的API文档和测试覆盖

### 🚧 进行中 (前端)
- [ ] React+TypeScript基础架构
- [ ] Redux状态管理和API集成
- [ ] 用户界面和交互设计
- [ ] 聊天界面和实时通信
- [ ] 个性/技能/状态可视化组件
- [ ] 响应式设计和移动端适配

### 🔮 计划中 (增强功能)
- [ ] 多语言国际化支持
- [ ] 宠物外观自定义系统
- [ ] 社交功能和宠物互动
- [ ] 数据分析和用户洞察
- [ ] 移动应用开发
- [ ] 云部署和CI/CD流水线

---

**最后更新**: 2025-07-21 | **当前版本**: v1.0.0-beta (后端完成)