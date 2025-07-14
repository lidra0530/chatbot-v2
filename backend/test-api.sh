#!/bin/bash

# 设置基础URL
BASE_URL="http://localhost:3000/api/v1"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== 开始API集成测试 ===${NC}\n"

# 测试数据
USER_EMAIL="test@example.com"
USER_PASSWORD="password123"
PET_NAME="小元"

# 步骤1: 用户注册
echo -e "${YELLOW}1. 用户注册...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"testuser\",
    \"email\": \"$USER_EMAIL\",
    \"password\": \"$USER_PASSWORD\"
  }")

if echo "$REGISTER_RESPONSE" | grep -q "error"; then
  echo -e "${YELLOW}注册失败，可能用户已存在，继续登录...${NC}"
else
  echo -e "${GREEN}✓ 用户注册成功${NC}"
fi

# 步骤2: 用户登录
echo -e "${YELLOW}2. 用户登录...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$USER_EMAIL\",
    \"password\": \"$USER_PASSWORD\"
  }")

# 提取token
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ 登录失败，无法获取token${NC}"
  echo "响应: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ 登录成功，获取到token${NC}"

# 步骤3: 创建宠物
echo -e "${YELLOW}3. 创建宠物 \"$PET_NAME\"...${NC}"
CREATE_PET_RESPONSE=$(curl -s -X POST "$BASE_URL/pets" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$PET_NAME\",
    \"breed\": \"虚拟助手\",
    \"description\": \"一个聪明可爱的AI宠物\"
  }")

# 提取宠物ID
PET_ID=$(echo "$CREATE_PET_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$PET_ID" ]; then
  echo -e "${RED}✗ 宠物创建失败${NC}"
  echo "响应: $CREATE_PET_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ 宠物创建成功${NC}"
echo "宠物ID: $PET_ID"

# 步骤4: 验证宠物创建
echo -e "${YELLOW}4. 验证宠物创建 - 获取宠物列表...${NC}"
GET_PETS_RESPONSE=$(curl -s -X GET "$BASE_URL/pets" \
  -H "Authorization: Bearer $TOKEN")

if echo "$GET_PETS_RESPONSE" | grep -q "$PET_NAME"; then
  echo -e "${GREEN}✓ 验证成功：在宠物列表中找到了\"$PET_NAME\"${NC}"
else
  echo -e "${RED}✗ 验证失败：未在宠物列表中找到\"$PET_NAME\"${NC}"
  echo "响应: $GET_PETS_RESPONSE"
  exit 1
fi

# 步骤5: 创建对话
echo -e "${YELLOW}5. 为\"$PET_NAME\"创建对话...${NC}"
CREATE_CONVERSATION_RESPONSE=$(curl -s -X POST "$BASE_URL/conversations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"与${PET_NAME}的第一次对话\",
    \"petId\": \"$PET_ID\"
  }")

# 提取对话ID
CONVERSATION_ID=$(echo "$CREATE_CONVERSATION_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$CONVERSATION_ID" ]; then
  echo -e "${RED}✗ 对话创建失败${NC}"
  echo "响应: $CREATE_CONVERSATION_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ 对话创建成功${NC}"
echo "对话ID: $CONVERSATION_ID"

# 步骤6: 验证对话创建
echo -e "${YELLOW}6. 验证对话创建 - 获取对话列表...${NC}"
GET_CONVERSATIONS_RESPONSE=$(curl -s -X GET "$BASE_URL/conversations" \
  -H "Authorization: Bearer $TOKEN")

if echo "$GET_CONVERSATIONS_RESPONSE" | grep -q "$PET_ID"; then
  echo -e "${GREEN}✓ 验证成功：在对话列表中找到了\"$PET_NAME\"的对话${NC}"
else
  echo -e "${RED}✗ 验证失败：未在对话列表中找到\"$PET_NAME\"的对话${NC}"
  echo "响应: $GET_CONVERSATIONS_RESPONSE"
  exit 1
fi

echo -e "\n${GREEN}=== 集成测试完成 ===${NC}"
echo -e "${GREEN}✓ 所有测试步骤都成功完成！${NC}"

# 输出测试结果总结
echo -e "\n${YELLOW}测试结果总结:${NC}"
echo "- 用户认证: ✓"
echo "- 宠物创建: ✓"  
echo "- 宠物验证: ✓"
echo "- 对话创建: ✓"
echo "- 对话验证: ✓"