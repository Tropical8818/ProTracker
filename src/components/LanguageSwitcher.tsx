'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
    className?: string;
}

export function LanguageSwitcher({ className = '' }: Props) {
    const [currentLocale, setCurrentLocale] = useState<string>('en');

    useEffect(() => {
        if (typeof document !== 'undefined') {
            const locale = document.cookie
                .split('; ')
                .find(row => row.startsWith('NEXT_LOCALE='))
                ?.split('=')[1] || 'en';
            setCurrentLocale(locale);
        }
    }, []);

    const toggleLanguage = () => {
        const newLocale = currentLocale === 'en' ? 'zh' : 'en';

        // Set cookie with explicit SameSite and path
        document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

        // Use purely native reload to ensure full server re-render
        window.location.reload();
    };

    return (
        <button
            onClick={toggleLanguage}
            className={`p-2.5 rounded-lg transition-all shadow-lg text-2xl ${className || 'text-slate-500 hover:bg-slate-100'}`}
            title={currentLocale === 'en' ? '切换到中文' : 'Switch to English'}
            aria-label="Switch Language"
        >
            {currentLocale === 'en' ? '🇨🇳' : '🇺🇸'}
        </button>
    );
}
