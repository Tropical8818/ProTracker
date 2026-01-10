import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { formatToShortTimestamp } from './date-utils';

describe('date-utils', () => {
    describe('formatToShortTimestamp', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            process.env.TZ = 'UTC'; // Enforce UTC for consistent testing
        });

        afterEach(() => {
            vi.useRealTimers();
            process.env.TZ = undefined;
        });

        it('should format date correctly', () => {
            const date = new Date('2024-01-02T19:30:00Z');
            // Assuming UTC format for simplicity in test env unless Intl is mocked perfectly
            // But formatToShortTimestamp uses process.env.TZ.

            // If TZ is UTC, it should be 02-Jan, 19:30
            const formatted = formatToShortTimestamp(date);
            expect(formatted).toMatch(/02-Jan, 19:30/);
        });
    });
});
