# Old Training System Analysis & Migration Plan

## Executive Summary

This document analyzes the old Excel-based training management system (managed via AppSheet) and maps its logic to the new WonderClimb system. The analysis identifies valuable features to incorporate, redundant elements to eliminate, and provides a data migration strategy.

**Date**: 2025-01-27  
**Old System**: Excel file with 7 sheets, ~10,000+ records  
**New System**: MongoDB-based web application with REST API

---

## Old System Structure

### Sheet Overview

| Sheet Name (Bulgarian) | English Translation | Rows | Columns | Purpose |
|------------------------|---------------------|------|----------|---------|
| **Карти** | Cards/Passes | 586 | 11 | Membership cards/passes for climbers |
| **Каса** | Cash Desk | 2,779 | 8 | Financial transactions (income/expenses) |
| **Тренировки** | Trainings | 5,621 | 25 | Training attendance records |
| **Календар** | Calendar | 1,165 | 19 | Training sessions schedule |
| **Деца** | Children | 984 | 19 | Children/climbers profiles |
| **Цени** | Prices | 13 | 3 | Pricing configuration |
| **Треньори** | Trainers/Coaches | 29 | 6 | Coach profiles |

**Total Records**: ~11,000+ records across all sheets

---

## Detailed Sheet Analysis

### 1. Деца (Children) - 984 records

**Purpose**: Stores climber/child profiles

**Key Fields**:
- `child_id` (number) - Primary identifier
- `short_name`, `first_name`, `middle_name`, `surname` - Name fields
- `date_of_birth` (text format: DD.MM.YYYY)
- `photo` (path to image)
- `phone` (number)
- `parent1_name`, `parent1_phone` - Primary parent info
- `parent2_name`, `parent2_phone` - Secondary parent (optional)
- `email` (mostly empty)
- `active` (boolean) - Account status
- `usual_train_hour` (text) - e.g., "Пн-Ср-Пт-18:00" - Preferred training schedule
- `last training`, `last training before X days` - Calculated fields

**Mapping to New System**:
- ✅ Maps to `User` model (climber role)
- ✅ Name fields → `firstName`, `middleName`, `lastName`
- ✅ `date_of_birth` → `dateOfBirth` (needs date parsing)
- ✅ `photo` → `photo` field
- ✅ `phone` → `phone` field
- ✅ `active` → `accountStatus` ('active'/'inactive')
- ✅ Parent info → `ParentClimberLink` + separate parent `User` records
- ⚠️ `usual_train_hour` - **VALUABLE**: Preferred training schedule pattern (not in new system)
- ⚠️ `last training` - Calculated field (can be derived from attendance)

**Valuable Features to Add**:
1. **Preferred Training Schedule** (`usual_train_hour`) - Store preferred days/times for each climber
2. **Last Training Date** - Quick reference field (can be calculated from attendance)

---

### 2. Треньори (Trainers/Coaches) - 29 records

**Purpose**: Coach/trainer profiles

**Key Fields**:
- `ид` (id) - Text ID (hex format: "544f25e3")
- `short_name` - Display name
- `full_name` - Full name (mostly empty)
- `photo` - Photo path (mostly empty)
- `phone` - Phone number (mostly empty)
- `email` - Email (mostly empty)

**Mapping to New System**:
- ✅ Maps to `User` model (coach role)
- ✅ `short_name` → Can be stored in `firstName` or as display name
- ✅ `ид` → Can be stored as custom ID or migrated to MongoDB ObjectId
- ⚠️ Coach-specific data → `CoachProfile` model exists but may need enhancement

**Valuable Features to Add**:
1. **Coach Display Names** - Short names for quick reference
2. **Coach Photos** - Photo support (already in User model)

---

### 3. Календар (Calendar) - 1,165 records

**Purpose**: Training session schedule

**Key Fields**:
- `training_session_id` (text, hex format: "E2B3F3")
- `date` (date)
- `status` (text) - e.g., "Проведена" (Conducted)
- `trainer` (text ID) - References Треньори.ид
- `second_trainer`, `3th_trainer`, `4th_trainer` - Multiple trainers support
- `duration` (mostly empty)
- `start-time`, `end-time` (mostly empty)
- `fees` (number) - Session fee
- `trainer_pay`, `second_trainer_pay`, `3th_trainer_pay`, `4th_trainer_pay` - Per-trainer payout amounts
- `trainer_pay_status`, `second_trainer_pay_status`, etc. - Payment status ("YES"/"NO")

