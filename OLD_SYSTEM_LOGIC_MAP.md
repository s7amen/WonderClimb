# Old System Logic Map - Quick Reference

## Data Flow Diagram

```
┌─────────────────┐
│   Деца          │  (Children/Climbers)
│   - child_id    │
│   - parent info │
└────────┬────────┘
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│   Карти         │  │  Тренировки     │
│   (Cards)       │  │  (Attendance)   │
│   - cart_id     │  │  - train_id     │
│   - visits      │  │  - type_of_visit│
│   - child_id ───┼──┼── child_id      │
└─────────────────┘  │  - session_id   │
                      └────────┬────────┘
                               │
                               ▼
                      ┌─────────────────┐
                      │   Календар      │
                      │   (Sessions)    │
                      │   - session_id  │
                      │   - trainer     │
                      └────────┬────────┘
                               │
                               ▼
                      ┌─────────────────┐
                      │   Треньори     │
                      │   (Coaches)    │
                      │   - ид         │
                      └─────────────────┘

┌─────────────────┐
│   Каса          │  (Cash Desk)
│   - operation_id│
│   - type        │
│   - amount      │
└─────────────────┘
    ▲         ▲
    │         │
    │         └─── Card purchases
    │
    └─── Trainer payouts

┌─────────────────┐
│   Цени          │  (Prices)
│   - type_of_visit│
│   - price       │
└─────────────────┘
```

## Key Relationships

### 1. Child → Cards
- **One-to-Many**: One child can have multiple cards
- **Link**: `Карти.child_id` → `Деца.child_id`
- **Business Logic**: Cards track remaining visits, validity, payment

### 2. Child → Attendance
- **One-to-Many**: One child has many attendance records
- **Link**: `Тренировки.child_id` → `Деца.child_id`
- **Business Logic**: Each attendance can use a card visit or be single payment

### 3. Session → Attendance
- **One-to-Many**: One session has many attendance records
- **Link**: `Тренировки.training_session_id` → `Календар.training_session_id`
- **Business Logic**: Attendance records who attended which session

### 4. Session → Coaches
- **Many-to-Many**: Sessions can have multiple coaches
- **Link**: `Календар.trainer`, `second_trainer`, etc. → `Треньори.ид`
- **Business Logic**: Each coach gets individual payout per session

### 5. Card → Attendance
- **One-to-Many**: One card can be used for multiple attendances
- **Link**: `Тренировки.Karta` (implied) → `Карти.cart_id`
- **Business Logic**: Each attendance decrements card visits

### 6. Cash Desk → Everything
- **References**: Cards (purchases), Sessions (payouts), Coaches (payments)
- **Business Logic**: All financial transactions flow through cash desk

## Business Rules (Inferred from Data)

### Card System Rules
1. Cards have fixed number of visits (`initila_number_of_visit`)
2. Cards track remaining visits (`visits`)
3. Cards can be valid/invalid (`is_valid`, `valid`)
4. Cards must be paid before use (`payed`)
5. Card types determine price and visit count

### Attendance Rules
1. Attendance links child + session
2. Attendance has visit type (single vs card)
3. Attendance records price paid
4. Card attendance tracks visit number on card
5. All attendance records are "present" (no absent records in data)

### Session Rules
1. Sessions can have 1-4 coaches
2. Each coach has individual payout amount
3. Each coach payout has separate status
4. Sessions have fees (price per climber)
5. Sessions have status (conducted/cancelled)

### Financial Rules
1. Card purchases = income
2. Trainer payouts = expenses
3. Transactions have types (income/expense)
4. Transactions link to source via description

## Data Patterns

### ID Formats
- **child_id**: Sequential numbers (1, 2, 3, ...)
- **cart_id**: Hex strings (8 chars: "0517c358")
- **training_session_id**: Hex strings (6 chars: "E2B3F3")
- **train_id**: Hex strings (6 chars: "77B7E9")
- **operation_id**: Hex strings (8 chars: "3b960b44")
- **trainer ид**: Hex strings (8 chars: "544f25e3")

