import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const role = session.role;

        let whereClause = {};
        if (role === 'user') {
            // Operators can only mention supervisors/admins
            whereClause = {
                role: { in: ['admin', 'supervisor'] }
            };
        }
        // If role is admin or supervisor, they can see everyone (whereClause = {})

        const users = await prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                username: true,
                role: true
            },
            orderBy: {
                username: 'asc'
            }
        });

        return NextResponse.json({ supervisors: users });
    } catch (error) {
        console.error('Failed to fetch supervisors:', error);
        return NextResponse.json({ error: 'Failed to fetch supervisors' }, { status: 500 });
    }
}
