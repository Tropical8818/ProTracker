import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

/**
 * Export data older than 3 months for archival
 * Returns a combined CSV with Orders, Logs, and Comments sections
 */
export async function GET() {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'supervisor')) {
        return NextResponse.json({ error: 'Unauthorized: Admin or Supervisor required' }, { status: 403 });
    }

    try {
        // Retention policy: 3 months
        const cutOffDate = new Date();
        cutOffDate.setMonth(cutOffDate.getMonth() - 3);

        // Fetch old data
        const [orders, logs, comments] = await Promise.all([
            // Orders
            prisma.order.findMany({
                where: { createdAt: { lt: cutOffDate } },
                include: { product: true },
                orderBy: { createdAt: 'desc' }
            }),
            // Operation Logs
            prisma.operationLog.findMany({
                where: { timestamp: { lt: cutOffDate } },
                include: {
                    user: { select: { username: true, employeeId: true } },
                    order: {
                        select: {
                            woId: true,
                            product: { select: { name: true } }
                        }
                    }
                },
                orderBy: { timestamp: 'desc' }
            }),
            // Comments
            prisma.comment.findMany({
                where: { createdAt: { lt: cutOffDate } },
                include: {
                    user: { select: { username: true, employeeId: true } },
                    order: {
                        select: {
                            woId: true,
                            product: { select: { name: true } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        if (orders.length === 0 && logs.length === 0 && comments.length === 0) {
            return new NextResponse('No data older than 3 months found to archive.', {
                status: 200,
                headers: {
                    'Content-Type': 'text/plain',
                }
            });
        }

        let csvContent = '';

        // Section 1: ORDERS
        if (orders.length > 0) {
            csvContent += '=== ORDERS ===\n';

            const allKeys = new Set<string>();
            allKeys.add('Order ID');
            allKeys.add('WO ID');
            allKeys.add('Product');
            allKeys.add('Created At');
            allKeys.add('Updated At');

            const flattenedOrders = orders.map(order => {
                let data: any = {};
                try {
                    data = JSON.parse(order.data);
                } catch (e) {
                    console.error('Error parsing order data:', e);
                }
                Object.keys(data).forEach(k => allKeys.add(k));

                return {
                    'Order ID': order.id,
                    'WO ID': order.woId,
                    'Product': order.product.name,
                    'Created At': format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm:ss'),
                    'Updated At': format(new Date(order.updatedAt), 'yyyy-MM-dd HH:mm:ss'),
                    ...data
                };
            });

            const headers = Array.from(allKeys);
            csvContent += headers.join(',') + '\n';
            csvContent += flattenedOrders.map(row => {
                return headers.map(header => {
                    const val = row[header] ?? '';
                    const strVal = String(val);
                    if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
                        return `"${strVal.replace(/"/g, '""')}"`;
                    }
                    return strVal;
                }).join(',');
            }).join('\n');
            csvContent += '\n\n';
        }

        // Section 2: OPERATION LOGS
        if (logs.length > 0) {
            csvContent += '=== OPERATION LOGS ===\n';
            const logsHeaders = [
                'Log ID', 'Timestamp', 'Product', 'WO ID', 'Step',
                'Action', 'Previous Value', 'New Value', 'Operator'
            ];
            csvContent += logsHeaders.join(',') + '\n';

            const flattenedLogs = logs.map(log => {
                const details = log.details ? JSON.parse(log.details) : {};
                const snapshot = log.snapshot ? JSON.parse(log.snapshot) : {};

                return {
                    'Log ID': log.id,
                    'Timestamp': format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
                    'Product': log.order?.product?.name || snapshot.productName || 'Unknown',
                    'WO ID': log.order?.woId || snapshot.woId || '',
                    'Step': details.step || '',
                    'Action': log.action,
                    'Previous Value': details.previousValue || '',
                    'New Value': details.newValue || '',
                    'Operator': log.user?.username || log.user?.employeeId || 'System'
                };
            });

            csvContent += flattenedLogs.map(row => {
                return logsHeaders.map(header => {
                    const val = (row as any)[header] ?? '';
                    const strVal = String(val);
                    if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
                        return `"${strVal.replace(/"/g, '""')}"`;
                    }
                    return strVal;
                }).join(',');
            }).join('\n');
            csvContent += '\n\n';
        }

        // Section 3: COMMENTS
        if (comments.length > 0) {
            csvContent += '=== COMMENTS ===\n';
            const commentsHeaders = [
                'Comment ID', 'Created At', 'Product', 'WO ID', 'Step',
                'Category', 'Content', 'User', 'Triggered Status', 'Is Read'
            ];
            csvContent += commentsHeaders.join(',') + '\n';

            const flattenedComments = comments.map(comment => {
                const readByList = comment.readBy ? JSON.parse(comment.readBy) : [];

                return {
                    'Comment ID': comment.id,
                    'Created At': format(new Date(comment.createdAt), 'yyyy-MM-dd HH:mm:ss'),
                    'Product': comment.order?.product?.name || 'Unknown',
                    'WO ID': comment.order?.woId || '',
                    'Step': comment.stepName,
                    'Category': comment.category,
                    'Content': comment.content || comment.note || '',
                    'User': comment.user?.username || comment.user?.employeeId || 'Unknown',
                    'Triggered Status': comment.triggeredStatus || '',
                    'Is Read': readByList.length > 1 ? 'Yes' : 'No'
                };
            });

            csvContent += flattenedComments.map(row => {
                return commentsHeaders.map(header => {
                    const val = (row as any)[header] ?? '';
                    const strVal = String(val);
                    if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
                        return `"${strVal.replace(/"/g, '""')}"`;
                    }
                    return strVal;
                }).join(',');
            }).join('\n');
        }

        // Return CSV for download
        const filename = `archive-old-data-${format(cutOffDate, 'yyyy-MM-dd')}.csv`;
        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        });

    } catch (error) {
        console.error('Export archive error:', error);
        return NextResponse.json({
            error: 'Failed to export archive',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
