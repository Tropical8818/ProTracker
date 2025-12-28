import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

export async function GET(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');

        if (!productId) {
            return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
        }

        const product = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        const config = JSON.parse(product.config);
        const steps: string[] = config.steps || [];
        const finalStep = steps[steps.length - 1];

        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = subDays(new Date(), i);
            return format(date, 'yyyy-MM-dd');
        }).reverse();

        // 1. Step Productivity (Completed counts in last 7 days)
        const logs = await prisma.operationLog.findMany({
            where: {
                timestamp: {
                    gte: subDays(startOfDay(new Date()), 7)
                },
                action: 'Done',
                order: {
                    productId: productId
                }
            }
        });

        const stepProductivity: Record<string, number> = {};
        steps.forEach(s => stepProductivity[s] = 0);

        logs.forEach(log => {
            const details = JSON.parse(log.details);
            if (details.step && stepProductivity[details.step] !== undefined) {
                stepProductivity[details.step]++;
            }
        });

        const productivityData = steps.map(s => ({
            name: s,
            count: stepProductivity[s]
        }));

        // 2. Bottlenecks (Current WIP or Pending per step)
        const orders = await prisma.order.findMany({
            where: { productId }
        });

        const wipCounts: Record<string, number> = {};
        steps.forEach(s => wipCounts[s] = 0);

        orders.forEach(order => {
            const data = JSON.parse(order.data);
            // An order is "at" a step if it's the first step that isn't a date
            // or if it's specifically marked WIP.
            // Simplified logic: If a step has 'WIP' or is empty while previous is done.
            for (const step of steps) {
                const val = data[step];
                if (val === 'WIP' || val === '' || val === undefined || val === 'Hold' || val === 'QN') {
                    wipCounts[step]++;
                    break; // Count towards the first active bottleneck
                }
            }
        });

        const bottleneckData = steps.map(s => ({
            name: s,
            count: wipCounts[s]
        }));

        // 3. 7-Day Trend (Daily final step completion)
        const trendData = last7Days.map(dateStr => {
            const count = logs.filter(log => {
                const details = JSON.parse(log.details);
                return details.step === finalStep && format(log.timestamp, 'yyyy-MM-dd') === dateStr;
            }).length;

            return {
                date: dateStr,
                output: count
            };
        });

        return NextResponse.json({
            productivity: productivityData,
            bottlenecks: bottleneckData,
            trend: trendData,
            summary: {
                topProducer: productivityData.reduce((prev, current) => (prev.count > current.count) ? prev : current, { name: 'None', count: 0 }).name,
                bottleneck: bottleneckData.reduce((prev, current) => (prev.count > current.count) ? prev : current, { name: 'None', count: 0 }).name,
                totalOutput: trendData.reduce((sum, d) => sum + d.output, 0)
            }
        });
    } catch (error) {
        console.error('Analytics API Error:', error);
        return NextResponse.json({ error: 'Failed to generate analytics' }, { status: 500 });
    }
}
