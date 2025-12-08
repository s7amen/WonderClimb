# План за Оптимизация: Linked Profiles System

## Цели

1. ✅ **Запазваме двете системи** (Linked Profiles + Family)
2. ✅ **Преименуваме** "parent" терминологията → "linked profiles"
3. ✅ **Оптимизираме** кода за по-добра поддръжка
4. ✅ **Минимизираме breaking changes**

---

## Фаза 1: Оптимизация на Backend

### 1.1 Преименуване на Модели

#### [RENAME] `ParentClimberLink` → `LinkedProfile`

**Файл:** `backend/src/models/parentClimberLink.js` → `linkedProfile.js`

```javascript
// linkedProfile.js
const linkedProfileSchema = new mongoose.Schema({
    authorizerId: {  // Вместо parentId
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    profileId: {  // Вместо climberId
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    relationshipType: {  // НОВА - опционално
        type: String,
        enum: ['parent', 'guardian', 'relative', 'friend', 'other'],
        default: 'other'
    },
    nickname: {  // НОВА - опционално ("Племенникът ми", "Дъщеря ми")
        type: String,
        default: null
    }
}, {
    timestamps: true,
});

linkedProfileSchema.index({ authorizerId: 1, profileId: 1 });
linkedProfileSchema.index({ profileId: 1 }); // Reverse lookup

export const LinkedProfile = mongoose.model('LinkedProfile', linkedProfileSchema);
```

**Миграция:** Създаваме migration script който:
1. Копира всички `parentclimberlinks` → `linkedprofiles`
2. Rename полета: `parentId` → `authorizerId`, `climberId` → `profileId`
3. Опционално: след проверка, drop старата колекция

---

#### [DEPRECATE → DELETE] `ParentInfo` model

**Проверка:** Използва ли се още `ParentInfo`?

```bash
grep -r "ParentInfo" backend/src --include="*.js"
```

Ако НЕ се използва:
- Директно го изтриваме
- Drop колекцията `parentinfos` от database

Ако СЕ използва:
- Мигрираме data към `User` или `LinkedProfile`

---

### 1.2 Създаване на Shared Authorization Service

#### [NEW] `backend/src/services/authorizationService.js`

**Цел:** Централизирана логика за "User X can act for User Y"

```javascript
import { LinkedProfile } from '../models/linkedProfile.js';
import { User } from '../models/user.js';
import logger from '../middleware/logging.js';

/**
 * Check if User A is authorized to act on behalf of User B
 * @param {string} authorizerId - The ID of the user requesting authorization
 * @param {string} profileId - The ID of the profile being accessed
 * @param {array} authorizerRoles - Roles of the authorizer
 * @returns {Promise<boolean>}
 */
export const canActForProfile = async (authorizerId, profileId, authorizerRoles = []) => {
    // Self-authorization (can always act for yourself)
    if (authorizerId === profileId || authorizerId.toString() === profileId.toString()) {
        return true;
    }

    // Admin can act for anyone
    if (authorizerRoles.includes('admin')) {
        return true;
    }

    // Check LinkedProfile relationship
    const link = await LinkedProfile.findOne({
        authorizerId,
        profileId
    });

    return !!link;
};

/**
 * Get all profiles that a user can act for
 * @param {string} authorizerId
 * @returns {Promise<Array>} Array of User objects
 */
export const getAuthorizedProfiles = async (authorizerId) => {
    const links = await LinkedProfile.find({ authorizerId })
        .populate('profileId', 'firstName lastName email phone accountStatus')
        .lean();
    
    return links.map(link => link.profileId);
};

/**
 * Check if profile exists and is linked
 * @param {string} authorizerId
 * @param {string} profileId
 * @returns {Promise<object>} { isLinked: boolean, profile: User }
 */
export const getLinkedProfile = async (authorizerId, profileId) => {
    const isLinked = await canActForProfile(authorizerId, profileId);
    if (!isLinked) {
        throw new Error('Profile not found or not linked to this user');
    }

    const profile = await User.findById(profileId);
    if (!profile) {
        throw new Error('Profile not found');
    }

    return { isLinked, profile };
};
```

---

