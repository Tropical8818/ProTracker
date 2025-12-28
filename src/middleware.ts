import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const sessionCookie = request.cookies.get('pt_session');

    if (!sessionCookie) {
        return NextResponse.next();
    }

    try {
        const session = JSON.parse(sessionCookie.value);
        const { role } = session;
        const { pathname } = request.nextUrl;

        // Kiosk role restriction
        if (role === 'kiosk') {
            if (!pathname.startsWith('/dashboard/kiosk') && pathname.startsWith('/dashboard')) {
                return NextResponse.redirect(new URL('/dashboard/kiosk', request.url));
            }
        }
    } catch (e) {
        // Invalid session cookie
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*'],
};
