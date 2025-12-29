# ProTracker - The Agile Manufacturing Middleware
> Bridging the gap between rigid ERP systems and the dynamic shop floor.

[🇺🇸 English](README.md) | [🇨🇳 简体中文](README_ZH.md)

## 🎯 The Problem
In modern high-mix manufacturing, relying solely on heavy ERP systems like **SAP** or **ME POD** creates critical operational gaps:

1.  **System Rigidity**: SAP is powerful but inflexible. It cannot adapt quickly to the fluid reality of the shop floor (machine breakdowns, urgent re-prioritization).
2.  **Data Lag**: ME POD data often has a synchronization delay when importing to SAP. This means the "System Truth" (SAP) is often hours behind the "Ground Truth" (Shop Floor).
3.  **Invisible Steps**: Operational steps often get skipped or not recorded in SAP due to complexity, causing orders to appear "stuck" in the wrong status.
4.  **The "Black Box" Effect**: Planners and Supervisors cannot see real-time progress. They rely on:
    *   Manual spreadsheets (siloed data).
    *   Social media/chat apps for updates (unprofessional, hard to track).
    *   Human memory (prone to error).

**Result**: You cannot precisely schedule manpower or machines because you don't know the *actual* state of the floor.

---

## 💡 The Solution: ProTracker
ProTracker is not a replacement for SAP. It is the **Agile Middleware Layer** that sits between your heavy ERP and your agile teams.

It provides a lightweight, real-time visual interface that:
*   **Visualizes the Invisible**: Tracks the micro-steps and real-time status that SAP misses.
*   **Empowers "Super Edit"**: Allows Supervisors to correct data instantly (e.g., bypassing a "stuck" step) without waiting for IT tickets.
*   **Kiosk Mode**: Replaces "asking via WeChat" with large, auto-updating shop floor monitors.
*   **AI-Driven Insights**: A built-in AI assistant that analyzes risk and generates reports, replacing manual data crunching.

---

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

## ✨ Key Capabilities

### 1. 🖥️ Shop Floor Kiosk (The "Control Tower")
*   **Purpose**: Replaces social media updates. A passive, always-on monitor for the floor.
*   **Features**:
    *   **Auto-Scroll & Refresh**: No mouse needed. Cycles through active orders.
    *   **Visual Priority**: Color-coded status (WIP, HOLD, QN) for instant awareness.
    *   **Privacy & Security**: Locked down mode with password-protected admin access.
    *   **Tabular Alignment**: Precision engineered for readability at a distance.

### 2. ✏️ Super Edit Mode (Agile Correction)
*   **Purpose**: Fix "SAP Lag" and "Missing Steps" instantly.
*   **Features**:
    *   **Direct Manipulation**: Supervisors can "force" a step to complete or correction data directly in the UI.
    *   **Optimistic UI**: No waiting for server round-trips; changes feel instant.
    *   **Audit Trail**: Every change is logged, ensuring accountability while allowing flexibility.

### 3. 🤖 AI Copilot (The "Digital Planner")
*   **Purpose**: Augment human decision making.
*   **Features**:
    *   **Risk Analysis**: "Which orders are stuck in WIP for >24h?"
    *   **Report Generation**: "Draft a shift handover report based on today's logs."
    *   **Context Aware**: Knows your specific product lines and terminology.

---

## 🔒 Security & Management
*   **Role-Based Access**: Strict separation between Admin, Supervisor, User, and Kiosk roles.
*   **Log Management**: Full CSV export capabilities for post-mortem analysis.

---

### DEMO
https://protracker.puppy101.dpdns.org/
Contact author for access: mailto: jkdb0g@whatifthenhow.com

---

## 📝 Changelog highlights
*   **v6.4.0**: Added Order Deletion & Kiosk Alignment fixes.
*   **v6.3.0**: Introduced Super Edit Mode.
*   **v6.1.0**: Launched Professional Kiosk Mode.
