import * as familyService from '../services/familyService.js';

export const createFamily = async (req, res) => {
    try {
        const userId = req.user.id;
        const family = await familyService.createFamily(req.body, userId);
        res.status(201).json(family);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const updateFamily = async (req, res) => {
    try {
        const userId = req.user.id;
        const family = await familyService.updateFamily(req.params.id, req.body, userId);
        res.json(family);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const getFamily = async (req, res) => {
    try {
        const family = await familyService.getFamilyById(req.params.id);
        res.json(family);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
};

export const getFamilies = async (req, res) => {
    try {
        const families = await familyService.getAllFamilies(req.query);
        res.json(families);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const deleteFamily = async (req, res) => {
    try {
        await familyService.deleteFamily(req.params.id);
        res.json({ message: 'Family deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
