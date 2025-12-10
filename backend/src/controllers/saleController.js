import { GymPass } from '../models/gymPass.js';
import { GymVisit } from '../models/gymVisit.js';
import { FinanceEntry } from '../models/financeEntry.js';
import { FinanceTransaction } from '../models/financeTransaction.js';
import { Pricing } from '../models/pricing.js';
import { Product } from '../models/product.js';
import { Family } from '../models/family.js';
import mongoose from 'mongoose';
import * as auditService from '../services/auditService.js';
import * as physicalCardService from '../services/physicalCardService.js';

/**
 * Process a sale transaction with multiple items (visits, passes, products)
 * Creates a parent FinanceTransaction and child FinanceEntry records.
 * Supports EUR only.
 * 
 * NOTE: Transaction logic (startSession) is intentionally OMITTED for standalone MongoDB compatibility.
 * Operations are performed sequentially.
 */
export const processSale = async (req, res) => {
    try {
        console.log('Processing sale payload:', JSON.stringify(req.body, null, 2));

        const { items, amountPaid } = req.body;
        // User ID from token: support both 'id' and '_id'
        const userId = req.user?.id || req.user?._id;

        if (!userId) {
            throw new Error('Authenticated user ID is missing. Cannot link sale to staff.');
        }

        // Validate request
        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new Error('Items array is required and must not be empty');
        }

        const createdRecords = {
            transaction: null,
            passes: [],
            visits: [],
            financeEntries: [],
            productUpdates: []
        };

        let totalAmountEUR = 0;

        // First pass: Validate all items and calc total
        for (const item of items) {
            // Validate Item
            if (!item.type || item.price === undefined || !item.quantity) {
                throw new Error(`Invalid item data: missing type, price, or quantity. Item: ${JSON.stringify(item)}`);
            }

            // Calculate total (all prices are in EUR)
            totalAmountEUR += Number(item.price) * Number(item.quantity);

            // Check product validity
            if (item.type === 'product' && item.productId) {
                const product = await Product.findById(item.productId);
                if (!product) {
                    throw new Error(`Product not found: ${item.name || item.productId}`);
                }
                if (!product.isActive) {
                    throw new Error(`Product is inactive: ${product.name}`);
                }
            }
        }

        // Extract payerClimberId from items (if all items have the same userId, use it)
        // This links the transaction to the climber making the purchase
        let payerClimberId = null;
        const userIds = items
            .map(item => item.userId)
            .filter(userId => userId && userId.trim() !== ''); // Filter out null, undefined, and empty strings

        // If all items are for the same user, set payerClimberId
        if (userIds.length > 0) {
            const uniqueUserIds = [...new Set(userIds)];
            if (uniqueUserIds.length === 1) {
                payerClimberId = uniqueUserIds[0];
            }
            // If mixed users in one transaction, we leave payerClimberId null
            // Transaction is still recorded, but not linked to a specific climber
        }

        // Feature: For family passes, set payerClimberId to the first family member
        // This ensures the transaction has a "Client" listed in finance entries
        if (!payerClimberId) {
            const familyItem = items.find(i => i.familyId);
            if (familyItem && familyItem.familyId) {
                const family = await Family.findById(familyItem.familyId);
                if (family && family.memberIds && family.memberIds.length > 0) {
                    payerClimberId = family.memberIds[0];
                }
            }
        }

        // Create Parent Transaction
        const transaction = new FinanceTransaction({
            totalAmount: totalAmountEUR,
            paymentMethod: 'cash', // Default to cash for now
            paidAt: new Date(),
            handledById: userId,
            payerClimberId: payerClimberId, // Now properly set from items
            source: 'gym', // Simplified logic, could be 'mixed'
        });
        await transaction.save();
        createdRecords.transaction = transaction;

        // Second pass: Process each item
        for (const item of items) {
            // Validate item.userId specifically for logic that needs it
            // Convert empty string to null for proper family pass handling
            const itemUserId = (item.userId && item.userId.trim() !== '') ? item.userId : null;
            const quantity = parseInt(item.quantity) || 1;
            const unitPrice = Number(item.price);
            const lineTotal = unitPrice * quantity;

            // Common FinanceEntry data
            const entryData = {
                transactionId: transaction._id,
                area: 'gym',
                type: 'revenue',
                itemType: mapItemType(item.type),
                pricingCode: null,
                quantity: quantity,
                unitAmount: unitPrice,
                totalAmount: lineTotal,
                climberId: itemUserId,
                description: `Sale: ${item.name} ${quantity > 1 ? 'x' + quantity : ''}`,
                createdById: userId,
                date: transaction.paidAt,
            };

            if (item.type === 'pass') {
                if (!itemUserId && !item.familyId) {
                    throw new Error('User ID OR Family ID is required for pass purchase');
                }

                const pricing = await Pricing.findById(item.pricingId);
                if (!pricing) throw new Error(`Pricing not found for pass: ${item.name}`);

                entryData.pricingCode = pricing.pricingCode;
                entryData.pricingCode = pricing.pricingCode;
                entryData.itemType = 'gym_pass'; // Specific override

                // HANDLE FAMILY PASS
                let familyId = null;
                let passOwnerId = itemUserId;

                // Check for familyId in item or derived logic
                if (item.familyId) {
                    familyId = item.familyId;
                    passOwnerId = null; // Owned by family, not individual

                    // Finance Attribution Rule: Use first climber in family
                    const family = await Family.findById(familyId).populate('memberIds');
                    if (family && family.memberIds.length > 0) {
                        // Use the ID of the first member found
                        // memberIds might be objects if populated or IDs if not?
                        // .populate() makes them objects.
                        const firstMember = family.memberIds[0];
                        entryData.climberId = firstMember._id || firstMember;
                    } else {
                        // Fallback if empty family? Keep existing behavior or set null?
                        // If null, it's just an anonymous sale or admin-attributed.
                        entryData.climberId = null;
                    }
                }

                const createdPassesForThisItem = [];

                for (let i = 0; i < quantity; i++) {
                    // Determine valid dates - use item data if provided, otherwise calculate from pricing
                    let validFromDate = new Date();
                    if (item.validFrom) {
                        validFromDate = new Date(item.validFrom);
                    }

                    let validUntilDate = null;
                    if (item.validUntil) {
                        validUntilDate = new Date(item.validUntil);
                    } else if (pricing.validityDays) {
                        const { addDuration } = await import('../utils/dateUtils.js');
                        validUntilDate = addDuration(validFromDate, pricing.validityDays, pricing.validityType || 'days');
                    }

                    // Handle physical card if provided (only for first card if quantity > 1)
                    let physicalCardId = null;
                    if (item.physicalCardCode && item.physicalCardCode.trim() && i === 0) {
                        try {
                            const trimmedCode = item.physicalCardCode.trim();
                            
                            // Validate format first
                            if (!/^\d{6}$/.test(trimmedCode)) {
                                throw new Error('Physical card code must be exactly 6 digits');
                            }
                            
                            let physicalCard = await physicalCardService.findByCardCode(trimmedCode);
                            if (!physicalCard) {
                                physicalCard = await physicalCardService.createPhysicalCard(trimmedCode);
                            } else if (physicalCard.status === 'linked' && physicalCard.linkedToCardInternalCode) {
                                const linkedPass = await GymPass.findById(physicalCard.linkedToCardInternalCode);
                                if (linkedPass && linkedPass.isActive) {
                                    throw new Error('Physical card is already linked to an active pass');
                                }
                            }
                            physicalCardId = physicalCard._id;
                        } catch (error) {
                            console.error('Error handling physical card:', error);
                            // Continue without physical card if there's an error
                        }
                    }

                    // Create GymPass
                    console.log('Creating GymPass with:', {
                        userId: passOwnerId,
                        familyId: familyId,
                        isFamilyPass: !!familyId,
                        passId: `PASS-${Date.now()}-${Math.floor(Math.random() * 1000)}`
                    });

                    const newPass = new GymPass({
                        userId: passOwnerId,
                        familyId: familyId,
                        isFamilyPass: !!familyId,
                        passId: `PASS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        type: pricing.category === 'gym_pass' ? 'prepaid_entries' : 'time_based',
                        name: pricing.labelBg || pricing.category,
                        totalEntries: (item.totalEntries !== undefined && item.totalEntries !== null) ? item.totalEntries : pricing.maxEntries,
                        remainingEntries: (item.totalEntries !== undefined && item.totalEntries !== null) ? item.totalEntries : pricing.maxEntries,
                        validFrom: validFromDate,
                        validUntil: validUntilDate,
                        pricingId: pricing._id,
                        pricingCode: pricing.pricingCode,
                        amount: unitPrice, // Historical record on pass
                        paymentStatus: 'paid',
                        createdById: userId,
                        physicalCardId: physicalCardId || null,
                        financeTransactionId: transaction._id // Link back if desired in future models
                    });

                    await newPass.save();

                    // Link physical card to pass if provided
                    if (physicalCardId && item.physicalCardCode && i === 0) {
                        try {
                            const trimmedCode = item.physicalCardCode.trim();
                            await physicalCardService.linkToPass(trimmedCode, newPass._id);
                        } catch (error) {
                            console.error('Error linking physical card to pass:', error);
                            // Don't throw - card is created but not linked
                        }
                    }

                    createdRecords.passes.push(newPass);
                    createdPassesForThisItem.push(newPass);
                }

                // Link finance entry to the first pass of the batch (or handled differently if 1:1 rigor needed)
                // Logical choice: Link to the first one effectively acting as the "primary" reference
                entryData.gymPassId = createdPassesForThisItem[0]._id;

            } else if (item.type === 'visit') {
                let pricing = null;
                if (item.pricingId) {
                    pricing = await Pricing.findById(item.pricingId);
                }

                entryData.pricingCode = pricing ? pricing.pricingCode : 'MANUAL';
                entryData.itemType = 'gym_visit_single'; // Specific override

                const createdVisitsForThisItem = [];

                for (let i = 0; i < quantity; i++) {
                    // Create GymVisit
                    const newVisit = new GymVisit({
                        userId: itemUserId, // Can be null for anonymous
                        type: 'single',
                        pricingId: item.pricingId || null,
                        pricingCode: pricing ? pricing.pricingCode : 'MANUAL',
                        amount: unitPrice,
                        checkedInById: userId,
                        financeEntryId: null // Circular ref issue if we don't have entry yet, skipping
                    });

                    await newVisit.save();
                    createdRecords.visits.push(newVisit);
                    createdVisitsForThisItem.push(newVisit);
                }
                entryData.gymVisitId = createdVisitsForThisItem[0]._id;

            } else if (item.type === 'product') {
                entryData.itemType = 'product';
                if (item.productId) {
                    const product = await Product.findById(item.productId);
                    entryData.productId = product._id;
                    entryData.pricingCode = product.code || 'product';

                    // Decrement stock
                    if (product && product.stockQuantity !== null) {
                        product.stockQuantity -= quantity;
                        await product.save();
                        createdRecords.productUpdates.push({
                            productId: product._id,
                            productName: product.name,
                            quantitySold: quantity,
                            remainingStock: product.stockQuantity
                        });
                    }
                }
            }

            // Create and Save FinanceEntry
            const financeEntry = new FinanceEntry(entryData);
            await financeEntry.save();
            createdRecords.financeEntries.push(financeEntry);
        }

        // Calculate change
        let changeEUR = 0;
        let amountPaidEUR = 0;

        if (amountPaid !== undefined) {
            amountPaidEUR = Number(amountPaid);
            changeEUR = amountPaidEUR - totalAmountEUR;
        }

        // Audit Log
        await auditService.log(
            userId,
            'SALE_PROCESSED',
            'FinanceTransaction',
            transaction._id,
            {
                totalAmount: totalAmountEUR,
                itemsCount: items.length,
                payerClimberId: payerClimberId
            },
            req
        );

        res.status(201).json({
            message: 'Sale processed successfully',
            data: createdRecords,
            payment: {
                totalEUR: Number(totalAmountEUR.toFixed(2)),
                currency: 'EUR',
                amountPaid: Number(amountPaidEUR.toFixed(2)),
                changeEUR: Number(changeEUR.toFixed(2)),
            }
        });

    } catch (error) {
        console.error('Sale processing error:', error);

        // Return detailed error if possible
        const errorMessage = error.message || 'Unknown error occurred';
        res.status(500).json({
            message: 'Failed to process sale',
            error: errorMessage,
            details: error.errors ? JSON.stringify(error.errors) : undefined
        });
    }
};

function mapItemType(frontendType) {
    switch (frontendType) {
        case 'pass': return 'gym_pass';
        case 'visit': return 'gym_visit_single';
        case 'product': return 'product';
        default: return 'other';
    }
}
