# 电子宠物系统

基于阿里通义千问大模型的智能电子宠物系统，具备动态个性演变、状态驱动对话和技能成长系统。

## 功能特性

- **动态个性化演变**: 宠物性格根据用户互动动态调整
- **状态驱动对话**: 宠物状态影响对话内容和风格
- **技能树系统**: 宠物通过互动解锁新能力和对话风格

## 技术栈

### 后端
- NestJS + TypeScript
- MongoDB + Prisma ORM
- JWT认证
- WebSocket实时通信
- 阿里通义千问API

### 前端
- React + TypeScript + Vite
- Redux状态管理
- Ant Design X组件库
- Socket.io客户端

### 工具链
- pnpm 包管理器
- Vite 构建工具
- ESLint + Prettier 代码规范

## 项目结构

```
chatbot/
├── backend/          # NestJS后端项目
│   ├── src/
│   │   ├── modules/
│   │   │   ├── personality/     # 个性演化模块
│   │   │   ├── skills/         # 技能系统模块
│   │   │   ├── state/          # 状态管理模块
│   │   │   └── analytics/      # 分析模块
│   │   ├── algorithms/         # 核心算法
│   │   └── utils/              # 工具函数
├── frontend/         # React前端项目
│   ├── src/
│   │   ├── components/
│   │   │   ├── personality/    # 个性展示组件
│   │   │   ├── skills/         # 技能树组件
│   │   │   └── state/          # 状态展示组件
│   │   └── store/             # Redux状态管理
└── docs/            # 项目文档
    ├── api/         # API文档
    └── algorithms/  # 算法说明
```

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- MongoDB >= 6.0
- 阿里云通义千问API Key

### 安装步骤

1. 克隆项目
```bash
git clone <repository-url>
cd chatbot
```

2. 安装pnpm(如果未安装)
```bash
npm install -g pnpm
```

3. 安装后端依赖
```bash
cd backend
pnpm install
```

4. 安装前端依赖
```bash
cd ../frontend
pnpm install
```

4. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，填入必要的配置信息
```

5. 启动数据库
```bash
# 确保MongoDB服务运行
# 运行数据库迁移
cd backend
pnpm dlx prisma generate
```

6. 启动开发服务器
```bash
# 启动后端服务器 (终端1)
cd backend
pnpm run start:dev

# 启动前端服务器 (终端2)
cd frontend
pnpm dev
```

## 开发指南

### API文档

启动后端服务器后，访问 `http://localhost:8000/api/docs` 查看Swagger API文档。

### 环境变量配置

参考 `.env.example` 文件配置以下环境变量：

- `DATABASE_URL`: MongoDB连接字符串
- `JWT_SECRET`: JWT密钥
- `QWEN_API_KEY`: 通义千问API密钥
- `QWEN_API_BASE`: 通义千问API基础URL

### 代码规范

- 使用ESLint + Prettier进行代码格式化
- 遵循TypeScript严格模式
- 使用Conventional Commits规范提交信息

## 部署

### 生产环境

1. 构建前端应用
```bash
cd frontend
pnpm build
```

2. 构建后端应用
```bash
cd backend
pnpm build
```

3. 配置生产环境变量

4. 启动应用
```bash
cd backend
pnpm start:prod
```

## 文档

- [系统架构设计](./docs/system-architecture.md)
- [实施清单](./docs/implementation-checklist.md)
- [API文档](http://localhost:8000/api/docs)

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交变更
4. 创建 Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请创建 Issue 或联系项目维护者。