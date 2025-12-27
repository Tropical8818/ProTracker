# ProTracker V5 - AI-Powered Production Tracker

> 🤖 **V5 新功能**: 集成 OpenAI GPT 智能助手，提供自然语言查询、异常检测、智能分析等 AI 功能。

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
在 `.env` 文件中添加你的 OpenAI API Key:
```
OPENAI_API_KEY=sk-your-api-key-here
```

### 3. 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000

---

## ✨ AI 功能

### 💬 AI 聊天助手
点击右下角的聊天按钮，即可与 AI 助手对话：

- **查询订单**: "WO-123 现在什么状态？"
- **统计分析**: "今天完成了多少订单？"
- **异常检测**: "哪些订单可能延期？"
- **生产洞察**: "当前生产状态如何？"

### 🔮 未来功能 (规划中)
- 智能 ECD 预测
- 自动异常警报
- 智能 Excel 导入列识别
- 生产报告自动生成

---

## 📁 项目结构

```
src/
├── app/
│   ├── api/
│   │   └── ai/
│   │       └── chat/route.ts   # AI 聊天 API
│   └── dashboard/
│       └── page.tsx            # 集成 AI Chat Panel
├── components/
│   └── AIChatPanel.tsx         # AI 聊天界面组件
└── lib/
    └── ai/
        ├── client.ts           # OpenAI 客户端
        ├── context.ts          # 生产数据上下文构建
        └── prompts.ts          # AI 系统提示词
```

---

## 🔒 安全注意

- 不要将 API Key 提交到代码库
- 建议在生产环境使用环境变量或密钥管理服务
- AI 功能仅对已登录用户可用

---

## 📝 更新日志

### V5.0.0
- ✨ 新增 AI 聊天助手
- ✨ 集成 OpenAI GPT-4o-mini
- ✨ 生产数据智能分析
- 🔧 基于 V4 全部功能

### V4.0.0
- 多产品线支持
- 权限管理系统
- 批量操作
- 操作日志
