import PropTypes from 'prop-types';
import { productsAPI } from '../../services/api';

/**
 * ProductCard - Card component for displaying product information
 * Used in the products grid layout
 */
const ProductCard = ({ product, onEdit }) => {
    const imageUrl = productsAPI.getImageUrl(product.imageUrl);
    // Inline SVG placeholder - no external file needed
    const defaultImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E';

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
            {/* Product Image */}
            <div className="relative aspect-[4/3] bg-gray-100">
                <img
                    src={imageUrl || defaultImage}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.target.src = defaultImage;
                    }}
                />
                {/* Category Badge */}
                {product.category && (
                    <div className="absolute top-2 left-2">
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-white/90 text-gray-700 rounded">
                            {product.category}
                        </span>
                    </div>
                )}

                {/* Edit Button - Always visible in top-right corner */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit(product);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-sm transition-all"
                    title="Редактирай"
                >
                    <svg
                        className="w-3.5 h-3.5 text-gray-700"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                    </svg>
                </button>
            </div>

            {/* Product Info */}
            <div className="p-3">
                {/* Product Name */}
                <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2 min-h-[2.5em]">
                    {product.name}
                </h3>

                {/* Price and Stock */}
                <div className="flex justify-between items-center">
                    <div className="text-base font-bold text-[#ea7a24]">
                        €{product.price.toFixed(2)}
                    </div>
                    {product.stockQuantity !== null && (
                        <div className={`text-xs ${product.stockQuantity <= (product.lowStockThreshold || 5) ? 'text-red-600' : 'text-gray-600'}`}>
                            {product.stockQuantity} {product.unit || 'бр'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

ProductCard.propTypes = {
    product: PropTypes.shape({
        _id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        price: PropTypes.number.isRequired,
        imageUrl: PropTypes.string,
        category: PropTypes.string,
        stockQuantity: PropTypes.number,
        lowStockThreshold: PropTypes.number,
        unit: PropTypes.string,
    }).isRequired,
    onEdit: PropTypes.func.isRequired,
};

export default ProductCard;