**Mapping to New System**:
- ✅ Maps to `Session` model
- ✅ `date` → `date` field
- ✅ `status` → `status` ('active'/'cancelled') - needs mapping from Bulgarian
- ✅ `trainer` → `coachIds` array (supports multiple coaches)
- ✅ `fees` → Could map to session price (not currently in Session model)
- ✅ `trainer_pay` → `coachPayoutAmount` (but only supports single amount, not per-coach)
- ✅ `trainer_pay_status` → `coachPayoutStatus` ('paid'/'unpaid')
- ⚠️ **MULTIPLE COACHES PER SESSION** - New system supports `coachIds` array ✅
- ⚠️ **PER-COACH PAYOUT AMOUNTS** - New system only has single `coachPayoutAmount` ❌
- ⚠️ **PER-COACH PAYOUT STATUS** - New system only has single `coachPayoutStatus` ❌

**Valuable Features to Add**:
1. **Per-Coach Payout Tracking** - Each coach should have individual payout amount and status
2. **Session Fees** - Price per session (for pricing/booking)
3. **Duration/Time Fields** - Start/end times (partially exists as `durationMinutes`)

**Gap Analysis**:
- Current `Session` model has single `coachPayoutAmount` and `coachPayoutStatus`
- Need: Array of coach payout objects: `[{coachId, amount, status}]`

---

### 4. Тренировки (Trainings) - 5,621 records

**Purpose**: Individual training attendance records

**Key Fields**:
- `train_id` (text, hex: "77B7E9")
- `training_session_id` (text) - References Календар
- `child_id` (number) - References Деца
- `date` (date)
- `type_of_visit` (text) - e.g., "Единичнa тренировка" (Single training), "Карта" (Card)
- `Karta` (mostly empty) - Card reference?
- `Price_of_visit` (number) - Price paid for this visit
- `number_of_visit_with_the_card` (mostly empty) - Visit number on card
- Many empty columns (15+)

**Mapping to New System**:
- ✅ Maps to `AttendanceRecord` model
- ✅ `training_session_id` → `sessionId`
- ✅ `child_id` → `climberId`
- ✅ `date` → Can be derived from session date
- ⚠️ `type_of_visit` - **VALUABLE**: Visit type (single session vs card-based)
- ⚠️ `Price_of_visit` - **VALUABLE**: Actual price paid (not in new system)
- ⚠️ `number_of_visit_with_the_card` - **VALUABLE**: Card visit tracking

**Valuable Features to Add**:
1. **Visit Type Tracking** - Track if attendance was via single session, card, or subscription
2. **Price Paid** - Record actual price paid per attendance (for financial tracking)
3. **Card Visit Number** - Track which visit number on a card was used

**Gap Analysis**:
- Current `AttendanceRecord` only has `status` ('present'/'absent')
- Missing: visit type, price paid, card reference

---

### 5. Карти (Cards) - 586 records

**Purpose**: Membership cards/passes

**Key Fields**:
- `cart_id` (text, hex: "0517c358")
- `date` (date) - Purchase/activation date
- `child_id` (number) - References Деца
- `type_of_visit` (text) - e.g., "Карта 2 = 1" (Card type)
- `initila_number_of_visit` (number) - Initial visits (e.g., 8)
- `price` (number) - Card price
- `payed` (boolean) - Payment status
- `is_valid`, `valid` (boolean) - Card validity
- `visits` (number) - Remaining/used visits
- `name` (text) - Child name (denormalized)

**Mapping to New System**:
- ❌ **NOT IN NEW SYSTEM** - Card/Pass system is planned but not implemented
- This is a **CRITICAL FEATURE** for the business model

**Valuable Features to Add**:
1. **Card/Pass System** - Pre-paid cards with fixed number of visits
2. **Card Types** - Different card types (e.g., "8 visits", "12 visits")
3. **Visit Tracking** - Track remaining visits on cards
4. **Card Validity** - Active/inactive cards
5. **Card Usage** - Link card usage to attendance records

