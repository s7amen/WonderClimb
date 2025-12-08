const mongoose = require('mongoose');
require('dotenv').config();

// Define schema minimally for query
const financeEntrySchema = new mongoose.Schema({
    area: String,
    type: String,
    source: String,
    pricingCode: String,
    amount: Number,
    date: Date,
    description: String
}, { collection: 'finance_entries' });

const FinanceEntry = mongoose.model('FinanceEntry', financeEntrySchema);

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // Fetch last 10 gym income entries
        const entries = await FinanceEntry.find({
            area: 'gym',
            type: 'revenue'
        })
            .sort({ date: -1 })
            .limit(10)
            .lean();

        console.log('Found entries:', entries.length);
        console.log(JSON.stringify(entries, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
