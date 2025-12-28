import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and supervisor can update settings
    if (session.role !== 'admin' && session.role !== 'supervisor') {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { monthlyTarget } = body;
        const productId = params.id;

        const product = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        let config: any = {};
        try {
            config = JSON.parse(product.config);
        } catch (e) {
            config = {};
        }

        if (monthlyTarget !== undefined) {
            console.log(`[API] Updating monthlyTarget for ${productId} to ${monthlyTarget}`);
            config.monthlyTarget = Number(monthlyTarget);
        }

        const jsonConfig = JSON.stringify(config);
        console.log('[API] Saving config:', jsonConfig);

        await prisma.product.update({
            where: { id: productId },
            data: {
                config: jsonConfig
            }
        });

        console.log('[API] Update successful');
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Update product error detail:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update product' }, { status: 500 });
    }
}
