import { prisma } from '@/lib/prisma';

export interface OrderSummary {
    woId: string;
    productName: string;
    currentStep: string;
    status: string;
    ecd: string;
    daysInCurrentStep: number;
    // Complete order data for AI analysis
    details: Record<string, string>; // All detail columns (PN, Description, WO DUE, Priority, etc.)
    stepValues: Record<string, string>; // All step values (dates, statuses)
}

export interface ProductionStats {
    todayCompleted: number;
    weeklyCompleted: number;
    totalActive: number;
    totalPending: number;
    totalHold: number;
    completionRate: number;
    totalOrders: number; // Real DB count
}

// Category Statistics for AI Analysis
export interface CategoryStats {
    byStep: Record<string, Record<string, number>>; // step -> category -> count
    total: Record<string, number>; // category -> total count
    topIssues: { step: string, category: string, count: number }[];
}

export interface AIContext {
    orders: OrderSummary[];
    stats: ProductionStats;
    categoryStats: CategoryStats; // New field
    recentLogs: {
        action: string;
        woId: string;
        step: string;
        timestamp: string;
        userName: string;
    }[];
    products: {
        id: string;
        name: string;
        steps: string[];
        customInstructions?: string;
    }[];
    activeIssues?: {
        woId: string;
        category: string;
        content: string;
        step: string;
        time: string;
    }[];
    activeModel?: string;
    activeProvider?: 'openai' | 'ollama';
}

// Helper to normalize dates (e.g., "23-Dec" -> "2025-12-23" if current is Jan 2026)
function normalizeDate(dateStr: string): string {
    if (!dateStr) return '';

    // If already ISO, return truncated
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.split('T')[0];

    // Handle "DD-Mon" format (e.g. 23-Dec)
    const match = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})$/);
    if (match) {
        const day = parseInt(match[1]);
        const monthStr = match[2];
        const months: Record<string, number> = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        const month = months[monthStr];

        if (typeof month === 'number') {
            const today = new Date();
            let year = today.getFullYear();
            const dateCandidate = new Date(year, month, day);

            // If the candidate date is more than 6 months in the future, assume it was last year
            // (e.g. today Jan 2026, date Dec 23 -> Dec 23 2026 is +11 months -> assume 2025)
            const diffMonths = (dateCandidate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);

            if (diffMonths > 6) {
                year -= 1;
            } else if (diffMonths < -6) {
                // Verify correctness: if today is Dec 2025, and date is Jan 2025?
                // Usually unlikely in this context, but safer logic:
                // Find year that makes date closest to today?
                // Simple heuristic: Production orders are usually within +/- 6 months.
            }

            // Reconstruct in IOS format 
            // Note: Month is 0-indexed in JS Date but 1-indexed in ISO
            const yyyy = year;
            const mm = String(month + 1).padStart(2, '0');
            const dd = String(day).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }
    }

    return dateStr;
}

// Helper to sanitize personal names from text for AI privacy
export function sanitizeContent(text: string): string {
    if (!text) return '';
    // Replace mentions @Username with [User]
    // Use lookbehind-like logic: match start-of-line or whitespace before @
    return text.replace(/(^|\s)@\w+/g, '$1[User]');
}

