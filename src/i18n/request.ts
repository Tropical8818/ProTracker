import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
    const locale = cookieLocale === 'zh' ? 'zh' : 'en';

    return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default
    };
});
