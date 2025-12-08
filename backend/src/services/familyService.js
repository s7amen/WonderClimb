import { Family } from '../models/family.js';
import { User } from '../models/user.js';
import logger from '../middleware/logging.js';

export const createFamily = async (data, createdById) => {
    try {
        const { name, memberIds, notes } = data;

        // Verify members exist
        if (memberIds && memberIds.length > 0) {
            const members = await User.find({ _id: { $in: memberIds } });
            if (members.length !== memberIds.length) {
                throw new Error('One or more family members not found');
            }
        }

        const family = await Family.create({
            name,
            memberIds: memberIds || [],
            notes,
            createdById,
            updatedById: createdById,
        });

        logger.info({ familyId: family._id, createdById }, 'Family created');
        return family;
    } catch (error) {
        logger.error({ error: error.message, data }, 'Error creating family');
        throw error;
    }
};

export const updateFamily = async (id, data, updatedById) => {
    try {
        const { name, memberIds, notes } = data;

        // Verify members if provided
        if (memberIds && memberIds.length > 0) {
            const members = await User.find({ _id: { $in: memberIds } });
            if (members.length !== memberIds.length) {
                throw new Error('One or more family members not found');
            }
        }

        const family = await Family.findByIdAndUpdate(
            id,
            {
                name,
                memberIds,
                notes,
                updatedById,
            },
            { new: true, runValidators: true }
        ).populate('memberIds', 'firstName lastName email phone photo');

        if (!family) {
            throw new Error('Family not found');
        }

        logger.info({ familyId: family._id, updatedById }, 'Family updated');
        return family;
    } catch (error) {
        logger.error({ error: error.message, id }, 'Error updating family');
        throw error;
    }
};

export const getFamilyById = async (id) => {
    try {
        const family = await Family.findById(id)
            .populate('memberIds', 'firstName lastName email phone photo clubMembership')
            .populate('createdById', 'firstName lastName');

        if (!family) {
            throw new Error('Family not found');
        }

        return family;
    } catch (error) {
        logger.error({ error: error.message, id }, 'Error fetching family');
        throw error;
    }
};

export const getAllFamilies = async (filters = {}) => {
    try {
        const query = {};
        if (filters.search) {
            query.name = { $regex: filters.search, $options: 'i' };
        }
        if (filters.memberId) {
            query.memberIds = filters.memberId;
        }

        const families = await Family.find(query)
            .populate('memberIds', 'firstName lastName')
            .sort({ createdAt: -1 });

        return families;
    } catch (error) {
        logger.error({ error: error.message }, 'Error fetching families');
        throw error;
    }
};

export const deleteFamily = async (id) => {
    try {
        const family = await Family.findByIdAndDelete(id);
        if (!family) {
            throw new Error('Family not found');
        }
        logger.info({ familyId: id }, 'Family deleted');
        return family;
    } catch (error) {
        logger.error({ error: error.message, id }, 'Error deleting family');
        throw error;
    }
};
