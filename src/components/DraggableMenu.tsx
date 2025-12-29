'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, HardHat, Table2, Pencil, Ban, PauseCircle, Eraser, Upload, ScanBarcode, RefreshCw, Settings, LogOut, Info, Users } from 'lucide-react';
import type { Product } from '@/lib/config';

interface DraggableMenuProps {
    products: Product[];
    selectedProductId: string;
    onProductChange: (id: string) => void;
    role: string;
    onNavigate: (path: string) => void;

    // Toggles
    pMode: boolean; setPMode: (v: boolean) => void;
    naMode: boolean; setNaMode: (v: boolean) => void;
    holdMode: boolean; setHoldMode: (v: boolean) => void;
    eraseMode: boolean; setEraseMode: (v: boolean) => void;
    handleEraseRequest: () => void; // Handles admin check / modal

    // Actions
    onImport: () => void;
    onScan: () => void;
    onRefresh: () => void;
    onLogout: () => void;
}

export default function DraggableMenu({
    products, selectedProductId, onProductChange,
    role, onNavigate,
    pMode, setPMode,
    naMode, setNaMode,
    holdMode, setHoldMode,
    eraseMode, setEraseMode,
    handleEraseRequest,
    onImport, onScan, onRefresh, onLogout
}: DraggableMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    // Initialize with a safe default, will retain update after mount
    const [position, setPosition] = useState({ x: 0, y: 80 });
    const [isDragging, setIsDragging] = useState(false);
    const [mounted, setMounted] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const initialPos = useRef({ x: 0, y: 0 });

    // Prevent menu from opening if it was a drag
    const [hasMoved, setHasMoved] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Set initial position on client side
        setPosition({ x: window.innerWidth - 70, y: 80 });

        // Handle window resize to keep it on screen
        const handleResize = () => {
            setPosition(p => ({
                x: Math.min(p.x, window.innerWidth - 60),
                y: Math.min(p.y, window.innerHeight - 60)
            }));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!mounted) return null;

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDragging(true);
        setHasMoved(false);
        dragStart.current = { x: e.clientX, y: e.clientY };
        initialPos.current = { ...position };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;

        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            setHasMoved(true);
        }

        setPosition({
            x: initialPos.current.x + dx,
            y: initialPos.current.y + dy
        });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);

        // Snap to edges horizontally? Optional. keeping it free floating for now.
        // Ensure within bounds
        const padding = 10;
        const buttonSize = 56;
        let newX = position.x;
        let newY = position.y;

        if (newX < padding) newX = padding;
        if (newX > window.innerWidth - buttonSize - padding) newX = window.innerWidth - buttonSize - padding;
        if (newY < padding) newY = padding;
        if (newY > window.innerHeight - buttonSize - padding) newY = window.innerHeight - buttonSize - padding;

        setPosition({ x: newX, y: newY });
    };

    const handleClick = () => {
        if (!hasMoved) {
            setIsOpen(!isOpen);
        }
    };

    const selectedProduct = products.find(p => p.id === selectedProductId);

    if (isOpen) {
        return (
            <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
                <div
                    className="absolute bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-[240px] flex flex-col gap-3 animate-in fade-in zoom-in duration-200"
                    style={{
                        top: Math.min(Math.max(position.y, 10), window.innerHeight - 450),
                        left: position.x > window.innerWidth / 2 ? position.x - 180 : position.x
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-1">
                        <span className="font-bold text-slate-800">Menu</span>
                        <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-100 rounded-full">
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>

                    {/* Primary Actions: Operation & Scan */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => { onNavigate(`/dashboard/operation?product=${selectedProductId}`); setIsOpen(false); }}
                            className="flex items-center gap-3 p-3 bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 font-medium transition-colors border border-slate-100/50"
                        >
                            <HardHat className="w-5 h-5 text-slate-500" />
                            <span className="text-sm">Operation</span>
                        </button>

                        <button
                            onClick={() => { onScan(); setIsOpen(false); }}
                            className="flex items-center gap-3 p-3 bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 font-medium transition-colors border border-slate-100/50"
                        >
                            <ScanBarcode className="w-5 h-5 text-slate-500" />
                            <span className="text-sm">Scan Barcode</span>
                        </button>
                    </div>

                    {/* Secondary Nav */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => { onNavigate(`/dashboard`); setIsOpen(false); }}
                            className="flex items-center gap-3 p-3 bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 font-medium transition-colors border border-slate-100/50"
                        >
                            <Table2 className="w-5 h-5 text-slate-500" />
                            <span>Home</span>
                        </button>

                        {(role === 'admin' || role === 'supervisor') && (
                            <button
                                onClick={() => { onImport(); setIsOpen(false); }}
                                className="flex items-center gap-3 p-3 bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 font-medium transition-colors border border-slate-100/50"
                            >
                                <Upload className="w-5 h-5 text-slate-500" />
                                <span>Import</span>
                            </button>
                        )}

                        <button
                            onClick={() => { onNavigate('/dashboard/settings'); setIsOpen(false); }}
                            className="flex items-center gap-3 p-3 bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 font-medium transition-colors border border-slate-100/50"
                        >
                            <Settings className="w-5 h-5 text-slate-500" />
                            <span>Settings</span>
                        </button>

                        <button
                            onClick={() => { onRefresh(); setIsOpen(false); }}
                            className="flex items-center gap-3 p-3 bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 font-medium transition-colors border border-slate-100/50"
                        >
                            <RefreshCw className="w-5 h-5 text-slate-500" />
                            <span>Refresh</span>
                        </button>
                    </div>

                    {(role === 'admin' || role === 'supervisor') && (
                        <div className="pt-2 border-t border-slate-100">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Quick Actions</label>
                            <div className="grid grid-cols-4 gap-2">
                                <button
                                    onClick={() => { setPMode(!pMode); if (!pMode) { setNaMode(false); setEraseMode(false); setHoldMode(false); } setIsOpen(false); }}
                                    className={`aspect-square rounded-xl flex items-center justify-center transition-all ${pMode ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-600'}`}
                                    title="P Mode"
                                >
                                    <Pencil className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => { setNaMode(!naMode); if (!naMode) { setPMode(false); setEraseMode(false); setHoldMode(false); } setIsOpen(false); }}
                                    className={`aspect-square rounded-xl flex items-center justify-center transition-all ${naMode ? 'bg-slate-600 text-white shadow-md' : 'bg-slate-50 text-slate-600'}`}
                                    title="N/A Mode"
                                >
                                    <Ban className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => { setHoldMode(!holdMode); if (!holdMode) { setPMode(false); setNaMode(false); setEraseMode(false); } setIsOpen(false); }}
                                    className={`aspect-square rounded-xl flex items-center justify-center transition-all ${holdMode ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-50 text-slate-600'}`}
                                    title="Hold Mode"
                                >
                                    <PauseCircle className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => { handleEraseRequest(); setIsOpen(false); }}
                                    className={`aspect-square rounded-xl flex items-center justify-center transition-all ${eraseMode ? 'bg-red-600 text-white shadow-md' : 'bg-slate-50 text-slate-600'}`}
                                    title="Erase Mode"
                                >
                                    <Eraser className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                        <span>v6.2.0</span>
                        <button onClick={onLogout} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg font-medium">
                            <LogOut className="w-4 h-4" />
                            Log Out
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <button
            className="fixed z-[90] w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-transform touch-none"
            style={{
                left: position.x,
                top: position.y,
                cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onClick={handleClick}
        >
            <Menu className="w-7 h-7" />
        </button>
    );
}
