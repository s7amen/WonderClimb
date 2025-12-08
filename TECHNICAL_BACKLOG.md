# WonderClimb - Technical Backlog & Future Improvements

> **Note:** This file tracks technical debt, optimization ideas, and future improvements that are not urgent but worth doing when time permits.

---

## 🔴 Priority: Low - Technical Debt

### Rename "Parent" Terminology to "Linked Profiles"

**Status:** Deferred  
**Added:** 2025-12-08  
**Estimated Effort:** ~10 hours  
**Priority:** Low (nice-to-have)

**Context:**
Currently, the system uses "parent/child" terminology for the training bookings authorization system (ParentClimberLink). However, this is misleading because the relationship is not strictly parent→child - it can include:
- Uncle/aunt → nephew/niece
- Friend → friend's child
- Any authorized person booking for another

The "Family" system is separate and specifically for gym cards (strictly nuclear family: parent + biological/adopted children).

**Proposed Change:**
- Rename `ParentClimberLink` → `LinkedProfile` or `AuthorizedProfile`
- Rename service: `parentClimberService.js` → `linkedProfileService.js`
- Update API routes: `/api/v1/parents/*` → `/api/v1/linked-profiles/*`
- Update frontend API: `parentClimbersAPI` → `linkedProfilesAPI`

**Why Not Done Now:**
- ✅ System is in testing phase (no production data)
- ✅ Frontend stays the same (no user-facing changes)
- ✅ No performance improvements
- ✅ Moderate benefit (~4.6/10) for ~10 hours work
- ✅ Better to focus on user-facing features/bugfixes first

**When to Do It:**
- During a "technical debt sprint"
- When planning major refactoring efforts
- When there's excess development capacity
- Before onboarding new developers (helps with code clarity)

**Documentation:**
- Full analysis: `docs/analysis/parent-vs-linked-profiles.md`
- Cost-benefit: `docs/analysis/linked-profiles-cost-benefit.md`
- Implementation plan (if needed): `docs/analysis/linked-profiles-implementation-plan.md`

---

## 🟢 Priority: Medium - Future Features

*(Add future feature ideas here)*

---

## 🟡 Priority: High - Critical Technical Debt

*(Add critical issues here that should be fixed soon)*

---

## 📝 Ideas & Notes

### System Architecture Clarity
- **Current:** Two parallel systems for relationships
  - `LinkedProfiles` (ParentClimberLink): Flexible authorization for bookings
  - `Family`: Strict nuclear family for shared gym cards
- **Status:** This is INTENTIONAL - they serve different purposes
- **Decision:** Keep both systems separate (don't merge)

### Future Considerations
- If we add more relationship types in the future, consider adding a `relationshipType` enum to LinkedProfile
  - Currently not needed (user confirmed)
  - Can be added later without breaking changes

---

## 🔧 Maintenance Reminders

- Review this backlog quarterly
- Prioritize items based on:
  - User impact
  - Development effort
  - Team capacity
  - Dependencies on other work

---

## 📚 Related Documentation

- System architecture: `specs/`
- API documentation: `backend/src/routes/docs.js`
- Frontend guides: `FRONTEND_FIXES.md`, `FRONTEND_SETUP.md`
- Deployment: `DEPLOYMENT_READINESS.md`
