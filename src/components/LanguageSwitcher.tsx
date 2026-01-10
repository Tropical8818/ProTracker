'use client';

import { Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function LanguageSwitcher() {
    const router = useRouter();

    const toggleLanguage = () => {
        const currentLocale = document.cookie
            .split('; ')
            .find(row => row.startsWith('NEXT_LOCALE='))
            ?.split('=')[1] || 'en';

        const newLocale = currentLocale === 'en' ? 'zh' : 'en';

        // Set cookie
        document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;

        // Refresh to apply new locale
        router.refresh(); // Soft refresh might not be enough for full context switch if providers don't update
        window.location.reload(); // Force reload to ensure server-side request.ts runs again
    };

    return (
        <button
            onClick={toggleLanguage}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
            title="Switch Language (English/中文)"
        >
            <Globe size={20} />
        </button>
    );
}
