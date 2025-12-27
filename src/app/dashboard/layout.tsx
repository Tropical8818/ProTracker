import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import RoleIndicator from '@/components/RoleIndicator';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    return (
        <>
            {children}
            <RoleIndicator username={session.username} role={session.role} />
        </>
    );
}
