import { PhysicalCard } from '../models/physicalCard.js';
import { GymPass } from '../models/gymPass.js';
import { TrainingPass } from '../models/trainingPass.js';
import logger from '../middleware/logging.js';

/**
 * Check if a GymPass is truly usable (active + not expired + has entries)
 * @param {Object} pass - GymPass document or plain object
 * @returns {boolean} True if pass can be used
 */
export const isGymPassUsable = (pass) => {
    if (!pass) return false;
    if (!pass.isActive) return false;
    
    const now = new Date();
    
    // Check if expired
    if (pass.validUntil && new Date(pass.validUntil) < now) {
        return false;
    }
    
    // Check if not yet valid
    if (pass.validFrom && new Date(pass.validFrom) > now) {
        return false;
    }
    
    // Check if exhausted (has entry limit and no remaining entries)
    if (pass.totalEntries && pass.totalEntries > 0) {
        if (pass.remainingEntries !== null && pass.remainingEntries <= 0) {
            return false;
        }
    }
    
    return true;
};

/**
 * Check if a TrainingPass is truly usable (active + not expired + has sessions)
 * @param {Object} pass - TrainingPass document or plain object
 * @returns {boolean} True if pass can be used
 */
export const isTrainingPassUsable = (pass) => {
    if (!pass) return false;
    if (!pass.isActive) return false;
    
    const now = new Date();
    
    // Check if expired
    if (pass.validUntil && new Date(pass.validUntil) < now) {
        return false;
    }
    
    // Check if not yet valid
    if (pass.validFrom && new Date(pass.validFrom) > now) {
        return false;
    }
    
    // Check if exhausted (has session limit and no remaining sessions)
    if (pass.totalSessions && pass.totalSessions > 0) {
        if (pass.remainingSessions !== null && pass.remainingSessions <= 0) {
            return false;
        }
    }
    
    return true;
};

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
 * Link physical card to a gym pass or training pass
 * @param {string} physicalCardCode - The physical card code
 * @param {string} passId - The pass ID (gym or training)
 * @param {string} passType - 'gym' or 'training'
 */
export const linkToPass = async (physicalCardCode, passId, passType = 'gym') => {
    try {
        const card = await PhysicalCard.findOne({ physicalCardCode });
        if (!card) {
            throw new Error('Physical card not found');
        }

        if (card.status === 'linked' && card.linkedToCardInternalCode) {
            // Check if the linked pass is still truly usable (active + not expired + has entries/sessions)
            let linkedPass = null;
            let isUsable = false;
            
            if (card.linkedToPassType === 'gym') {
                linkedPass = await GymPass.findById(card.linkedToCardInternalCode);
                isUsable = isGymPassUsable(linkedPass);
            } else if (card.linkedToPassType === 'training') {
                linkedPass = await TrainingPass.findById(card.linkedToCardInternalCode);
                isUsable = isTrainingPassUsable(linkedPass);
            }
            
            if (linkedPass && isUsable) {
                throw new Error('Physical card is already linked to an active pass');
            }
        }

        card.status = 'linked';
        card.linkedToCardInternalCode = passId;
        card.linkedToPassType = passType;
        await card.save();

        logger.info({ physicalCardId: card._id, passId, passType }, 'Physical card linked to pass');
        return card;
    } catch (error) {
        logger.error({ error: error.message, physicalCardCode, passId, passType }, 'Error linking physical card to pass');
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
        card.linkedToPassType = null;
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

        // Find the linked pass based on type
        if (physicalCard.linkedToPassType === 'training') {
            // Find training pass
            const trainingPass = await TrainingPass.findById(physicalCard.linkedToCardInternalCode)
                .populate('userId', 'firstName lastName email phone')
                .populate('familyId', 'name')
                .populate('pricingId')
                .lean();

            if (!trainingPass) {
                throw new Error('Linked training pass not found');
            }

            // Check if pass is active
            if (!trainingPass.isActive) {
                throw new Error('Training pass is not active');
            }

            // Check if pass is still valid (date-wise)
            const now = new Date();
            if (trainingPass.validUntil && new Date(trainingPass.validUntil) < now) {
                throw new Error('Training pass has expired');
            }

            // Check if pass has remaining sessions (if applicable)
            if (trainingPass.remainingSessions !== null && trainingPass.remainingSessions <= 0) {
                throw new Error('Training pass has no remaining sessions');
            }

            return {
                physicalCard,
                trainingPass,
            };
        } else {
            // Default to gym pass (for backward compatibility)
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
        }
    } catch (error) {
        logger.error({ error: error.message, physicalCardCode }, 'Error getting active pass by card code');
        throw error;
    }
};

