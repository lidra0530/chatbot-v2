# 电子宠物系统实施清单 (修订版 v2.2)

## 阶段一：项目基础设施搭建 (1-2天)

### 1. 项目结构初始化
1. 在 `/home/libra/project/chatbot` 目录下创建 `backend` 目录
2. 在 `/home/libra/project/chatbot` 目录下创建 `frontend` 目录  
3. 在根目录创建 `.gitignore` 文件
4. 在根目录创建 `README.md` 文件
5. 在根目录创建 `.env.example` 文件

### 2. 后端NestJS项目初始化
6. 确保系统已安装 pnpm：`npm install -g pnpm`
7. 进入 `backend` 目录，执行 `npx @nestjs/cli new . --package-manager pnpm` 初始化NestJS项目
8. 安装依赖包：`pnpm add @nestjs/mongoose mongoose prisma @prisma/client jsonwebtoken @nestjs/jwt @nestjs/passport passport passport-jwt bcryptjs class-validator class-transformer @nestjs/swagger swagger-ui-express @nestjs/websockets @nestjs/platform-socket.io`
9. 安装开发依赖：`pnpm add -D @types/jsonwebtoken @types/bcryptjs @types/passport-jwt eslint prettier`
10. 配置 `tsconfig.json` 启用严格模式
11. 配置 ESLint 和 Prettier 规则

### 3. 前端React+Vite项目初始化  
12. 进入 `frontend` 目录，执行 `pnpm create vite . --template react-ts` 初始化Vite+React项目
13. 安装依赖包：`pnpm add @reduxjs/toolkit react-redux antd @ant-design/x axios socket.io-client`
14. 安装开发依赖：`pnpm add -D @types/node eslint prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser`
15. 配置 TypeScript 严格模式
16. 配置 ESLint 和 Prettier 规则
17. 更新 `vite.config.ts` 配置开发服务器端口和代理

### 4. 数据库连接配置
18. 在 `backend` 目录初始化 Prisma：`pnpm dlx prisma init`
19. 配置 `prisma/schema.prisma` 文件，设置 MongoDB 数据源
20. 创建环境变量文件 `backend/.env`，配置数据库连接字符串
21. 测试 MongoDB 连接是否正常

### 5. 版本控制提交
22. 将所有更改添加到暂存区：`git add .`
23. 执行提交：`git commit -m "chore: initialize project infrastructure with backend and frontend setup

- Set up NestJS backend with pnpm package manager
- Initialize React+Vite frontend with TypeScript
- Configure MongoDB database connection with Prisma
- Set up ESLint and Prettier for code quality"`

## 阶段二：基础数据模型和API框架 (2-3天)

### 6. MongoDB Schema 定义
24. 在 `prisma/schema.prisma` 中定义 `User` 模型
25. 在 `prisma/schema.prisma` 中定义 `Pet` 模型（包含个性、状态、技能字段）
26. 在 `prisma/schema.prisma` 中定义 `Conversation` 模型
27. 在 `prisma/schema.prisma` 中定义 `Message` 模型（包含扩展的metadata）
28. 在 `prisma/schema.prisma` 中定义 `PetEvolutionLog` 模型
29. 在 `prisma/schema.prisma` 中定义 `InteractionPattern` 模型
30. 执行 `pnpm dlx prisma generate` 生成 Prisma 客户端

### 7. 基础模块结构创建
31. 创建 `src/modules/auth` 模块目录和基础文件
32. 创建 `src/modules/users` 模块目录和基础文件
33. 创建 `src/modules/pets` 模块目录和基础文件
34. 创建 `src/modules/conversations` 模块目录和基础文件
35. 创建 `src/modules/chat` 模块目录和基础文件
36. 创建 `src/modules/personality` 模块目录和基础文件
37. 创建 `src/modules/skills` 模块目录和基础文件
38. 创建 `src/modules/state` 模块目录和基础文件

### 8. 基础DTO和实体类定义
39. 在 `auth` 模块创建 `RegisterDto`, `LoginDto`, `AuthResponseDto`
40. 在 `users` 模块创建 `UserDto`, `UpdateUserDto`
41. 在 `pets` 模块创建 `CreatePetDto`, `PetDto`, `UpdatePetDto`
42. 在 `personality` 模块创建 `PersonalityTraitsDto`, `PersonalityEvolutionDto`
43. 在 `skills` 模块创建 `SkillTreeDto`, `SkillUnlockDto`
44. 在 `state` 模块创建 `PetStateDto`, `StateUpdateDto`
45. 在 `chat` 模块创建 `ChatCompletionDto`, `MessageDto`

