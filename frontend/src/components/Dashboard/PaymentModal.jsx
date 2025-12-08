import React, { useState, useEffect } from 'react';
import BaseModal from '../UI/BaseModal';
import { formatCurrency, convertEURtoBGN, convertBGNtoEUR } from '../../utils/currencyUtils';

const PaymentModal = ({ isOpen, onClose, items = [], totalEUR = 0, onConfirm }) => {
    const [amountPaidEUR, setAmountPaidEUR] = useState('');
    const [amountPaidBGN, setAmountPaidBGN] = useState('');
    const [changeEUR, setChangeEUR] = useState(0);
    const [changeBGN, setChangeBGN] = useState(0);
    const [lastEditedCurrency, setLastEditedCurrency] = useState(null);

    // Calculate total in BGN
    const totalBGN = convertEURtoBGN(totalEUR);

    // Update change calculation when amount paid changes
    useEffect(() => {
        let paidInEUR = 0;

        if (amountPaidEUR && parseFloat(amountPaidEUR) > 0) {
            paidInEUR += parseFloat(amountPaidEUR);
        }
        if (amountPaidBGN && parseFloat(amountPaidBGN) > 0) {
            paidInEUR += convertBGNtoEUR(parseFloat(amountPaidBGN));
        }

        const calculatedChangeEUR = paidInEUR - totalEUR;
        const calculatedChangeBGN = convertEURtoBGN(calculatedChangeEUR);

        setChangeEUR(parseFloat(calculatedChangeEUR.toFixed(2)));
        setChangeBGN(parseFloat(calculatedChangeBGN.toFixed(2)));
    }, [amountPaidEUR, amountPaidBGN, totalEUR]);

    const handleConfirm = () => {
        const totalPaidEUR = (parseFloat(amountPaidEUR) || 0) + convertBGNtoEUR(parseFloat(amountPaidBGN) || 0);

        // Validation removed as per request of the user

        onConfirm({
            currency: lastEditedCurrency || 'EUR',
            amountPaid: totalPaidEUR,
            amountPaidEUR: parseFloat(amountPaidEUR) || 0,
            amountPaidBGN: parseFloat(amountPaidBGN) || 0,
            change: changeEUR,
            changeEUR,
            changeBGN,
            totalEUR,
            totalBGN
        });
    };

    const handleClose = () => {
        setAmountPaidEUR('');
        setAmountPaidBGN('');
        setChangeEUR(0);
        setChangeBGN(0);
        setLastEditedCurrency(null);
        onClose();
    };

    // Set exact amount as default in EUR
    const handleSetExactAmountEUR = () => {
        setAmountPaidEUR(totalEUR.toFixed(2));
        setAmountPaidBGN('');
        setLastEditedCurrency('EUR');
    };

    // Set exact amount as default in BGN
    const handleSetExactAmountBGN = () => {
        setAmountPaidBGN(totalBGN.toFixed(2));
        setAmountPaidEUR('');
        setLastEditedCurrency('BGN');
    };

    const handleEURChange = (e) => {
        setAmountPaidEUR(e.target.value);
        setLastEditedCurrency('EUR');
    };

    const handleBGNChange = (e) => {
        setAmountPaidBGN(e.target.value);
        setLastEditedCurrency('BGN');
    };

    return (
        <BaseModal isOpen={isOpen} onClose={handleClose} title="Финализиране на продажба">
            <div className="space-y-3">
                {/* Cart Summary */}
                <div className="bg-gray-50 rounded-lg p-3">
                    <h4 className="text-xs font-medium text-neutral-950 mb-2">Артикули в кошницата</h4>
                    <div className="space-y-1">
                        {items.map((item, index) => (
                            <div key={index} className="flex justify-between text-xs">
                                <span className="text-gray-600">
                                    {item.climberName} - {item.productName} (x{item.quantity})
                                </span>
                                <span className="font-medium text-neutral-950">
                                    {formatCurrency(item.price * item.quantity, 'EUR')}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Total Amount Display - EUR and BGN centered */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                    <div className="text-xs font-medium text-neutral-950 mb-1">Обща сума за плащане:</div>
                    <div className="flex justify-center gap-6">
                        <span className="text-sm font-bold text-[#ea7a24]">{formatCurrency(totalEUR, 'EUR')}</span>
                        <span className="text-sm font-bold text-[#ea7a24]">{formatCurrency(totalBGN, 'BGN')}</span>
                    </div>
                </div>

                {/* Paid Amount Inputs - EUR and BGN centered and narrow */}
                <div className="text-center">
                    <label className="block text-xs font-medium text-neutral-950 mb-2">
                        Платена сума:
                    </label>
                    <div className="flex justify-center gap-4">
                        <div className="w-28">
                            <div className="flex gap-1 items-center">
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={amountPaidEUR}
                                    onChange={handleEURChange}
                                    placeholder="0.00"
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#ea7a24] focus:border-transparent text-center"
                                />
                                <span className="text-xs font-medium text-gray-500">€</span>
                            </div>
                            <button
                                onClick={handleSetExactAmountEUR}
                                className="w-full mt-1 px-1 py-0.5 bg-gray-100 hover:bg-gray-200 text-xs text-neutral-950 rounded transition-colors"
                            >
                                Точна сума
                            </button>
                        </div>
                        <div className="w-28">
                            <div className="flex gap-1 items-center">
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={amountPaidBGN}
                                    onChange={handleBGNChange}
                                    placeholder="0.00"
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#ea7a24] focus:border-transparent text-center"
                                />
                                <span className="text-xs font-medium text-gray-500">лв</span>
                            </div>
                            <button
                                onClick={handleSetExactAmountBGN}
                                className="w-full mt-1 px-1 py-0.5 bg-gray-100 hover:bg-gray-200 text-xs text-neutral-950 rounded transition-colors"
                            >
                                Точна сума
                            </button>
                        </div>
                    </div>
                </div>

                {/* Change Display - EUR and BGN centered - Always Green/Neutral */}
                <div className="border rounded-lg p-3 text-center bg-green-50 border-green-200">
                    <div className="text-xs font-medium mb-1 text-green-900">
                        Ресто:
                    </div>
                    <div className="flex justify-center gap-6">
                        <span className="text-sm font-bold text-green-700">
                            {formatCurrency(changeEUR, 'EUR')}
                        </span>
                        <span className="text-sm font-bold text-green-700">
                            {formatCurrency(changeBGN, 'BGN')}
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4">
                    <button
                        onClick={handleClose}
                        className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium text-neutral-950 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Отказ
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 px-4 py-2 bg-[#ea7a24] hover:bg-[#d96a1a] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Потвърди плащане
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};

export default PaymentModal;
