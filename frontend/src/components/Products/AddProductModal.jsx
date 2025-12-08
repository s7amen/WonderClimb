import { useState } from 'react';
import PropTypes from 'prop-types';
import BaseModal from '../UI/BaseModal';
import FormField from '../UI/FormField';
import Button from '../UI/Button';
import ProductImageUpload from './ProductImageUpload';
import { productsAPI } from '../../services/api';
import { useToast } from '../UI/Toast';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning.jsx';

/**
 * AddProductModal - Modal for adding new products
 */
const AddProductModal = ({ isOpen, onClose, onSuccess }) => {
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
    const { showToast } = useToast();

    // Unsaved changes warning
    const hasFormChanges = () => {
        return formData.name.trim() !== '' ||
            formData.sku.trim() !== '' ||
            formData.price !== '' ||
            formData.category.trim() !== '' ||
            formData.stockQuantity !== '' ||
            imageFile !== null;
    };

    const { confirmClose, UnsavedChangesModal } = useUnsavedChangesWarning({
        hasChanges: hasFormChanges,
        message: "Имате незапазени промени във формата. Сигурни ли сте, че искате да излезете без да ги запазите?"
    });

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

            // Create product
            const response = await productsAPI.create(productData);
            const createdProduct = response.data.product;

            // Upload image if provided
            if (imageFile) {
                try {
                    const uploadResponse = await productsAPI.uploadImage(createdProduct._id, imageFile);
                    console.log('✅ Image uploaded successfully:', uploadResponse.data);
                    showToast('Продуктът и снимката са добавени успешно', 'success');
                } catch (imageError) {
                    console.error('❌ Image upload failed:', imageError);
                    showToast('Продуктът е създаден, но снимката не можа да се качи', 'warning');
                }
            } else {
                showToast('Продуктът е добавен успешно', 'success');
            }

            // Reset form
            setFormData({
                name: '',
                sku: '',
                type: 'sale',
                price: '',
                category: '',
                unit: 'бр',
                stockQuantity: '',
                lowStockThreshold: '5',
            });
            setImageFile(null);
            setErrors({});

            // Close modal first
            onClose();

            // Refresh product list after a brief delay to ensure DB update is complete
            setTimeout(() => {
                if (onSuccess) {
                    onSuccess();
                }
            }, 300);
        } catch (error) {
            const errorMessage = error.response?.data?.error?.message || 'Грешка при добавяне на продукт';
            showToast(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const footer = (
        <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
                Отказ
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Добавяне...' : 'Добави продукт'}
            </Button>
        </div>
    );

    return (
        <>
            <BaseModal
                isOpen={isOpen}
                onClose={() => confirmClose(onClose)}
                title="Добавяне на продукт"
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
                </form>
            </BaseModal><UnsavedChangesModal />
        </>
    );
};

AddProductModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSuccess: PropTypes.func,
};

export default AddProductModal;