**Gap Analysis**:
- New system has `PriceListItem` model planned (future) but no card/pass implementation
- Need: New `Card` or `Pass` model with visit tracking

---

### 6. Каса (Cash Desk) - 2,779 records

**Purpose**: Financial transactions

**Key Fields**:
- `operation_id` (text, hex: "3b960b44")
- `date` (date)
- `type` (text) - "Разход" (Expense) or likely "Приход" (Income)
- `description` (text) - Transaction description
- `amaunt` (number) - Amount (note: typo "amaunt" instead of "amount")
- `balance` (mostly empty)
- Empty columns

**Mapping to New System**:
- ✅ Maps to `CashRecord` model (planned/future)
- ✅ `type` → `type` ('income'/'expense')
- ✅ `date` → `occurredAt`
- ✅ `description` → `description`
- ✅ `amaunt` → `amount`
- ⚠️ `balance` - Running balance (not in new system)

**Valuable Features to Add**:
1. **Running Balance** - Track cash desk balance over time
2. **Transaction Categories** - Better categorization of income/expense types

**Gap Analysis**:
- `CashRecord` model exists in spec but not implemented
- Missing: running balance calculation

---

### 7. Цени (Prices) - 13 records

**Purpose**: Pricing configuration

**Key Fields**:
- `type_of_visit` (text) - e.g., "Карта - 8 тренировки" (Card - 8 trainings)
- `price` (number) - Current price
- `price up to 31.10.2025` (number) - Historical/old price

**Mapping to New System**:
- ✅ Maps to `PriceListItem` model (planned/future)
- ✅ `type_of_visit` → `name` or `type`
- ✅ `price` → `price`
- ⚠️ Historical prices - Not in new system

**Valuable Features to Add**:
1. **Price History** - Track price changes over time
2. **Effective Dates** - Price validity periods

---

## Logical Connections & Data Flow

### Entity Relationship Diagram (Old System)

```
Деца (Children)
  ├─ child_id ──┐
  │             │
  │             ├─> Тренировки.child_id (attendance)
  │             │
  │             └─> Карти.child_id (cards/passes)
  │
  └─ parent1_name, parent1_phone (parent info)

Треньори (Coaches)
  └─ ид ──> Календар.trainer, second_trainer, etc.

Календар (Sessions)
  └─ training_session_id ──> Тренировки.training_session_id

Карти (Cards)
  └─ cart_id ──> (referenced in Тренировки.Karta?)

Каса (Cash Desk)
  └─ (references cards, sessions, coaches via description)

Цени (Prices)
  └─ type_of_visit ──> (used in Карти, Тренировки)
```

### Business Logic Flow

1. **Registration Flow**:
   - Child registered in "Деца" → Gets `child_id`
   - Parent info stored in same record

2. **Card Purchase Flow**:
   - Parent buys card → Record in "Карти"
   - Card linked to `child_id`
   - Card type determines `initila_number_of_visit`
   - Payment recorded in "Каса"

3. **Session Creation Flow**:
   - Admin creates session in "Календар"
   - Assigns trainer(s) from "Треньори"
   - Sets fees and trainer payouts

4. **Attendance Flow**:
   - Child attends session → Record in "Тренировки"
   - Links to `training_session_id` and `child_id`
   - If using card, decrements `visits` in "Карти"
   - Records `Price_of_visit` and `type_of_visit`

5. **Payment Flow**:
   - Card purchases → "Каса" income record
   - Trainer payouts → "Каса" expense record
   - Links to sessions via description

---

## Feature Comparison: Old vs New System

### ✅ Already Implemented in New System

| Feature | Old System | New System | Status |
|---------|-----------|------------|--------|
| User/Climber Profiles | Деца | User (climber role) | ✅ |
| Coach Profiles | Треньори | User (coach role) + CoachProfile | ✅ |
| Training Sessions | Календар | Session | ✅ |
| Attendance Records | Тренировки | AttendanceRecord | ✅ |
| Multiple Coaches per Session | Календар (trainer, second_trainer, etc.) | Session.coachIds[] | ✅ |
| Parent-Child Links | Деца.parent1_name | ParentClimberLink | ✅ |
| Financial Records | Каса | CashRecord (planned) | ⚠️ Planned |
| Pricing | Цени | PriceListItem (planned) | ⚠️ Planned |

