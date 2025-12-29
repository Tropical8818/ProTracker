import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { error: 'Order ID is required' },
                { status: 400 }
            );
        }

        // Check if order exists
        const order = await prisma.order.findUnique({
            where: { id }
        });

        if (!order) {
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            );
        }

        // Delete the order
        await prisma.order.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Error deleting order:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