### 9. 基础服务类创建
46. 在 `auth` 模块创建 `AuthService` 类，实现JWT认证逻辑
47. 在 `users` 模块创建 `UsersService` 类，实现用户CRUD操作
48. 在 `pets` 模块创建 `PetsService` 类，实现宠物基础管理
49. 在 `conversations` 模块创建 `ConversationsService` 类
50. 创建 `src/common/prisma.service.ts` 作为数据库连接服务

### 10. 版本控制提交
51. 将所有更改添加到暂存区：`git add .`
52. 执行提交：`git commit -m "feat: implement basic data models and API framework

- Define MongoDB schemas for User, Pet, Conversation, and Message
- Create basic module structure for auth, users, pets, conversations
- Implement foundational DTO classes and service layers
- Set up Prisma ORM with database models"`

## 阶段三：个性演化系统开发 (3-4天)

### 11. 个性演化算法实现
53. 创建 `src/algorithms/personality-evolution.ts` 文件
54. 实现 `PersonalityEvolutionEngine` 类，包含特质调整算法
55. 实现 `calculateTraitAdjustment` 方法，基于互动历史计算特质变化
56. 实现 `applyEvolutionLimits` 方法，应用演化边界限制
57. 实现 `analyzeInteractionPattern` 方法，分析用户互动模式
58. 创建个性特质到数值映射的配置文件

### 12. 个性系统服务层开发
59. 在 `personality` 模块实现 `PersonalityService` 类
60. 实现 `getPersonalityDetails` 方法获取宠物个性详情
61. 实现 `triggerPersonalityAnalysis` 方法触发个性分析
62. 实现 `updatePersonalityTraits` 方法更新个性特质
63. 实现 `getPersonalityHistory` 方法获取演化历史
64. 实现个性演化的定时任务机制

### 13. 个性系统API控制器
65. 在 `personality` 模块创建 `PersonalityController` 类
66. 实现 `GET /api/v1/pets/:id/personality` 端点
67. 实现 `GET /api/v1/pets/:id/personality/history` 端点
68. 实现 `POST /api/v1/pets/:id/personality/analyze` 端点
69. 实现 `PUT /api/v1/pets/:id/personality/settings` 端点
70. 添加API参数验证和错误处理

### 14. 个性系统数据持久化
71. 实现个性变化的数据库记录逻辑
72. 实现 `PetEvolutionLog` 的创建和查询
73. 实现个性演化历史的分页查询
74. 创建个性数据的数据库索引优化
75. 实现个性数据的缓存机制

### 15. 版本控制提交
76. 将所有更改添加到暂存区：`git add .`
77. 执行提交：`git commit -m "feat: implement personality evolution system with dynamic traits

- Create personality evolution algorithm with trait adjustment logic
- Implement personality service layer with evolution tracking
- Add personality API endpoints with comprehensive validation
- Set up personality data persistence with caching mechanisms"`

## 阶段四：状态驱动系统开发 (3-4天)

### 16. 状态管理算法实现
78. 创建 `src/algorithms/state-driver.ts` 文件
79. 实现 `StateDriverEngine` 类，包含状态到对话的映射逻辑
80. 实现 `generatePromptModifiers` 方法，根据状态生成提示词修饰符
81. 实现 `calculateStateDecay` 方法，计算状态自然衰减
82. 实现 `updateStateFromInteraction` 方法，根据互动更新状态
83. 创建状态影响系数的配置文件

### 17. 状态系统服务层开发  
84. 在 `state` 模块实现 `StateService` 类
85. 实现 `getCurrentState` 方法获取宠物当前状态
86. 实现 `updatePetState` 方法更新宠物状态
87. 实现 `processStateInteraction` 方法处理状态交互
88. 实现 `getStateHistory` 方法获取状态历史
89. 实现状态自动衰减的定时任务

### 18. 状态系统API控制器
90. 在 `state` 模块创建 `StateController` 类
91. 实现 `GET /api/v1/pets/:id/state` 端点
92. 实现 `PUT /api/v1/pets/:id/state` 端点  
93. 实现 `POST /api/v1/pets/:id/state/interact` 端点
94. 实现 `GET /api/v1/pets/:id/state/history` 端点
95. 添加状态更新的验证和边界检查

