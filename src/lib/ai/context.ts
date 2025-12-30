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
}

export interface AIContext {
    orders: OrderSummary[];
    stats: ProductionStats;
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
    activeModel?: string;
    activeProvider?: 'openai' | 'ollama';
}

// Build context for AI from production data
export async function buildAIContext(productId?: string): Promise<AIContext> {
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

    // Fetch orders - get more for better AI lookup
    const orderWhere = productId ? { productId } : {};
    const orders = await prisma.order.findMany({
        where: orderWhere,
        include: {
            product: {
                select: { name: true, config: true }
            }
        },
        take: 500, // Increased for better AI order recognition
        orderBy: { updatedAt: 'desc' }
    });

    // Process orders into summaries
    const orderSummaries: OrderSummary[] = orders.map(order => {
        const data = JSON.parse(order.data || '{}');
        const config = JSON.parse(order.product.config || '{}');
        const steps = config.steps || [];
        const detailColumns = config.detailColumns || [];

        // Extract all detail columns for AI analysis
        const details: Record<string, string> = {};
        for (const col of detailColumns) {
            details[col] = data[col] || '';
        }

        // Extract all step values for AI analysis
        const stepValues: Record<string, string> = {};
        for (const step of steps) {
            stepValues[step] = data[step] || '';
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

        return {
            woId: order.woId,
            productName: order.product.name,
            currentStep,
            status,
            ecd: data['ECD'] || '',
            daysInCurrentStep: 0, // Could calculate from logs
            details,
            stepValues
        };
    });

    // Calculate stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const completedToday = orderSummaries.filter(o => o.status === 'Completed').length;
    const activeOrders = orderSummaries.filter(o => ['Active', 'P', 'WIP'].includes(o.status));
    const holdOrders = orderSummaries.filter(o => ['Hold', 'QN'].includes(o.status));
    const pendingOrders = orderSummaries.filter(o => o.status === 'Pending');

    const stats: ProductionStats = {
        todayCompleted: completedToday,
        weeklyCompleted: completedToday * 7, // Simplified
        totalActive: activeOrders.length,
        totalPending: pendingOrders.length,
        totalHold: holdOrders.length,
        completionRate: orders.length > 0 ? Math.round((completedToday / orders.length) * 100) : 0
    };

    // Fetch recent logs
    const logs = await prisma.operationLog.findMany({
        take: 30, // Increased log count for better activity analysis
        orderBy: { timestamp: 'desc' },
        include: {
            order: {
                select: { woId: true }
            },
            user: {
                select: { username: true, employeeId: true }
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
            userName: log.user?.employeeId || log.user?.username || 'System'
        };
    });

    return {
        orders: orderSummaries, // Include all orders
        stats,
        recentLogs,
        products: productData,
        activeModel,
        activeProvider
    };
}

// Format context as a string for the AI prompt
export function formatContextForAI(context: AIContext, activeProductId?: string): string {
    const lines: string[] = [];

    lines.push('## Production Statistics');
    lines.push(`- Total Orders: ${context.orders.length}`);
    lines.push(`- Completed Today: ${context.stats.todayCompleted} orders`);
    lines.push(`- Active Orders: ${context.stats.totalActive}`);
    lines.push(`- Pending: ${context.stats.totalPending}`);
    lines.push(`- Hold/QN: ${context.stats.totalHold}`);
    lines.push('');

    lines.push('## Product Lines');
    for (const product of context.products) {
        lines.push(`- ${product.name}: ${product.steps.join(' → ')}`);
        // Only show custom instructions for the active product to save tokens
        if (product.customInstructions && (!activeProductId || product.id === activeProductId)) {
            lines.push(`  > AI Note: ${product.customInstructions}`);
        }
    }
    lines.push('');

    // Include Active WO IDs for lookup (limit to active to save tokens)
    lines.push('## Active Order WO IDs');
    const activeWoIds = context.orders
        .filter(o => ['Active', 'P', 'WIP', 'Hold', 'QN'].includes(o.status))
        .map(o => o.woId);
    lines.push(activeWoIds.join(', '));
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
    lines.push('## Recent Active Orders (Complete Details)');
    let count = 0;
    for (const order of context.orders) {
        if (count >= 15) break; // Limit to 15 detailed orders to manage token usage
        if (listedWoIds.has(order.woId)) continue; // Skip if already listed
        if (order.status === 'Completed') continue; // Skip completed for details (they are in stats)

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
        const user = log.userName; // This is now employeeId or username
        lines.push(`- ${time} | ID:${user} updated ${log.woId}: ${log.step} → ${log.action}`);
    }

    return lines.join('\n');
}
