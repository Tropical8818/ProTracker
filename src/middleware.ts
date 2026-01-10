import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { decrypt } from '@/lib/session';

export async function middleware(request: NextRequest) {
    const sessionCookie = request.cookies.get('protracker_sess');

    if (!sessionCookie) {
        return NextResponse.next();
    }

    try {
        const session = await decrypt(sessionCookie.value);
        const { role } = session;
        const { pathname } = request.nextUrl;

        // Kiosk role restriction
        if (role === 'kiosk') {
            if (!pathname.startsWith('/dashboard/kiosk') && pathname.startsWith('/dashboard')) {
                return NextResponse.redirect(new URL('/dashboard/kiosk', request.url));
            }
        }
    } catch {
        // Invalid session cookie - optionally clear it or redirect to login
        // For now, treat as no session
        const response = NextResponse.next();
        response.cookies.delete('protracker_sess');
        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*'],
};