### 19. 状态系统数据持久化
96. 实现状态变化的数据库记录
97. 实现状态历史的高效查询
98. 创建状态数据的数据库索引
99. 实现状态数据的缓存策略

### 20. 版本控制提交
100. 将所有更改添加到暂存区：`git add .`
101. 执行提交：`git commit -m "feat: implement state-driven system with real-time updates

- Create state management algorithm with decay and interaction logic
- Implement state service layer with automatic decay scheduling
- Add state API endpoints with validation and boundary checks
- Set up state data persistence with efficient querying"`

## 阶段五：技能树系统开发 (4-5天)

### 21. 技能系统算法实现
102. 创建 `src/algorithms/skill-system.ts` 文件
103. 实现 `SkillSystemEngine` 类，包含技能解锁逻辑
104. 实现 `evaluateUnlockConditions` 方法评估解锁条件
105. 实现 `calculateExperienceGain` 方法计算经验获取
106. 实现 `unlockNewSkill` 方法解锁新技能
107. 创建技能树结构的配置文件

### 22. 技能系统服务层开发
108. 在 `skills` 模块实现 `SkillsService` 类
109. 实现 `getSkillTree` 方法获取技能树信息
110. 实现 `getAvailableSkills` 方法获取可解锁技能
111. 实现 `unlockSkill` 方法解锁新技能
112. 实现 `getCurrentAbilities` 方法获取当前能力
113. 实现技能经验自动增长机制

### 23. 技能系统API控制器
114. 在 `skills` 模块创建 `SkillsController` 类
115. 实现 `GET /api/v1/pets/:id/skills` 端点
116. 实现 `GET /api/v1/pets/:id/skills/available` 端点
117. 实现 `POST /api/v1/pets/:id/skills/unlock` 端点
118. 实现 `GET /api/v1/pets/:id/skills/abilities` 端点
119. 添加技能操作的权限验证

### 24. 技能系统数据持久化
120. 实现技能进度的数据库记录
121. 实现技能解锁历史记录
122. 创建技能数据的数据库索引
123. 实现技能数据的缓存机制

### 25. 版本控制提交
124. 将所有更改添加到暂存区：`git add .`
125. 执行提交：`git commit -m "feat: implement skill tree system with unlock mechanics

- Create skill system algorithm with unlock condition evaluation
- Implement skills service layer with automatic experience growth
- Add skills API endpoints with permission validation
- Set up skill data persistence with caching mechanisms"`

## 阶段六：增强对话系统集成 (3-4天)

### 26. AI提示词动态生成系统
126. 创建 `src/algorithms/prompt-generator.ts` 文件
127. 实现 `PromptGeneratorEngine` 类
128. 实现 `generatePersonalityPrompt` 方法，根据个性生成提示词
129. 实现 `generateStatePrompt` 方法，根据状态生成提示词
130. 实现 `generateSkillPrompt` 方法，根据技能生成提示词
131. 实现 `combinePrompts` 方法，组合完整提示词

### 27. 通义千问API集成
132. 创建 `src/services/qwen-api.service.ts` 文件
133. 实现 `QwenApiService` 类，封装通义千问API调用
134. 实现OpenAI格式的请求转换逻辑
135. 实现API调用的错误处理和重试机制
136. 实现API调用的限流和缓存
137. 添加API使用统计和监控

### 28. 增强对话服务开发
138. 在 `chat` 模块实现 `ChatService` 类
139. 实现 `processEnhancedChat` 方法，集成个性、状态、技能
140. 实现 `analyzeChatResponse` 方法，分析对话结果
141. 实现 `updatePetFromChat` 方法，根据对话更新宠物数据
142. 实现对话历史的智能管理
143. 实现对话上下文的动态维护

### 29. 增强对话API控制器
144. 在 `chat` 模块更新 `ChatController` 类
145. 实现增强版 `POST /api/v1/chat/completions` 端点
146. 添加宠物上下文参数处理
147. 实现对话结果的扩展响应格式
148. 添加对话质量监控和日志记录

### 30. 版本控制提交
149. 将所有更改添加到暂存区：`git add .`
150. 执行提交：`git commit -m "feat: integrate enhanced chat system with AI prompt generation

- Create dynamic prompt generation based on personality, state, and skills
- Integrate Qwen API service with OpenAI-compatible format
- Implement enhanced chat service with context management
- Add comprehensive chat monitoring and logging"`

