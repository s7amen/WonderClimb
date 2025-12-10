import { PhysicalCard } from '../models/physicalCard.js';
import { GymPass } from '../models/gymPass.js';
import logger from '../middleware/logging.js';

/**
 * Find physical card by card code
 */
export const findByCardCode = async (physicalCardCode) => {
    try {
        const card = await PhysicalCard.findOne({ physicalCardCode });
        return card;
    } catch (error) {
        logger.error({ error: error.message, physicalCardCode }, 'Error finding physical card by code');
        throw error;
    }
};

/**
 * Create a new physical card
 */
export const createPhysicalCard = async (physicalCardCode) => {
    try {
        // Validate format: exactly 6 digits
        if (!/^\d{6}$/.test(physicalCardCode)) {
            throw new Error('Physical card code must be exactly 6 digits');
        }

        // Check if card already exists
        const existing = await PhysicalCard.findOne({ physicalCardCode });
        if (existing) {
            throw new Error('Physical card with this code already exists');
        }

        const card = await PhysicalCard.create({
            physicalCardCode,
            status: 'free',
        });

        logger.info({ physicalCardId: card._id, physicalCardCode }, 'Physical card created');
        return card;
    } catch (error) {
        logger.error({ error: error.message, physicalCardCode }, 'Error creating physical card');
        throw error;
    }
};

/**
 * Link physical card to a gym pass
 */
export const linkToPass = async (physicalCardCode, gymPassId) => {
    try {
        const card = await PhysicalCard.findOne({ physicalCardCode });
        if (!card) {
            throw new Error('Physical card not found');
        }

        if (card.status === 'linked' && card.linkedToCardInternalCode) {
            // Check if the linked pass is still active
            const linkedPass = await GymPass.findById(card.linkedToCardInternalCode);
            if (linkedPass && linkedPass.isActive) {
                throw new Error('Physical card is already linked to an active pass');
            }
        }

        card.status = 'linked';
        card.linkedToCardInternalCode = gymPassId;
        await card.save();

        logger.info({ physicalCardId: card._id, gymPassId }, 'Physical card linked to pass');
        return card;
    } catch (error) {
        logger.error({ error: error.message, physicalCardCode, gymPassId }, 'Error linking physical card to pass');
        throw error;
    }
};

/**
 * Unlink physical card from pass
 */
export const unlinkFromPass = async (physicalCardId) => {
    try {
        const card = await PhysicalCard.findById(physicalCardId);
        if (!card) {
            throw new Error('Physical card not found');
        }

        card.status = 'free';
        card.linkedToCardInternalCode = null;
        await card.save();

        logger.info({ physicalCardId }, 'Physical card unlinked from pass');
        return card;
    } catch (error) {
        logger.error({ error: error.message, physicalCardId }, 'Error unlinking physical card');
        throw error;
    }
};

/**
 * Get active gym pass by physical card code
 */
export const getActivePassByCardCode = async (physicalCardCode) => {
    try {
        // Validate format
        if (!/^\d{6}$/.test(physicalCardCode)) {
            throw new Error('Physical card code must be exactly 6 digits');
        }

        // Find physical card
        const physicalCard = await PhysicalCard.findOne({ physicalCardCode });
        if (!physicalCard) {
            throw new Error('Physical card not found');
        }

        // Check if card is linked
        if (physicalCard.status !== 'linked' || !physicalCard.linkedToCardInternalCode) {
            throw new Error('Physical card is not linked to any pass');
        }

        // Find the linked gym pass
        const gymPass = await GymPass.findById(physicalCard.linkedToCardInternalCode)
            .populate('userId', 'firstName lastName email phone')
            .populate('familyId', 'name')
            .populate('pricingId')
            .lean();

        if (!gymPass) {
            throw new Error('Linked gym pass not found');
        }

        // Check if pass is active
        if (!gymPass.isActive) {
            throw new Error('Gym pass is not active');
        }

        // Check if pass is still valid (date-wise)
        const now = new Date();
        if (gymPass.validUntil && new Date(gymPass.validUntil) < now) {
            throw new Error('Gym pass has expired');
        }

        // Check if pass has remaining entries (if applicable)
        if (gymPass.remainingEntries !== null && gymPass.remainingEntries <= 0) {
            throw new Error('Gym pass has no remaining entries');
        }

        return {
            physicalCard,
            gymPass,
        };
    } catch (error) {
        logger.error({ error: error.message, physicalCardCode }, 'Error getting active pass by card code');
        throw error;
    }
};

