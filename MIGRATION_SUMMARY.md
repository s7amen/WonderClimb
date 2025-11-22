# Old System Migration Summary

## Quick Overview

**Old System**: Excel file with 7 sheets, ~11,000 records  
**Analysis Date**: 2025-01-27  
**Status**: Analysis Complete ✅

## Key Findings

### ✅ What Maps Well
- **Children/Climbers** → User model (climber role)
- **Coaches** → User model (coach role) + CoachProfile
- **Sessions** → Session model
- **Attendance** → AttendanceRecord model
- **Parent-Child Links** → ParentClimberLink model

### 🔴 Critical Missing Features

1. **Card/Pass System** (586 cards exist)
   - Pre-paid cards with visit tracking
   - Card types and pricing
   - Visit usage tracking
   - **Action**: Implement Card model before migration

2. **Per-Coach Payout Tracking**
   - Sessions have multiple coaches (up to 4)
   - Each coach has individual payout amount and status
   - **Action**: Enhance Session model with coachPayouts array

3. **Visit Type & Price in Attendance**
   - Track if attendance was via card, single session, or subscription
   - Record actual price paid per attendance
   - **Action**: Enhance AttendanceRecord model

### 🟡 Important Enhancements Needed

- Session pricing (price per climber)
- Card visit number tracking
- Preferred training schedule per climber
- Price history tracking

## Data Volume

| Sheet | Records | Status |
|-------|---------|--------|
| Деца (Children) | 984 | ✅ Ready to migrate |
| Треньори (Coaches) | 29 | ✅ Ready to migrate |
| Календар (Sessions) | 1,165 | ⚠️ Needs per-coach payout enhancement |
| Тренировки (Attendance) | 5,621 | ⚠️ Needs visit type/price fields |
| Карти (Cards) | 586 | ❌ Model not implemented |
| Каса (Cash Desk) | 2,779 | ⚠️ Model planned but not implemented |
| Цени (Prices) | 13 | ⚠️ Model planned but not implemented |

## Recommended Implementation Order

### Phase 1: Critical Features (Before Migration)
1. ✅ Implement Card/Pass model and API
2. ✅ Enhance Session model for per-coach payouts
3. ✅ Enhance AttendanceRecord for visit tracking
4. ✅ Add session pricing field

### Phase 2: Migration Preparation
1. Create migration scripts
2. Data validation and cleaning
3. Test migration on sample data
4. Backup strategy

### Phase 3: Data Migration
1. Migrate Users (children + coaches)
2. Migrate Sessions
3. Migrate Cards
4. Migrate AttendanceRecords
5. Migrate Financial records
6. Validate data integrity

### Phase 4: Post-Migration
1. Preferred schedule feature
2. Enhanced reporting
3. Analytics and insights

## Next Steps

1. **Review** `OLD_SYSTEM_ANALYSIS.md` for detailed analysis
2. **Review** `OLD_SYSTEM_LOGIC_MAP.md` for logical connections
3. **Decide** on implementation priorities
4. **Implement** critical features (Card system, per-coach payouts)
5. **Create** migration scripts
6. **Test** migration on sample data
7. **Execute** full migration

## Files Created

- `OLD_SYSTEM_ANALYSIS.md` - Comprehensive analysis document
- `OLD_SYSTEM_LOGIC_MAP.md` - Logic connections and data flow
- `MIGRATION_SUMMARY.md` - This summary document
- `excel_analysis_report.json` - Raw analysis data (JSON)
- `analyze_excel.py` - Analysis script (can be reused)

## Questions?

Refer to the detailed analysis documents for:
- Field-by-field mapping
- Business logic explanations
- Data validation rules
- Migration script structure
- Implementation recommendations

