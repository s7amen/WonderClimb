import { useState, useEffect } from 'react';
import Button from '../../components/UI/Button';
import ProductCard from '../../components/Products/ProductCard';
import AddProductModal from '../../components/Products/AddProductModal';
import EditProductModal from '../../components/Products/EditProductModal';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
import LastSoldProducts from './LastSoldProducts';
import { productsAPI } from '../../services/api';
import { useToast } from '../../components/UI/Toast';
import ClimbingLoader from '../../components/UI/ClimbingLoader';

const ProductsList = () => {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('active'); // 'active' or 'inactive'
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);
    const [deleteAction, setDeleteAction] = useState('deactivate'); // 'deactivate' or 'delete'
    const { showToast } = useToast();

    // Fetch products
    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await productsAPI.getAll({
                isActive: statusFilter === 'active'
            });
            const productsList = response.data.products || [];

            // Debug logging
            console.log('📦 Fetched products:', productsList.map(p => ({
                id: p._id,
                name: p.name,
                imageUrl: p.imageUrl,
                isActive: p.isActive
            })));

            setProducts(productsList);
            setFilteredProducts(productsList);
        } catch (error) {
            showToast('Грешка при зареждане на продукти', 'error');
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [statusFilter]); // Refetch when status filter changes

    // Filter products based on search query
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredProducts(products);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = products.filter(
                product =>
                    product.name.toLowerCase().includes(query) ||
                    product.category?.toLowerCase().includes(query)
            );
            setFilteredProducts(filtered);
        }
    }, [searchQuery, products]);

    const handleEdit = (product) => {
        setSelectedProduct(product);
        setShowEditModal(true);
    };

    const handleDelete = (product, action = 'deactivate') => {
        setProductToDelete(product);
        setDeleteAction(action);
        setShowDeleteConfirm(true);
    };

    const handleReactivate = async (product) => {
        try {
            await productsAPI.reactivate(product._id);
            showToast('Продуктът е възстановен успешно', 'success');
            fetchProducts();
            setShowEditModal(false);
        } catch (error) {
            const errorMessage = error.response?.data?.error?.message || 'Грешка при възстановяване на продукт';
            showToast(errorMessage, 'error');
        }
    };

    const confirmDelete = async () => {
        if (!productToDelete) return;

        try {
            if (deleteAction === 'delete') {
                await productsAPI.deletePermanent(productToDelete._id);
                showToast('Продуктът е изтрит завинаги', 'success');
            } else {
                await productsAPI.delete(productToDelete._id);
                showToast('Продуктът е деактивиран успешно', 'success');
            }
            fetchProducts();
        } catch (error) {
            const errorMessage = error.response?.data?.error?.message || 'Грешка при изтриване на продукт';
            showToast(errorMessage, 'error');
        } finally {
            setShowDeleteConfirm(false);
            setProductToDelete(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-medium text-neutral-950">Продукти</h1>
                </div>
                <Button variant="primary" onClick={() => setShowAddModal(true)}>
                    + Добави продукт
                </Button>
            </div>

            {/* Status Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setStatusFilter('active')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                            ${statusFilter === 'active'
                                ? 'border-[#ea7a24] text-[#ea7a24]'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
                    >
                        Активни
                    </button>
                    <button
                        onClick={() => setStatusFilter('inactive')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                            ${statusFilter === 'inactive'
                                ? 'border-[#ea7a24] text-[#ea7a24]'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
                    >
                        Архив (Деактивирани)
                    </button>
                </nav>
            </div>

            {/* Search and Filter */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Търси по име или категория..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ea7a24] focus:border-transparent"
                />
            </div>

            {/* Products Count */}
            <div className="text-sm text-gray-600">
                {statusFilter === 'active' ? 'Активни продукти' : 'Архивирани продукти'} ({filteredProducts.length})
            </div>

            {/* Products Grid */}
            {loading ? (
                <ClimbingLoader text="Зареждане..." />
            ) : filteredProducts.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <p className="text-gray-500">
                        {searchQuery
                            ? 'Няма намерени продукти'
                            : (statusFilter === 'active' ? 'Няма активни продукти' : 'Няма архивирани продукти')}
                    </p>
                    {!searchQuery && statusFilter === 'active' && (
                        <Button
                            variant="primary"
                            onClick={() => setShowAddModal(true)}
                            className="mt-4"
                        >
                            Добави първи продукт
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredProducts.map((product) => (
                        <ProductCard
                            key={product._id}
                            product={product}
                            onEdit={handleEdit}
                            onDelete={(p) => handleDelete(p, 'deactivate')}
                        />
                    ))}
                </div>
            )}

            {/* Last Sold Products - Only show for active products */}
            {statusFilter === 'active' && <LastSoldProducts />}

            {/* Modals */}
            <AddProductModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={fetchProducts}
            />

            <EditProductModal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setSelectedProduct(null);
                }}
                product={selectedProduct}
                onSuccess={fetchProducts}
                onDelete={(product) => {
                    setShowEditModal(false);
                    handleDelete(product, 'deactivate');
                }}
                onDeletePermanent={(product) => {
                    setShowEditModal(false);
                    handleDelete(product, 'delete');
                }}
                onReactivate={handleReactivate}
            />

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setProductToDelete(null);
                }}
                onConfirm={confirmDelete}
                title={deleteAction === 'delete' ? "Изтриване завинаги" : "Деактивиране на продукт"}
                message={deleteAction === 'delete'
                    ? `Сигурни ли сте, че искате да изтриете ${productToDelete?.name} ЗАВИНАГИ? Това действие е необратимо!`
                    : `Сигурни ли сте, че искате да деактивирате ${productToDelete?.name}? Продуктът ще бъде преместен в архив.`}
                confirmText={deleteAction === 'delete' ? "Изтрий завинаги" : "Деактивирай"}
                confirmVariant="danger"
            /></div>
    );
};

export default ProductsList;

