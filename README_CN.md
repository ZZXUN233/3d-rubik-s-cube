# 3D魔方项目 - 本地运行指南

这是一个使用React + Three.js构建的3D魔方模拟器。

## 项目概述

- **技术栈**: React 19 + TypeScript + Three.js + @react-three/fiber
- **功能**: 3D魔方模拟、旋转动画、打乱、重置
- **控制**: 键盘控制魔方各面旋转

## 本地运行步骤

### 1. 安装依赖
```bash
npm install
```

### 2. 运行开发服务器
```bash
npm run dev
```

### 3. 访问应用
打开浏览器访问: http://localhost:3000

## 魔方控制说明

### 键盘控制
- **R**: 右面顺时针旋转
- **L**: 左面顺时针旋转  
- **U**: 上面顺时针旋转
- **D**: 下面顺时针旋转
- **F**: 前面顺时针旋转
- **B**: 后面顺时针旋转
- **Shift + 字母**: 逆时针旋转

### 按钮控制
- **Scramble**: 随机打乱魔方
- **Reset**: 重置魔方到初始状态

## 魔方颜色配置

修复后的标准魔方配色：
- **上(U)**: 白色 (#FFFFFF)
- **下(D)**: 黄色 (#FFD700) 
- **前(F)**: 绿色 (#00FF00)
- **后(B)**: 蓝色 (#0000FF)
- **左(L)**: 橙色 (#FFA500)
- **右(R)**: 红色 (#FF0000)

## 项目结构
```
3d-rubik's-cube/
├── components/
│   └── RubiksCube.tsx    # 魔方3D组件
├── App.tsx               # 主应用组件
├── types.ts              # TypeScript类型定义
├── package.json          # 项目依赖配置
└── vite.config.ts        # Vite构建配置
```

## 技术特性

- **3D渲染**: 使用Three.js和@react-three/fiber
- **动画系统**: 流畅的魔方旋转动画
- **热重载**: Vite开发服务器支持热更新
- **类型安全**: 完整的TypeScript支持