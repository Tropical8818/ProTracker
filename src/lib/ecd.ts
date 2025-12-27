import { Order } from '@/lib/excel';
import { format } from 'date-fns';

export interface ECDCalculationParams {
    /** The order object containing step status values */
    order: Order;
    /** Ordered list of step names to process */
    steps: string[];
    /** Map of step names to their standard duration in hours */
    durations?: Record<string, number>;
    /** Whether to count Saturdays as working days */
    includeSaturday?: boolean;
    /** Whether to count Sundays as working days */
    includeSunday?: boolean;
}

/**
 * ECD (Estimated Completion Date) Calculation Algorithm
 * 
 * This function predicts when a production order will be completed based on its current status,
 * standard step durations, and work schedule configuration.
 * 
 * ## Core Logic
 * 1. **Identify Start Point**:
 *    - If status is 'QN' (Quality Notification) anywhere, process is disrupted. **Start = NOW**.
 *    - If status is 'Not Started' (no steps completed), **Start = NOW**.
 *    - If process is in flow, **Start = Last Completed Step's Date**.
 *      - *Exception*: If the last step was completed > 24 hours ago (stalled), reset **Start = NOW**.
 * 
 * 2. **Calculate Remaining Work**:
 *    - Sum standard durations for all *incomplete* steps.
 *    - **Status Modifiers**:
 *      - 'WIP' (Work In Progress): Assumed 50% done. Adds `0.5 * duration`.
 *      - 'P' (Pending/Paused) or 'N/A': Standard behavior (depends on specific business rule, currently 'P' adds full duration, 'N/A' is skipped).
 *      - Empty/Blank: Adds full `1.0 * duration`.
 * 
 * 3. **Project Timeline**:
 *    - Add the remaining hours to the Start Time.
 *    - **Skip Non-Working Days**: Automatically pushes dates forward if they land on weekends (unless `includeSaturday`/`includeSunday` is true).
 * 
 * ## Data for Future AI Analysis
 * To optimize step durations, the AI should compare:
 * - `Configured Duration`: The standard time defined in settings.
 * - `Actual Duration`: `Timestamp(Step N) - Timestamp(Step N-1)`.
 * - `ECD Accuracy`: `Actual Completion Date - Predicted ECD`.
 */
export const calculateECD = ({
    order,
    steps,
    durations,
    includeSaturday = false,
    includeSunday = false
}: ECDCalculationParams): string => {
    // If durations are missing, assume default 24h (1 day) per step logic
    const activeDurations = durations && Object.keys(durations).length > 0 ? durations : {};
    if (Object.keys(activeDurations).length === 0) {
        steps.forEach(s => { activeDurations[s] = 24; });
    }

    // Check if last step is done
    const lastStep = steps[steps.length - 1];
    const lastVal = order[lastStep] || '';

    // Helper: Checks if a value is a valid completion date
    const isDate = (val: string) => {
        if (!val || val.length < 6) return false;
        const v = val.toUpperCase();
        if (['N/A', 'WIP', 'PENDING', 'QN', 'DIFA', 'P'].some(s => v.startsWith(s))) return false;
        const d = new Date(val);
        return !isNaN(d.getTime()) && d.getFullYear() > 2000;
    };

    // Helper: Check for "QN" exception anywhere in the order
    const hasException = steps.some(step => {
        const val = (order[step] || '').toUpperCase();
        return val.includes('QN'); // Only QN triggers reset
    });

    if (isDate(lastVal)) return ''; // Completed orders have no ECD

    // Normalization helper for fuzzy matching durations
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Create a normalized duration map for robust lookup
    const normalizedDurations: Record<string, number> = {};
    Object.entries(activeDurations).forEach(([k, v]) => {
        normalizedDurations[normalize(k)] = v;
    });

    // 1. Calculate Remaining Hours
    let remainingHours = 0;
    let foundIncomplete = false;
    let lastCompletedDate: Date | null = null;

    for (const step of steps) {
        const val = order[step] || '';
        const v = val.toUpperCase();
        const isNA = v === 'N/A';
        const dur = normalizedDurations[normalize(step)] || 0;

        if (!foundIncomplete) {
            if (isDate(val)) {
                // Keep track of the latest completion time
                try {
                    lastCompletedDate = new Date(val);
                } catch { }
            } else if (!isNA) {
                // Found first incomplete step
                foundIncomplete = true;

                // Add remaining time for this current step
                if (v.startsWith('WIP')) {
                    remainingHours += dur * 0.5; // WIP assumes 50% remaining
                } else if (v.startsWith('P')) {
                    remainingHours += dur;       // Pending assumes full duration
                } else {
                    remainingHours += dur;       // Not started assumes full duration
                }
            }
        } else {
            // Future steps
            if (!isNA) {
                remainingHours += dur;
            }
        }
    }

    // 2. Determine Start Time
    let startTime = new Date();

    if (hasException) {
        // Condition: Exception -> Start from NOW
        startTime = new Date();
    } else if (lastCompletedDate) {
        const now = new Date();
        const diffHours = (now.getTime() - lastCompletedDate.getTime()) / (1000 * 60 * 60);

        if (diffHours > 24) {
            // Condition: Stalled (>24h since last move) -> Start from NOW
            startTime = new Date();
        } else {
            // Condition: Normal Flow -> Start from Last Completion
            startTime = lastCompletedDate;
        }
    } else {
        // Condition: Not started -> Start from NOW
    }

    if (remainingHours <= 0) return '';

    // 3. Project Timeline (Skipping Weekends)
    const targetDate = new Date(startTime);
    let hoursLeft = remainingHours;
    let opsCount = 0;

    while (hoursLeft > 0 && opsCount < 365 * 24) { // Safety break
        opsCount++;

        // Add minimal increment (e.g., 1 hour) to check day boundaries more granularly?
        // Current logic: Add logic based on day chunks or simple day skipping.
        // For simplicity and matching V4/V5 existing logic, we often just add hours but skip "Weekend Days".
        // A robust approach adds hour by hour if we care about "Working Hours", but here we just care about "Working Days".

        // Simple Algorithm:
        // 1. Check if current day is working day.
        // 2. If no, move to next day 00:00.
        // 3. If yes, subtract hours.

        const dayOfWeek = targetDate.getDay(); // 0=Sun, 6=Sat
        const isSunday = dayOfWeek === 0;
        const isSaturday = dayOfWeek === 6;
        const skipSunday = isSunday && !includeSunday;
        const skipSaturday = isSaturday && !includeSaturday;

        if (skipSunday || skipSaturday) {
            targetDate.setDate(targetDate.getDate() + 1);
            targetDate.setHours(9, 0, 0, 0); // Reset to start of working day (approx 9am)
            continue;
        }

        // It is a working day.
        // Identify how many hours we can consume today.
        // For continuous operations (24h), we consume up to 24h.
        // The original logic was simpler: Just check day validness? 
        // Let's refine: The previous logic iterated days. Let's do that for clarity.

        // Current Hour
        const currentHour = targetDate.getHours();
        const hoursInDayRemaining = 24 - currentHour;

        if (hoursLeft <= hoursInDayRemaining) {
            targetDate.setHours(targetDate.getHours() + hoursLeft);
            hoursLeft = 0;
        } else {
            // Advance to next day
            targetDate.setDate(targetDate.getDate() + 1);
            targetDate.setHours(0, 0, 0, 0); // Start of next day
            hoursLeft -= hoursInDayRemaining;
        }
    }

    // Format: dd-MMM (e.g. 26-Dec)
    return format(targetDate, 'dd-MMM');
};
