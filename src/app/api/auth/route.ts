import { NextResponse } from 'next/server';
import { createSession, destroySession, getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// POST /api/auth - Login
export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();
        console.log('Login attempt:', username);
        console.log('CWD:', process.cwd());
        console.log('PASS:', password);
        // @ts-ignore
        console.log('DB URL:', process.env.DATABASE_URL);

        if (!username || !password) {
            return NextResponse.json(
                { success: false, error: 'Username and password required' },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { username }
        });

        console.log('User found:', user);

        if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
            return NextResponse.json(
                { success: false, error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        if (user.status !== 'approved') {
            return NextResponse.json(
                { success: false, error: 'Account is pending approval or disabled' },
                { status: 403 }
            );
        }

        await createSession(user.id, user.username, user.role);

        return NextResponse.json({
            success: true,
            role: user.role,
            username: user.username
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { success: false, error: 'Login failed' },
            { status: 500 }
        );
    }
}

// GET /api/auth - Check session
export async function GET() {
    const session = await getSession();

    if (!session) {
        return NextResponse.json({
            authenticated: false
        });
    }

    // Verify user still exists in DB
    const user = await prisma.user.findUnique({
        where: { id: session.userId }
    });

    if (!user) {
        await destroySession();
        return NextResponse.json({
            authenticated: false
        });
    }

    return NextResponse.json({
        authenticated: true,
        role: session.role,
        id: session.userId,
        username: session.username
    });
}

// DELETE /api/auth - Logout
export async function DELETE() {
    await destroySession();
    return NextResponse.json({ success: true });
}
