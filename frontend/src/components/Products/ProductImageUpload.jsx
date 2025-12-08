import { useState, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * ProductImageUpload - Specialized image upload component for products
 * Similar to PhotoUpload but optimized for product images
 */
const ProductImageUpload = ({ onFileSelect, existingImage, disabled = false }) => {
    const [dragActive, setDragActive] = useState(false);
    const [preview, setPreview] = useState(existingImage || null);
    const fileInputRef = useRef(null);

    const handleFileSelect = (file) => {
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            alert('Невалиден формат на файл. Разрешени са само JPG, PNG и WebP.');
            return;
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            alert('Файлът е твърде голям. Максималният размер е 10MB.');
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result);
        };
        reader.readAsDataURL(file);

        // Notify parent
        if (onFileSelect) {
            onFileSelect(file);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleInputChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handleClick = () => {
        if (!disabled && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleRemove = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        if (onFileSelect) {
            onFileSelect(null);
        }
    };

    return (
        <div
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${dragActive
                    ? 'border-[#ea7a24] bg-[#fff5ed]'
                    : 'border-[#d1d5dc] hover:border-[#ea7a24]'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={handleClick}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleInputChange}
                disabled={disabled}
                className="hidden"
            />

            {preview ? (
                <div className="relative">
                    <img
                        src={preview}
                        alt="Product preview"
                        className="w-full h-48 object-cover rounded-md"
                    />
                    {!disabled && (
                        <button
                            onClick={handleRemove}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                            type="button"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center gap-2 py-4">
                    <svg
                        className="w-12 h-12 text-[#4a5565]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                    </svg>
                    <p className="text-sm font-medium text-neutral-950">
                        Кликнете или плъзнете снимка тук
                    </p>
                    <p className="text-xs text-[#4a5565]">
                        JPG, PNG или WebP до 10MB
                    </p>
                </div>
            )}
        </div>
    );
};

ProductImageUpload.propTypes = {
    onFileSelect: PropTypes.func,
    existingImage: PropTypes.string,
    disabled: PropTypes.bool,
};

export default ProductImageUpload;
