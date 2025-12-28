# ProTracker - AI-Powered Production Tracker

[🇺🇸 English](README.md) | [🇨🇳 简体中文](README_ZH.md)

> 🤖 **V6.1.0 New Features**: Professional Kiosk Mode, Density Control, Extended Sessions, and Enhanced Security.

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

## ✨ AI Features (v6.0.0)

### 💬 Floating AI Assistant
A specialized production assistant that helps you:
- **Analyze Risks**: "Which orders are likely to be delayed?"
- **Generate Morning Reports**: "Prepare a summary for the morning meeting."
- **Smart Navigation**: "Show me WO-1234" -> *Auto-opens order details*.

### 🛡️ AI Guardrails
The AI is strictly scoped to production topics. It will refuse non-work-related queries (e.g., jokes, weather) to ensure professional use.

---

### 🖥️ Kiosk Mode (v6.1.0)
Specialized shop floor monitor view:
- **Compact & Comfortable Views**: Toggle between high-density 2-column grid or large card layouts.
- **Role-Based Lockdown**: Dedicated `kiosk` role automatically restricted to the monitor view.
- **30-Day Persistence**: Extended session duration for reliable long-term terminal use.
- **Secure Unlock**: Access administrative tools within Kiosk using your account password.
- **Smart Sorting**: Orders are prioritized by Due Date, Priority flags, and "Planned" status.

---

## 🔒 Security & Management

### Role-Based Access
- **Admin**: Full access + AI Risk Analysis + Log Clearing + User Management.
- **Supervisor**: Management + AI Reports + User Approvals.
- **User**: Operation View + Basic Chat.
- **Kiosk**: Strictly restricted to Shop Floor Monitor (30-day session).

### 📊 Log Management
- **CSV Export**: Download comprehensive operation logs.
- **Clear Logs**: Admin-only function to reset history.

---

## 📝 Changelog

### V6.1.0
- 🖥️ **Professional Kiosk Mode**: New Shop Floor Monitor with auto-scroll and 60s refresh.
- 📐 **Density Control**: Switch between "Comfortable" (large cards) and "Compact" (2-column list) views.
- 🔒 **Enhanced Security**: Role-based lockdown for `kiosk` accounts and password-protected unlock.
- ⏳ **30-Day Sessions**: Extended login persistence for terminal deployment.
- 📈 **Smart Sorting**: Priority logic based on Due Date, Priority flags, and P (Planned) status.

### V6.0.0
- ✨ **Floating AI Assistant**: New UI with persistent chat.
- 🧭 **Smart Navigation**: Navigate to orders via chat commands.
- 🛡️ **Role-Based AI**: Restricted advanced tools to Admin/Supervisor.
- 📊 **Log Management**: CSV Export and Clear Logs features.
- 🔒 **AI Guardrails**: Strict scope enforcement.

### V5.0.0
- Added initial AI Chat functionality.
- Integrated OpenAI GPT-4o-mini.

---

