import { cookies } from 'next/headers';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

const SESSION_COOKIE = 'pt_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export type UserRole = 'user' | 'supervisor' | 'admin';

export interface Session {
    userId: string;
    username: string;
    role: UserRole;
    expiresAt: number;
}

export async function createSession(userId: string, username: string, role: string): Promise<void> {
    const session: Session = {
        userId,
        username,
        role: role as UserRole,
        expiresAt: Date.now() + SESSION_DURATION
    };

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, JSON.stringify(session), {
        httpOnly: true,
        secure: false, // Allow HTTP for reverse proxy compatibility
        sameSite: 'lax',
        maxAge: SESSION_DURATION / 1000,
        path: '/'
    });
}

export async function getSession(): Promise<Session | null> {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE);

    if (!cookie) return null;

    try {
        const session: Session = JSON.parse(cookie.value);
        if (session.expiresAt < Date.now()) {
            await destroySession();
            return null;
        }
        return session;
    } catch {
        return null;
    }
}

export async function destroySession(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
}
