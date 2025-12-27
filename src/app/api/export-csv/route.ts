
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');

        const where = productId ? { productId } : {};

        const orders = await prisma.order.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        // Generate CSV
        // We will include all fields from the JSON content + createdAt/updatedAt
        // Flatten the data: ID, ProductID, CreatedAt, ...dynamicFields

        if (orders.length === 0) {
            return new NextResponse('No data found', {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="production-data-${format(new Date(), 'yyyy-MM-dd')}.csv"`
                }
            });
        }

        // Collect all possible keys from all orders to make headers
        const allKeys = new Set<string>();
        allKeys.add('WO ID'); // Ensure WO ID is first
        allKeys.add('Product Line');
        allKeys.add('Created At');

        const flattenedOrders = orders.map(order => {
            let data: any = {};
            try {
                data = JSON.parse(order.data);
            } catch (e) {
                console.error('Error parsing order data:', e);
            }

            // Add keys to Set
            Object.keys(data).forEach(k => allKeys.add(k));

            return {
                'WO ID': order.woId,
                'Product Line': order.productId,
                'Created At': format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm:ss'),
                ...data
            };
        });

        const headers = Array.from(allKeys);

        // Create CSV Content
        const csvRows = [
            headers.join(','), // Header row
            ...flattenedOrders.map(row => {
                return headers.map(header => {
                    const val = row[header] ?? '';
                    // Escape quotes and wrap in quotes if contains comma or newline
                    const strVal = String(val);
                    if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
                        return `"${strVal.replace(/"/g, '""')}"`;
                    }
                    return strVal;
                }).join(',');
            })
        ];

        const csvContent = csvRows.join('\n');

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="production-data-${format(new Date(), 'yyyy-MM-dd')}.csv"`
            }
        });

    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
    }
}
