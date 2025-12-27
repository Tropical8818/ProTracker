import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const products = await prisma.product.findMany();

        const formattedProducts = products.map(p => {
            const config = JSON.parse(p.config);
            return {
                id: p.id,
                name: p.name,
                ...config
            };
        });

        // Find active product or default to first
        const activeProduct = products.find(p => p.isActive) || products[0];

        return NextResponse.json({
            products: formattedProducts,
            activeProductId: activeProduct?.id
        });
    } catch (error) {
        console.error('Config fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and supervisor can update config
    if (session.role !== 'admin' && session.role !== 'supervisor') {
        return NextResponse.json({ error: 'Admin or supervisor access required' }, { status: 403 });
    }

    try {
        const body = await request.json();

        if (body.products) {
            const incomingIds = body.products.map((p: any) => p.id);

            // 1. Delete products not in the incoming list (except matching existing ones)
            // Use transaction or separate calls
            await prisma.product.deleteMany({
                where: {
                    id: { notIn: incomingIds }
                }
            });

            // 2. Upsert incoming products
            for (const p of body.products) {
                const { id, name, ...config } = p;

                // Helper to generate slug
                const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                // We add ID suffix to ensure uniqueness especially if multiple products have same name
                const slug = `${baseSlug}-${id.slice(-6)}`;

                if (id) {
                    await prisma.product.upsert({
                        where: { id },
                        update: {
                            name,
                            config: JSON.stringify(config)
                        },
                        create: {
                            id,
                            name,
                            slug, // Ensure slug is unique
                            config: JSON.stringify(config),
                            isActive: false // Default, active state handled below
                        }
                    });
                }
            }
        }

        // Handle Active Product Switch
        if (body.activeProductId) {
            // Deactivate all
            await prisma.product.updateMany({
                data: { isActive: false }
            });
            // Activate target
            await prisma.product.update({
                where: { id: body.activeProductId },
                data: { isActive: true }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Config update error:', error);
        return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
    }
}