### 1.3 Рефакторинг на Services

#### [REFACTOR] `parentClimberService.js` → `linkedProfileService.js`

**Промени:**
- Използва новия `authorizationService`
- Rename всички функции: `getClimbersForParent` → `getLinkedProfiles`
- Update всички референции към модела

**Преди:**
```javascript
export const getClimbersForParent = async (parentId) => {
    const links = await ParentClimberLink.find({ parentId })
        .populate('climberId')
        .lean();
    return links.map(link => link.climberId);
};
```

**След:**
```javascript
export const getLinkedProfiles = async (authorizerId) => {
    return getAuthorizedProfiles(authorizerId); // Използва shared service
};

export const createLinkedProfile = async (authorizerId, profileData) => {
    // Създаване на User (неактивен)
    const profile = await User.create({
        ...profileData,
        email: null,
        passwordHash: null,
        accountStatus: 'inactive',
        roles: ['climber']
    });

    // Създаване на LinkedProfile връзка
    await LinkedProfile.create({
        authorizerId,
        profileId: profile._id,
        relationshipType: profileData.relationshipType || 'other'
    });

    return profile;
};
```

---

### 1.4 Оптимизация на Booking Логика

#### [REFACTOR] `bookingService.js`

**Консолидираме authorization проверките:**

**Преди:**
```javascript
// Разпръснато навсякъде
const isLinked = await isClimberLinkedToParent(parentId, climberId);
if (!isLinked) {
    throw new Error('Not authorized');
}
```

**След:**
```javascript
import { canActForProfile } from './authorizationService.js';

export const createBooking = async (sessionId, climberId, userId, userRoles) => {
    // Unified authorization check
    const canAct = await canActForProfile(userId, climberId, userRoles);
    if (!canAct) {
        throw new Error('Not authorized to book for this user');
    }

    // Rest of booking logic...
};
```

---

## Фаза 2: API Routes Оптимизация

### 2.1 Нови Route Names (Backwards Compatible)

#### [NEW] `backend/src/routes/linkedProfiles.js`

**Подход:** Създаваме НОВ route file, запазваме стария като aliases

```javascript
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import * as linkedProfileService from '../services/linkedProfileService.js';

const router = express.Router();

router.use(authenticate);
router.use(requireRole('admin', 'climber'));

// GET /api/v1/linked-profiles/me
router.get('/me', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const profiles = await linkedProfileService.getLinkedProfiles(userId);
        res.json({ profiles });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/linked-profiles
router.post('/', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const profile = await linkedProfileService.createLinkedProfile(userId, req.body);
        res.status(201).json({ profile });
    } catch (error) {
        next(error);
    }
});

// ... other routes

export default router;
```

#### [MODIFY] `backend/src/routes/index.js`

```javascript
import linkedProfilesRoutes from './linkedProfiles.js';
import parentProfileRoutes from './parentProfile.js'; // DEPRECATED

// New routes
router.use('/linked-profiles', linkedProfilesRoutes);

// Legacy routes (DEPRECATED - alias to new routes)
router.use('/parents', parentProfileRoutes); // Kept for backwards compatibility
router.use('/parents', parentProfileRoutes); // Kept for backwards compatibility
```

**Deprecation Notice:**
- Добавяме deprecation header във всички `/parents/*` endpoints:
  ```javascript
  res.setHeader('X-API-Deprecated', 'true');
  res.setHeader('X-API-Replacement', '/linked-profiles/*');
  ```

---

### 2.2 Консолидиране на Bookings Endpoint

#### [MODIFY] `parentProfile.js`

**Текущ проблем:** Booking логиката е дуплицирана

**Решение:** Използваме shared bookings service

```javascript
// GET /api/v1/parents/me/bookings (DEPRECATED)
// GET /api/v1/linked-profiles/me/bookings (NEW)
router.get('/me/bookings', async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        // Use shared booking service with family members included
        const bookings = await getBookingsForUser(userId, req.user.roles, {
            ...req.query,
            includeLinkedProfiles: true  // NEW parameter
        });
        
        res.json({ bookings });
    } catch (error) {
        next(error);
    }
});
```

---

## Фаза 3: Frontend Оптимизация

