import fs from 'fs';
import path from 'path';

// In standalone mode, use /app/data or fallback to relative path
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

// Product configuration
export interface Product {
    id: string;           // Unique identifier (e.g., "stator")
    name: string;         // Display name (e.g., "Stator Line")
    excelPath: string;    // Path to Excel file
    detailColumns: string[]; // Work order detail columns (e.g., WO ID, PN, Description)
    steps: string[];      // Process step column names
    stepDurations?: Record<string, number>; // Estimated duration for each step in hours
    monthlyTarget?: number; // Target quantity for the current month
    customInstructions?: string; // Custom instructions for AI to understand this product line
    aiProvider?: 'openai' | 'ollama'; // AI Provider for this specific product
}

export interface Config {
    products: Product[];
    activeProductId: string;
    USER_PASSWORD: string;
    SUPERVISOR_PASSWORD: string;
    ADMIN_PASSWORD: string;
    includeSaturday?: boolean; // Include Saturday in ECD calculation (default: false)
    includeSunday?: boolean;   // Include Sunday in ECD calculation (default: false)
    aiProvider?: 'openai' | 'ollama';
    ollamaUrl?: string;
    ollamaModel?: string;
    systemPrompt?: string;
    rolePrompts?: Record<string, string>;
}

// Default steps for migration from v2
const DEFAULT_STEPS = [
    'WO Released', 'Stacking', 'Winding', 'Lacing', 'Formation',
    'Impregnation', 'Assembly', 'HI-POT test', 'Final Inspection', 'Receipt'
];

const DEFAULT_DETAIL_COLUMNS = ['WO ID', 'PN', 'Description', 'WO DUE', 'Priority'];

const DEFAULT_PRODUCT: Product = {
    id: 'default',
    name: 'Default Product',
    excelPath: '',
    detailColumns: DEFAULT_DETAIL_COLUMNS,
    steps: DEFAULT_STEPS,
    monthlyTarget: 100 // Default target
};

const DEFAULT_CONFIG: Config = {
    products: [DEFAULT_PRODUCT],
    activeProductId: 'default',
    USER_PASSWORD: process.env.USER_PASSWORD || '123456',
    SUPERVISOR_PASSWORD: process.env.SUPERVISOR_PASSWORD || 'dhe-supervisor',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'dhe-admin',
    includeSaturday: false, // Default: exclude Saturday
    includeSunday: false,   // Default: exclude Sunday
    aiProvider: 'openai',   // Default to OpenAI
    ollamaUrl: 'http://localhost:11434/v1',
    ollamaModel: 'llama3.1'
};

// Migrate from old config format (v2) to new format (v3)
function migrateConfig(parsed: Record<string, unknown>): Config {
    // Check if already in new format
    if (Array.isArray(parsed.products)) {
        return {
            ...DEFAULT_CONFIG,
            ...parsed,
            products: parsed.products as Product[]
        };
    }

    // Migrate from old format
    console.log('[Config] Migrating from v2 to v3 format...');

    const migratedProduct: Product = {
        id: 'default',
        name: 'Stator Line',
        excelPath: (parsed.EXCEL_FILE_PATH as string) || '',
        detailColumns: DEFAULT_DETAIL_COLUMNS,
        steps: DEFAULT_STEPS,
        monthlyTarget: 100
    };

    return {
        products: [migratedProduct],
        activeProductId: 'default',
        USER_PASSWORD: (parsed.USER_PASSWORD as string) || DEFAULT_CONFIG.USER_PASSWORD,
        SUPERVISOR_PASSWORD: (parsed.LEADER_PASSWORD as string) || DEFAULT_CONFIG.SUPERVISOR_PASSWORD,
        ADMIN_PASSWORD: (parsed.ADMIN_PASSWORD as string) || DEFAULT_CONFIG.ADMIN_PASSWORD
    };
}

export function getConfig(): Config {
    try {
        // Ensure data directory exists
        if (!fs.existsSync(DATA_DIR)) {
            console.log('[Config] Creating data directory:', DATA_DIR);
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        // If config doesn't exist, create with defaults
        if (!fs.existsSync(CONFIG_PATH)) {
            console.log('[Config] Creating default config at:', CONFIG_PATH);
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 4));
            return DEFAULT_CONFIG;
        }

        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        const config = migrateConfig(parsed);

        // Save migrated config if format changed
        if (!Array.isArray(parsed.products)) {
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 4));
            console.log('[Config] Migration completed and saved.');
        }

        return config;
    } catch (err) {
        console.error('[Config] Read error:', err);
        return DEFAULT_CONFIG;
    }
}

export function updateConfig(newConfig: Partial<Config>): Config {
    try {
        // Ensure data directory exists
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        const current = getConfig();
        const updated = { ...current, ...newConfig };
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 4));
        return updated;
    } catch (err) {
        console.error('Config write error:', err);
        throw new Error('Failed to save config');
    }
}

// Helper to get active product
export function getActiveProduct(): Product | null {
    const config = getConfig();
    return config.products.find(p => p.id === config.activeProductId) || config.products[0] || null;
}

// Helper to get product by ID
export function getProductById(productId: string): Product | null {
    const config = getConfig();
    return config.products.find(p => p.id === productId) || null;
}
