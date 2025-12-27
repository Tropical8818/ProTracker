import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'supervisor')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const whereClause = session.role === 'supervisor' ? { role: 'user' } : {};

        const users = await prisma.user.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                username: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true
            }
        });
        return NextResponse.json({ users });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'supervisor')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { username, password, role } = await request.json();

        // Validation
        if (!username || !password || !role) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // Permission check
        if (session.role === 'supervisor' && role !== 'user') {
            return NextResponse.json({ error: 'Supervisors can only create standard users' }, { status: 403 });
        }

        // Check existence
        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) {
            return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                username,
                passwordHash,
                role,
                status: 'approved' // Manually created users are auto-approved
            }
        });

        return NextResponse.json({
            success: true,
            user: {
                id: newUser.id,
                username: newUser.username,
                role: newUser.role,
                status: newUser.status
            }
        });

    } catch (error) {
        console.error('Create user error:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
