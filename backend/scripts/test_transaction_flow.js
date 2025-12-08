import mongoose from 'mongoose';
import { processSale } from '../src/controllers/saleController.js';
import { User } from '../src/models/user.js';
import { Product } from '../src/models/product.js';
import { Pricing } from '../src/models/pricing.js';
import { FinanceTransaction } from '../src/models/financeTransaction.js';
import { FinanceEntry } from '../src/models/financeEntry.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wonderclimb';

const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

async function runTest() {
    console.log('Connecting to DB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    try {
        // 1. Setup Data
        let admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            console.log('No admin user found, trying any user...');
            admin = await User.findOne({});
        }

        if (!admin) {
            console.log('No users found in DB. Creating a temporary test user...');
            admin = new User({
                firstName: 'Test',
                lastName: 'Admin',
                email: `testadmin${Date.now()}@example.com`,
                password: 'password123',
                role: 'admin'
            });
            await admin.save();
            console.log('Created temporary test user:', admin._id);
        }

        const product = await Product.findOne({ isActive: true });
        const pricingPass = await Pricing.findOne({ category: 'gym_pass' });
        const pricingVisit = await Pricing.findOne({ category: 'gym_entry' }); // specific usually

        if (!product || !pricingPass) {
            console.log('Missing data for full test, skipping some items');
        }

        // 2. Prepare Payload
        const items = [];

        // Add Pass
        if (pricingPass) {
            items.push({
                type: 'pass',
                name: 'Test Pass',
                price: 50,
                quantity: 1,
                pricingId: pricingPass._id.toString(),
                userId: admin._id.toString() // Buying for self
            });
        }

        // Add Product
        if (product) {
            items.push({
                type: 'product',
                name: 'Test Product',
                price: 5,
                quantity: 2,
                productId: product._id.toString()
            });
        }

        // Add Visit
        items.push({
            type: 'visit',
            name: 'Test Visit',
            price: 10,
            quantity: 1,
            pricingId: pricingVisit ? pricingVisit._id.toString() : null,
            userId: admin._id.toString()
        });

        const req = {
            user: admin,
            body: {
                items,
                amountPaid: 100
            }
        };

        const res = mockRes();

        console.log('Executing processSale...');
        await processSale(req, res);

        if (res.statusCode === 201) {
            console.log('SUCCESS: Sale processed.');
            console.log('Transaction:', res.data.data.transaction);

            // Verify
            const txId = res.data.data.transaction._id;
            const entries = await FinanceEntry.find({ transactionId: txId });
            console.log(`Found ${entries.length} finance entries linked to transaction.`);

            if (entries.length !== items.length) {
                console.error(`MISMATCH: Expected ${items.length} entries, found ${entries.length}`);
            } else {
                console.log('VERIFICATION PASSED: Entry count matches.');
            }

            // Clean up
            console.log('Cleaning up test data...');
            await FinanceTransaction.findByIdAndDelete(txId);
            await FinanceEntry.deleteMany({ transactionId: txId });
            // Note: We are not deleting the passes/visits/product updates to keep script simple, 
            // but in a real test env we would.

        } else {
            console.error('FAILED: Status', res.statusCode);
            console.error('Error:', res.data);
        }

    } catch (e) {
        console.error('Test Error:', e);
    } finally {
        await mongoose.disconnect();
    }
}

runTest();