## 阶段七：实时通信和WebSocket (2-3天)

### 31. WebSocket网关开发
151. 创建 `src/gateways/pet.gateway.ts` 文件
152. 实现 `PetGateway` 类，处理WebSocket连接
153. 实现连接认证和用户绑定机制
154. 实现房间管理（用户-宠物会话室）
155. 添加连接状态监控和错误处理

### 32. 实时事件系统
156. 实现 `personality_evolution` 事件推送
157. 实现 `skill_unlocked` 事件推送
158. 实现 `state_milestone` 事件推送
159. 实现 `evolution_opportunity` 事件推送
160. 实现实时消息的序列化和反序列化

### 33. WebSocket服务集成
161. 在各个服务中集成WebSocket事件发送
162. 在个性演化时发送实时通知
163. 在技能解锁时发送实时通知
164. 在状态变化时发送实时通知
165. 实现WebSocket连接的优雅断开和重连

### 34. 版本控制提交
166. 将所有更改添加到暂存区：`git add .`
167. 执行提交：`git commit -m "feat: implement real-time communication with WebSocket support

- Create WebSocket gateway with authentication and room management
- Implement real-time event system for personality, skills, and state
- Integrate WebSocket notifications across all services
- Add connection monitoring and graceful reconnection"`

## 阶段八：前端基础界面开发 (4-5天)

### 35. Vite配置和项目设置
168. 配置 `vite.config.ts` 文件，设置代理和构建选项
169. 更新 `package.json` 脚本命令
170. 配置开发环境热重载
171. 设置构建输出目录和资源处理

### 36. Redux状态管理配置
172. 配置 Redux Toolkit store
173. 创建 `src/store/slices/authSlice.ts`
174. 创建 `src/store/slices/petSlice.ts`
175. 创建 `src/store/slices/chatSlice.ts`
176. 创建 `src/store/slices/personalitySlice.ts`
177. 创建 `src/store/slices/skillsSlice.ts`
178. 创建 `src/store/slices/stateSlice.ts`

### 37. API客户端开发
179. 创建 `src/services/api.ts` 统一API客户端（适配Vite环境变量）
180. 实现认证相关API调用
181. 实现宠物管理API调用
182. 实现对话API调用
183. 实现个性系统API调用
184. 实现技能系统API调用
185. 实现状态系统API调用

### 38. 基础组件开发
186. 创建 `src/components/Layout` 布局组件
187. 创建 `src/components/Auth` 认证组件
188. 创建 `src/components/Pet` 宠物信息组件
189. 创建 `src/components/Chat` 对话组件
190. 创建 `src/components/Personality` 个性展示组件
191. 创建 `src/components/Skills` 技能树组件
192. 创建 `src/components/State` 状态展示组件

### 39. 页面路由配置
193. 安装并配置 React Router：`pnpm add react-router-dom @types/react-router-dom`
194. 创建登录页面
195. 创建主界面页面
196. 创建宠物管理页面
197. 创建对话页面
198. 创建设置页面
199. 实现路由守卫和权限控制

### 40. 版本控制提交
200. 将所有更改添加到暂存区：`git add .`
201. 执行提交：`git commit -m "feat: develop frontend basic interface with React and Vite

- Configure Vite build system with proxy and hot reload
- Set up Redux Toolkit store with comprehensive state management
- Implement API client layer with Vite environment variables
- Create basic component structure and routing system"`

## 阶段九：前端高级功能开发 (3-4天)

### 41. 个性可视化组件
202. 创建个性特质雷达图组件
203. 创建个性演化历史图表组件
204. 实现个性数据的实时更新
205. 添加个性变化的动画效果

### 42. 技能树可视化组件
206. 创建技能树图形化展示组件
207. 实现技能解锁的动画效果
208. 创建技能详情弹窗组件
209. 实现技能进度的实时更新

### 43. 状态监控界面
210. 创建宠物状态仪表盘组件
211. 实现状态值的动态展示
212. 创建状态历史图表组件
213. 添加状态交互按钮和效果

### 44. WebSocket前端集成
214. 创建 WebSocket 连接管理服务（适配Vite环境）
215. 实现实时事件的接收和处理
216. 集成实时通知到各个组件
217. 实现连接状态的用户提示

