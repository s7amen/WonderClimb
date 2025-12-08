import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import BaseModal from '../UI/BaseModal';
import FormField from '../UI/FormField';
import Button from '../UI/Button';
import ProductImageUpload from './ProductImageUpload';
import { productsAPI } from '../../services/api';
import { useToast } from '../UI/Toast';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning.jsx';

/**
 * EditProductModal - Modal for editing existing products
 */
const EditProductModal = ({ isOpen, onClose, product, onSuccess, onDelete, onDeletePermanent, onReactivate }) => {
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        type: 'sale',
        price: '',
        category: '',
        unit: 'бр',
        stockQuantity: '',
        lowStockThreshold: '5',
    });
    const [imageFile, setImageFile] = useState(null);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [initialFormState, setInitialFormState] = useState(null);
    const { showToast } = useToast();

    // Unsaved changes warning
    const hasFormChanges = () => {
        if (!initialFormState) return false;
        return JSON.stringify(formData) !== initialFormState || imageFile !== null;
    };

    const { confirmClose, UnsavedChangesModal } = useUnsavedChangesWarning({
        hasChanges: hasFormChanges,
        message: "Имате незапазени промени във формата. Сигурни ли сте, че искате да излезете без да ги запазите?"
    });

    // Populate form when product changes
    useEffect(() => {
        if (product) {
            const newFormData = {
                name: product.name || '',
                sku: product.sku || '',
                type: product.type || 'sale',
                price: product.price?.toString() || '',
                category: product.category || '',
                unit: product.unit || 'бр',
                stockQuantity: product.stockQuantity?.toString() || '',
                lowStockThreshold: product.lowStockThreshold?.toString() || '5',
            };
            setFormData(newFormData);
            setInitialFormState(JSON.stringify(newFormData));
        }
    }, [product]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Име на продукта е задължително';
        }

        if (!formData.type) {
            newErrors.type = 'Тип е задължителен';
        }

        if (!formData.price || parseFloat(formData.price) <= 0) {
            newErrors.price = 'Цената трябва да е положително число';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) {
            showToast('Моля, коригирайте грешките във формата', 'error');
            return;
        }

        setLoading(true);

        try {
            // Prepare data for API
            const productData = {
                name: formData.name.trim(),
                sku: formData.sku.trim() || undefined,
                type: formData.type,
                price: parseFloat(formData.price),
                category: formData.category.trim() || undefined,
                unit: formData.unit.trim() || 'бр',
                stockQuantity: formData.stockQuantity ? parseInt(formData.stockQuantity) : null,
                lowStockThreshold: formData.lowStockThreshold ? parseInt(formData.lowStockThreshold) : 5,
            };

            // Update product
            await productsAPI.update(product._id, productData);

            // Upload new image if provided
            if (imageFile) {
                try {
                    await productsAPI.uploadImage(product._id, imageFile);
                    showToast('Продуктът и снимката са актуализирани успешно', 'success');
                } catch (imageError) {
                    showToast('Продуктът е актуализиран, но снимката не можа да се качи', 'warning');
                }
            } else {
                showToast('Продуктът е актуализиран успешно', 'success');
            }

            // Reset image file
            setImageFile(null);
            setErrors({});

            // Notify parent
            if (onSuccess) {
                onSuccess();
            }

            onClose();
        } catch (error) {
            const errorMessage = error.response?.data?.error?.message || 'Грешка при актуализиране на продукт';
            showToast(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const footer = (
        <div className="flex justify-end gap-3 w-full">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
                Отказ
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Запазване...' : 'Запази промените'}
            </Button>
        </div>
    );

    if (!product) return null;

    return (
        <>
            <BaseModal
                isOpen={isOpen}
                onClose={() => confirmClose(onClose)}
                title="Редактиране на продукт"
                footer={footer}
                size="xl"
                closeOnBackdrop={!loading}
                closeOnEsc={!loading}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Product Image */}
                    <FormField label="Снимка на продукта" name="image">
                        <ProductImageUpload
                            onFileSelect={setImageFile}
                            existingImage={productsAPI.getImageUrl(product.imageUrl)}
                            disabled={loading}
                        />
                    </FormField>

                    {/* Product Name */}
                    <FormField label="Име на продукта" name="name" required error={errors.name}>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ea7a24] focus:border-transparent"
                            placeholder="напр. Протеин Whey"
                            disabled={loading}
                        />
                    </FormField>

                    {/* SKU */}
                    <FormField label="Артикулен номер (SKU)" name="sku" error={errors.sku}>
                        <input
                            type="text"
                            name="sku"
                            value={formData.sku}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ea7a24] focus:border-transparent"
                            placeholder="напр. PROT-WHEY-001"
                            disabled={loading}
                        />
                    </FormField>

                    {/* Type and Category Row */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Type */}
                        <FormField label="Тип" name="type" required error={errors.type}>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ea7a24] focus:border-transparent"
                                disabled={loading}
                            >
                                <option value="sale">Продажба</option>
                                <option value="rental">Наем</option>
                            </select>
                        </FormField>

                        {/* Category */}
                        <FormField label="Категория" name="category" error={errors.category}>
                            <input
                                type="text"
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ea7a24] focus:border-transparent"
                                placeholder="напр. Добавки, Екипировка"
                                disabled={loading}
                            />
                        </FormField>
                    </div>

                    {/* Price and Unit Row */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Price */}
                        <FormField label="Цена (€)" name="price" required error={errors.price}>
                            <input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                step="0.01"
                                min="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ea7a24] focus:border-transparent"
                                placeholder="0.00"
                                disabled={loading}
                            />
                        </FormField>

                        {/* Unit */}
                        <FormField label="Мерна единица" name="unit" error={errors.unit}>
                            <input
                                type="text"
                                name="unit"
                                value={formData.unit}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ea7a24] focus:border-transparent"
                                placeholder="бр"
                                disabled={loading}
                            />
                        </FormField>
                    </div>

                    {/* Stock Quantity and Low Stock Threshold Row */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Stock Quantity */}
                        <FormField
                            label="Количество на склад"
                            name="stockQuantity"
                            helpText="Оставете празно за неограничено"
                            error={errors.stockQuantity}
                        >
                            <input
                                type="number"
                                name="stockQuantity"
                                value={formData.stockQuantity}
                                onChange={handleChange}
                                min="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ea7a24] focus:border-transparent"
                                placeholder="напр. 50"
                                disabled={loading}
                            />
                        </FormField>

                        {/* Low Stock Threshold */}
                        <FormField
                            label="Праг за нисък запас"
                            name="lowStockThreshold"
                            error={errors.lowStockThreshold}
                        >
                            <input
                                type="number"
                                name="lowStockThreshold"
                                value={formData.lowStockThreshold}
                                onChange={handleChange}
                                min="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ea7a24] focus:border-transparent"
                                placeholder="5"
                                disabled={loading}
                            />
                        </FormField>
                    </div>

                    {/* Delete/Deactivate Actions Section - Scrollable at bottom */}
                    <div className="pt-6 mt-6 border-t border-gray-100">
                        <div className="flex flex-col gap-2">
                            {product?.isActive !== false ? (
                                // Active Product Actions
                                onDelete && (
                                    <div className="flex justify-start">
                                        <Button
                                            variant="danger"
                                            onClick={() => onDelete(product)}
                                            disabled={loading}
                                            type="button"
                                            className="!text-xs !py-1.5 !px-3 opacity-80 hover:opacity-100"
                                        >
                                            Деактивирай продукта
                                        </Button>
                                    </div>
                                )
                            ) : (
                                // Inactive Product Actions
                                <div className="flex gap-3 justify-start">
                                    {onReactivate && (
                                        <Button
                                            variant="success"
                                            onClick={() => onReactivate(product)}
                                            disabled={loading}
                                            type="button"
                                            className="!text-xs !py-1.5 !px-3"
                                        >
                                            Възстанови
                                        </Button>
                                    )}
                                    {onDeletePermanent && (
                                        <Button
                                            variant="danger"
                                            onClick={() => onDeletePermanent(product)}
                                            disabled={loading}
                                            type="button"
                                            className="!bg-red-800 hover:!bg-red-900 !text-xs !py-1.5 !px-3 opacity-80 hover:opacity-100"
                                        >
                                            Изтрий завинаги
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            </BaseModal><UnsavedChangesModal />
        </>
    );
};

EditProductModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    product: PropTypes.object,
    onSuccess: PropTypes.func,
    onDelete: PropTypes.func,
    onDeletePermanent: PropTypes.func,
    onReactivate: PropTypes.func,
};

export default EditProductModal;
