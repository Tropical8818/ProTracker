import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id: woId } = await params;
        const { step, status, productId } = await request.json();

        if (!step || !status || !productId) {
            return NextResponse.json({ error: 'Step, status, and product ID are required' }, { status: 400 });
        }

        // Find the order
        const order = await prisma.order.findUnique({
            where: {
                productId_woId: {
                    productId,
                    woId
                }
            }
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const currentData = JSON.parse(order.data);
        const previousValue = currentData[step] || '';
        let newValue = status;


        if (status === 'Reset') {
            newValue = '';
            delete currentData[step];
        } else if (status === 'Done') {
            // "Done" generates a timestamp in format: dd-MMM, HH:mm
            const now = new Date();
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const day = String(now.getDate()).padStart(2, '0');
            const month = months[now.getMonth()];
            const hour = String(now.getHours()).padStart(2, '0');
            const minute = String(now.getMinutes()).padStart(2, '0');
            newValue = `${day}-${month}, ${hour}:${minute}`;
            currentData[step] = newValue;
        } else if (['P', 'WIP', 'N/A', 'Hold', 'QN', 'DIFA'].includes(status)) {
            // Status markers are kept as-is
            currentData[step] = status;
            newValue = status;
        } else {
            // Fallback: anything else is saved as-is (e.g., manual edits)
            currentData[step] = status;
            newValue = status;
        }


        // Transaction: Update Order + Create Log
        const [updatedOrder] = await prisma.$transaction([
            prisma.order.update({
                where: { id: order.id },
                data: {
                    data: JSON.stringify(currentData)
                }
            }),
            prisma.operationLog.create({
                data: {
                    action: status,
                    details: JSON.stringify({
                        step,
                        previousValue,
                        newValue
                    }),
                    userId: session.userId,
                    orderId: order.id,
                    snapshot: JSON.stringify({
                        woId,
                        productName: (await prisma.product.findUnique({ where: { id: productId } }))?.name
                    })
                }
            })
        ]);

        return NextResponse.json({ success: true, order: { ...updatedOrder, ...currentData } });
    } catch (error) {
        console.error('Update Step Error:', error);
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }
}
