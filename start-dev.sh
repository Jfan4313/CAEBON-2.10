#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}零碳项目收益评估软件 - macOS Electron 开发启动${NC}"
echo -e "${BLUE}========================================${NC}\n"

# 检查依赖
echo -e "${YELLOW}[1/5] 检查系统依赖...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ 需要安装 Node.js${NC}"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ 需要安装 Python 3${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js: $(node --version)${NC}"
echo -e "${GREEN}✓ Python: $(python3 --version)${NC}\n"

# 检查并安装前端依赖
echo -e "${YELLOW}[2/5] 安装前端依赖...${NC}"
if [ ! -d "node_modules" ]; then
    npm install
else
    echo -e "${GREEN}✓ 前端依赖已存在${NC}"
fi
echo ""

# 启动后端 API
echo -e "${YELLOW}[3/5] 启动后端 API 服务...${NC}"
FRONTEND_DIR=$(pwd)
API_DIR="../零碳项目收益分析软件/zero_carbon_valuation/api"

if [ ! -d "$API_DIR" ]; then
    echo -e "${RED}✗ API 目录不存在: $API_DIR${NC}"
    exit 1
fi

cd "$API_DIR"

# 检查 Python 虚拟环境
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}创建虚拟环境...${NC}"
    python3 -m venv venv
fi

# 激活虚拟环境并安装依赖
source venv/bin/activate
pip install -q -r requirements.txt 2>/dev/null

# 后台启动 API 服务
echo -e "${GREEN}✓ 启动 API 服务: http://localhost:8000${NC}"
python3 main.py > /tmp/zerocarbon-api.log 2>&1 &
API_PID=$!
echo $API_PID > /tmp/zerocarbon-api.pid

sleep 3

# 验证 API 是否启动成功
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${GREEN}✓ API 服务启动成功\n${NC}"
else
    echo -e "${RED}✗ API 服务启动失败${NC}"
    echo -e "${YELLOW}日志信息:${NC}"
    cat /tmp/zerocarbon-api.log
    exit 1
fi

# 回到前端目录
cd "$FRONTEND_DIR"

# 检查前端依赖
echo -e "${YELLOW}[4/5] 检查前端依赖...${NC}"
if [ ! -d "node_modules" ]; then
    npm install
fi
echo ""

# 启动 Electron 开发环境
echo -e "${YELLOW}[5/5] 启动 Electron 开发环境...${NC}\n"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}📱 前端服务: http://localhost:3001 (自动检测可用端口)${NC}"
echo -e "${GREEN}🔌 API 服务: http://localhost:8000${NC}"
echo -e "${GREEN}📖 API 文档: http://localhost:8000/docs${NC}"
echo -e "${GREEN}========================================\n${NC}"
echo -e "${YELLOW}Electron 应用即将启动...${NC}"
echo -e "${YELLOW}关闭应用窗口时所有服务将停止${NC}\n"

export NODE_ENV=development
npm run electron:dev

# 清理：关闭后端服务
echo -e "\n${YELLOW}正在关闭后端服务...${NC}"
if [ -f /tmp/zerocarbon-api.pid ]; then
    kill $(cat /tmp/zerocarbon-api.pid) 2>/dev/null
    rm /tmp/zerocarbon-api.pid
fi
pkill -f "python3 main.py" 2>/dev/null
echo -e "${GREEN}✓ 已完全退出\n${NC}"