// Build context for AI from production data
// queriedWoId: If provided, ensures this specific order is included in context even if not in top results
// buildAIContext updated signature
export async function buildAIContext(productId?: string, queriedWoId?: string, queriedEmployeeId?: string): Promise<AIContext> {
    // CRITICAL: Require productId for product line isolation
    // This prevents AI from accessing data across multiple product lines
    if (!productId) {
        throw new Error('Product ID is required for AI context. Cannot access data without product line specification.');
    }

    // Fetch products
    const products = await prisma.product.findMany({
        select: {
            id: true,
            name: true,
            config: true,
        }
    });

    const productData = products.map(p => {
        const config = JSON.parse(p.config || '{}');
        return {
            id: p.id,
            name: p.name,
            steps: config.steps || [],
            customInstructions: config.customInstructions || '',
            config // Keep config for later use
        };
    });

    // Determine active model from requested product or first product
    let activeModel = 'gpt-4o-mini';
    let activeProvider: 'openai' | 'ollama' = 'openai';

    if (productId) {
        const p = productData.find(p => p.id === productId);
        if (p?.config.aiModel) activeModel = p.config.aiModel;
        if (p?.config.aiProvider) activeProvider = p.config.aiProvider;
    } else if (productData.length > 0) {
        // Fallback to first product or some global setting
        if (productData[0].config.aiModel) activeModel = productData[0].config.aiModel;
        if (productData[0].config.aiProvider) activeProvider = productData[0].config.aiProvider;
    }

    // Fetch ALL orders for this product line (no limit)
    // With intelligent query, AI can access any order regardless of count
    const orderWhere = productId ? { productId } : {};
    let orders = await prisma.order.findMany({
        where: orderWhere,
        include: {
            product: {
                select: { name: true, config: true }
            }
        },
        // Limit default context to recent orders for performance
        // Deep history is accessed via Intelligent Query (recursion)
        take: 60,
        orderBy: { updatedAt: 'desc' } // Sort by most recently updated
    });

    // INTELLIGENT QUERY: If user queried a specific WO ID, ensure it's in the context
    if (queriedWoId) {
        console.log(`[AI Context] Intelligent Query START for: "${queriedWoId}" in Product: ${productId}`);

        // Strategy 1: Check if already in the fetched list (Exact match)
        const existingOrderIndex = orders.findIndex(o => o.woId === queriedWoId);

        if (existingOrderIndex !== -1) {
            console.log(`[AI Context] Intelligent Query: Order found in recent list at index ${existingOrderIndex}. Promoting to TOP.`);
            // Move to top to ensure it gets detailed info (which is limited to top 20)
            const existingOrder = orders[existingOrderIndex];
            orders.splice(existingOrderIndex, 1); // Remove from current position
            orders.unshift(existingOrder); // Add to start
        } else {
            let queriedOrder = null;

            // Strategy 2: Database Exact Match
            console.log(`[AI Context] Strategy 2: Exact Match for "${queriedWoId}"...`);
            queriedOrder = await prisma.order.findFirst({
                where: { woId: queriedWoId, productId },
                include: { product: { select: { name: true, config: true } } }
            });

            // Strategy 3: Fuzzy Match (Contains)
            if (!queriedOrder && queriedWoId.length >= 4) {
                console.log(`[AI Context] Strategy 3: Fuzzy Match for "${queriedWoId}"...`);
                queriedOrder = await prisma.order.findFirst({
                    where: { woId: { contains: queriedWoId }, productId },
                    include: { product: { select: { name: true, config: true } } }
                });
            }

            // Strategy 4: Numeric Match
            if (!queriedOrder) {
                const numericPart = queriedWoId.replace(/\D/g, '');
                if (numericPart.length >= 4 && numericPart !== queriedWoId) {
                    console.log(`[AI Context] Strategy 4: Numeric Match for "${numericPart}"...`);
                    queriedOrder = await prisma.order.findFirst({
                        where: { woId: { contains: numericPart }, productId },
                        include: { product: { select: { name: true, config: true } } }
                    });
                }
            }

            if (queriedOrder) {
                // Add to beginning of orders array for priority
                console.log(`[AI Context] SUCCESS: Found order via Intelligent Query: ${queriedOrder.woId}`);
                orders = [queriedOrder, ...orders];
            } else {
                console.log(`[AI Context] FAILED: Intelligent Query failed to find order: "${queriedWoId}"`);
            }
        }
    }

    // Process orders into summaries
    const orderSummaries: OrderSummary[] = orders.map(order => {
        const data = JSON.parse(order.data || '{}');
        const config = JSON.parse(order.product.config || '{}');
        const steps = config.steps || [];
        const detailColumns = config.detailColumns || [];

        // Visibility Settings (Backward compatibility: if undefined, show all)
        const visibleDetailCols = config.aiVisibleColumns; // string[] | undefined
        const visibleStepCols = config.aiVisibleSteps; // string[] | undefined

        // Extract detail columns, applying visibility filter if configured
        const details: Record<string, string> = {};
        for (const col of detailColumns) {
            // Include if no filter defined, OR if explicitly included
            if (!visibleDetailCols || visibleDetailCols.includes(col)) {
                details[col] = data[col] || '';
            }
        }

        // Extract step values, applying visibility filter if configured
        const stepValues: Record<string, string> = {};
        for (const step of steps) {
            // Include if no filter defined, OR if explicitly included
            if (!visibleStepCols || visibleStepCols.includes(step)) {
                stepValues[step] = data[step] || '';
            }
        }

        // First, scan ALL steps for Hold/QN/DIFA (blocking statuses have priority)
        let holdStep = '';
        let qnStep = '';
        for (const step of steps) {
            const value = (data[step] || '').toUpperCase();
            if (value === 'HOLD' && !holdStep) {
                holdStep = step;
            }
            if ((value === 'QN' || value === 'DIFA') && !qnStep) {
                qnStep = step;
            }
        }

        // If has Hold, report that
        if (holdStep) {
            return {
                woId: order.woId,
                productName: order.product.name,
                currentStep: holdStep,
                status: 'Hold',
                ecd: data['ECD'] || '',
                daysInCurrentStep: 0,
                details,
                stepValues
            };
        }

        // If has QN/DIFA, report that
        if (qnStep) {
            return {
                woId: order.woId,
                productName: order.product.name,
                currentStep: qnStep,
                status: 'QN',
                ecd: data['ECD'] || '',
                daysInCurrentStep: 0,
                details,
                stepValues
            };
        }

        // Otherwise, find current step (first incomplete step)
        let currentStep = 'Unknown';
        let status = 'Active';

        for (const step of steps) {
            const value = data[step] || '';
            if (!value || value === 'P' || value === 'WIP') {
                currentStep = step;
                status = value || 'Pending';
                break;
            }
        }

        // Check if completed (last step has date)
        const lastStep = steps[steps.length - 1];
        const lastValue = data[lastStep] || '';
        if (lastValue && !['P', 'WIP', 'Hold', 'QN', 'N/A', 'DIFA'].includes(lastValue.toUpperCase())) {
            status = 'Completed';
            currentStep = lastStep;
        }

        // Find Due Date (handle multiple column names)
        const rawDueDate = data['WO DUE'] || data['Due Date'] || data['ECD'] || data['交期'] || '';
        const normDueDate = normalizeDate(rawDueDate);

        return {
            woId: order.woId,
            productName: order.product.name,
            currentStep,
            status,
            ecd: normDueDate, // Use normalized numeric date for AI analysis
            daysInCurrentStep: 0, // Could calculate from logs
            details,
            stepValues
        };
    });

    // Fetch REAL total count for the product line (not just the truncated list)
    const totalRealCount = await prisma.order.count({ where: { productId } });

    // Calculate stats based on SAMPLE (Top 60)
    // NOTE: These are distribution ratios based on recent activity, not absolute totals
    const completedToday = orderSummaries.filter(o => o.status === 'Completed').length;
    const activeOrders = orderSummaries.filter(o => ['Active', 'P', 'WIP'].includes(o.status));
    const holdOrders = orderSummaries.filter(o => ['Hold', 'QN'].includes(o.status));
    const pendingOrders = orderSummaries.filter(o => o.status === 'Pending');

    const stats: ProductionStats = {
        totalOrders: totalRealCount, // REAL TOTAL
        todayCompleted: completedToday,
        weeklyCompleted: completedToday * 7, // Simplified estimation
        totalActive: activeOrders.length, // Sample active
        totalPending: pendingOrders.length, // Sample pending
        totalHold: holdOrders.length, // Sample hold
        completionRate: orders.length > 0 ? Math.round((completedToday / orders.length) * 100) : 0
    };

    // --- Category Statistics Logic ---
    // Fetch comments from last 90 days for this product
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const relevantComments = await prisma.comment.findMany({
        where: {
            order: { productId },
            createdAt: { gte: ninetyDaysAgo },
            NOT: { category: 'GENERAL' } // Focus on issues
        },
        select: {
            stepName: true,
            category: true
        }
    });

    const categoryStats: CategoryStats = {
        byStep: {},
        total: {},
        topIssues: []
    };

    relevantComments.forEach(c => {
        // Aggregate by Query Category
        if (!categoryStats.total[c.category]) categoryStats.total[c.category] = 0;
        categoryStats.total[c.category]++;

        // Aggregate by Step
        if (!categoryStats.byStep[c.stepName]) categoryStats.byStep[c.stepName] = {};
        if (!categoryStats.byStep[c.stepName][c.category]) categoryStats.byStep[c.stepName][c.category] = 0;
        categoryStats.byStep[c.stepName][c.category]++;
    });

    // Calculate Top Issues
    const issueList: { step: string, category: string, count: number }[] = [];
    Object.entries(categoryStats.byStep).forEach(([step, cats]) => {
        Object.entries(cats).forEach(([cat, count]) => {
            issueList.push({ step, category: cat, count });
        });
    });
    // Sort desc by count
    categoryStats.topIssues = issueList.sort((a, b) => b.count - a.count).slice(0, 10);
    // ---------------------------------

    // --- Active Order Issues (For Morning Report) ---
    // Fetch recent comments (last 48h) for ACTIVE orders only
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    const activeOrderComments = await prisma.comment.findMany({
        where: {
            order: {
                productId,
                NOT: {
                    // Check latest status from JSON data is tricky in Prisma filter, 
                    // so we interpret "Active" as orders available in our activeOrders list
                    // But for safety, we'll fetch recent comments and filter in JS
                }
            },
            createdAt: { gte: fortyEightHoursAgo },
            NOT: { category: 'GENERAL' } // Focus on issues
        },
        include: {
            order: {
                select: { woId: true, data: true }
            },
            user: {
                select: { employeeId: true }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 20 // Limit to top 20 recent issues
    });

    // Fetch all users for mention resolution (optimization: fetch only needed fields)
    const allUsers = await prisma.user.findMany({
        select: { username: true, employeeId: true }
    });

    // Create a map for quick username -> employeeId lookup (lowercase for case-insensitive match)
    const userMap = new Map<string, string>();
    allUsers.forEach(u => {
        if (u.username && u.employeeId) {
            userMap.set(u.username.toLowerCase(), u.employeeId);
        }
    });

    // Filter for truly active orders (check status from JSON)
    const activeIssues = activeOrderComments.filter(c => {
        const data = JSON.parse(c.order.data || '{}');
        const product = productData.find(p => p.id === productId);
        const config = (product as any).config || {};
        const steps = config.steps || [];

        // Determine status
        let status = 'Active';
        const lastStep = steps[steps.length - 1];
        const lastValue = data[lastStep] || '';
        if (lastValue && !['P', 'WIP', 'Hold', 'QN', 'N/A', 'DIFA'].includes(lastValue.toUpperCase())) {
            status = 'Completed';
        }

        return status !== 'Completed';
    }).map(c => {
        // Sanitize content with Employee IDs
        let content = c.content || '';

        // 1. Replace mentions @Username -> @EmployeeID using lookup map
        // Match @Username word boundaries
        content = content.replace(/@(\w+)/g, (match, username) => {
            const eid = userMap.get(username.toLowerCase());
            return eid ? `[ID:${eid}]` : match; // Replace if found, else keep original (will be caught by generic sanitizer later)
        });

        // 2. Fallback sanitization for any remaining @mentions (e.g. unknown users)
        content = sanitizeContent(content);

        // 3. Attribute to Author ID
        const authorId = c.user?.employeeId || 'Unknown';

        return {
            woId: c.order.woId,
            category: c.category,
            content: `[ID:${authorId}] ${content}`,
            step: c.stepName,
            time: c.createdAt.toISOString()
        };
    });
    // ------------------------------------------------

    // Fetch recent logs
    // If queriedEmployeeId is present, we prioritize logs for that user
    let logWhere = {};
    if (queriedEmployeeId) {
        console.log(`[AI Context] Fetching specific logs for Employee ID: ${queriedEmployeeId}`);
        logWhere = {
            user: { employeeId: queriedEmployeeId }
        };
    }

    const logs = await prisma.operationLog.findMany({
        where: logWhere,
        take: 30, // Increased log count for better activity analysis
        orderBy: { timestamp: 'desc' },
        include: {
            order: {
                select: { woId: true }
            },
            user: {
                select: { employeeId: true } // CRITICAL: Only fetch employeeId, NEVER username
            }
        }
    });

    const recentLogs = logs.map(log => {
        const details = JSON.parse(log.details || '{}');
        return {
            action: log.action,
            woId: log.order?.woId || '',
            step: details.step || '',
            timestamp: log.timestamp.toISOString(),
            userName: log.user?.employeeId || 'Unknown' // PRIVACY: Only use employeeId, never username
        };
    });

    return {
        orders: orderSummaries, // Include all orders
        stats,
        categoryStats,
        recentLogs,
        products: productData,
        activeIssues, // Include in context
        activeModel,
        activeProvider
    };
}

// Format context as a string for the AI prompt
export function formatContextForAI(context: AIContext, activeProductId?: string): string {
    const lines: string[] = [];

    // Show current product line scope (CRITICAL for isolation)
    lines.push('## Current Product Line (SCOPE)');
    const activeProduct = context.products.find(p => p.id === activeProductId);
    if (activeProduct) {
        lines.push(`**You are assisting with: ${activeProduct.name}**`);
        lines.push('**IMPORTANT**: You can ONLY see and answer questions about THIS product line.');
        lines.push('If asked about other product lines, respond: "I can only assist with the current product line. Please switch product lines to access that information."');
    } else {
        lines.push('**Product line context not specified**');
    }
    lines.push('');

    // Inject Today's Date for Reference (CRITICAL for overdue calculations)
    const today = new Date();
    lines.push(`## System Context`);
    lines.push(`- **Current Date**: ${today.toISOString().split('T')[0]}`);
    lines.push('');

    lines.push('## Production Statistics');
    lines.push('## Production Statistics');
    lines.push(`- Total Orders: ${context.stats.totalOrders} (Analysis based on recent ${context.orders.length} active orders)`);
    lines.push(`- Completed Today: ${context.stats.todayCompleted} orders`);
    lines.push(`- Active Orders: ${context.stats.totalActive}`);
    lines.push(`- Pending: ${context.stats.totalPending}`);
    lines.push(`- Hold/QN: ${context.stats.totalHold}`);
    lines.push('');

    // Inject Category Analysis
    lines.push('## ⚠️ Issue Analysis (Last 90 Days)');
    if (context.categoryStats.topIssues.length > 0) {
        lines.push('**Top Reported Issues (Category / Step / Count):**');
        context.categoryStats.topIssues.forEach(issue => {
            lines.push(`- ${issue.category} at "${issue.step}": ${issue.count} incidents`);
        });
        lines.push('');
        lines.push('**Issue Totals:**');
        Object.entries(context.categoryStats.total).forEach(([cat, count]) => {
            lines.push(`- ${cat}: ${count}`);
        });
    } else {
        lines.push('No significant issues (Material, Quality, Equipment) reported in the last 90 days.');
    }
    lines.push('');

    // Inject Active Order Issues (Detailed) - NEW
    if (context.activeIssues && context.activeIssues.length > 0) {
        lines.push('## 🔴 Recent Issues on ACTIVE Orders (Last 48h)');
        lines.push('Use these details for the Morning Report to highlight specific blockers:');
        context.activeIssues.forEach(issue => {
            // Content is already sanitized and ID-attributed in the mapping phase
            lines.push(`- [${issue.category}] ${issue.woId} at "${issue.step}": "${issue.content}"`);
        });
        lines.push('');
    }

    lines.push('## Product Lines & Data Structure');
    for (const product of context.products) {
        const config = (product as any).config || {};
        const detailCols = config.detailColumns || [];
        const steps = product.steps || [];

        // Filter Detail Columns based on Visibility
        const visibleDetailCols = config.aiVisibleColumns
            ? detailCols.filter((c: string) => config.aiVisibleColumns.includes(c))
            : detailCols;

        // Filter Steps based on Visibility
        const visibleSteps = config.aiVisibleSteps
            ? steps.filter((s: string) => config.aiVisibleSteps.includes(s))
            : steps;

        lines.push(`### ${product.name}`);

        // Show detail columns (static order info)
        if (visibleDetailCols.length > 0) {
            lines.push(`**Detail Columns** (Static Order Info): ${visibleDetailCols.join(', ')}`);
        }

        // Show process steps (progress tracking)
        if (visibleSteps.length > 0) {
            lines.push(`**Process Steps** (in sequence): ${visibleSteps.join(' → ')}`);
        }

        // Only show custom instructions for the active product to save tokens
        if (product.customInstructions && (!activeProductId || product.id === activeProductId)) {
            lines.push(`  > AI Note: ${product.customInstructions}`);
        }
        lines.push('');
    }

    // LAYERED DISPLAY: Show all orders with basic info first
    lines.push('## Recent Orders (Basic Info)');
    lines.push(`Total: ${context.orders.length} orders in this product line`);
    lines.push('**Note**: Showing the most recent 50 orders. If you need to check an order not listed here, simply ask about its WO ID.');
    lines.push('');
    lines.push('**Order List** (WO ID | Status | Current Step):');
    let basicCount = 0;
    for (const order of context.orders) {
        if (basicCount >= 50) break; // Limit to 50 basic items to save tokens
        basicCount++;
        const statusIcon = order.status === 'Completed' ? '✅' :
            order.status === 'Hold' ? '🔴' :
                order.status === 'QN' ? '⚠️' : '🔵';
        lines.push(`- ${statusIcon} ${order.woId} | ${order.status} | ${order.currentStep}`);
    }
    lines.push('');

    // List orders with special statuses (Hold, QN) - check from order status
    const holdOrders = context.orders.filter(o => o.status === 'Hold');
    const qnOrders = context.orders.filter(o => o.status === 'QN');

    const listedWoIds = new Set<string>();

    if (holdOrders.length > 0) {
        lines.push('## ⚠️ Orders on HOLD');
        for (const order of holdOrders) {
            lines.push(`- ${order.woId} [${order.productName}]: Hold at step "${order.currentStep}"`);
            listedWoIds.add(order.woId);
        }
        lines.push('');
    }

    if (qnOrders.length > 0) {
        lines.push('## ⚠️ Orders with QN (Quality Notification)');
        for (const order of qnOrders) {
            lines.push(`- ${order.woId} [${order.productName}]: QN at step "${order.currentStep}"`);
            listedWoIds.add(order.woId);
        }
        lines.push('');
    }

    // Detailed info for recent/active orders with COMPLETE data
    // Exclude ones we already listed in Hold/QN sections to avoid duplication
    lines.push('## Top 20 Orders (Complete Details)');
    lines.push('Showing detailed information for the most recent 20 orders (including completed):');
    lines.push('');
    let count = 0;
    for (const order of context.orders) {
        if (count >= 20) break; // Optimized to 20 to minimize token usage
        if (listedWoIds.has(order.woId)) continue; // Skip if already listed in Hold/QN
        // REMOVED: No longer skip completed orders - show all statuses

        // Show WO ID and product as header
        lines.push(`### ${order.woId} [${order.productName}]`);
        lines.push(`Status: ${order.status}, Current Step: ${order.currentStep}`);

        // Show all detail columns
        if (Object.keys(order.details).length > 0) {
            lines.push('Details:');
            for (const [key, value] of Object.entries(order.details)) {
                if (value) lines.push(`  - ${key}: ${value}`);
            }
        }

        // Show step progress
        if (Object.keys(order.stepValues).length > 0) {
            lines.push('Steps:');
            for (const [step, value] of Object.entries(order.stepValues)) {
                if (value) {
                    // Format dates nicely, keep statuses as-is
                    const displayValue = /\d{4}-\d{2}-\d{2}/.test(value)
                        ? value.split('T')[0]
                        : value;
                    lines.push(`  - ${step}: ${displayValue}`);
                }
            }
        }

        lines.push(''); // Blank line between orders
        count++;
    }
    lines.push('');

    lines.push('## Recent Operations & Employee activity');
    lines.push('NOTE: Performers are identified by their Anonymous Employee ID for privacy.');
    for (const log of context.recentLogs.slice(0, 20)) {
        const time = new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const user = log.userName; // This is employeeId only (never username for privacy)
        lines.push(`- ${time} | ID:${user} updated ${log.woId}: ${log.step} → ${log.action}`);
    }

    return lines.join('\n');
}
