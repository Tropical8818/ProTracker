# ProTracker User Manual

**Version 6.0.0**

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
   - [System Requirements](#system-requirements)
   - [Login](#login)
   - [Registration](#registration)
3. [Dashboard Overview](#dashboard-overview)
   - [Navigation](#navigation)
   - [Product Line Selection](#product-line-selection)
   - [Order Table](#order-table)
4. [Operation View](#operation-view)
   - [Barcode Scanning](#barcode-scanning)
   - [Quick Status Updates](#quick-status-updates)
5. [Batch Operations](#batch-operations)
   - [P Mode](#p-mode)
   - [N/A Mode](#na-mode)
   - [Hold Mode](#hold-mode)
   - [QN Mode](#qn-mode)
   - [WIP Mode](#wip-mode)
   - [Complete Mode](#complete-mode)
   - [Erase Mode](#erase-mode)
6. [Importing Orders](#importing-orders)
7. [AI Assistant](#ai-assistant)
8. [Settings](#settings)
   - [Product Line Configuration](#product-line-configuration)
   - [AI Settings](#ai-settings)
   - [User Management](#user-management)
   - [Data Management](#data-management)
9. [User Roles & Permissions](#user-roles--permissions)
10. [Troubleshooting](#troubleshooting)

---

## Introduction

**ProTracker** is an AI-powered production tracking system designed for manufacturing environments. It helps you:

- Track work orders through multiple production steps
- Update order status in real-time via desktop or mobile
- Analyze production data with an AI assistant
- Manage multiple product lines from a single interface

---

## Getting Started

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection or access to the local server
- For mobile: iOS Safari or Android Chrome

### Login

1. Navigate to the ProTracker URL (e.g., `http://localhost:3001`)
2. Enter your **Username** and **Password**
3. Click **Login**

> **Note**: If you don't have an account, contact your administrator or use the registration link.

### Registration

1. Click "Don't have an account? Create one"
2. Enter your desired username and password
3. Submit the form
4. Wait for administrator approval (new accounts require approval)

---

## Dashboard Overview

After logging in, you'll see the main dashboard with all your orders.

### Navigation

| Button | Description |
|--------|-------------|
| **Home** | Main dashboard with order table |
| **Operation** | Simplified view for production floor workers |
| **Settings** | Configure products, users, and system settings |

### Product Line Selection

- Click the **product dropdown** in the header to switch between product lines
- Each product line has its own orders, steps, and configuration

### Order Table

The main table shows all work orders with:

- **Detail Columns**: Order ID, customer, due date, quantity, etc.
- **Step Columns**: Production steps (e.g., Cutting, Assembly, QC)
- **Status Indicators**:
  - 📘 **P** = Planned/Pending
  - ⬜ **N/A** = Not Applicable
  - 🟠 **Hold** = On Hold
  - 🔴 **QN** = Quality Notification (issue)
  - 🟡 **WIP** = Work In Progress
  - ✅ **Date** = Completed (shows completion date)

---

---

## Operation View

The **Operation View** is optimized for production floor workers using tablets or mobile devices.

### Barcode Scanning

1. Click the **Scan** button (barcode icon)
2. Point camera at the WO ID barcode
3. The system will automatically locate and display that order

### Quick Status Updates

In Operation View, you can quickly update order status:

1. Find your order (by scanning or scrolling)
2. Tap on a step cell
3. Select the new status from the popup menu:
   - **Complete** - Mark as done with timestamp
   - **WIP** - Work in progress
   - **Hold** - Put on hold
   - **QN** - Quality notification
   - **N/A** - Not applicable

---

## Kiosk Mode (Shop Floor Monitor)

**Kiosk Mode** is designed for terminal displays (tablets or large screens) situated on the production floor, providing a high-contrast, full-screen view.

### Accessing Kiosk Mode
- **Dedicated Account**: It is recommended to create a user with the `kiosk` role. Once logged in, this account is automatically locked to the Shop Floor Monitor and cannot access the administrative dashboard.
- **Long-Term Session**: Kiosk sessions stay active for **30 days**, making them ideal for always-on display terminals.

### Key Features
- **Auto-Refresh**: Production data updates automatically every 60 seconds.
- **Smooth Auto-Scroll**: If there are many orders, the display will smoothly scroll to loop through all active work orders.
- **Console Lock**:
    - Click the factory logo in the header to attempt administrative actions.
    - **Secure Unlock**: You must enter the currently logged-in account's **Password** to unlock the console for switching product lines or filtering stages.
    - Once unlocked, the console remains active until you click the lock icon again.

---

---

## Batch Operations

For supervisors and admins, batch operations allow updating multiple cells quickly.

### P Mode

- Click **P** button to enter P Mode
- Click any step cell to toggle "P" (Planned) status
- Click **P** again to exit

### N/A Mode

- Mark steps as "Not Applicable" for orders that skip certain steps

### Hold Mode

- Put orders on hold when waiting for materials or approvals

### QN Mode

- Mark steps with quality issues requiring attention

### WIP Mode

- Indicate work is actively in progress

### Complete Mode

- Click to mark steps as complete with current date/time stamp

### Erase Mode

- **Admin only** or requires password for supervisors
- Clears any status from a cell
- Use with caution!

---

## Log Management

### Operation Logs
The system tracks every change made to orders. You can view these logs by clicking the **History** icon in the dashboard header.

### Export & Clear (Admin/Supervisor)
In the Operation Logs modal:
1.  **Download CSV**: Click the green **CSV** button to download full logs for Excel analysis.
2.  **Clear Logs**: (Admin Only) Click the red **Clear** button to permanently delete all history. This is useful when starting a new production cycle.

---

## Importing Orders

### Excel Import (Admin/Supervisor)

1. Click the **Import** button in the header
2. Select your Excel file (.xlsx or .xls)
3. Review the import preview
4. Click **Import** to add new orders

> **Note**: Existing WO IDs are automatically skipped to prevent duplicates.

---

## AI Assistant

ProTracker includes a smart, floating AI assistant to help you:

- Analyze production risks and delays
- Generate daily morning reports
- Navigate automatically to specific orders
- Answer questions about production status

### Using the AI

1. Click the **Chat Icon** 💬 (bottom right of screen)
2. Type your question or use the **Quick Tools** (Admin/Supervisor only):
    - **Analyze Risks**: Identify orders at risk of delay.
    - **Morning Report**: Generate a summary for your daily standup.

### Smart Navigation 🚀
You can ask the AI to take you to an order:
*   "Show me WO-1234"
*   "Go to order 5555"

**Result**: The system will automatically jump to the **Operation View** for that order.

### Example Questions

- "Which orders are behind schedule?"
- "What's the average time in Winding step?"
- "Show me orders with QN status"
- "Summarize today's production"

---

## Settings

Access Settings from the navigation bar.

### Product Line Configuration

*(Admin only)*

- **Add Product Line**: Create new production lines
- **Edit Steps**: Define production steps and durations
- **Detail Columns**: Configure order information fields
- **Monthly Target**: Set production goals
- **ECD Settings**: Configure weekend inclusion for delivery estimates

### AI Settings

*(Admin only)*

- **OpenAI API Key**: Enter your OpenAI API key to enable AI features
- **AI Model**: Choose between GPT-4o, GPT-4o Mini, or GPT-3.5 Turbo
- **Custom Instructions**: Add product-specific knowledge for the AI

### User Management

*(Admin/Supervisor)*

Navigate to **Settings → User Management** to:

- View all users
- Approve pending registrations
- Reset passwords
- Enable/disable accounts
- Delete users (admin only)

### Data Management

*(Admin only)*

- **Export CSV**: Download all production data
- **Cleanup**: Remove data older than 2 years

---

## User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **User** | View orders, update status in Operation View |
| **Kiosk** | Strictly restricted to Shop Floor Monitor, 30-day sessions, no dashboard access |
| **Supervisor** | All User permissions + Import orders, batch operations, manage basic users |
| **Admin** | All permissions + Settings, User Management, Data Management |

---

## Troubleshooting

### Common Issues

**Q: Page keeps refreshing**
- Clear browser cache and cookies
- Try a different browser
- Contact administrator to restart the server

**Q: Can't log in**
- Check username and password
- Ensure your account is approved
- Contact administrator

**Q: Orders not showing**
- Select the correct product line
- Check if you have "Show Completed" enabled
- Refresh the page

**Q: AI not responding**
- Verify OpenAI API key is configured in Settings
- Check your API key balance/quota

---

## Support

For technical support, contact your system administrator.

**ProTracker v6.0.0** - AI-Powered Production Tracker