### 3.1 API Layer Refactoring

#### [MODIFY] `frontend/src/services/api.js`

```javascript
// NEW: Linked Profiles API
export const linkedProfilesAPI = {
  getAll: () => api.get('/linked-profiles/me'),
  create: (data) => api.post('/linked-profiles', data),
   update: (id, data) => api.put(`/linked-profiles/${id}`, data),
  delete: (id) => api.delete(`/linked-profiles/${id}`),
  getBookings: () => api.get('/linked-profiles/me/bookings'),
  checkDeletion: (id) => api.get(`/linked-profiles/${id}/check-deletion`),
};

// DEPRECATED: Keep for backwards compatibility (alias to new API)
/**
 * @deprecated Use linkedProfilesAPI instead
 */
export const parentClimbersAPI = {
  getAll: () => linkedProfilesAPI.getAll(),
  create: (data) => linkedProfilesAPI.create(data),
  update: (id, data) => linkedProfilesAPI.update(id, data),
  deactivate: (id) => linkedProfilesAPI.delete(id),
  linkExisting: (id) => linkedProfilesAPI.linkExisting(id),  
  checkDeletion: (id) => linkedProfilesAPI.checkDeletion(id),
};
```

**Стратегия:**
1. Създаваме новото `linkedProfilesAPI`
2. Запазваме старото `parentClimbersAPI` като wrapper (backwards compatible)
3. Постепенно мигрираме components да използват новото API

---

### 3.2 Component Terminology Updates

#### Phase 1: Internal Variable Renaming (no UI change)

**Файлове:** All components using `parentClimbersAPI`

**Before:**
```javascript
const [children, setChildren] = useState([]);
const response = await parentClimbersAPI.getAll();
setChildren(response.data.climbers);
```

**After:**
```javascript
const [linkedProfiles, setLinkedProfiles] = useState([]);
const response = await linkedProfilesAPI.getAll();
setLinkedProfiles(response.data.profiles);
```

---

#### Phase 2: UI Text Updates

**Ключови компоненти:**
- `Profile.jsx`: "My Children" → "Linked Profiles" / "Управлявани профили"
- `Sessions/Browse.jsx`: "Select children" → "Select profile"
- `BookingModal.jsx`: "Who is attending?" (neutral)

**Пример:**
```jsx
// Profile.jsx
<h2 className="text-xl font-semibold">
  Управлявани профили {/* Instead of "Децата ми" */}
</h2>

<Button onClick={openCreateModal}>
  Добави профил {/* Instead of "Добави дете" */}
</Button>

{linkedProfiles.map(profile => (
  <div key={profile._id}>
    <h3>{profile.firstName} {profile.lastName}</h3>
    <span className="text-sm text-gray-500">
      {profile.relationshipType === 'parent' && 'Дете'}
      {profile.relationshipType === 'relative' && 'Роднина'}
      {profile.relationshipType === 'friend' && 'Приятелско лице'}
    </span>
  </div>
))}
```

---

### 3.3 Create Shared Components

#### [NEW] `frontend/src/components/LinkedProfiles/ProfileSelector.jsx`

**Цел:** Reusable component за избор на профил (използва се в bookings, check-ins, etc.)

```jsx
import React, { useEffect, useState } from 'react';
import { linkedProfilesAPI } from '../../services/api';

const ProfileSelector = ({ value, onChange, includeNone = false }) => {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfiles = async () => {
            try {
                const response = await linkedProfilesAPI.getAll();
                setProfiles(response.data.profiles || []);
            } catch (error) {
                console.error('Error fetching profiles:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfiles();
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
        <select value={value} onChange={e => onChange(e.target.value)}>
            {includeNone && <option value="">-- Select Profile --</option>}
            {profiles.map(profile => (
                <option key={profile._id} value={profile._id}>
                    {profile.firstName} {profile.lastName}
                    {profile.nickname && ` (${profile.nickname})`}
                </option>
            ))}
        </select>
    );
};

export default ProfileSelector;
```

**Usage:**
```jsx
// In BookingModal.jsx
import ProfileSelector from '../LinkedProfiles/ProfileSelector';

<ProfileSelector 
    value={selectedProfileId}
    onChange={setSelectedProfileId}
    includeNone={true}
/>
```

