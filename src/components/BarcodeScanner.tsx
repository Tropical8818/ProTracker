'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Camera } from 'lucide-react';

interface BarcodeScannerProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (code: string) => void;
}

export default function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const scannerRef = useRef<any>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        let scanner: any = null;

        const startScanner = async () => {
            try {
                setError('');
                setLoading(true);

                // Dynamic import to avoid SSR issues
                const { Html5Qrcode } = await import('html5-qrcode');

                if (!mountedRef.current) return;

                // Wait for DOM element
                await new Promise(resolve => setTimeout(resolve, 100));

                const element = document.getElementById('barcode-reader');
                if (!element) {
                    setError('Scanner container not found');
                    setLoading(false);
                    return;
                }

                scanner = new Html5Qrcode('barcode-reader');
                scannerRef.current = scanner;

                // Get available cameras
                const cameras = await Html5Qrcode.getCameras();
                if (!cameras || cameras.length === 0) {
                    setError('No cameras found');
                    setLoading(false);
                    return;
                }

                // Prefer back camera
                const backCamera = cameras.find(c =>
                    c.label.toLowerCase().includes('back') ||
                    c.label.toLowerCase().includes('rear') ||
                    c.label.toLowerCase().includes('environment')
                ) || cameras[cameras.length - 1];

                await scanner.start(
                    backCamera.id,
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 150 },
                    },
                    (decodedText: string) => {
                        if (mountedRef.current) {
                            onScan(decodedText);
                            stopScanner();
                            onClose();
                        }
                    },
                    () => {
                        // Scan error - ignore
                    }
                );

                setLoading(false);
            } catch (err: any) {
                console.error('Scanner error:', err);
                if (mountedRef.current) {
                    setError(err?.message || 'Camera access denied or not available');
                    setLoading(false);
                }
            }
        };

        startScanner();

        return () => {
            stopScanner();
        };
    }, [isOpen, onClose, onScan]);

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                const state = scannerRef.current.getState?.();
                if (state === 2) { // SCANNING
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear?.();
            } catch (e) {
                // Ignore stop errors
            }
            scannerRef.current = null;
        }
    };

    const handleClose = async () => {
        await stopScanner();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 text-white safe-area-inset-top">
                <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    <span className="font-medium">Scan Barcode</span>
                </div>
                <button
                    onClick={handleClose}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Scanner View */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="relative w-full max-w-md">
                    {loading && !error && (
                        <div className="text-center text-white">
                            <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4" />
                            <p>Starting camera...</p>
                        </div>
                    )}
                    {error ? (
                        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6 text-center">
                            <p className="text-red-300 mb-3">{error}</p>
                            {error.includes('secure context') && (
                                <p className="text-white/60 text-sm mb-4">
                                    Camera requires HTTPS. Use localhost or enable HTTPS on your server.
                                </p>
                            )}
                            {/* Manual input fallback */}
                            <div className="mt-4">
                                <input
                                    type="text"
                                    placeholder="Enter barcode manually..."
                                    className="w-full px-4 py-2 rounded-lg text-slate-900 mb-2"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.currentTarget.value) {
                                            onScan(e.currentTarget.value);
                                            onClose();
                                        }
                                    }}
                                />
                                <p className="text-white/50 text-xs">Press Enter to submit</p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <>
                            <div
                                id="barcode-reader"
                                className="w-full rounded-lg overflow-hidden"
                                style={{ minHeight: '300px' }}
                            />
                            {!loading && (
                                <p className="text-white/70 text-center mt-4 text-sm">
                                    Point camera at barcode to scan
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