### ❌ Missing Critical Features

| Feature | Old System | New System | Priority |
|---------|-----------|------------|----------|
| **Card/Pass System** | Карти (586 records) | Not implemented | 🔴 **CRITICAL** |
| **Per-Coach Payout Tracking** | Календар (per-coach pay/status) | Single coachPayoutAmount | 🔴 **HIGH** |
| **Visit Type Tracking** | Тренировки.type_of_visit | Not in AttendanceRecord | 🟡 **MEDIUM** |
| **Price Paid per Attendance** | Тренировки.Price_of_visit | Not in AttendanceRecord | 🟡 **MEDIUM** |
| **Preferred Training Schedule** | Деца.usual_train_hour | Not in User | 🟢 **LOW** |
| **Card Visit Number** | Тренировки.number_of_visit_with_the_card | Not tracked | 🟡 **MEDIUM** |
| **Running Balance** | Каса.balance | Not in CashRecord | 🟢 **LOW** |
| **Price History** | Цени (current + historical) | Not in PriceListItem | 🟢 **LOW** |

### ⚠️ Partially Implemented / Needs Enhancement

| Feature | Old System | New System | Gap |
|---------|-----------|------------|-----|
| Session Pricing | Календар.fees | Not in Session | Add price field |
| Duration/Time | Календар.start-time, end-time | Session.durationMinutes | Add start/end times |
| Coach Display Names | Треньори.short_name | User.firstName | Consider display name field |

---

## Recommendations: Features to Incorporate

### 🔴 Priority 1: Critical Business Features

#### 1. Card/Pass System (Membership Cards)

**Why Critical**: 586 card records exist, core business model

**Implementation**:
```javascript
// New Model: Card
{
  cardId: String,           // Unique card identifier
  climberId: ObjectId,      // Reference to User
  cardType: String,         // e.g., "8-visits", "12-visits"
  initialVisits: Number,    // Total visits purchased
  remainingVisits: Number,  // Current balance
  price: Number,           // Purchase price
  purchaseDate: Date,       // When card was bought
  isValid: Boolean,        // Active/inactive
  paid: Boolean,           // Payment status
  expiresAt: Date          // Optional expiration
}
```

**Integration Points**:
- Link to `AttendanceRecord` via `cardId`
- Track visit usage: `remainingVisits--` on attendance
- Show card balance in parent/climber dashboard
- Allow booking with card selection

#### 2. Per-Coach Payout Tracking

**Why Critical**: Multiple coaches per session, different pay rates

**Implementation**:
```javascript
// Enhance Session model
{
  coachPayouts: [{
    coachId: ObjectId,
    amount: Number,
    status: String,  // 'unpaid' | 'paid'
    paidAt: Date
  }]
}
```

**Migration**: Extract from Календар.trainer_pay, second_trainer_pay, etc.

### 🟡 Priority 2: Important Features

#### 3. Visit Type & Price Tracking in Attendance

**Why Important**: Financial tracking, card usage tracking

**Implementation**:
```javascript
// Enhance AttendanceRecord model
{
  visitType: String,        // 'single', 'card', 'subscription'
  cardId: ObjectId,         // If visitType === 'card'
  visitNumberOnCard: Number, // Which visit on card
  pricePaid: Number,        // Actual price paid
  paymentMethod: String     // 'cash', 'card', 'online'
}
```

#### 4. Session Pricing

**Why Important**: Display prices, calculate revenue

**Implementation**:
```javascript
// Add to Session model
{
  price: Number,            // Price per climber
  currency: String          // 'BGN', 'EUR'
}
```

### 🟢 Priority 3: Nice-to-Have Features

#### 5. Preferred Training Schedule

**Why Useful**: UX improvement, auto-suggest bookings

**Implementation**:
```javascript
// Add to User model
{
  preferredSchedule: {
    daysOfWeek: [Number],   // [1, 3, 5] for Mon, Wed, Fri
    time: String,           // "18:00"
    active: Boolean
  }
}
```

#### 6. Price History

**Why Useful**: Historical reporting, audit trail

