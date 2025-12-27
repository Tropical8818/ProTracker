import React from 'react';

interface RoleIndicatorProps {
    username: string;
    role: string;
}

export default function RoleIndicator({ username, role }: RoleIndicatorProps) {
    return (
        <div className="fixed bottom-2 right-2 z-50 pointer-events-none select-none">
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm rounded-full px-3 py-1 text-[10px] font-medium text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                <span className="text-slate-600 font-bold">{username}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span className={
                    role === 'admin' ? 'text-purple-600' :
                        role === 'supervisor' ? 'text-indigo-600' :
                            'text-slate-500'
                }>{role}</span>
            </div>
        </div>
    );
}
