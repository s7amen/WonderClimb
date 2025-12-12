
import mongoose from 'mongoose';
import { Settings } from '../models/settings.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const checkSettings = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const settings = await Settings.findOne();
        if (settings) {
            console.log('Settings found:');
            // Use inspect to see full depth
            console.dir(settings.trainingLabels, { depth: null });

            console.log('\nVisibility specific:');
            console.log(settings.trainingLabels?.visibility);
        } else {
            console.log('No settings found');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
};

checkSettings();
