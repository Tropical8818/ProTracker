'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Factory, Table2, HardHat, Settings, LogOut, Save, FileSpreadsheet, Lock, Plus, Trash2, Edit2, X, ChevronUp, ChevronDown, Package, RefreshCw, Check, Eye, EyeOff, Clock, FilePlus, Info, User, Key, Users, Database, Download, Bot, Sparkles, Monitor, Play } from 'lucide-react';

interface Product {
    id: string;
    name: string;
    excelPath: string;
    detailColumns: string[];
    steps: string[];
    stepDurations?: Record<string, number>;
    monthlyTarget?: number;
    watchFolder?: string;
    includeSaturday?: boolean;
    includeSunday?: boolean;
    aiModel?: string;
    customInstructions?: string;
    aiProvider?: 'openai' | 'ollama';
}

interface Config {
    products: Product[];
    activeProductId: string;
    USER_PASSWORD?: string;
    SUPERVISOR_PASSWORD?: string;
    ADMIN_PASSWORD?: string;
    includeSaturday?: boolean;
    includeSunday?: boolean;
    aiProvider?: 'openai' | 'ollama';
    ollamaUrl?: string;
    ollamaModel?: string;
    systemPrompt?: string;
    rolePrompts?: Record<string, string>;
    kioskPin?: string;
}

