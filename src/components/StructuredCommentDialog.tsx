'use client';
import { useState } from 'react';
import { Package, Wrench, AlertTriangle, MessageSquare, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CommentData {
    orderId: string;
    stepName: string;
    category: string;
    structuredData: Record<string, string>;
    note: string;
    triggeredStatus: string | null;
}

interface Props {
    orderId: string;
    stepName: string;
    onClose: () => void;
    onSubmit: (data: CommentData) => Promise<void>;
}

export function StructuredCommentDialog({ orderId, stepName, onClose, onSubmit }: Props) {
    const [step, setStep] = useState<'category' | 'details'>('category');
    const [category, setCategory] = useState<string>('');
    const [formData, setFormData] = useState<{ note?: string }>({});
    const [submitting, setSubmitting] = useState(false);

    const t = useTranslations('StructuredCommentDialog');

    const CategorySelection = () => (
        <div className="space-y-3">
            <h3 className="text-lg font-bold mb-4">{t('title')}</h3>
            <p className="text-sm text-gray-600 mb-4">
                {t('subtitle')}
            </p>

            <button
                onClick={() => { setCategory('MATERIAL_SHORTAGE'); setStep('details'); }}
                className="w-full p-4 border-2 border-orange-300 rounded-lg hover:bg-orange-50 flex items-center gap-3"
            >
                <Package className="text-orange-600" size={24} />
                <div className="text-left">
                    <div className="font-bold">{t('categories.material.title')}</div>
                    <div className="text-sm text-gray-600">{t('categories.material.desc')}</div>
                </div>
            </button>

            <button
                onClick={() => { setCategory('EQUIPMENT_FAILURE'); setStep('details'); }}
                className="w-full p-4 border-2 border-red-300 rounded-lg hover:bg-red-50 flex items-center gap-3"
            >
                <Wrench className="text-red-600" size={24} />
                <div className="text-left">
                    <div className="font-bold">{t('categories.equipment.title')}</div>
                    <div className="text-sm text-gray-600">{t('categories.equipment.desc')}</div>
                </div>
            </button>

            <button
                onClick={() => { setCategory('QUALITY_ISSUE'); setStep('details'); }}
                className="w-full p-4 border-2 border-yellow-300 rounded-lg hover:bg-yellow-50 flex items-center gap-3"
            >
                <AlertTriangle className="text-yellow-600" size={24} />
                <div className="text-left">
                    <div className="font-bold">{t('categories.quality.title')}</div>
                    <div className="text-sm text-gray-600">{t('categories.quality.desc')}</div>
                </div>
            </button>

            <button
                onClick={() => { setCategory('GENERAL'); setStep('details'); }}
                className="w-full p-4 border-2 border-blue-300 rounded-lg hover:bg-blue-50 flex items-center gap-3"
            >
                <MessageSquare className="text-blue-600" size={24} />
                <div className="text-left">
                    <div className="font-bold">{t('categories.general.title')}</div>
                    <div className="text-sm text-gray-600">{t('categories.general.desc')}</div>
                </div>
            </button>
        </div>
    );

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const triggeredStatus =
                category === 'QUALITY_ISSUE' ? 'QN' :
                    (category === 'MATERIAL_SHORTAGE' || category === 'EQUIPMENT_FAILURE') ? 'HOLD' :
                        null;

            const payload = {
                orderId,
                stepName,
                category,
                structuredData: { category, ...formData },
                note: formData.note || '',
                triggeredStatus
            };

            await onSubmit(payload);
            onClose();
        } catch (error) {
            alert('Submission Failed: ' + error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                {step === 'category' && <CategorySelection />}

                {step === 'details' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold">
                            {category === 'MATERIAL_SHORTAGE' && t('details.materialTitle')}
                            {category === 'EQUIPMENT_FAILURE' && t('details.equipmentTitle')}
                            {category === 'QUALITY_ISSUE' && t('details.qualityTitle')}
                            {category === 'GENERAL' && t('details.generalTitle')}
                        </h3>

                        <div>
                            <label className="block text-sm font-medium mb-1">{t('details.descLabel')}</label>
                            <textarea
                                className="w-full p-2 border rounded"
                                rows={4}
                                placeholder={t('details.placeholder')}
                                value={formData.note || ''}
                                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setStep('category')}
                                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
                                disabled={submitting}
                            >
                                {t('details.back')}
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!formData.note || submitting}
                                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {submitting ? t('details.submitting') : t('Common.submit')}
                            </button>
                        </div>
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
}