---

## Фаза 4: Database Optimization

### 4.1 Indexes

```javascript
// linkedProfile.js
linkedProfileSchema.index({ authorizerId: 1, profileId: 1 }, { unique: true });
linkedProfileSchema.index({ profileId: 1 }); // For reverse lookups
linkedProfileSchema.index({ authorizerId: 1, 'profileId': 1 }); // Compound for queries
```

### 4.2 Query Optimization

**Problem:** N+1 queries when fetching bookings for linked profiles

**Before:**
```javascript
const profiles = await getLinkedProfiles(userId);
const allBookings = [];
for (const profile of profiles) {
    const bookings = await getBookingsForUser(profile._id); // N queries!
    allBookings.push(...bookings);
}
```

**After:**
```javascript
const profiles = await getLinkedProfiles(userId);
const profileIds = profiles.map(p => p._id);

// Single query for all bookings
const allBookings = await Booking.find({
    climberId: { $in: [userId, ...profileIds] }
}).populate('sessionId').lean();
```

---

## Фаза 5: Документация и Тестване

### 5.1 Migration Guide

**Файл:** `docs/LINKED_PROFILES_MIGRATION.md`

```markdown
# Migration Guide: Parent → Linked Profiles

## For Developers

### Backend Changes
- `ParentClimberLink` → `LinkedProfile`
- `parentId` → `authorizerId`
- `climberId` → `profileId`
- Service: `parentClimberService` → `linkedProfileService`

### API Changes
- `/api/v1/parents/*` → `/api/v1/linked-profiles/*` (old routes still work)
- Response field: `climbers` → `profiles`

### Frontend Changes
- `parentClimbersAPI` → `linkedProfilesAPI` (old API aliased)
- Component variables: `children` → `linkedProfiles`
```

### 5.2 Update Tests

```javascript
// tests/integration/linkedProfiles.e2e.test.js
describe('LinkedProfiles API', () => {
    it('should create linked profile', async () => {
        const response = await request(app)
            .post('/api/v1/linked-profiles')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                firstName: 'Test',
                lastName: 'Profile',
                dateOfBirth: '2015-01-01',
                relationshipType: 'relative'
            });
        
        expect(response.status).toBe(201);
        expect(response.body.profile).toBeDefined();
    });

    it('should get all linked profiles', async () => {
        const response = await request(app)
            .get('/api/v1/linked-profiles/me')
            .set('Authorization', `Bearer ${authToken}`);
        
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.profiles)).toBe(true);
    });
});
```

---

## Rollout Timeline

### Week 1: Backend Foundation
- ✅ Create `LinkedProfile` model
- ✅ Create `authorizationService`
- ✅ Refactor `linkedProfileService`
- ✅ Write migration script
- ✅ Test on dev database

### Week 2: API Layer
- ✅ Create `/linked-profiles/*` routes
- ✅ Add deprecation headers to `/parents/*`
- ✅ Update booking service with authorization checks
- ✅ Integration tests

### Week 3: Frontend Phase 1
- ✅ Create `linkedProfilesAPI`
- ✅ Keep `parentClimbersAPI` as alias
- ✅ Internal variable renaming (no UI change)
- ✅ Test all booking flows

### Week 4: Frontend Phase 2
- ✅ UI text updates ("Linked Profiles")
- ✅ Create `ProfileSelector` component
- ✅ User acceptance testing

### Week 5: Production Deployment
- ✅ Database migration
- ✅ Deploy backend
- ✅ Deploy frontend
- ✅ Monitor for errors

### Week 6+: Monitoring & Cleanup
- Monitor usage of deprecated endpoints
- After 30 days of zero usage:
  - Remove deprecated routes
  - Remove `parentClimbersAPI` alias
  - Drop old database collection

---

## Success Metrics

- ✅ Zero breaking changes for existing users
- ✅ All tests passing
- ✅ Reduced code duplication (shared authorization logic)
- ✅ Clearer terminology (no more misleading "parent")
- ✅ Improved performance (optimized queries)
- ✅ Better developer experience (clearer API naming)
