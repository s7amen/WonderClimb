# Pricing Documentation

Pricing is the **Source of Truth** for all prices in the system. It is not just a price tag, but a versioned definition of a product or service.

## Core Concepts

### 1. What is Pricing?
Pricing is a template for issuing cards (GymPass, TrainingPass), selling single entries, or products. It defines:
- Cost (`amount`)
- Validity (`validityDays`, `validFrom`, `validUntil`)
- Constraints (`maxEntries`)
- Category (`category`)

### 2. Pricing Code (`pricingCode`)
The `pricingCode` is a stable, unchanging identifier for a type of price. It links all historical versions of a price together.
**Example**: `GYM_SINGLE`, `GYM_10_PASS`, `TRAIN_PASS_8_FAMILY`.

The `_id` of a Pricing document changes with every price update, but the `pricingCode` remains the same.

### 3. Categories
| Category | Description |
| :--- | :--- |
| `gym_pass` | Cards for gym access (subscription/entries) |
| `gym_single_visit` | Single entry to the gym |
| `training_pass` | Cards for training sessions |
| `training_single` | Single training session |
| `product` | Physical goods (drinks, gear) |
| `birthday` | Birthday parties |
| `events` | Special events |
| `course` | Courses (e.g., top-rope course) |
| `other` | Miscellaneous services |

## Naming Conventions for `pricingCode`

To ensure consistency and readability, follow this structured format:

```
[AREA]_[TYPE]_[DETAILS]
```

Where:
- **AREA**: `GYM` / `TRAIN` / `COURSE` / `EVENT` / `PRODUCT` / `OTHER`
- **TYPE**: `SINGLE` / `PASS` / `FAMILY` / `MEMBER` / `MULTISPORT`
- **DETAILS**: Additional info like `8` (for 8 sessions), `MONTHLY`, `TOPROPE`, etc.

### Examples:
| pricingCode | Description |
| :--- | :--- |
| `GYM_SINGLE` | Single gym entry |
| `GYM_PASS_MONTHLY` | Monthly gym pass |
| `GYM_PASS_MONTHLY_FAMILY` | Monthly family gym pass |
| `TRAIN_SINGLE_INDIVIDUAL` | Single individual training |
| `TRAIN_SINGLE_MULTI` | Single multisport training |
| `TRAIN_SINGLE_FAMILY` | Single family training |
| `TRAIN_PASS_8` | Training pass with 8 sessions |
| `TRAIN_PASS_8_FAMILY` | Family training pass with 8 sessions |
| `TRAIN_PASS_12` | Training pass with 12 sessions |
| `COURSE_TOPROPE` | Top-rope course |
| `EVENT_BIRTHDAY` | Birthday party event |
| `PRODUCT_MAGNESIUM` | Magnesium product |

## Usage Guide

### Creating a New Price (Versioning)
When a price changes:
1. Find the current active Pricing by `pricingCode`.
2. Set its `validUntil` to `now` and `isActive` to `false`.
3. Create a **NEW** Pricing document with:
   - Same `pricingCode`
   - New `amount`
   - `validFrom` = `now`
   - `isActive` = `true`

**Backend Example:**
```javascript
import * as pricingService from '../services/pricingService.js';

// Update existing pricing (creates new version)
const updatedPricing = await pricingService.updatePricing('GYM_SINGLE', {
  amount: 10, // new price
}, adminUserId);
```

### Issuing a Card (GymPass / TrainingPass)
When issuing a card, you **MUST copy** the pricing details into the card document. Do not rely on referencing the Pricing ID alone, as it may become inactive.

**Backend Example:**
```javascript
// In gymService.js or trainingService.js
const pricing = await Pricing.findById(pricingId);
if (!pricing || !pricing.isActive) {
    throw new Error('Pricing not found or inactive');
}

const gymPass = await GymPass.create({
    userId,
    pricingId: pricing._id,
    pricingCode: pricing.pricingCode, // ✅ Copy pricingCode
    amount: pricing.amount,           // ✅ Copy amount
    totalEntries: pricing.maxEntries, // ✅ Copy maxEntries
    // ... other fields
});
```

### Reporting
Use `pricingCode` in `FinanceEntry` and `Booking` to group revenue by product type, regardless of price changes over time.

**Example Query:**
```javascript
// Get all revenue from single gym visits
const singleVisitRevenue = await FinanceEntry.aggregate([
    { $match: { pricingCode: 'GYM_SINGLE', type: 'revenue' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
]);
```

## Frontend Implementation

### Dropdown for Category Selection
When creating or editing pricing, the `category` should be selected from a dropdown to ensure consistency.

**Example (React):**
```jsx
const PRICING_CATEGORIES = [
  { value: 'gym_pass', label: 'Карта за зала' },
  { value: 'gym_single_visit', label: 'Единично посещение - зала' },
  { value: 'training_pass', label: 'Карта за тренировки' },
  { value: 'training_single', label: 'Единична тренировка' },
  { value: 'product', label: 'Продукт' },
  { value: 'birthday', label: 'Рожден ден' },
  { value: 'events', label: 'Събития' },
  { value: 'course', label: 'Курс' },
  { value: 'other', label: 'Друго' },
];

<select name="category">
  {PRICING_CATEGORIES.map(cat => (
    <option key={cat.value} value={cat.value}>{cat.label}</option>
  ))}
</select>
```

### Dropdown for pricingCode Selection
When issuing a pass, the `pricingCode` should be selected from active pricings fetched from the API.

**Example (React):**
```jsx
const [activePricings, setActivePricings] = useState([]);

useEffect(() => {
  // Fetch active pricings for gym passes
  fetch('/api/pricing/active?category=gym_pass')
    .then(res => res.json())
    .then(data => setActivePricings(data.data));
}, []);

<select name="pricingId">
  {activePricings.map(pricing => (
    <option key={pricing._id} value={pricing._id}>
      {pricing.labelBg} - {pricing.amount}€
    </option>
  ))}
</select>
```

## API Endpoints

### Get Active Pricings
```
GET /api/pricing/active?category=gym_pass
```
Returns all active pricings, optionally filtered by category.

### Get Pricing History
```
GET /api/pricing/history/:pricingCode
```
Returns all versions of a pricing by its code.

### Create Pricing
```
POST /api/pricing
Body: {
  "pricingCode": "GYM_SINGLE",
  "labelBg": "Единично посещение",
  "category": "gym_single_visit",
  "amount": 8,
  "validityDays": null,
  "maxEntries": null
}
```

### Update Pricing (Creates New Version)
```
PUT /api/pricing/:pricingCode
Body: {
  "amount": 10
}
```

## Data Structure
```typescript
interface Pricing {
  _id: ObjectId;
  pricingCode: string;        // Stable code (e.g., "GYM_SINGLE")
  labelBg: string;            // Name in Bulgarian
  category: 'gym_pass' | 'gym_single_visit' | 'training_pass' | ... ;
  amount: number;             // Price in EUR
  validityDays?: number;      // Days valid (null = unlimited)
  maxEntries?: number;        // Number of visits/sessions (null = unlimited)
  validFrom: Date;
  validUntil?: Date;          // null if currently active
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## Important Rules

1. **Never delete old Pricing documents** - they are historical records.
2. **Always use `pricingCode` for logic**, not `_id` or `labelBg`.
3. **Copy pricing data** into GymPass/TrainingPass when creating them.
4. **Only one active pricing per `pricingCode`** at any time.
5. **Use dropdowns** in the frontend to ensure consistency in `category` and `pricingCode` selection.

