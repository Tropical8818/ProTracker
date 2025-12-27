# ProTracker - AI-Powered Production Tracker

[🇺🇸 English](README.md) | [🇨🇳 简体中文](README_ZH.md)

> 🤖 **V5 New Features**: Integrated OpenAI GPT intelligent assistant, providing natural language queries, anomaly detection, intelligent analysis, and other AI capabilities.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Add your OpenAI API Key to the `.env` file:
```
OPENAI_API_KEY=sk-your-api-key-here
```

### 3. Start Development Server
```bash
npm run dev
```

Visit http://localhost:3000

---

## ✨ AI Features

### 💬 AI Chat Assistant
Click the chat button in the bottom right corner to converse with the AI assistant:

- **Query Orders**: "What is the status of WO-123?"
- **Statistical Analysis**: "How many orders were completed today?"
- **Anomaly Detection**: "Which orders might be delayed?"
- **Production Insights**: "What is the current production status?"

### 🔮 Future Features (Planned)
- Intelligent ECD Prediction
- Automatic Anomaly Alerts
- Intelligent Excel Import Column Recognition
- Automatic Production Report Generation

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── ai/
│   │       └── chat/route.ts   # AI Chat API
│   └── dashboard/
│       └── page.tsx            # Integrated AI Chat Panel
├── components/
│   └── AIChatPanel.tsx         # AI Chat Interface Component
└── lib/
    └── ai/
        ├── client.ts           # OpenAI Client
        ├── context.ts          # Production Data Context Builder
        └── prompts.ts          # AI System Prompts
```

---

## 🔒 Security Notes

- Do not commit your API Key to the codebase.
- It is recommended to use environment variables or secret management services in production environments.
- AI features are only available to logged-in users.

---

## 📝 Changelog

### V5.0.0
- ✨ Added AI Chat Assistant
- ✨ Integrated OpenAI GPT-4o-mini
- ✨ Intelligent Production Data Analysis
- 🔧 Based on all V4 features

### V4.0.0
- Multi-product line support
- Permission management system
- Batch operations
- Operation logs

---

## ☕ Support

If you find this project helpful, please consider buying the author a coffee! Your support is the motivation for my continuous maintenance and updates.

### PayPal
![PayPal QR Code](https://album.whatifthenhow.com/i/2025/12/27/694fbcadaf646.png)
