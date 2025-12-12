
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/WonderClimb', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const settingsSchema = new mongoose.Schema({
    // Minimal schema to read the document
}, { strict: false });

const Settings = mongoose.model('Settings', settingsSchema, 'settings');

async function getSettings() {
    try {
        const settings = await Settings.findOne();
        if (settings) {
            console.log('--- Settings Document ---');
            console.log(JSON.stringify(settings, null, 2));
            console.log('-------------------------');
        } else {
            console.log('No settings document found.');
        }
    } catch (error) {
        console.error('Error fetching settings:', error);
    } finally {
        mongoose.connection.close();
    }
}

getSettings();