### Date Formats
- **Деца.date_of_birth**: DD.MM.YYYY (text)
- **Other dates**: Excel date format (YYYY-MM-DD HH:MM:SS)

### Boolean Values
- Stored as numbers: 1/0 or True/False
- Some fields duplicated (`is_valid` and `valid`)

### Text Fields
- Bulgarian language throughout
- Status values in Bulgarian ("Проведена", "Разход")
- Card types in Bulgarian ("Карта 2 = 1", "Карта - 8 тренировки")

## Critical Business Logic

### Card Usage Flow
```
1. Parent buys card → Карти record created
2. Card has N visits (initila_number_of_visit)
3. Child attends session → Тренировки record
4. If type_of_visit = "Карта":
   - Link to card (Karta field)
   - Decrement visits in Карти
   - Track visit number (number_of_visit_with_the_card)
5. When visits = 0, card is used up
```

### Session Payout Flow
```
1. Session created → Календар record
2. Coaches assigned → trainer, second_trainer, etc.
3. Payout amounts set → trainer_pay, second_trainer_pay
4. After session:
   - Mark attendance → Тренировки
   - Calculate coach payouts
   - Update trainer_pay_status = "YES" when paid
5. Record payout in Каса (expense)
```

### Financial Flow
```
Income:
- Card purchases → Каса (type = income)
- Single session payments → Каса (type = income)

Expenses:
- Trainer payouts → Каса (type = expense)
- Other expenses → Каса (type = expense)

Balance:
- Running balance tracked (but mostly empty in data)
```

## Migration Mapping

### Entity Mapping
| Old System | New System | Notes |
|------------|------------|-------|
| Деца | User (climber) | Add preferredSchedule |
| Треньори | User (coach) + CoachProfile | Map ид to custom field |
| Календар | Session | Enhance for per-coach payouts |
| Тренировки | AttendanceRecord | Add visitType, pricePaid, cardId |
| Карти | **NEW: Card model** | Critical missing feature |
| Каса | CashRecord | Planned, not implemented |
| Цени | PriceListItem | Planned, not implemented |

### Field Mapping
| Old Field | New Field | Transformation |
|-----------|----------|----------------|
| child_id | User._id | Generate ObjectId |
| first_name | User.firstName | Direct |
| middle_name | User.middleName | Direct |
| surname | User.lastName | Direct |
| date_of_birth | User.dateOfBirth | Parse DD.MM.YYYY → Date |
| active | User.accountStatus | True → 'active', False → 'inactive' |
| training_session_id | Session._id | Map hex → ObjectId |
| trainer | Session.coachIds[] | Map ид → User._id |
| train_id | AttendanceRecord._id | Generate ObjectId |
| type_of_visit | AttendanceRecord.visitType | Map Bulgarian → English |
| cart_id | Card._id | Map hex → ObjectId |

## Validation Rules

### Data Integrity Checks
1. All `child_id` in Тренировки must exist in Деца
2. All `training_session_id` in Тренировки must exist in Календар
3. All `trainer` IDs in Календар must exist in Треньори
4. All `child_id` in Карти must exist in Деца
5. Card visits cannot exceed `initila_number_of_visit`
6. Attendance with card must reference valid card

### Business Rule Validation
1. Card visits >= 0
2. Card must be paid before use
3. Card must be valid before use
4. Session date must be in past for attendance
5. Coach payout amounts >= 0
6. Price amounts >= 0

## Questions for Clarification

1. **Card Types**: What do "Карта 2 = 1" mean? Special promotion?
2. **Visit Tracking**: How is `number_of_visit_with_the_card` calculated?
3. **Session Status**: What does "Проведена" mean exactly? Completed?
4. **Multiple Parents**: How are parent2_name/parent2_phone used?
5. **Empty Columns**: Why so many empty columns in Тренировки?
6. **Balance Field**: Why is Каса.balance mostly empty?
7. **Card Expiration**: Do cards expire? (no expiration date in data)

