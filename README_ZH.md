# ProTracker - 敏捷制造协同平台 (Agile Manufacturing Collaboration Platform)
> 连接僵化 ERP 与动态车间的敏捷协同层。

[🇺🇸 English](README.md) | [🇨🇳 简体中文](README_ZH.md)

## 🎯 痛点：被忽视的生产"黑盒"
在现代多品种、小批量的即时制造环境中，仅仅依赖 **SAP** 或 **ME POD** 等重型 ERP 系统会产生严重的运营断层：

1.  **系统僵化 (System Rigidity)**：SAP 强大但不够灵活，很难迅速适应车间的动态变化（如机器故障、紧急插单）。
2.  **数据滞后 (Data Lag)**：从 ME POD 导入数据到 SAP 往往存在时间差。这意味着系统中的"即时库存"（System Truth）往往比"车间实况"（Ground Truth）滞后数小时。
3.  **隐形步骤 (Invisible Steps)**：由于流程复杂，很多微小的操作步骤被略过或未记录，导致工单在 SAP 中显示为"卡住"或状态错误。
4.  **"黑盒"效应 (The Black Box)**：计划员和主管无法看到实时的生产进度。他们被迫依赖：
    *   手工 Excel 表格（数据孤岛）。
    *   微信/WhatsApp 聊天汇报（不专业、难以追踪）。
    *   人的记忆（容易出错）。

**结果**：因为不知道车间的*真实*状态，你根本无法精确地调度人员或设备。

---

## 💡 解决方案：ProTracker
ProTracker 不是要取代 SAP。它是连接重型 ERP 与敏捷团队之间的 **敏捷协同层 (Agile Collaboration Layer)**。

它提供了一个轻量级、实时的可视化界面：
*   **可视化隐形数据**：追踪 SAP 遗漏的微小步骤和实时状态。
*   **赋能"超级编辑"**：允许主管即时修正数据（例如：强制完成一个卡住的步骤），无需等待 IT 开票。
*   **电子看板 (Kiosk)**：用大屏幕、自动刷新的车间显示器取代"微信询问"。
*   **AI 驱动洞察**：内置 AI 助手分析风险并生成日报，取代人工数据整理。

---

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

## ✨ 核心能力

### 1. 🖥️ 车间电子看板 (Shop Floor Kiosk) —— "控制塔"
*   **目标**：替代社交软件汇报。为车间提供一个被动式、常驻的监控屏幕。
*   **特性**：
    *   **自动滚动与刷新**：无需鼠标操作，自动循环显示活跃工单。
    *   **可视化优先级**：WIP（进行中）、HOLD（暂停）、QN（质量问题）颜色编码，一目了然。
    *   **隐私与安全**：专用的锁定模式，仅允许密码保护的管理员访问。
    *   **表格对齐优化**：专为远距离阅读设计的等宽数字对齐。

### 2. ✏️ 超级编辑模式 (Super Edit) —— "敏捷修正"
*   **目标**：即时修复 "SAP 滞后" 和 "步骤遗漏" 问题。
*   **特性**：
    *   **直接操作**：主管可以直接在 UI 上"强制"完成一个步骤或修正工单信息。
    *   **乐观 UI 响应**：无需等待服务器往返，操作感觉即时生效。
    *   **审计追踪**：每一次修改都有日志记录，既保证了灵活性，又确保了责任可追溯。

### 3. 🤖 AI 副驾驶 (AI Copilot) —— "数字计划员"
*   **目标**：增强人类的决策能力。
*   **特性**：
    *   **风险分析**："哪些工单在 WIP 状态停留超过 24 小时？"
    *   **报告生成**："根据今天的日志起草一份交接班报告。"
    *   **上下文感知**：了解你特定的产品线术语和规则。

---

## 🔒 安全与管理
*   **基于角色的访问控制 (RBAC)**：严格区分管理员、主管、用户和看板角色。
*   **日志管理**：支持 CSV 全量导出，便于事后分析和存档。

---

### 演示 (DEMO)
https://protracker.puppy101.dpdns.org/
联系作者获取访问权限: mailto: jkdb0g@whatifthenhow.com

---

## 📝 更新日志摘要
*   **v6.5.0**: Docker 生产环境就绪 (Node 22, Watcher 修复, CVE 修复).
*   **v6.4.0**: 新增工单删除功能 & 看板对齐修复。
*   **v6.3.0**: 引入超级编辑模式 (Super Edit)。
*   **v6.1.0**: 发布专业电子看板模式 (Kiosk Mode)。

---

## 🛡️ 许可与社区
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/Tropical8818/ProTracker?style=social)](https://github.com/Tropical8818/ProTracker)

## 📈 Git 趋势 (Git Trend)
[![Star History Chart](https://api.star-history.com/svg?repos=Tropical8818/ProTracker&type=Date)](https://star-history.com/#Tropical8818/ProTracker&Date)