**Implementation**:
```javascript
// Enhance PriceListItem model
{
  priceHistory: [{
    price: Number,
    effectiveFrom: Date,
    effectiveTo: Date
  }]
}
```

---

## Data Migration Strategy

### Phase 1: Core Data Migration

1. **Деца → User (Climbers)**
   - Map all child records to User documents
   - Parse `date_of_birth` from DD.MM.YYYY to Date
   - Set `isTrainee: true`, `accountStatus` from `active`
   - Create parent User records from `parent1_name`, `parent1_phone`
   - Create `ParentClimberLink` records

2. **Треньори → User (Coaches)**
   - Map coach records to User documents
   - Set role: `['coach']`
   - Create `CoachProfile` records
   - Map `ид` to custom field or generate new ObjectIds

3. **Календар → Session**
   - Map session records
   - Parse `date` field
   - Map `status` from Bulgarian to English
   - Map trainers to `coachIds` array
   - **Temporary**: Store per-coach payouts in notes/separate collection until model updated

### Phase 2: Relationship Data Migration

4. **Тренировки → AttendanceRecord**
   - Map attendance records
   - Link `training_session_id` → Session._id
   - Link `child_id` → User._id
   - Set `status: 'present'` (all records are attendance)
   - **Store additional data**: visitType, pricePaid in notes temporarily

5. **Карти → Card (New Model)**
   - Create Card documents
   - Link `child_id` → User._id
   - Calculate `remainingVisits` from `visits` field
   - Map card types

### Phase 3: Financial Data Migration

6. **Каса → CashRecord**
   - Map financial transactions
   - Parse `type` from Bulgarian
   - Calculate running balance
   - Link to sessions/cards via description parsing

7. **Цени → PriceListItem**
   - Map pricing configuration
   - Store historical prices

### Migration Script Structure

```javascript
// migration/importOldSystem.js
async function migrateOldSystem() {
  // 1. Read Excel file
  // 2. Migrate Users (children + coaches)
  // 3. Migrate Sessions
  // 4. Migrate Cards
  // 5. Migrate AttendanceRecords
  // 6. Migrate CashRecords
  // 7. Migrate PriceListItems
  // 8. Create ParentClimberLinks
  // 9. Validate data integrity
}
```

---

## Duplications & Redundancies to Eliminate

### ❌ Remove from Old System

1. **Empty Columns** - Тренировки has 15+ empty columns
2. **Duplicate Fields** - Карти has both `is_valid` and `valid`
3. **Denormalized Data** - Карти.name duplicates Деца data
4. **Calculated Fields** - Деца."last training" can be calculated
5. **Typo Fields** - Каса."amaunt" should be "amount"

### ✅ Keep (Valuable)

1. **All relationship IDs** - Critical for data integrity
2. **Historical prices** - Useful for reporting
3. **Visit tracking** - Core business logic
4. **Payment statuses** - Financial tracking

---

## Action Items

### Immediate (Before Migration)

- [ ] **Implement Card/Pass Model** - Critical for business continuity
- [ ] **Enhance Session Model** - Add per-coach payout tracking
- [ ] **Enhance AttendanceRecord** - Add visit type and price tracking
- [ ] **Add Session Pricing** - Price field to Session model

### Short Term (Migration Prep)

- [ ] Create migration scripts
- [ ] Data validation rules
- [ ] Test migration on sample data
- [ ] Backup strategy

### Long Term (Post-Migration)

- [ ] Preferred schedule feature
- [ ] Price history tracking
- [ ] Enhanced financial reporting
- [ ] Card usage analytics

---

## Conclusion

The old system has **~11,000 records** across 7 sheets. Key findings:

1. **Core entities map well** to new system (Users, Sessions, Attendance)
2. **Card/Pass system is missing** but critical (586 cards exist)
3. **Per-coach payouts need enhancement** (multiple coaches per session)
4. **Financial tracking is partially implemented** (CashRecord planned)
5. **Visit type tracking is valuable** for business logic

**Recommended Approach**:
1. Implement Card/Pass system first (highest priority)
2. Enhance Session model for per-coach payouts
3. Enhance AttendanceRecord for visit tracking
4. Then proceed with data migration

This will ensure the new system supports all critical business processes before migrating historical data.

