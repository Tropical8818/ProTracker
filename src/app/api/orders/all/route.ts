import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status'); // 'active', 'completed', 'all'
        const productId = searchParams.get('productId');

        const where: any = {};
        if (productId) {
            where.productId = productId;
        }

        // Fetch orders with optional productId filter
        const allOrders = await prisma.order.findMany({
            where,
            include: {
                product: {
                    select: { name: true, config: true }
                }
            },
            orderBy: { updatedAt: 'desc' },
            take: 200 // Kiosk usually only needs recent/active ones
        });

        const filteredOrders = allOrders.filter(order => {
            const config = JSON.parse(order.product.config);
            const data = JSON.parse(order.data);
            const steps = config.steps || [];
            const finalStep = steps[steps.length - 1];

            if (status === 'active') {
                const finalVal = data[finalStep] || '';
                const isDone = /\d{2}-\w{3}/.test(finalVal); // Date format check
                return !isDone;
            }
            return true;
        }).map(order => {
            const config = JSON.parse(order.product.config);
            return {
                id: order.id,
                woId: order.woId,
                productId: order.productId,
                productName: order.product.name,
                data: JSON.parse(order.data),
                steps: config.steps || [],
                updatedAt: order.updatedAt.toISOString()
            };
        }).sort((a, b) => {
            // 1. Primary Sort: Due Date (Matches "DUE")
            const getDueDate = (data: any) => {
                const keys = Object.keys(data);
                const dueKey = keys.find(k =>
                    k.toUpperCase().includes('DUE') && !k.toUpperCase().includes('ECD')
                );
                if (!dueKey || !data[dueKey]) return null;
                const d = new Date(data[dueKey]);
                return isNaN(d.getTime()) ? null : d;
            };

            const dateA = getDueDate(a.data);
            const dateB = getDueDate(b.data);

            if (dateA || dateB) {
                if (!dateA) return 1;
                if (!dateB) return -1;
                if (dateA.getTime() !== dateB.getTime()) {
                    return dateA.getTime() - dateB.getTime(); // Earliest Due Date first
                }
            }

            // 2. Secondary Sort: Priority weight (!!! -> !! -> !)
            const getPriorityWeight = (data: any) => {
                const keys = Object.keys(data);
                const priorityKey = keys.find(k =>
                    k.toUpperCase().includes('PRIORITY')
                );
                const val = priorityKey ? String(data[priorityKey] || '') : '';

                if (val.includes('!!!')) return 3;
                if (val.includes('!!')) return 2;
                if (val.includes('!')) return 1;
                return 0;
            };

            const weightA = getPriorityWeight(a.data);
            const weightB = getPriorityWeight(b.data);

            if (weightA !== weightB) {
                return weightB - weightA; // Higher Priority weight first
            }

            // 3. Tertiary Sort: Planned Status ('P')
            const hasPlannedStatus = (data: any) => {
                return Object.values(data).some(v => String(v).toUpperCase() === 'P') ? 1 : 0;
            };

            const plannedA = hasPlannedStatus(a.data);
            const plannedB = hasPlannedStatus(b.data);

            if (plannedA !== plannedB) {
                return plannedB - plannedA; // Planned ('P') comes first
            }

            // 4. Last Resort: Recently Updated
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

        // Collect all unique steps from all products
        const allStepsSet = new Set<string>();
        filteredOrders.forEach(order => {
            order.steps.forEach((step: string) => allStepsSet.add(step));
        });

        return NextResponse.json({
            orders: filteredOrders,
            availableSteps: Array.from(allStepsSet)
        });
    } catch (error) {
        console.error('Kiosk All Orders API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch kiosk orders' }, { status: 500 });
    }
}
