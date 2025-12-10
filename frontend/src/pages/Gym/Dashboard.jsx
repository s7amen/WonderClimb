import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/UI/Card';
import StatsCard from '../../components/Dashboard/StatsCard';

import ActiveCardsWidget from '../../components/Dashboard/ActiveCardsWidget';
import ProductsWidget from '../../components/Dashboard/ProductsWidget';
import ClimbersTableWidget from '../../components/Dashboard/ClimbersTableWidget';
import StickyCartWidget from '../../components/Dashboard/StickyCartWidget';
import PaymentModal from '../../components/Dashboard/PaymentModal';
import CreatePassModal from '../../components/Cards/CreatePassModal';
import SaleActionModal from '../../components/Dashboard/SaleActionModal';
import AddClimberModal from '../../components/Modals/AddClimberModal';
import EditClimberModal from '../../components/Modals/EditClimberModal';
import api, { processSale, gymAPI, productsAPI, adminUsersAPI } from '../../services/api';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning.jsx';
import { useToast } from '../../components/UI/Toast';

const GymDashboard = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isProcessingSale, setIsProcessingSale] = useState(false);
    const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
    const [isSaleActionModalOpen, setIsSaleActionModalOpen] = useState(false);
    const [isAddClimberModalOpen, setIsAddClimberModalOpen] = useState(false);
    const [isEditClimberModalOpen, setIsEditClimberModalOpen] = useState(false);
    const [editingClimber, setEditingClimber] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [saleActionType, setSaleActionType] = useState('visit'); // 'visit' or 'product'

    // Global climber selection for all operations
    const [selectedClimberId, setSelectedClimberId] = useState('');
    const [selectedClimberName, setSelectedClimberName] = useState('');

    // Card scanner state
    const [cardCode, setCardCode] = useState('');
    const [isLoadingCardScan, setIsLoadingCardScan] = useState(false);
    const [cardScanError, setCardScanError] = useState('');
    const cardScannerInputRef = useRef(null);

    // Refs for sticky cart behavior
    const cartRef = useRef(null);
    const cartContainerRef = useRef(null);
    const productsRef = useRef(null);
    const [cartStyle, setCartStyle] = useState({ position: 'sticky', top: '32px' });

    const [prices, setPrices] = useState([]);
    const [apiPricing, setApiPricing] = useState([]); // Original pricing from API for modal
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Climber details for display
    const [climberDetails, setClimberDetails] = useState({
        isMember: false,
        activePass: null,
        lastPass: null,
        loaded: false
    });
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    const [stats, setStats] = useState({
        dailyVisits: 0,
        activeCards: 0,
    });

    const [cardFilter, setCardFilter] = useState('last_created');
    const [cards, setCards] = useState([]);
    const [recentVisits, setRecentVisits] = useState([]);
    const [climbers, setClimbers] = useState([]);
    const [clients, setClients] = useState([]); // Unified list of climbers and families
    const [visitFilter, setVisitFilter] = useState('all');

    const fetchClients = async () => {
        try {
            // Fetch climbers and families in parallel
            const [climbersRes, familiesRes] = await Promise.all([
                adminUsersAPI.getAll({ role: 'climber', limit: 100, sort: 'firstName' }),
                api.get('/families')
            ]);

            const climbersList = (climbersRes.data.users || []).map(c => ({
                id: c.id,
                _id: c.id,
                firstName: c.firstName,
                lastName: c.lastName,
                name: `${c.firstName} ${c.lastName}`,
                email: c.email,
                phone: c.phone,
                clubMembership: c.clubMembership,
                createdAt: c.createdAt,
                type: 'user',
                isFamily: false
            }));

            const familiesList = (familiesRes.data || []).map(f => ({
                id: f._id,
                _id: f._id,
                name: f.name,
                memberCount: f.memberIds.length,
                type: 'family',
                isFamily: true
            }));

            // Combine and sort
            const unified = [...familiesList, ...climbersList].sort((a, b) => a.name.localeCompare(b.name));
            setClients(unified);
            setClimbers(climbersList); // Keep raw climbers if needed elsewhere

        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    };

    const handleClimberSelect = (e) => {
        const id = e.target.value;
        setSelectedClimberId(id);
        if (id) {
            const client = clients.find(c => c.id === id);
            setSelectedClimberName(client ? client.name : '');
        } else {
            setSelectedClimberName('');
        }
    };

    const handleClearClimberSelection = () => {
        setSelectedClimberId('');
        setSelectedClimberName('');
        setClimberDetails({ isMember: false, activePass: null, lastPass: null, loaded: false });
        setCardCode('');
        setCardScanError('');
    };

    // Handle card code input change
    const handleCardCodeChange = (e) => {
        const value = e.target.value.trim();
        // Only allow digits
        const digitsOnly = value.replace(/\D/g, '');
        // Limit to 6 digits
        const limited = digitsOnly.slice(0, 6);
        setCardCode(limited);
        setCardScanError('');
    };

    // Handle card code scan/search
    useEffect(() => {
        const searchByCardCode = async () => {
            if (!cardCode || cardCode.length !== 6) {
                return;
            }

            setIsLoadingCardScan(true);
            setCardScanError('');

            try {
                const response = await gymAPI.findClimberByCardCode(cardCode);
                const { userId, familyId, clientInfo } = response.data;

                if (userId || familyId) {
                    // Set the selected climber
                    setSelectedClimberId(userId || familyId);
                    if (clientInfo) {
                        setSelectedClimberName(clientInfo.name);
                    }
                    // Clear card code after successful scan
                    setCardCode('');
                } else {
                    setCardScanError('Катерач не е намерен');
                }
            } catch (error) {
                console.error('Error finding climber by card code:', error);
                const errorMessage = error.response?.data?.error?.message || 'Картата не е намерена или не е активна';
                setCardScanError(errorMessage);
            } finally {
                setIsLoadingCardScan(false);
            }
        };

        // Debounce: wait 300ms after user stops typing
        const timeoutId = setTimeout(() => {
            if (cardCode.length === 6) {
                searchByCardCode();
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [cardCode]);

    // Auto-focus card scanner input on mount
    useEffect(() => {
        if (cardScannerInputRef.current) {
            cardScannerInputRef.current.focus();
        }
    }, []);

    // Fetch details when climber is selected
    useEffect(() => {
        const fetchClimberDetails = async () => {
            if (!selectedClimberId) {
                setClimberDetails({ isMember: false, activePass: null, lastPass: null, loaded: false });
                return;
            }

            setIsLoadingDetails(true);
            try {
                // 1. Get Client Details
                const client = clients.find(c => c.id === selectedClimberId);
                let isMember = false;

                if (client?.type === 'user') {
                    isMember = client?.clubMembership?.isActive || false;
                }

                // Query params for passes
                const query = { limit: 5, sort: '-validUntil' };
                if (client?.type === 'family') {
                    query.familyId = selectedClimberId;
                    // query.userId = undefined; // Not needed if we don't send it
                } else {
                    query.userId = selectedClimberId;
                }

                // 2. Get Passes History
                const passesRes = await gymAPI.getAllPasses(query);
                const passes = passesRes.data.passes || [];

                // Determine Active Pass
                const now = new Date();
                const activePass = passes.find(p => {
                    const validUntil = new Date(p.validUntil);
                    return validUntil >= now && (p.remainingEntries === null || p.remainingEntries === undefined || p.remainingEntries > 0);
                });

                // Determine Last Pass (first expired one if no active, or just the most recent one that isn't the active one)
                let lastPass = null;
                if (!activePass && passes.length > 0) {
                    lastPass = passes[0];
                } else if (activePass && passes.length > 1) {
                    lastPass = passes.find(p => p._id !== activePass._id);
                }

                setClimberDetails({
                    isMember,
                    activePass: activePass ? {
                        id: activePass._id,
                        name: activePass.name,
                        validUntil: new Date(activePass.validUntil).toLocaleDateString('bg-BG'),
                        remaining: activePass.remainingEntries,
                        type: activePass.type
                    } : null,
                    lastPass: lastPass ? {
                        name: lastPass.name,
                        validUntil: new Date(lastPass.validUntil).toLocaleDateString('bg-BG')
                    } : null,
                    loaded: true
                });

            } catch (error) {
                console.error('Error fetching climber details:', error);
            } finally {
                setIsLoadingDetails(false);
            }
        };

        fetchClimberDetails();
    }, [selectedClimberId, clients]);

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [pricingRes, productsRes, visitsRes] = await Promise.all([
                    gymAPI.getAllPricing({ isActive: true }),
                    productsAPI.getAll({ isActive: true }),
                    gymAPI.getTodaysVisits ? gymAPI.getTodaysVisits() : { data: { count: 0, visits: [] } },
                    // gymAPI.getAllPasses moved to separate effect
                ]);

                // Initial clients fetch
                await fetchClients();

                // Pricing
                const pricingData = (pricingRes.data.pricing || []).map(p => ({
                    id: p._id,
                    name: p.labelBg,
                    price: p.amount,
                    type: p.category,
                    duration: p.validityDays,
                    visitsIncluded: p.maxEntries,
                    pricingId: p._id
                }));
                setPrices(pricingData);
                setApiPricing(pricingRes.data.pricing || []); // Store original for modal

                // Products
                const productsData = productsRes.data.products || productsRes.data;
                const productsArray = Array.isArray(productsData) ? productsData : (productsData.products || []);
                setProducts(productsArray.map(p => ({
                    id: p._id,
                    name: p.name,
                    price: p.price,
                    image: productsAPI.getImageUrl(p.imageUrl),
                    description: p.description,
                    stock: p.stockQuantity
                })));

                // Stats
                setStats({
                    dailyVisits: visitsRes.data?.count || 0,
                    activeCards: 0 // Will be updated if we fetch stats separately, but for now we might miss total active count if we don't fetch it.
                    // Actually, let's keep the count? 
                    // passesRes above gave us pagination.total.
                    // Since we removed passesRes, we lose the total active count.
                    // We should probably fetch it separately or keep a lightweight call.
                });

                // Let's do a separate lightweight call for stats if needed, or just leave it 0/loaded asynchronously?
                // The widget "ActiveCards" (StatsCard) uses stats.activeCards.
                // We should probably fetch the count of ACTIVE cards regardless of the filter.

                try {
                    const activeCountRes = await gymAPI.getAllPasses({ isActive: true, limit: 1 });
                    setStats(prev => ({
                        ...prev,
                        activeCards: activeCountRes.data?.pagination?.total || 0
                    }));
                } catch (e) { console.error(e); }

                // Recent Visits
                setRecentVisits((visitsRes.data?.visits || []).map(v => ({
                    id: v._id,
                    climberName: v.userId ? `${v.userId.firstName} ${v.userId.lastName}` : (v.familyId ? v.familyId.name : 'Гост'),
                    time: new Date(v.checkInTime).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' }),
                    type: v.type === 'single' ? 'Еднократно' : 'Карта',
                    rawType: v.type, // 'single' or 'pass' for filtering
                    rawDate: new Date(v.checkInTime) // For sorting
                })));

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // Fetch cards based on filter
    useEffect(() => {
        const fetchCards = async () => {
            try {
                const query = { limit: 5 };

                if (cardFilter === 'last_created') {
                    query.sort = '-createdAt';
                    // query.isActive = true; // Show all created? Or just active? "Last Cards" usually implies recent additions.
                } else if (cardFilter === 'expiring') {
                    query.sort = 'validUntil';
                    query.isActive = true;
                    // Ideally we'd filter for future dates too, but isActive=true usually implies it.
                    // If we want strictly "soonest to expire", sorting asc by validUntil is correct for active cards.
                } else if (cardFilter === 'expired') {
                    query.sort = '-validUntil'; // Show most recently expired
                    query.isActive = false;
                    // Note: This relies on cards being marked inactive when expired or explicitly fetching inactive ones.
                }

                const passesRes = await gymAPI.getAllPasses(query);

                setCards((passesRes.data?.passes || []).map(p => ({
                    id: p._id,
                    climberName: p.userId
                        ? `${p.userId.firstName} ${p.userId.lastName}`
                        : (p.familyId ? `${p.familyId.name}` : 'Неизвестен'),
                    type: p.name,
                    expiryDate: new Date(p.validUntil),
                    createdAt: p.createdAt,
                    remainingVisits: p.type === 'time_based' ? null : p.remainingEntries
                })));
            } catch (error) {
                console.error('Error fetching cards:', error);
            }
        };

        fetchCards();
    }, [cardFilter]);

    // Empty cart initially
    const [cartItems, setCartItems] = useState([]);

    const cartTotal = cartItems.reduce((sum, item) => sum + item.quantity * item.price, 0);

    // Cart unsaved changes warning
    const { UnsavedChangesModal } = useUnsavedChangesWarning({
        hasChanges: () => cartItems.length > 0,
        message: "Имате незавършена продажба с продукти в кошницата. Промените няма да бъдат запазени."
    });



    // Sticky cart scroll behavior
    useEffect(() => {
        const handleScroll = () => {
            if (!cartRef.current || !productsRef.current || !cartContainerRef.current) return;

            const cartElement = cartRef.current;
            const productsElement = productsRef.current;
            const stickyTopOffset = 32; // Top offset when sticky (2rem = 32px)
            const gap = 24; // Gap between cart and products (1.5rem = 24px)

            const cartHeight = cartElement.offsetHeight;
            const productsRect = productsElement.getBoundingClientRect();

            // Calculate where the cart bottom would be if it's sticky
            const cartBottomIfSticky = stickyTopOffset + cartHeight;

            // Check if cart would overlap with products section
            if (cartBottomIfSticky >= productsRect.top - gap) {
                // Cart is reaching products - calculate absolute position to stop it
                const scrollY = window.scrollY;
                const productsTopFromDocument = productsRect.top + scrollY;
                const maxCartBottom = productsTopFromDocument - gap;
                const absoluteTop = maxCartBottom - cartHeight;

                setCartStyle({
                    position: 'absolute',
                    top: `${absoluteTop}px`,
                    left: 0,
                    right: 0
                });
            } else {
                // Cart is free to be sticky
                setCartStyle({
                    position: 'sticky',
                    top: `${stickyTopOffset}px`
                });
            }
        };

        // Reset and recalculate on resize
        const handleResize = () => {
            handleScroll();
        };

        window.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleResize);
        handleScroll(); // Initial check

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const handleRemoveCartItem = (id) => {
        setCartItems(items => items.filter(item => item.id !== id));
    };

    const handleFinalizeCart = () => {
        if (cartItems.length === 0) {
            alert('Кошницата е празна!');
            return;
        }
        setIsPaymentModalOpen(true);
    };

    // Card direct sale handler
    const handleDirectCardSale = async (cardData) => {
        try {
            console.log('Processing direct card sale:', cardData);

            const saleData = {
                items: [{
                    type: 'pass',
                    name: prices.find(p => p.id === cardData.pricingId)?.name || 'Карта',
                    price: cardData.amount,
                    quantity: 1,
                    userId: cardData.userId,
                    familyId: cardData.familyId || null,
                    isFamilyPass: cardData.isFamilyPass || false,
                    pricingId: cardData.pricingId,
                    totalEntries: cardData.totalEntries,
                    validFrom: cardData.validFrom,
                    validUntil: cardData.validUntil
                }],
                amountPaid: cardData.amount,
                currency: 'EUR'
            };

            await processSale(saleData);

            // Refresh data
            setStats(prev => ({ ...prev, activeCards: prev.activeCards + 1 }));

            // Find climber or family name for the toast
            let clientName = 'Клиент';
            if (cardData.familyId) {
                const family = clients.find(c => c.id === cardData.familyId);
                clientName = family ? family.name : 'Семейство';
            } else if (cardData.userId) {
                const climber = clients.find(c => c.id === cardData.userId);
                clientName = climber ? climber.name : 'Катерач';
            }

            showToast(`Картата е създадена успешно - ${clientName}`, 'success');
        } catch (error) {
            console.error('Error processing card sale:', error);
            showToast(`Грешка при продажба на картата: ${error.response?.data?.message || error.message}`, 'error');
        }
    };

    // Card add to cart handler
    const handleAddCardToCart = async (cardData) => {
        try {
            console.log('Adding card to cart:', cardData);

            const pricingItem = prices.find(p => p.id === cardData.pricingId);
            const cartItem = {
                id: Date.now(),
                productName: `Карта: ${pricingItem?.name || 'Неизвестна'}`,
                quantity: 1,
                price: cardData.amount,
                source: 'card',
                pricingId: cardData.pricingId,
                userId: cardData.userId,
                familyId: cardData.familyId || null,
                isFamilyPass: cardData.isFamilyPass || false,
                type: 'pass',
                totalEntries: cardData.totalEntries,
                remainingEntries: cardData.remainingEntries,
                validFrom: cardData.validFrom,
                validUntil: cardData.validUntil
            };
            setCartItems(prev => [...prev, cartItem]);
        } catch (error) {
            console.error('Error adding card to cart:', error);
            // alert(`Грешка при добавяне на картата: ${error.message}`);
            showToast(`Грешка при добавяне на картата: ${error.message}`, 'error');
        }
    };

    // Single visit handlers
    const handleAddSingleVisit = () => {
        // Priority check for the correct backend key
        const visitPrice = prices.find(p => p.type === 'gym_single_visit');

        if (!visitPrice) {
            // Fallbacks for backward compatibility or alternative naming
            const alternativeVisitPrice = prices.find(p =>
                p.type === 'single_visit' ||
                p.type === 'visit' ||
                p.type === 'single' ||
                p.type === 'day_pass' ||
                (p.name && p.name.toLowerCase().includes('еднократно'))
            );

            if (!alternativeVisitPrice) {
                // alert('Грешка: Не е намерена цена за еднократно посещение (gym_single_visit). Моля, добавете ценова категория за посещения в админ панела.');
                showToast('Грешка: Не е намерена цена за еднократно посещение (gym_single_visit).', 'error');
                return;
            }
            setSelectedItem(alternativeVisitPrice);
        } else {
            setSelectedItem(visitPrice);
        }

        setSaleActionType('visit');
        setIsSaleActionModalOpen(true);
    };

    const handleDirectVisitSale = async (item, quantity = 1, extraData = {}) => {
        try {
            const { userId, climberName } = extraData;

            // Check if userId is actually a familyId (from our clients list)
            const client = clients.find(c => c.id === userId);
            const isFamily = client?.type === 'family';

            const saleData = {
                items: [{
                    type: 'visit',
                    name: item.name,
                    price: item.price,
                    quantity: quantity,
                    pricingId: item._id || item.pricingId,
                    userId: isFamily ? null : (userId || null),
                    familyId: isFamily ? userId : null
                }],
                amountPaid: item.price * quantity,
                currency: 'EUR'
            };

            await processSale(saleData);

            setStats(prev => ({ ...prev, dailyVisits: prev.dailyVisits + quantity }));
            // alert(`${quantity} посещение(я) за ${climberName || 'гост'} записано(и) успешно!`);
            showToast(`${quantity} посещение(я) за ${climberName || 'гост'} записано(и) успешно!`, 'success');
        } catch (error) {
            console.error('Error recording visit:', error);
            // alert(`Грешка при записване на посещението: ${error.response?.data?.message || 'Server error'}`);
            showToast(`Грешка при записване на посещението: ${error.response?.data?.message || 'Server error'}`, 'error');
        }
    };

    const handleAddVisitToCart = (item, quantity = 1, extraData = {}) => {
        console.log('handleAddVisitToCart called with:', item, quantity, extraData);
        const { userId, climberName } = extraData;

        // Check if userId is actually a familyId (from our clients list)
        const client = clients.find(c => c.id === userId);
        const isFamily = client?.type === 'family';

        const newItem = {
            id: Date.now(),
            productName: item.name,
            quantity: quantity,
            price: item.price,
            source: 'single-visit',
            pricingId: item._id || item.pricingId, // Fix: Pricing objects use _id
            type: 'visit',
            userId: isFamily ? null : (userId || null),
            familyId: isFamily ? userId : null,
            climberName: climberName || 'Гост'
        };
        console.log('Adding item to cart:', newItem);
        setCartItems(prev => {
            const updated = [...prev, newItem];
            console.log('Updated cart items:', updated);
            return updated;
        });
    };

    // Product handlers
    const handleProductClick = (product) => {
        setSelectedItem(product);
        setSaleActionType('product');
        setIsSaleActionModalOpen(true);
    };

    const handleDirectProductSale = async (product, quantity = 1) => {
        try {
            const saleData = {
                items: [{
                    type: 'product',
                    name: product.name,
                    price: product.price,
                    quantity: quantity,
                    productId: product.id
                }],
                amountPaid: product.price * quantity,
                currency: 'EUR'
            };

            await processSale(saleData);

            showToast(`${quantity} x ${product.name} добавен(и) успешно!`, 'success');
        } catch (error) {
            console.error('Error selling product:', error);
            showToast(`Грешка при продажбата на продукт: ${error.response?.data?.message || error.message}`, 'error');
        }
    };

    const handleAddProductToCart = (product, quantity = 1) => {
        const newItem = {
            id: Date.now(),
            productName: product.name,
            quantity: quantity,
            price: product.price,
            source: 'product',
            productId: product.id,
            type: 'product'
        };
        setCartItems(prev => [...prev, newItem]);
    };

    const handlePaymentConfirm = async (paymentData) => {
        setIsProcessingSale(true);

        try {
            const saleData = {
                items: cartItems.map(item => ({
                    type: item.type,
                    name: item.productName || item.climberName,
                    quantity: item.quantity,
                    price: item.price,
                    totalEntries: item.totalEntries || null,
                    remainingEntries: item.totalEntries || null,
                    userId: item.userId || null,
                    familyId: item.familyId || null,
                    isFamilyPass: item.isFamilyPass || false,
                    productId: item.productId || null,
                    pricingId: item.pricingId || null,
                    validFrom: item.validFrom || null,
                    validUntil: item.validUntil || null
                })),
                currency: paymentData.currency,
                amountPaid: paymentData.amountPaid
            };

            const result = await processSale(saleData);

            setCartItems([]);
            setIsPaymentModalOpen(false);

            showToast(`Продажбата е успешна! Общо: ${result.payment.totalEUR.toFixed(2)} €`, 'success');

        } catch (error) {
            console.error('Sale processing error:', error);
            showToast(`Грешка при продажбата: ${error.response?.data?.error || error.message}`, 'error');
        } finally {
            setIsProcessingSale(false);
        }
    };

    // Check In Handler
    const handleCheckIn = async () => {
        if (!climberDetails.activePass) return;

        const client = clients.find(c => c.id === selectedClimberId);
        const isFamily = client?.isFamily;

        try {
            await gymAPI.checkIn({
                userId: isFamily ? null : selectedClimberId,
                familyId: isFamily ? selectedClimberId : null,
                type: 'pass',
                gymPassId: climberDetails.activePass.id
            });

            showToast('Успешно чекиране!', 'success');

            // Refresh visits and stats
            const visitsRes = await gymAPI.getTodaysVisits();
            setStats(prev => ({
                ...prev,
                dailyVisits: visitsRes.data?.count || 0
            }));

            // Updating local state for remaining entries if applicable
            if (climberDetails.activePass.remaining !== null && climberDetails.activePass.remaining !== undefined) {
                setClimberDetails(prev => ({
                    ...prev,
                    activePass: {
                        ...prev.activePass,
                        remaining: prev.activePass.remaining - 1
                    }
                }));
            }

            // Update recent visits list
            setRecentVisits((visitsRes.data?.visits || []).map(v => ({
                id: v._id,
                climberName: v.userId ? `${v.userId.firstName} ${v.userId.lastName}` : (v.familyId ? v.familyId.name : 'Гост'),
                time: new Date(v.checkInTime).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' }),
                type: v.type === 'single' ? 'Еднократно' : 'Карта',
                rawType: v.type,
                rawDate: new Date(v.checkInTime)
            })));

        } catch (error) {
            console.error('Check-in error:', error);
            showToast(`Грешка при чекиране: ${error.response?.data?.error?.message || error.message}`, 'error');
        }
    };

    // Filter and limit recent visits
    const filteredVisits = recentVisits
        .filter(visit => {
            if (visitFilter === 'single') return visit.rawType === 'single';
            if (visitFilter === 'card') return visit.rawType !== 'single';
            return true; // 'all'
        })
        .sort((a, b) => b.rawDate - a.rawDate) // Newest first
        .slice(0, 10); // Limit to 10

    return (
        <div className="space-y-6 pb-12">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-medium text-neutral-950">Табло</h1>
            </div>

            {/* Global Climber Selector - Compact Layout */}
            <Card className="p-3">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Card Scanner */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-neutral-950 whitespace-nowrap">
                            Карта:
                        </label>
                        <div className="relative">
                            <input
                                ref={cardScannerInputRef}
                                type="text"
                                value={cardCode}
                                onChange={handleCardCodeChange}
                                placeholder="Сканирай карта..."
                                maxLength={6}
                                className={`px-3 py-1.5 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950 w-32 font-mono ${
                                    cardScanError ? 'border-red-500' : ''
                                } ${isLoadingCardScan ? 'opacity-50' : ''}`}
                                disabled={isLoadingCardScan}
                            />
                            {isLoadingCardScan && (
                                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#ea7a24]"></div>
                                </div>
                            )}
                        </div>
                        {cardScanError && (
                            <span className="text-xs text-red-600 whitespace-nowrap">{cardScanError}</span>
                        )}
                    </div>

                    {/* Selector */}
                    <div className="flex items-center gap-2 min-w-[200px]">
                        <label className="text-sm font-medium text-neutral-950 whitespace-nowrap">
                            Катерач:
                        </label>
                        <select
                            value={selectedClimberId}
                            onChange={handleClimberSelect}
                            className="px-3 py-1.5 bg-[#f3f3f5] border border-[#d1d5dc] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#ea7a24]/20 focus:border-[#ea7a24] text-sm text-neutral-950 min-w-[180px]"
                        >
                            <option value="">Гост</option>
                            {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                    {client.isFamily ? `${client.name}` : client.name}
                                </option>
                            ))}
                        </select>
                        {selectedClimberId && (
                            <button
                                onClick={handleClearClimberSelection}
                                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                                title="Изчисти избора"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Climber Details - Inline */}
                    {selectedClimberId && climberDetails.loaded && (
                        <div className="flex items-center gap-4 text-sm border-l border-gray-200 pl-4">
                            <span className={`${climberDetails.isMember ? 'text-green-600' : 'text-gray-500'}`}>
                                <span className="text-gray-400">Член:</span> {climberDetails.isMember ? 'Да' : 'Не'}
                            </span>
                            <span className={`${climberDetails.activePass ? 'text-green-600' : 'text-gray-500'}`}>
                                <span className="text-gray-400">Карта:</span> {climberDetails.activePass ? `${climberDetails.activePass.name} (до ${climberDetails.activePass.validUntil})` : 'Няма'}
                            </span>

                            {climberDetails.activePass && (climberDetails.activePass.remaining !== null && climberDetails.activePass.remaining !== undefined) && (
                                <span className="text-orange-600 font-medium">
                                    <span className="text-gray-400 font-normal">Оставащи:</span> {climberDetails.activePass.remaining}
                                </span>
                            )}

                            {climberDetails.activePass && (
                                <button
                                    onClick={handleCheckIn}
                                    className="ml-2 px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors shadow-sm"
                                >
                                    Чекирай
                                </button>
                            )}

                            {!climberDetails.activePass && climberDetails.lastPass && (
                                <span className="text-gray-500">
                                    <span className="text-gray-400">Последна:</span> {climberDetails.lastPass.name} (изт. {climberDetails.lastPass.validUntil})
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </Card>

            {/* Main Content - 3 Equal Column Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Column 1: Single Visits Stats + Current Sale Items */}
                <div className="space-y-4">
                    <StatsCard
                        title="Единични посещения днес"
                        value={stats.dailyVisits}
                        action={handleAddSingleVisit}
                        actionLabel="+ Посещение"
                        variant="green"
                    />

                    <Card className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base font-medium text-neutral-950">Последни посещения</h3>
                            <select
                                value={visitFilter}
                                onChange={(e) => setVisitFilter(e.target.value)}
                                className="bg-[#f3f3f5] border-none text-sm rounded-[6px] py-1.5 px-3 text-[#4a5565] focus:ring-0"
                            >
                                <option value="all">Всички</option>
                                <option value="card">С карта</option>
                                <option value="single">Единични</option>
                            </select>
                        </div>
                        <div className="space-y-3">
                            {filteredVisits.map((visit) => (
                                <div key={visit.id} className="flex items-center justify-between border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                                    <p className="text-sm font-medium text-neutral-950">{visit.climberName}</p>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs px-2 py-0.5 rounded-[4px] ${visit.rawType === 'single'
                                            ? 'bg-[#fefce8] text-[#adb933]'
                                            : 'bg-[#fff7ed] text-[#ea7a24]'
                                            }`}>
                                            {visit.type}
                                        </span>
                                        <p className="text-xs text-[#9ca3af]">{visit.time}</p>
                                    </div>
                                </div>
                            ))}
                            {filteredVisits.length === 0 && (
                                <p className="text-sm text-gray-400 text-center py-4">Няма посещения</p>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Column 2: Active Cards + Current Sale Items */}
                <div className="space-y-4">
                    <StatsCard
                        title="Активни карти"
                        value={stats.activeCards}
                        action={() => setIsAddCardModalOpen(true)}
                        actionLabel="+ Нова карта"
                        variant="orange"
                    />

                    <ActiveCardsWidget
                        cards={cards}
                        onAddCard={() => setIsAddCardModalOpen(true)}
                        filter={cardFilter}
                        onFilterChange={setCardFilter}
                    />

                </div>


                {/* Column 3: Sticky Cart with advanced scroll behavior */}
                <div ref={cartContainerRef}>
                    <div
                        ref={cartRef}
                        style={cartStyle}
                    >
                        <StickyCartWidget
                            items={cartItems}
                            total={cartTotal}
                            onFinalize={handleFinalizeCart}
                            onRemoveItem={handleRemoveCartItem}
                        />
                    </div>
                </div>
            </div>

            {/* Bottom Section: Climbers & Products - 2 Equal Columns */}
            <div ref={productsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Climbers Table */}
                <ClimbersTableWidget
                    climbers={climbers}
                    onAddClimber={() => setIsAddClimberModalOpen(true)}
                    onEditClimber={(climber) => {
                        setEditingClimber(climber);
                        setIsEditClimberModalOpen(true);
                    }}
                />

                {/* Products Section */}
                <ProductsWidget
                    products={products}
                    onProductClick={handleProductClick}
                />
            </div>

            {/* Modals */}
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                items={cartItems}
                totalEUR={cartTotal}
                onConfirm={handlePaymentConfirm}
            />

            <CreatePassModal
                isOpen={isAddCardModalOpen}
                onClose={() => setIsAddCardModalOpen(false)}
                mode="gym"
                actionType="sale"
                pricing={apiPricing.filter(p => p.category === 'gym_pass')}
                onDirectSale={handleDirectCardSale}
                onAddToCart={handleAddCardToCart}
                preSelectedClimberId={selectedClimberId}
            />

            <SaleActionModal
                isOpen={isSaleActionModalOpen}
                onClose={() => setIsSaleActionModalOpen(false)}
                onDirectSale={saleActionType === 'visit' ? handleDirectVisitSale : handleDirectProductSale}
                onAddToCart={saleActionType === 'visit' ? handleAddVisitToCart : handleAddProductToCart}
                item={selectedItem}
                type={saleActionType}
                preSelectedClimberId={selectedClimberId}
            />

            <AddClimberModal
                isOpen={isAddClimberModalOpen}
                onClose={() => setIsAddClimberModalOpen(false)}
                onSuccess={fetchClients}
            />

            <EditClimberModal
                isOpen={isEditClimberModalOpen}
                onClose={() => {
                    setIsEditClimberModalOpen(false);
                    setEditingClimber(null);
                }}
                user={editingClimber}
                onSuccess={fetchClients}
            />

            {/* Cart Unsaved Changes Warning */}
            <UnsavedChangesModal />

            {/* Toast Notifications */}</div >
    );
};

export default GymDashboard;
