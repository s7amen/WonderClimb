# Parent vs Linked Profiles - Documentation Index

This directory contains analysis and documentation about the "parent/child" vs "linked profiles" terminology discussion.

## Files

### 1. `parent-vs-linked-profiles.md`
Main analysis comparing the two systems:
- **Linked Profiles System:** Training bookings authorization (flexible - any authorized relationship)
- **Family System:** Gym cards sharing (strict - nuclear family only)

Key insight: These systems serve different purposes and should NOT be merged.

### 2. `linked-profiles-cost-benefit.md`
Cost-benefit analysis of renaming "parent" terminology to "linked profiles":
- **Effort:** ~10 hours development
- **Benefit:** ~4.6/10 (moderate)
- **Recommendation:** Defer until technical debt sprint or major refactoring
- **Reason:** No user-facing changes, no performance gains

### 3. `linked-profiles-implementation-plan.md`
Detailed implementation plan (if we decide to do the refactoring):
- Phased approach with backwards compatibility
- Database migration scripts
- Frontend updates
- Testing strategy
- 5-week rollout timeline

**Note:** This plan was created assuming we'd keep backwards compatibility. Since the system is in testing with no production data, a simplified approach could be used instead (direct rename without migration).

## Decision

**Status:** Deferred  
**Reason:** Focus on user-facing features and bugfixes first  
**Tracked in:** `TECHNICAL_BACKLOG.md` (root directory)

## When to Revisit

- Technical debt sprint
- Major refactoring effort
- Before onboarding new developers
- When there's excess development capacity
