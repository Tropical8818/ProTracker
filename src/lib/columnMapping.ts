/**
 * Column Name Mapping Utilities
 * Handles synonym detection and normalization of Excel column headers
 */

export interface ColumnMappings {
    [standardName: string]: string[];  // standardName -> [synonyms]
}

/**
 * Normalize detected headers to standard column names using mappings
 */
export function normalizeHeaders(
    detectedHeaders: string[],
    mappings: ColumnMappings
): { normalized: string[]; mapping: Record<string, string> } {
    const normalized: string[] = [];
    const mapping: Record<string, string> = {}; // detected -> standard

    for (const header of detectedHeaders) {
        const standardName = getStandardName(header, mappings);
        normalized.push(standardName);
        if (standardName !== header) {
            mapping[header] = standardName;
        }
    }

    return { normalized, mapping };
}

/**
 * Find the standard name for a given header using mappings
 * Returns the header itself if no mapping found
 */
export function getStandardName(header: string, mappings: ColumnMappings): string {
    const trimmed = header.trim();

    // Exact match first
    for (const [standardName, synonyms] of Object.entries(mappings)) {
        if (synonyms.includes(trimmed)) {
            return standardName;
        }
    }

    // Case-insensitive match
    const lowerHeader = trimmed.toLowerCase();
    for (const [standardName, synonyms] of Object.entries(mappings)) {
        if (synonyms.some(s => s.toLowerCase() === lowerHeader)) {
            return standardName;
        }
    }

    // No mapping found, return original
    return trimmed;
}

/**
 * Build a reverse lookup index for faster mapping
 */
export function buildMappingIndex(mappings: ColumnMappings): Record<string, string> {
    const index: Record<string, string> = {};

    for (const [standardName, synonyms] of Object.entries(mappings)) {
        for (const synonym of synonyms) {
            index[synonym.toLowerCase()] = standardName;
        }
    }

    return index;
}

/**
 * Create default column mappings for common fields
 */
export function getDefaultMappings(): ColumnMappings {
    return {
        "WO ID": ["WO ID", "工单号", "Work Order", "订单号", "WO Number", "Order ID"],
        "Description": ["Description", "描述", "说明", "Desc", "Product", "产品"],
        "WO DUE": ["WO DUE", "到期日", "Due Date", "截止日期", "Deadline", "交期"],
        "WO Rel": ["WO Rel", "发布日", "Release Date", "发放日", "Released"],
        "Receipt": ["Receipt", "收货", "Received", "完成", "Completion"],
    };
}

/**
 * Validate that required columns are present after mapping
 */
export function validateRequiredColumns(
    normalizedHeaders: string[],
    requiredColumns: string[]
): { valid: boolean; missing: string[] } {
    const missing = requiredColumns.filter(col => !normalizedHeaders.includes(col));
    return {
        valid: missing.length === 0,
        missing
    };
}
