/**
 * Data Validation Utilities
 * Validates order data against defined rules
 */

export interface ValidationRule {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    format?: 'date' | 'number' | 'text';
    regex?: string;
    customValidator?: (value: any) => boolean;
}

export interface ValidationRules {
    [fieldName: string]: ValidationRule;
}

export interface ValidationError {
    row: number;
    field: string;
    error: string;
    value: any;
}

/**
 * Validate a single field value against a rule
 */
export function validateField(
    fieldName: string,
    value: any,
    rule: ValidationRule
): string | null {
    // Required check
    if (rule.required && (value === null || value === undefined || value === '')) {
        return `${fieldName} is required`;
    }

    // If value is empty and not required, skip other validations
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const stringValue = String(value);

    // Length validations
    if (rule.minLength !== undefined && stringValue.length < rule.minLength) {
        return `${fieldName} must be at least ${rule.minLength} characters`;
    }

    if (rule.maxLength !== undefined && stringValue.length > rule.maxLength) {
        return `${fieldName} must be at most ${rule.maxLength} characters`;
    }

    // Format validations
    if (rule.format === 'date') {
        const dateRegex = /^\d{2}-[A-Z][a-z]{2}(,\s\d{2}:\d{2})?$/; // dd-MMM or dd-MMM, HH:mm
        if (!dateRegex.test(stringValue) && !isValidDate(stringValue)) {
            return `${fieldName} has invalid date format`;
        }
    }

    if (rule.format === 'number') {
        if (isNaN(Number(stringValue))) {
            return `${fieldName} must be a number`;
        }
    }

    // Regex validation
    if (rule.regex) {
        const regex = new RegExp(rule.regex);
        if (!regex.test(stringValue)) {
            return `${fieldName} format is invalid`;
        }
    }

    // Custom validator
    if (rule.customValidator && !rule.customValidator(value)) {
        return `${fieldName} failed custom validation`;
    }

    return null;
}

/**
 * Validate an entire order row
 */
export function validateOrderData(
    rowData: Record<string, any>,
    rules: ValidationRules,
    rowNumber: number
): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const [fieldName, rule] of Object.entries(rules)) {
        const value = rowData[fieldName];
        const error = validateField(fieldName, value, rule);

        if (error) {
            errors.push({
                row: rowNumber,
                field: fieldName,
                error,
                value
            });
        }
    }

    return errors;
}

/**
 * Get default validation rules for common fields
 */
export function getDefaultValidationRules(): ValidationRules {
    return {
        "WO ID": {
            required: true,
            minLength: 1,
            maxLength: 50
        },
        "Description": {
            required: true,
            minLength: 1
        }
    };
}

/**
 * Check if a string is a valid date
 */
function isValidDate(dateString: string): boolean {
    // Try parsing various date formats
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date.getFullYear() > 1900;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
    if (errors.length === 0) return '';

    return errors
        .map(err => `Row ${err.row}: ${err.error}`)
        .join('\n');
}
