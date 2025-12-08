import React from 'react';
import Card from '../UI/Card';

const ProductsWidget = ({ products, onProductClick }) => {
    return (
        <Card className="p-6">
            <h3 className="text-base font-medium text-neutral-950 mb-4">Продукти</h3>
            <div className="grid grid-cols-4 xl:grid-cols-5 gap-3">
                {products.map((product) => (
                    <div
                        key={product.id}
                        onClick={() => onProductClick?.(product)}
                        className="bg-white border border-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                    >
                        <div className="h-24 bg-gray-100 relative">
                            {product.image ? (
                                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <div className="p-2">
                            <p className="text-xs font-medium text-neutral-950 truncate" title={product.name}>{product.name}</p>
                            <p className="text-[10px] text-[#ea7a24] font-bold mt-0.5">{product.price.toFixed(2)} €</p>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default ProductsWidget;
