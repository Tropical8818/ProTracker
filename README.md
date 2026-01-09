# iProTraX - The Agile Manufacturing Collaboration Platform
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

## 🔐 Default Credentials
After the initial deployment, use the following credentials to access the **SuperAdmin** account:

*   **Employee ID (UserID)**: `SUPER001`
*   **Default Password**: `superadmin123`

> [!IMPORTANT]
> For security, it is highly recommended to change this password immediately after your first login via the User Management settings.

---

iProTraX is not a replacement for SAP. It is the **Agile Collaboration Layer** that sits between your heavy ERP and your agile teams.

It provides a lightweight, real-time visual interface that:
*   **Visualizes the Invisible**: Tracks the micro-steps and real-time status that SAP misses.
*   **Empowers "Super Edit"**: Allows Supervisors to correct data instantly (e.g., bypassing a "stuck" step) without waiting for IT tickets.
*   **Kiosk Mode**: Replaces "asking via WeChat" with large, auto-updating shop floor monitors.
*   **AI-Driven Insights**: A built-in AI assistant that analyzes risk and generates reports, replacing manual data crunching.

```mermaid
graph TD
    subgraph RigidERP ["Rigid ERP"]
        SAP[SAP / ME POD]
    end

    subgraph DynamicShop ["Dynamic Shop"]
        Worker[Worker / Digital Updates]
        Kiosk[Kiosk Mode]
    end

    subgraph AgileCollaboration ["Agile Collaboration"]
        Core[iProTraX Core]
        DB[(Local Database)]
        AI[AI Copilot]
    end

    Supervisor[Supervisor / Super Edit]

    %% Connections
    SAP -->|"1. Auto-Import (Excel)"| Core
    Core -->|"2. Real-time Status"| Kiosk
    Worker -->|"3. Digital Updates"| Core
    Core -->|"Store"| DB
    Core <--> AI
    AI -->|"Risk Analysis"| Supervisor
    Core -->|"4. Monitoring & Correction"| Supervisor
    Core -->|"5. CSV Export"| Supervisor
    Supervisor -.->|"6. Reconciliation"| SAP

    %% Styling
    classDef sap fill:#1e3a8a,stroke:#333,stroke-width:2px,color:white;
    classDef core fill:#4f46e5,stroke:#333,stroke-width:2px,color:white;
    classDef kiosk fill:#059669,stroke:#333,stroke-width:2px,color:white;
    classDef super fill:#d97706,stroke:#333,stroke-width:2px,color:white;
    classDef db fill:#fff,stroke:#333,stroke-width:2px;
    classDef shop fill:#f59e0b,stroke:#333,stroke-width:2px,color:black;

    class SAP sap;
    class Core core;
    class Kiosk kiosk;
    class Supervisor super;
    class DB db;
    class Worker shop;
```

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
Visit http://localhost:3001

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
    *   **Category Analysis**: Analyzes comments tagged with categories (e.g., QN, Machine, Material) to identify bottlenecks.
    *   **Smart Comments**: Tracks discussions per-step, allowing precise problem-solving directly in the flow.

---

## 🔒 Security & Management
*   **Role-Based Access**: Strict separation between Admin, Supervisor, User, and Kiosk roles.
*   **Log Management**: Full CSV export capabilities for post-mortem analysis.

---

### Visual Experience

#### 1. The Gateway (Login)
Stunning dark-themed login portal with the new v7.0.0 branding.
![Login Screen](public/screenshots/login.png)

#### 2. The Command Center (Dashboard)
Comprehensive production data grid with detailed management controls.
![Dashboard View](public/screenshots/dashboard.png)

#### 3. The Control Tower (Kiosk Mode)
Optimized for large screens, this view aligns data perfectly for shop floor visibility.
![Kiosk Mode](public/screenshots/kiosk.png)

#### 4. The AI Assistant (Production Copilot)
Real-time risk analysis and data insights powered by LLMs.
![AI Chat Interface](public/screenshots/ai-chat.png)

#### 5. The Frontline (Mobile Worker View)
Simplified, touch-friendly interface for operators on the floor.
<img src="public/screenshots/worker-mobile.png" width="300" alt="Worker Mobile View">

---

### DEMO
https://iprotrax.work
Contact author for access: mailto: jkdb0g@whatifthenhow.com

---

## 📝 Changelog highlights
*   **v7.0.0**: Smart Comments (Order-level Collaboration), Configurable AI Visibility, Enhanced AI Privacy (Strict ID mode), Supervisor Excel Import, and Multi-tier Employee Cooperation.
*   **v6.5.0**: Docker Production Support (Node 22, Fixed Watcher, CVE Remediation).
*   **v6.4.0**: Added Order Deletion & Kiosk Alignment fixes.
*   **v6.3.0**: Introduced Super Edit Mode.
*   **v6.1.0**: Launched Professional Kiosk Mode.

---

## 🛡️ License & Community
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/Tropical8818/ProTracker?style=social)](https://github.com/Tropical8818/ProTracker)

## 📈 Git Trend
[![Star History Chart](https://api.star-history.com/svg?repos=Tropical8818/ProTracker&type=Date)](https://star-history.com/#Tropical8818/ProTracker&Date)