function PasswordInput({
    label,
    value,
    onChange
}: {
    label: string,
    value: string,
    onChange: (val: string) => void
}) {
    const [visible, setVisible] = useState(false);
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            <div className="relative">
                <input
                    type={visible ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 font-mono text-slate-800 pr-10"
                />
                <button
                    type="button"
                    onClick={() => setVisible(!visible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                    {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
        </div>
    );
}



// Default new product template - start empty for user to define
const NEW_PRODUCT_TEMPLATE: Omit<Product, 'id'> = {
    name: 'New Product Line',
    excelPath: '',
    detailColumns: [],
    steps: [],
    monthlyTarget: 100,
    includeSaturday: false,
    includeSunday: false
};

export default function SettingsPage() {
    const [config, setConfig] = useState<Config>({ products: [], activeProductId: '', USER_PASSWORD: '', SUPERVISOR_PASSWORD: '', ADMIN_PASSWORD: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Product editing state
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [detecting, setDetecting] = useState(false);
    const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
    const [columnCategories, setColumnCategories] = useState<Record<string, 'detail' | 'step'>>({});
    const [showColumnsConfirm, setShowColumnsConfirm] = useState(false);

    // Manual column/step management
    const [newStepName, setNewStepName] = useState('');
    const [newDetailColumnName, setNewDetailColumnName] = useState('');

    // Template creation state
    const [creatingTemplate, setCreatingTemplate] = useState(false);

    // Import preview state
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);
    const [previewFile, setPreviewFile] = useState<File | null>(null);

    // Current User State
    const [currentUser, setCurrentUser] = useState<{ id: string, username: string, role: string } | null>(null);
    const [currentPassword, setCurrentPass] = useState('');
    const [newPassword, setNewPass] = useState('');
    const [confirmNewPass, setConfirmNewPass] = useState('');
    const [passMsg, setPassMsg] = useState('');

    // AI Settings State
    const [aiApiKey, setAiApiKey] = useState('');
    const [aiApiKeyVisible, setAiApiKeyVisible] = useState(false);
    const [aiTestResult, setAiTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message: string }>({ status: 'idle', message: '' });
    const [savingAiKey, setSavingAiKey] = useState(false);

    // Split model lists
    const [cloudModels, setCloudModels] = useState<{ id: string }[]>([]);
    const [localModels, setLocalModels] = useState<{ id: string }[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);

    // Watcher state
    const [watcherRunning, setWatcherRunning] = useState(false);
    const [watcherPid, setWatcherPid] = useState<number | null>(null);
    const [watcherLoading, setWatcherLoading] = useState(false);

    const router = useRouter();

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch('/api/config');
                if (res.ok) {
                    const data = await res.json();
                    setConfig(data);
                    // Fetch both model lists initially
                    fetchModels();
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        const fetchUser = async () => {
            const res = await fetch('/api/auth');
            if (res.ok) {
                const data = await res.json();
                if (data.authenticated) {
                    setCurrentUser({ id: data.id, username: data.username, role: data.role });
                }
            }
        };
        fetchConfig();
        fetchUser();
        fetchWatcherStatus(); // Check watcher status on mount
    }, []);

    // Auto-dismiss messages after 4 seconds
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const fetchModels = async (providerOverride?: string) => {
        setLoadingModels(true);
        try {
            // Fetch OpenAI Models
            if (!providerOverride || providerOverride === 'openai') {
                const resCloud = await fetch('/api/ai/models?provider=openai');
                if (resCloud.ok) {
                    const data = await resCloud.json();
                    setCloudModels(data.data || []);
                }
            }

            // Fetch Ollama Models
            if (!providerOverride || providerOverride === 'ollama') {
                const resLocal = await fetch('/api/ai/models?provider=ollama');
                if (resLocal.ok) {
                    const data = await resLocal.json();
                    setLocalModels(data.data || []);
                }
            }
        } catch (e) {
            console.error('Fetch models error:', e);
        } finally {
            setLoadingModels(false);
        }
    };

    // Fetch watcher status
    const fetchWatcherStatus = async () => {
        try {
            const res = await fetch('/api/watcher');
            if (res.ok) {
                const data = await res.json();
                setWatcherRunning(data.running);
                setWatcherPid(data.pid || null);
            }
        } catch (e) {
            console.error('Failed to fetch watcher status:', e);
        }
    };

    // Start watcher
    const startWatcher = async () => {
        setWatcherLoading(true);
        try {
            const res = await fetch('/api/watcher', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: 'File watcher started successfully!' });
                await fetchWatcherStatus();
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to start watcher' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to start watcher' });
        } finally {
            setWatcherLoading(false);
        }
    };

    // Stop watcher
    const stopWatcher = async () => {
        setWatcherLoading(true);
        try {
            const res = await fetch('/api/watcher', { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: 'File watcher stopped' });
                await fetchWatcherStatus();
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to stop watcher' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to stop watcher' });
        } finally {
            setWatcherLoading(false);
        }
    };


    const handleLogout = async () => {
        await fetch('/api/auth', { method: 'DELETE' });
        router.push('/login');
        router.refresh();
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Settings saved successfully!' });
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.error || 'Failed to save settings.' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };

    const addPresetProduct = (preset: Omit<Product, 'id'>) => {
        const newId = `product_${Date.now()}`;
        const newProduct: Product = { id: newId, ...preset };
        const newProducts = [...config.products, newProduct];
        setConfig({
            ...config,
            products: newProducts,
            activeProductId: config.activeProductId || newId
        });
        setEditingProduct(newProduct);
    };

    const addCustomProduct = () => {
        const newId = `product_${Date.now()}`;
        const newProduct: Product = { id: newId, ...NEW_PRODUCT_TEMPLATE };
        const newProducts = [...config.products, newProduct];
        setConfig({
            ...config,
            products: newProducts,
            activeProductId: config.activeProductId || newId
        });
        setEditingProduct(newProduct);
    };

    // Manual column management functions
    const addManualDetailColumn = () => {
        if (!editingProduct || !newDetailColumnName.trim()) return;
        const colName = newDetailColumnName.trim();
        if (editingProduct.detailColumns.includes(colName)) {
            setMessage({ type: 'error', text: 'Detail column already exists!' });
            return;
        }
        const updated = {
            ...editingProduct,
            detailColumns: [...editingProduct.detailColumns, colName]
        };
        setEditingProduct(updated);
        updateProduct(updated);
        setNewDetailColumnName('');
    };

    const deleteDetailColumn = (colName: string) => {
        if (!editingProduct) return;
        const updated = {
            ...editingProduct,
            detailColumns: editingProduct.detailColumns.filter(c => c !== colName)
        };
        setEditingProduct(updated);
        updateProduct(updated);
    };

    const moveDetailColumn = (index: number, direction: 'up' | 'down') => {
        if (!editingProduct) return;
        const newCols = [...editingProduct.detailColumns];
        if (direction === 'up' && index > 0) {
            [newCols[index], newCols[index - 1]] = [newCols[index - 1], newCols[index]];
        } else if (direction === 'down' && index < newCols.length - 1) {
            [newCols[index], newCols[index + 1]] = [newCols[index + 1], newCols[index]];
        }
        const updated = { ...editingProduct, detailColumns: newCols };
        setEditingProduct(updated);
        updateProduct(updated);
    };

    // Manual step management functions
    const addManualStep = () => {
        if (!editingProduct || !newStepName.trim()) return;
        const stepName = newStepName.trim();
        if (editingProduct.steps.includes(stepName)) {
            setMessage({ type: 'error', text: 'Step already exists!' });
            return;
        }
        const updated = {
            ...editingProduct,
            steps: [...editingProduct.steps, stepName],
            stepDurations: { ...editingProduct.stepDurations, [stepName]: 0 }
        };
        setEditingProduct(updated);
        updateProduct(updated);
        setNewStepName('');
    };

    const deleteStep = (stepName: string) => {
        if (!editingProduct) return;
        const newDurations = { ...editingProduct.stepDurations };
        delete newDurations[stepName];
        const updated = {
            ...editingProduct,
            steps: editingProduct.steps.filter(s => s !== stepName),
            stepDurations: newDurations
        };
        setEditingProduct(updated);
        updateProduct(updated);
    };

    const moveStep = (index: number, direction: 'up' | 'down') => {
        if (!editingProduct) return;
        const newSteps = [...editingProduct.steps];
        if (direction === 'up' && index > 0) {
            [newSteps[index], newSteps[index - 1]] = [newSteps[index - 1], newSteps[index]];
        } else if (direction === 'down' && index < newSteps.length - 1) {
            [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
        }
        const updated = { ...editingProduct, steps: newSteps };
        setEditingProduct(updated);
        updateProduct(updated);
    };

    const deleteProduct = (productId: string) => {
        if (config.products.length <= 1) {
            setMessage({ type: 'error', text: 'Cannot delete the last product.' });
            return;
        }
        const newProducts = config.products.filter(p => p.id !== productId);
        const newActiveId = config.activeProductId === productId ? newProducts[0].id : config.activeProductId;
        setConfig({ ...config, products: newProducts, activeProductId: newActiveId });
        if (editingProduct?.id === productId) {
            setEditingProduct(null);
        }
    };

    const updateProduct = (updatedProduct: Product) => {
        setConfig({
            ...config,
            products: config.products.map(p => p.id === updatedProduct.id ? updatedProduct : p)
        });
    };

    const moveColumn = (index: number, direction: 'up' | 'down') => {
        const newCols = [...detectedColumns];
        if (direction === 'up' && index > 0) {
            [newCols[index], newCols[index - 1]] = [newCols[index - 1], newCols[index]];
        } else if (direction === 'down' && index < newCols.length - 1) {
            [newCols[index], newCols[index + 1]] = [newCols[index + 1], newCols[index]];
        }
        setDetectedColumns(newCols);
    };


    const confirmDetectedColumns = () => {
        if (!editingProduct) return;
        const details = detectedColumns.filter(col => columnCategories[col] === 'detail');
        const steps = detectedColumns.filter(col => columnCategories[col] === 'step');
        const updated = { ...editingProduct, detailColumns: details, steps: steps };
        setEditingProduct(updated);
        updateProduct(updated);
        setShowColumnsConfirm(false);
        setDetectedColumns([]);
        setColumnCategories({});
        setMessage({ type: 'success', text: `${details.length} detail columns + ${steps.length} step columns imported!` });
    };

    const isAdmin = currentUser?.role === 'admin';
    const isSupervisor = currentUser?.role === 'supervisor';

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
                <div className="max-w-full mx-auto px-4 h-14 flex items-center justify-between">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
                        title="Return to Home"
                    >
                        <div className="bg-indigo-600 p-2 rounded-lg">
                            <Factory className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-lg font-bold text-slate-900">ProTracker <span className="text-indigo-600 text-xs ml-1">V6.5.0</span></h1>
                    </button>

                    <nav className="flex items-center gap-2">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium"
                        >
                            <Table2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Home</span>
                        </button>

                        <button
                            onClick={() => router.push('/dashboard/operation')}
                            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium"
                        >
                            <HardHat className="w-4 h-4" />
                            <span className="hidden sm:inline">Operation</span>
                        </button>

                        <button className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
                            <Settings className="w-4 h-4" />
                            <span className="hidden sm:inline">Settings</span>
                        </button>

                        <button
                            onClick={handleLogout}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="p-4 max-w-4xl mx-auto pb-24">
                {loading ? (
                    <div className="text-center py-10 text-slate-400">Loading...</div>
                ) : (

                    <div className="max-w-4xl mx-auto space-y-6">
                        {isAdmin && (
                            <div className="space-y-6">
                                {/* Products Section */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-md">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                            <Package className="w-5 h-5 text-indigo-600" />
                                            Product Lines
                                        </h2>
                                    </div>

                                    {/* Add Products Section */}
                                    <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                        <p className="text-sm text-slate-700 mb-3 font-medium">Add Product Line:</p>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={addCustomProduct}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 transition-colors shadow-sm flex items-center gap-2"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Add New Production Line
                                            </button>
                                        </div>
                                    </div>

                                    {/* Product List */}
                                    <div className="space-y-3">
                                        {config.products.map(product => (
                                            <div
                                                key={product.id}
                                                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${editingProduct?.id === product.id
                                                    ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                                                    : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">

                                                    <div>
                                                        <div className="font-semibold text-slate-900">{product.name}</div>
                                                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                                                            <span className={`px-1.5 py-0.5 rounded ${product.steps.length > 0 ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>
                                                                {product.steps.length > 0 ? `${product.steps.length} steps` : 'No steps'}
                                                            </span>
                                                            {product.excelPath && (
                                                                <span className="truncate max-w-[200px]" title={product.excelPath}>
                                                                    • {product.excelPath.split('/').pop()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setEditingProduct(editingProduct?.id === product.id ? null : product)}
                                                        className={`p-2 rounded-lg transition-colors ${editingProduct?.id === product.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-white hover:shadow-sm hover:text-indigo-600'}`}
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteProduct(product.id)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Product Editor */}
                                    {editingProduct && (
                                        <div className="mt-6 p-6 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="font-semibold text-slate-900 text-lg">Configure Product</h3>
                                                <button onClick={() => setEditingProduct(null)} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>

                                            {/* Product Name (Editable) */}
                                            <div className="mb-6">
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                    Product Line Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editingProduct.name}
                                                    onChange={(e) => {
                                                        const updated = { ...editingProduct, name: e.target.value };
                                                        setEditingProduct(updated);
                                                        updateProduct(updated);
                                                    }}
                                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 text-black font-medium transition-shadow shadow-sm"
                                                    placeholder="Enter product line name"
                                                />
                                            </div>

                                            {/* Excel File Upload with Auto-Detect */}
                                            <div className="mb-6">
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                    <FileSpreadsheet className="w-4 h-4 inline mr-1.5" />
                                                    Upload Excel File
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="file"
                                                        accept=".xlsx,.xls"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file || !editingProduct) return;

                                                            setDetecting(true);
                                                            setMessage(null);

                                                            try {
                                                                // Call preview API
                                                                const formData = new FormData();
                                                                formData.append('file', file);
                                                                formData.append('productId', editingProduct.id);

                                                                const res = await fetch('/api/import-excel/preview', {
                                                                    method: 'POST',
                                                                    body: formData
                                                                });

                                                                if (res.ok) {
                                                                    const data = await res.json();
                                                                    setPreviewData(data);
                                                                    setPreviewFile(file);
                                                                    setShowPreviewModal(true);
                                                                } else {
                                                                    const err = await res.json();
                                                                    setMessage({ type: 'error', text: err.error || 'Failed to preview Excel file.' });
                                                                }
                                                            } catch (err) {
                                                                console.error('Excel preview error:', err);
                                                                setMessage({ type: 'error', text: 'Failed to process Excel file.' });
                                                            } finally {
                                                                setDetecting(false);
                                                                // Reset file input
                                                                e.target.value = '';
                                                            }
                                                        }}
                                                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 text-sm text-slate-800 shadow-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                                        disabled={detecting}
                                                    />
                                                </div>
                                                <p className="text-xs text-slate-500 mt-2">
                                                    Upload Excel to auto-import new orders (existing WO IDs will be skipped)
                                                </p>

                                                {/* Create Excel Template Button */}
                                                {(editingProduct.steps.length > 0 || editingProduct.detailColumns.length > 0) && !editingProduct.excelPath && (
                                                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl shadow-sm">
                                                        <p className="text-sm text-green-800 mb-3 font-medium">
                                                            {editingProduct.detailColumns.length} detail column(s) and {editingProduct.steps.length} step(s) defined.
                                                        </p>
                                                        <button
                                                            onClick={async () => {
                                                                setCreatingTemplate(true);
                                                                try {
                                                                    const res = await fetch('/api/create-template', {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ productId: editingProduct.id })
                                                                    });
                                                                    const data = await res.json();
                                                                    if (res.ok) {
                                                                        setMessage({ type: 'success', text: `Excel template created: ${data.path}` });
                                                                        // Update editingProduct with new excelPath
                                                                        const updated = { ...editingProduct, excelPath: data.path };
                                                                        setEditingProduct(updated);
                                                                        // Refresh config
                                                                        const configRes = await fetch('/api/config');
                                                                        if (configRes.ok) {
                                                                            setConfig(await configRes.json());
                                                                        }
                                                                    } else {
                                                                        setMessage({ type: 'error', text: data.error || 'Failed to create template' });
                                                                    }
                                                                } catch (err) {
                                                                    setMessage({ type: 'error', text: 'Failed to create template' });
                                                                } finally {
                                                                    setCreatingTemplate(false);
                                                                }
                                                            }}
                                                            disabled={creatingTemplate}
                                                            className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 disabled:opacity-50 flex items-centerjustify-center gap-2 shadow-sm transition-all hover:shadow-md hover:scale-[1.02]"
                                                        >
                                                            <FilePlus className={`w-4 h-4 ${creatingTemplate ? 'animate-pulse' : ''}`} />
                                                            {creatingTemplate ? 'Creating...' : 'Create Excel Template File'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>





                                            <div className="mb-6">
                                                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                                    <Bot className="w-4 h-4 text-indigo-600" />
                                                    AI Assistant Settings
                                                </h4>
                                                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                                                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex justify-between">
                                                        <span>AI Model</span>
                                                        <button
                                                            onClick={(e) => { e.preventDefault(); fetchModels(); }}
                                                            className="text-indigo-600 text-xs hover:underline flex items-center gap-1"
                                                        >
                                                            <RefreshCw className={`w-3 h-3 ${loadingModels ? 'animate-spin' : ''}`} />
                                                            Refresh List
                                                        </button>
                                                    </label>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {/* Cloud Models */}
                                                        <div>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Cloud (OpenAI)</h5>
                                                                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{cloudModels.length}</span>
                                                            </div>
                                                            <div className="h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white p-1 space-y-1">
                                                                {cloudModels.length > 0 ? cloudModels.map(model => (
                                                                    <button
                                                                        key={model.id}
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            const updated = { ...editingProduct, aiModel: model.id, aiProvider: 'openai' as const };
                                                                            setEditingProduct(updated);
                                                                            updateProduct(updated);
                                                                        }}
                                                                        className={`w-full text-left px-3 py-2 text-xs rounded-md transition-all flex items-center justify-between ${editingProduct.aiModel === model.id && editingProduct.aiProvider !== 'ollama' // Default to openai if undefined
                                                                            ? 'bg-indigo-50 text-indigo-700 font-medium ring-1 ring-indigo-200'
                                                                            : 'text-slate-600 hover:bg-slate-50'
                                                                            }`}
                                                                    >
                                                                        <span className="truncate">{model.id}</span>
                                                                        {(editingProduct.aiModel === model.id && editingProduct.aiProvider !== 'ollama') && <Check className="w-3 h-3 text-indigo-600 flex-shrink-0 ml-2" />}
                                                                    </button>
                                                                )) : (
                                                                    <div className="p-3 text-center text-xs text-slate-400 italic">No cloud models found</div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Local Models */}
                                                        <div>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Local (Ollama)</h5>
                                                                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{localModels.length}</span>
                                                            </div>
                                                            <div className="h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white p-1 space-y-1">
                                                                {localModels.length > 0 ? localModels.map(model => (
                                                                    <button
                                                                        key={model.id}
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            const updated = { ...editingProduct, aiModel: model.id, aiProvider: 'ollama' as const };
                                                                            setEditingProduct(updated);
                                                                            updateProduct(updated);
                                                                        }}
                                                                        className={`w-full text-left px-3 py-2 text-xs rounded-md transition-all flex items-center justify-between ${editingProduct.aiModel === model.id && editingProduct.aiProvider === 'ollama'
                                                                            ? 'bg-purple-50 text-purple-700 font-medium ring-1 ring-purple-200'
                                                                            : 'text-slate-600 hover:bg-slate-50'
                                                                            }`}
                                                                    >
                                                                        <span className="truncate">{model.id}</span>
                                                                        {editingProduct.aiModel === model.id && editingProduct.aiProvider === 'ollama' && <Check className="w-3 h-3 text-purple-600 flex-shrink-0 ml-2" />}
                                                                    </button>
                                                                )) : (
                                                                    <div className="p-3 text-center text-xs text-slate-400 italic">No local models found</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-2 mb-4">
                                                        Select the model used for AI chat.
                                                        {config.aiProvider === 'ollama'
                                                            ? ' Selected from your local Ollama instance.'
                                                            : ' Selected from available OpenAI models.'}
                                                    </p>

                                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                        Product Knowledge & Custom Instructions
                                                    </label>
                                                    <textarea
                                                        value={editingProduct.customInstructions || ''}
                                                        onChange={(e) => {
                                                            const updated = { ...editingProduct, customInstructions: e.target.value };
                                                            setEditingProduct(updated);
                                                            updateProduct(updated);
                                                        }}
                                                        placeholder="e.g. 'This line produces stators. The key bottleneck is usually Winding. If QN is High, check the copper wire quality.'"
                                                        className="w-full px-4 py-2.5 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 text-sm font-medium bg-white shadow-sm min-h-[100px] text-slate-900"
                                                    />
                                                    <p className="text-xs text-slate-500 mt-2">
                                                        Teach the AI about this product line. Add specific context, jargon, or rules you want it to know.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mb-6">
                                                <h4 className="text-sm font-bold text-slate-900 mb-3">ECD Calculation Settings</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                                                        <div>
                                                            <p className="font-medium text-slate-900 text-sm">Include Saturday</p>
                                                            <p className="text-xs text-slate-500">{editingProduct.includeSaturday ? 'Included' : 'Excluded'}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                const updated = { ...editingProduct, includeSaturday: !editingProduct.includeSaturday };
                                                                setEditingProduct(updated);
                                                                updateProduct(updated);
                                                            }}
                                                            className={`relative w-10 h-6 rounded-full transition-colors ${editingProduct.includeSaturday ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                                        >
                                                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${editingProduct.includeSaturday ? 'left-5' : 'left-1'}`} />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                                                        <div>
                                                            <p className="font-medium text-slate-900 text-sm">Include Sunday</p>
                                                            <p className="text-xs text-slate-500">{editingProduct.includeSunday ? 'Included' : 'Excluded'}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                const updated = { ...editingProduct, includeSunday: !editingProduct.includeSunday };
                                                                setEditingProduct(updated);
                                                                updateProduct(updated);
                                                            }}
                                                            className={`relative w-10 h-6 rounded-full transition-colors ${editingProduct.includeSunday ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                                        >
                                                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${editingProduct.includeSunday ? 'left-5' : 'left-1'}`} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Auto-Import Watch Folder */}
                                            <div className="mb-6">
                                                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                                    <RefreshCw className="w-4 h-4 text-green-600" />
                                                    Automatic Excel Import
                                                </h4>
                                                <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                        Watch Folder Path
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editingProduct.watchFolder || ''}
                                                        onChange={(e) => {
                                                            const updated = { ...editingProduct, watchFolder: e.target.value };
                                                            setEditingProduct(updated);
                                                            updateProduct(updated);
                                                        }}
                                                        placeholder="/path/to/excel/folder (e.g., /Users/yourname/Downloads/ProTracker-Watch)"
                                                        className="w-full px-4 py-2.5 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 text-sm text-slate-800 font-mono bg-white shadow-sm"
                                                    />
                                                    <p className="text-xs text-green-700 mt-2 mb-3">
                                                        When configured, the system will automatically detect and import Excel files placed in this folder.
                                                    </p>

                                                    {/* Watcher Status and Controls */}
                                                    <div className="mt-4 p-4 bg-white rounded-lg border border-green-200 shadow-sm">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-2.5 h-2.5 rounded-full ${watcherRunning ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                                                                    <span className="text-sm font-medium text-slate-700">
                                                                        Status: {watcherRunning ? 'Running' : 'Stopped'}
                                                                    </span>
                                                                </div>
                                                                {watcherPid && (
                                                                    <span className="text-xs text-slate-500 font-mono">PID: {watcherPid}</span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={fetchWatcherStatus}
                                                                    disabled={watcherLoading}
                                                                    className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
                                                                    title="Refresh status"
                                                                >
                                                                    <RefreshCw className={`w-4 h-4 ${watcherLoading ? 'animate-spin' : ''}`} />
                                                                </button>
                                                                {watcherRunning ? (
                                                                    <button
                                                                        onClick={stopWatcher}
                                                                        disabled={watcherLoading}
                                                                        className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 flex items-center gap-2 shadow-sm transition-all"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                        Stop Watcher
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={startWatcher}
                                                                        disabled={watcherLoading || !editingProduct?.watchFolder}
                                                                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 disabled:opacity-50 flex items-center gap-2 shadow-sm transition-all"
                                                                        title={!editingProduct?.watchFolder ? 'Please set Watch Folder Path first' : ''}
                                                                    >
                                                                        <Play className="w-4 h-4" />
                                                                        Start Watcher
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-200">
                                                {/* Detail Columns Management */}
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-900 mb-2">
                                                        Detail Columns
                                                    </label>
                                                    <p className="text-xs text-slate-500 mb-3">
                                                        Order info (e.g., WO ID, Due Date).
                                                    </p>

                                                    {/* Add Detail Column Input */}
                                                    <div className="flex gap-2 mb-3">
                                                        <input
                                                            type="text"
                                                            value={newDetailColumnName}
                                                            onChange={(e) => setNewDetailColumnName(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && addManualDetailColumn()}
                                                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 text-sm text-black font-medium"
                                                            placeholder="Column name..."
                                                        />
                                                        <button
                                                            onClick={addManualDetailColumn}
                                                            disabled={!newDetailColumnName.trim()}
                                                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    {/* Detail Columns List */}
                                                    <div className="bg-white border border-slate-200 rounded-lg p-1 min-h-[100px] max-h-[400px] overflow-y-auto space-y-1">
                                                        {editingProduct.detailColumns.map((col, index) => (
                                                            <div key={col} className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded-md group hover:bg-blue-100 transition-colors">
                                                                <div className="flex flex-col gap-0.5 opacity-50 hover:opacity-100">
                                                                    <button onClick={() => moveDetailColumn(index, 'up')} disabled={index === 0} className="hover:text-blue-700"><ChevronUp className="w-3 h-3" /></button>
                                                                    <button onClick={() => moveDetailColumn(index, 'down')} disabled={index === editingProduct.detailColumns.length - 1} className="hover:text-blue-700"><ChevronDown className="w-3 h-3" /></button>
                                                                </div>
                                                                <span className="text-xs font-mono text-blue-500 w-5 text-center">{index + 1}</span>
                                                                <div className="flex-1 text-sm font-medium text-slate-700 truncate">{col}</div>
                                                                <button onClick={() => deleteDetailColumn(col)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                                                            </div>
                                                        ))}
                                                        {editingProduct.detailColumns.length === 0 && (
                                                            <div className="text-center py-8 text-slate-400 text-sm italic">No detail columns</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Process Steps Management */}
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-900 mb-2">
                                                        Process Steps
                                                    </label>
                                                    <p className="text-xs text-slate-500 mb-3">
                                                        Production steps with durations.
                                                    </p>

                                                    {/* Add Step Input */}
                                                    <div className="flex gap-2 mb-3">
                                                        <input
                                                            type="text"
                                                            value={newStepName}
                                                            onChange={(e) => setNewStepName(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && addManualStep()}
                                                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 text-sm text-black font-medium"
                                                            placeholder="Step name..."
                                                        />
                                                        <button
                                                            onClick={addManualStep}
                                                            disabled={!newStepName.trim()}
                                                            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    {/* Steps List */}
                                                    <div className="bg-white border border-slate-200 rounded-lg p-1 min-h-[100px] max-h-[400px] overflow-y-auto space-y-1">
                                                        {editingProduct.steps.map((step, index) => (
                                                            <div key={step} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-md group hover:bg-slate-50 transition-colors">
                                                                <div className="flex flex-col gap-0.5 opacity-50 hover:opacity-100">
                                                                    <button onClick={() => moveStep(index, 'up')} disabled={index === 0} className="hover:text-indigo-700"><ChevronUp className="w-3 h-3" /></button>
                                                                    <button onClick={() => moveStep(index, 'down')} disabled={index === editingProduct.steps.length - 1} className="hover:text-indigo-700"><ChevronDown className="w-3 h-3" /></button>
                                                                </div>
                                                                <span className="text-xs font-mono text-slate-400 w-5 text-center">{index + 1}</span>
                                                                <div className="flex-1 text-sm font-medium text-slate-700 truncate">{step}</div>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.5"
                                                                    value={editingProduct.stepDurations?.[step] || 0}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value) || 0;
                                                                        const newDurations = { ...editingProduct.stepDurations, [step]: val };
                                                                        const updated = { ...editingProduct, stepDurations: newDurations };
                                                                        setEditingProduct(updated);
                                                                        updateProduct(updated);
                                                                    }}
                                                                    className="w-14 px-1 py-0.5 text-right text-xs text-black font-medium border border-slate-200 rounded bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300"
                                                                    title="Hours"
                                                                />
                                                                <span className="text-[10px] text-slate-400">h</span>
                                                                <button onClick={() => deleteStep(step)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                                                            </div>
                                                        ))}
                                                        {editingProduct.steps.length === 0 && (
                                                            <div className="text-center py-8 text-slate-400 text-sm italic">No steps defined</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}


                                </div>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    {saving ? 'Saving...' : 'Save Settings'}
                                </button>

                                {/* Save Status Message */}
                                {message && (
                                    <div className={`mt-3 text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                        }`}>
                                        {message.type === 'success' ? (
                                            <Check className="w-4 h-4 flex-shrink-0" />
                                        ) : (
                                            <X className="w-4 h-4 flex-shrink-0" />
                                        )}
                                        <span>{message.text}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Right Column - Sidebar (ECD / Security / About) */}
                        <div className="space-y-6">
                            {/* User Management Link */}
                            {(isAdmin || isSupervisor) && (
                                <div
                                    onClick={() => router.push('/dashboard/users')}
                                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-md cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="bg-purple-100 p-3 rounded-lg group-hover:bg-purple-200 transition-colors">
                                            <Users className="w-6 h-6 text-purple-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors">User Management</h3>
                                            <p className="text-sm text-slate-500">Manage accounts & approvals</p>
                                        </div>
                                    </div>
                                </div>
                            )}



                            {/* Data Management (Admin Only) */}
                            {isAdmin && (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-md">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                        <Database className="w-5 h-5 text-indigo-600" />
                                        Data Management
                                    </h3>
                                    <div className="space-y-4">
                                        <button
                                            onClick={() => window.open('/api/export-csv')}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download All Data (CSV)
                                        </button>

                                        <div className="border-t border-slate-100 pt-4">
                                            <p className="text-xs text-slate-500 mb-2">
                                                Retention Policy: Keep 6 months of data.
                                            </p>
                                            <button
                                                onClick={async () => {
                                                    if (!confirm('WARNING: This will PERMANENTLY DELETE all data older than 6 months.\n\nAre you sure you want to proceed?')) return;

                                                    try {
                                                        const res = await fetch('/api/cleanup', { method: 'POST' });
                                                        const data = await res.json();
                                                        if (res.ok) {
                                                            alert(data.message);
                                                        } else {
                                                            alert('Error: ' + data.error);
                                                        }
                                                    } catch (e) {
                                                        alert('Cleanup failed');
                                                    }
                                                }}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Cleanup Old Data
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* AI Settings (Admin Only) */}
                            {isAdmin && (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-md">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-purple-600" />
                                        AI Settings
                                    </h3>

                                    <div className="space-y-6">
                                        {/* Provider Toggle */}
                                        <div className="flex bg-slate-100 p-1 rounded-lg">
                                            <button
                                                onClick={() => {
                                                    const newConfig = { ...config, aiProvider: 'openai' as const };
                                                    setConfig(newConfig);
                                                    fetchModels('openai');
                                                }}
                                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${config.aiProvider === 'openai' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                OpenAI (Cloud)
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const newConfig = { ...config, aiProvider: 'ollama' as const };
                                                    setConfig(newConfig);
                                                    fetchModels('ollama');
                                                }}
                                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${config.aiProvider === 'ollama' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                Ollama (Local)
                                            </button>
                                        </div>

                                        {config.aiProvider === 'ollama' ? (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Ollama URL</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={config.ollamaUrl || 'http://localhost:11434/v1'}
                                                            onChange={(e) => setConfig({ ...config, ollamaUrl: e.target.value })}
                                                            placeholder="http://localhost:11434/v1"
                                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 font-mono text-sm text-slate-800"
                                                        />
                                                        <button
                                                            onClick={() => fetchModels('ollama')}
                                                            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500"
                                                            title="Test Connection & List Models"
                                                        >
                                                            <RefreshCw className={`w-4 h-4 ${loadingModels ? 'animate-spin' : ''}`} />
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        Found {localModels.length} models.
                                                        {localModels.length > 0 && (
                                                            <span className="ml-1 text-green-600">Connection successful.</span>
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="pt-2">
                                                    <button
                                                        onClick={async () => {
                                                            setSavingAiKey(true);
                                                            try {
                                                                // Save config for Ollama
                                                                const res = await fetch('/api/config', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({
                                                                        aiProvider: 'ollama',
                                                                        ollamaUrl: config.ollamaUrl
                                                                        // model is now selected per product
                                                                    })
                                                                });
                                                                if (res.ok) {
                                                                    setAiTestResult({ status: 'success', message: 'Ollama settings saved!' });
                                                                    fetchModels(); // Refresh after save
                                                                } else {
                                                                    setAiTestResult({ status: 'error', message: 'Failed to save settings' });
                                                                }
                                                            } catch (e) {
                                                                setAiTestResult({ status: 'error', message: 'Error saving settings' });
                                                            } finally {
                                                                setSavingAiKey(false);
                                                            }
                                                        }}
                                                        disabled={savingAiKey}
                                                        className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                                    >
                                                        <Save className="w-4 h-4" />
                                                        Save & Connect
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">OpenAI API Key</label>
                                                    <div className="relative">
                                                        <input
                                                            type={aiApiKeyVisible ? 'text' : 'password'}
                                                            value={aiApiKey}
                                                            onChange={(e) => setAiApiKey(e.target.value)}
                                                            placeholder="sk-proj-..."
                                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 font-mono text-sm text-slate-800 pr-10"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setAiApiKeyVisible(!aiApiKeyVisible)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                        >
                                                            {aiApiKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">Required for AI chat. stored in env vars.</p>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            if (!aiApiKey.trim()) return setAiTestResult({ status: 'error', message: 'Enter API key' });
                                                            setAiTestResult({ status: 'testing', message: 'Testing...' });
                                                            try {
                                                                const res = await fetch('/api/ai/test', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ apiKey: aiApiKey })
                                                                });
                                                                if (res.ok) setAiTestResult({ status: 'success', message: 'Connected!' });
                                                                else setAiTestResult({ status: 'error', message: 'Test failed' });
                                                            } catch { setAiTestResult({ status: 'error', message: 'Connection failed' }); }
                                                        }}
                                                        disabled={aiTestResult.status === 'testing'}
                                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 font-medium transition-colors disabled:opacity-50 text-sm"
                                                    >
                                                        <Bot className="w-4 h-4" />
                                                        Test
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (!aiApiKey.trim()) return;
                                                            setSavingAiKey(true);
                                                            try {
                                                                // Save Config for OpenAI Provider selection + Key
                                                                await fetch('/api/config', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ aiProvider: 'openai' })
                                                                });

                                                                const res = await fetch('/api/ai/config', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ apiKey: aiApiKey })
                                                                });
                                                                if (res.ok) setAiTestResult({ status: 'success', message: 'Key saved!' });
                                                                else setAiTestResult({ status: 'error', message: 'Save failed' });
                                                            } catch { setAiTestResult({ status: 'error', message: 'Save failed' }); }
                                                            finally { setSavingAiKey(false); }
                                                        }}
                                                        disabled={savingAiKey}
                                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 font-medium transition-colors disabled:opacity-50 text-sm"
                                                    >
                                                        <Save className="w-4 h-4" />
                                                        Save
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {aiTestResult.message && (
                                            <div className={`text-sm px-3 py-2 rounded-lg ${aiTestResult.status === 'success' ? 'bg-green-50 text-green-700' :
                                                aiTestResult.status === 'error' ? 'bg-red-50 text-red-700' :
                                                    'bg-slate-50 text-slate-600'
                                                }`}>
                                                {aiTestResult.message}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}



                            {/* AI Prompt Engineering (Admin Only) */}
                            {currentUser?.role === 'admin' && (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-md mb-6">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-purple-600" />
                                        AI Prompt Engineering (Advanced)
                                    </h3>
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-sm text-amber-800">
                                        <strong>Caution:</strong> Modifying these prompts affects how the AI behaves for all users. Leave fields empty to use the system defaults (recommended).
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <label className="block text-sm font-medium text-slate-700">System Prompt (Global)</label>
                                                <button
                                                    onClick={() => setConfig({ ...config, systemPrompt: '' })}
                                                    className="text-xs text-slate-400 hover:text-red-500"
                                                >
                                                    Reset to Default
                                                </button>
                                            </div>
                                            <textarea
                                                value={config.systemPrompt || ''}
                                                onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                                                placeholder="Default system prompt..."
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 font-mono text-sm h-32 text-slate-900"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {['admin', 'supervisor', 'user'].map((role) => (
                                                <div key={role}>
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <label className="block text-sm font-medium text-slate-700 capitalize">{role} Persona</label>
                                                        <button
                                                            onClick={() => {
                                                                const newRolePrompts = { ...(config.rolePrompts || {}) };
                                                                delete newRolePrompts[role];
                                                                setConfig({ ...config, rolePrompts: newRolePrompts });
                                                            }}
                                                            className="text-xs text-slate-400 hover:text-red-500"
                                                        >
                                                            Default
                                                        </button>
                                                    </div>
                                                    <textarea
                                                        value={config.rolePrompts?.[role] || ''}
                                                        onChange={(e) => {
                                                            const newRolePrompts = { ...(config.rolePrompts || {}) };
                                                            newRolePrompts[role] = e.target.value;
                                                            setConfig({ ...config, rolePrompts: newRolePrompts });
                                                        }}
                                                        placeholder={`Default ${role} instructions...`}
                                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 font-mono text-xs h-32 text-slate-900"
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        {/* Save Button */}
                                        <div className="pt-4 border-t border-slate-100">
                                            <button
                                                onClick={handleSave}
                                                disabled={saving}
                                                className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                <Save className="w-4 h-4" />
                                                {saving ? 'Saving...' : 'Save AI Prompts'}
                                            </button>

                                            {/* Save Status Message */}
                                            {message && (
                                                <div className={`mt-3 text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                                    }`}>
                                                    {message.type === 'success' ? (
                                                        <Check className="w-4 h-4 flex-shrink-0" />
                                                    ) : (
                                                        <X className="w-4 h-4 flex-shrink-0" />
                                                    )}
                                                    <span>{message.text}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* User Profile & Security */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-md">
                                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <User className="w-5 h-5 text-indigo-600" />
                                    Your Profile
                                </h3>
                                {currentUser ? (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                                            <div className="bg-indigo-100 p-2 rounded-full">
                                                <User className="w-6 h-6 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{currentUser.username}</p>
                                                <p className="text-sm text-slate-500 capitalize">{currentUser.role}</p>
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-100 pt-4">
                                            <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                                <Key className="w-4 h-4 text-slate-500" />
                                                Change Password
                                            </h4>
                                            <div className="space-y-3">
                                                <input
                                                    type="password"
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPass(e.target.value)}
                                                    placeholder="Current Password"
                                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 text-sm text-black font-medium"
                                                />
                                                <input
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPass(e.target.value)}
                                                    placeholder="New Password"
                                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 text-sm text-black font-medium"
                                                />
                                                <input
                                                    type="password"
                                                    value={confirmNewPass}
                                                    onChange={(e) => setConfirmNewPass(e.target.value)}
                                                    placeholder="Confirm New Password"
                                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 text-sm text-black font-medium"
                                                />
                                                <button
                                                    onClick={async () => {
                                                        if (!currentPassword) {
                                                            setPassMsg('Current password required');
                                                            return;
                                                        }
                                                        if (!newPassword || newPassword !== confirmNewPass) {
                                                            setPassMsg('New passwords do not match');
                                                            return;
                                                        }
                                                        setPassMsg('Updating...');
                                                        try {
                                                            const res = await fetch(`/api/users/${currentUser.id}`, {
                                                                method: 'PATCH',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ password: newPassword, currentPassword })
                                                            });
                                                            if (res.ok) {
                                                                setPassMsg('Password updated!');
                                                                setCurrentPass('');
                                                                setNewPass('');
                                                                setConfirmNewPass('');
                                                            } else {
                                                                const err = await res.json();
                                                                setPassMsg(err.error || 'Failed to update');
                                                            }
                                                        } catch {
                                                            setPassMsg('Error updating');
                                                        }
                                                    }}
                                                    disabled={!newPassword || !currentPassword}
                                                    className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors"
                                                >
                                                    Update Password
                                                </button>
                                                {passMsg && (
                                                    <p className={`text-xs text-center ${passMsg.includes('updated') ? 'text-green-600' : 'text-amber-600'}`}>
                                                        {passMsg}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500">Loading user profile...</p>
                                )}
                            </div>


                        </div>
                    </div >
                )}
            </main >

            {/* Column Categorization Modal */}
            {
                showColumnsConfirm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 max-w-lg mx-4 shadow-xl max-h-[80vh] overflow-hidden flex flex-col">
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Categorize Columns</h3>
                            <p className="text-slate-500 mb-2 text-sm">
                                Click to toggle each column as <span className="text-blue-600 font-medium">Detail</span> (order info) or <span className="text-green-600 font-medium">Step</span> (process):
                            </p>
                            <p className="text-xs text-slate-500 mb-4">
                                Detail: {detectedColumns.filter(c => columnCategories[c] === 'detail').length} |
                                Step: {detectedColumns.filter(c => columnCategories[c] === 'step').length}
                            </p>

                            <div className="flex-1 overflow-y-auto mb-4 max-h-60">
                                <div className="space-y-1">
                                    {detectedColumns.map((col: string, index: number) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded group hover:bg-slate-100">
                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-col gap-0.5">
                                                    <button
                                                        onClick={() => moveColumn(index, 'up')}
                                                        disabled={index === 0}
                                                        className="text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                                                    >
                                                        <ChevronUp className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => moveColumn(index, 'down')}
                                                        disabled={index === detectedColumns.length - 1}
                                                        className="text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                                                    >
                                                        <ChevronDown className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <span className="text-xs text-slate-400 w-6">{index + 1}</span>
                                                <span className="text-sm text-slate-800">{col}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setColumnCategories({ ...columnCategories, [col]: 'detail' })}
                                                    className={`px-2 py-0.5 text-xs rounded ${columnCategories[col] === 'detail' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-blue-100'}`}
                                                >
                                                    Detail
                                                </button>
                                                <button
                                                    onClick={() => setColumnCategories({ ...columnCategories, [col]: 'step' })}
                                                    className={`px-2 py-0.5 text-xs rounded ${columnCategories[col] === 'step' ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-green-100'}`}
                                                >
                                                    Step
                                                </button>
                                                <button
                                                    onClick={() => setDetectedColumns(detectedColumns.filter((_: string, i: number) => i !== index))}
                                                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Exclude this column"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setShowColumnsConfirm(false); setDetectedColumns([]); setColumnCategories({}); }}
                                    className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDetectedColumns}
                                    disabled={detectedColumns.length === 0}
                                    className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Check className="w-4 h-4" />
                                    Import Columns
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Import Preview Modal */}
            {
                showPreviewModal && previewData && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-800">📊 Connect Excel Columns</h2>
                                <button onClick={() => { setShowPreviewModal(false); setPreviewData(null); setPreviewFile(null); }} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="overflow-y-auto px-6 py-8 text-center space-y-4">
                                <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                    <Table2 className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900">
                                    Excel File Analyzed Successfully
                                </h3>
                                <p className="text-slate-500 max-w-md mx-auto">
                                    We found <strong>{previewData.detectedHeaders?.length || 0}</strong> columns in your file.
                                    Click below to review and map these columns to your production tracking needs.
                                </p>
                            </div>
                            <div className="px-6 py-4 border-t flex justify-center gap-4 bg-slate-50">
                                <button onClick={() => { setShowPreviewModal(false); setPreviewData(null); setPreviewFile(null); }} className="px-6 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-white transition-colors">Cancel</button>

                                {/* Option to just use columns for config */}
                                {previewData.detectedHeaders && previewData.detectedHeaders.length > 0 && (
                                    <button
                                        onClick={() => {
                                            setDetectedColumns(previewData.detectedHeaders);
                                            // Simple heuristic categorization
                                            const cats: Record<string, 'detail' | 'step'> = {};
                                            previewData.detectedHeaders.forEach((h: string) => {
                                                // Assume defaults or unknown?
                                                // Let user decide in next modal
                                            });
                                            setColumnCategories(cats);
                                            setShowPreviewModal(false);
                                            setShowColumnsConfirm(true);
                                        }}
                                        className="px-8 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow hover:scale-[1.02]"
                                    >
                                        <Table2 className="w-4 h-4" />
                                        Review & Use Columns
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
