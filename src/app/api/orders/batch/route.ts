import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface StepUpdate {
    woId: string;
    step: string;
    status: string;
}

export async function PATCH(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { updates, productId } = await request.json();

        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
        }

        if (!productId) {
            return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
        }

        // Process batch updates in a transaction
        let successCount = 0;
        const errors: string[] = [];

        for (const update of updates as StepUpdate[]) {
            try {
                // Find the order
                const order = await prisma.order.findUnique({
                    where: {
                        productId_woId: {
                            productId,
                            woId: update.woId
                        }
                    }
                });

                if (!order) {
                    errors.push(`Order ${update.woId} not found`);
                    continue;
                }

                const currentData = JSON.parse(order.data);
                const previousValue = currentData[update.step] || '';
                let newValue = update.status;

                // Handle different status types
                if (update.status === 'Reset') {
                    newValue = '';
                    delete currentData[update.step];
                } else if (['P', 'WIP', 'N/A', 'Hold', 'QN', 'DIFA'].includes(update.status)) {
                    currentData[update.step] = update.status;
                } else {
                    currentData[update.step] = update.status;
                }

                // Update order and create log in transaction
                await prisma.$transaction([
                    prisma.order.update({
                        where: { id: order.id },
                        data: {
                            data: JSON.stringify(currentData)
                        }
                    }),
                    prisma.operationLog.create({
                        data: {
                            action: update.status,
                            details: JSON.stringify({
                                step: update.step,
                                previousValue,
                                newValue,
                                batchOperation: true
                            }),
                            userId: session.userId,
                            orderId: order.id,
                            snapshot: JSON.stringify({
                                woId: update.woId
                            })
                        }
                    })
                ]);

                successCount++;
            } catch (err) {
                console.error(`Failed to update ${update.woId}:`, err);
                errors.push(`Failed to update ${update.woId}`);
            }
        }

        return NextResponse.json({
            success: true,
            count: successCount,
            total: updates.length,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('Batch update error:', error);
        const message = error instanceof Error ? error.message : 'Batch update failed';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
