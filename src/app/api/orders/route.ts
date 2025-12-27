import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const productId = request.nextUrl.searchParams.get('productId');
        if (!productId) {
            return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
        }

        const product = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        const productConfig = JSON.parse(product.config);
        const { steps, detailColumns } = productConfig;

        const orders = await prisma.order.findMany({
            where: { productId }
        });

        const formattedOrders = orders.map(order => {
            const data = JSON.parse(order.data);
            return {
                id: order.id,
                woId: order.woId,
                ...data
            };
        });

        return NextResponse.json({
            orders: formattedOrders,
            steps: steps,
            detailColumns: detailColumns
        });
    } catch (error) {
        console.error('Orders fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}
