import React from 'react';
import { useParams } from 'react-router-dom';

const ProductDetail = () => {
    const { id } = useParams();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Детайли за продукт</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <p className="text-gray-500">Преглед на продукт ID: {id}</p>
            </div>
        </div>
    );
};

export default ProductDetail;
