import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: targetUserId } = await params;
    const body = await request.json();

    try {
        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId }
        });

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Permission Logic
        const isSelf = session.userId === targetUserId;
        const isAdmin = session.role === 'admin';
        const isSupervisor = session.role === 'supervisor';
        const targetIsUser = targetUser.role === 'user';

        // 1. Password Change
        if (body.password) {
            // Allowed if: Self, Admin, or (Supervisor AND Target is User)
            const canChangePassword = isSelf || isAdmin || (isSupervisor && targetIsUser);

            if (!canChangePassword) {
                return NextResponse.json({ error: 'Permission denied to change password' }, { status: 403 });
            }

            // Require current password for self-service logic
            if (isSelf) {
                if (!body.currentPassword) {
                    return NextResponse.json({ error: 'Current password required' }, { status: 400 });
                }
                const isValid = await bcrypt.compare(body.currentPassword, targetUser.passwordHash);
                if (!isValid) {
                    return NextResponse.json({ error: 'Incorrect current password' }, { status: 403 });
                }
            }

            const hash = await bcrypt.hash(body.password, 10);
            await prisma.user.update({
                where: { id: targetUserId },
                data: { passwordHash: hash }
            });
        }

        // 2. Status/Role/EmployeeID Change
        if (body.status || body.role || body.hasOwnProperty('employeeId')) {
            // Only Admin or (Supervisor if target is User)
            const canManage = isAdmin || (isSupervisor && targetIsUser);

            if (!canManage) {
                return NextResponse.json({ error: 'Permission denied to update user details' }, { status: 403 });
            }

            // Supervisor cannot promote to Admin/Supervisor
            if (isSupervisor && body.role && body.role !== 'user') {
                return NextResponse.json({ error: 'Supervisors cannot promote users' }, { status: 403 });
            }

            // Check Employee ID uniqueness if changed
            if (body.employeeId && body.employeeId !== targetUser.employeeId) {
                const existing = await prisma.user.findUnique({
                    where: { employeeId: body.employeeId }
                });
                if (existing) {
                    return NextResponse.json({ error: 'Employee ID already exists' }, { status: 409 });
                }
            }

            const data: any = {};
            if (body.status) data.status = body.status;
            if (body.role) data.role = body.role;
            if (body.hasOwnProperty('employeeId')) data.employeeId = body.employeeId || null;

            await prisma.user.update({
                where: { id: targetUserId },
                data
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: targetUserId } = await params;

    try {
        const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const isAdmin = session.role === 'admin';
        const isSupervisor = session.role === 'supervisor';
        const targetIsUser = targetUser.role === 'user';

        if (isAdmin || (isSupervisor && targetIsUser)) {
            // Prevent deleting self?
            if (session.userId === targetUserId) {
                return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
            }

            await prisma.user.delete({ where: { id: targetUserId } });
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }
    } catch (error) {
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