### 45. 版本控制提交
218. 将所有更改添加到暂存区：`git add .`
219. 执行提交：`git commit -m "feat: implement advanced frontend features with data visualization

- Create personality radar charts and evolution history visualization
- Implement interactive skill tree with unlock animations
- Develop state monitoring dashboard with real-time updates
- Integrate WebSocket client with connection management"`

## 阶段十：系统测试和优化 (3-4天)

### 46. 单元测试编写
220. 为个性演化算法编写单元测试
221. 为状态驱动算法编写单元测试
222. 为技能系统算法编写单元测试
223. 为API控制器编写单元测试
224. 为服务层编写单元测试

### 47. 集成测试编写
225. 编写个性演化流程的集成测试
226. 编写技能解锁流程的集成测试
227. 编写状态更新流程的集成测试
228. 编写对话增强流程的集成测试
229. 编写WebSocket通信的集成测试

### 48. 性能优化
230. 优化数据库查询性能
231. 实现关键数据的缓存策略
232. 优化API响应时间
233. 优化前端组件渲染性能（利用Vite的优化特性）
234. 实现前端代码分割和懒加载

### 49. 系统监控和日志
235. 配置应用性能监控
236. 实现错误日志收集
237. 配置API调用监控
238. 实现用户行为分析
239. 配置系统健康检查

### 50. 版本控制提交
240. 将所有更改添加到暂存区：`git add .`
241. 执行提交：`git commit -m "test: add comprehensive testing and performance optimization

- Implement unit tests for core algorithms and services
- Add integration tests for complete feature workflows
- Optimize database queries and implement caching strategies
- Configure monitoring, logging, and health checks"`

## 阶段十一：部署和文档 (2-3天)

### 51. 生产环境配置
242. 配置生产环境变量
243. 创建生产环境数据库
244. 配置Nginx反向代理（可选）
245. 实现前端生产构建（使用 `pnpm build`）
246. 配置PM2进程管理（使用pnpm生态）

### 52. 包管理器优化
247. 配置 `.npmrc` 文件优化pnpm设置
248. 实现 `pnpm-lock.yaml` 的版本锁定
249. 配置monorepo workspace（可选）
250. 优化pnpm缓存策略

### 53. API文档生成
251. 配置Swagger文档生成
252. 添加API端点的详细文档
253. 创建API使用示例
254. 生成在线API文档

### 54. 用户文档编写
255. 编写系统使用说明
256. 创建功能介绍文档
257. 编写故障排除指南
258. 创建开发者指南（包含pnpm和Vite相关内容）

### 55. 最终部署测试
259. 在生产环境进行完整功能测试
260. 进行性能压力测试
261. 验证所有API端点正常工作
262. 测试WebSocket连接稳定性
263. 验证数据持久化正确性
264. 测试Vite构建产物的正确性

### 56. 版本控制提交
265. 将所有更改添加到暂存区：`git add .`
266. 执行提交：`git commit -m "docs: complete deployment setup and documentation

- Configure production environment with Nginx and PM2
- Optimize pnpm configuration and workspace setup
- Generate comprehensive API documentation with Swagger
- Create user guides and developer documentation
- Complete production deployment testing"`

---

**总计**: 266个具体实施步骤  
**预估开发时间**: 32-42天 (单人开发)  
**核心里程碑**: 
- 第12天: 基础框架完成（包含pnpm和Vite配置）
- 第22天: 三大核心系统完成
- 第32天: 前端界面完成
- 第37天: 测试优化完成
- 第42天: 部署上线完成

**技术变更说明**: 
- 所有 `npm` 命令已更新为 `pnpm`
- 前端开发服务器端口从3000更改为5173（Vite默认）
- Create React App替换为Vite，包含相应的配置和构建优化
- 新增22个针对版本控制的提交步骤，符合Conventional Commits规范
- 新增34个针对pnpm和Vite的特定配置步骤

**版本控制策略说明**:
- 每个主要阶段完成后执行一次git提交
- 提交信息遵循Conventional Commits规范
- 包含详细的提交描述和变更内容
- 确保代码历史的可追溯性和清晰度

**重要说明**: 本清单与更新后的 `system-architecture.md` v2.1 文档完全对应，并新增了版本控制最佳实践，确保实施过程中的一致性和可追溯性。