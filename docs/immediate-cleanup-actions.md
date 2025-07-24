# Immediate Cleanup Actions for ThrivioHR

## 1. Delete Duplicate Files (Save 168KB)
```bash
rm client/src/components/profile/InterestsSection-complete.tsx
rm client/src/components/profile/InterestsSection-fixed.tsx
rm client/src/components/profile/InterestsSection-new.tsx
rm client/src/components/profile/InterestsSection-updated.tsx
# Keep only: client/src/components/profile/InterestsSection.tsx
```

## 2. Remove Legacy Migration Files
```bash
rm server/profile-migration.ts
rm server/direct-sql-migration.ts
rm server/check-migration-status.ts
rm server/mongodb/migration.ts
rm server/mongodb/run-migration.ts
rm server/run-mongodb-migration.ts
rm server/add-role-column-migration.ts
rm server/subscription-migration.ts
```

## 3. Remove Backup Files
```bash
rm server/routes.backup.ts
```

## 4. Clean Test/Setup Files
```bash
rm test.js
rm -rf attached_assets/  # Development screenshots/logs
```

## 5. Consolidate Management Routes
Choose one and delete the other:
- `server/management-routes.ts` (keep this)
- `server/management-routes-simple.ts` (delete - 1,148 lines)

## Total Impact
- **Files to delete**: 14 files
- **Space saved**: ~400KB
- **Code reduction**: ~5,000 lines

## Next Priority: Split Large Files

### 1. Split `server/storage.ts` (2,548 lines) into:
- `server/storage/user-storage.ts`
- `server/storage/organization-storage.ts`
- `server/storage/leave-storage.ts`
- `server/storage/recognition-storage.ts`
- `server/storage/social-storage.ts`

### 2. Split `shared/schema.ts` (2,040 lines) into:
- `shared/schemas/user-schema.ts`
- `shared/schemas/organization-schema.ts`
- `shared/schemas/leave-schema.ts`
- `shared/schemas/recognition-schema.ts`
- `shared/schemas/social-schema.ts`

### 3. Split `client/src/pages/admin-employees-groups.tsx` (2,559 lines) into:
- `EmployeeList.tsx`
- `GroupManagement.tsx`
- `BulkEmployeeActions.tsx`
- `EmployeeFilters.tsx`
- `AdminEmployeesPage.tsx` (main container)

## Quick Wins List (Do Today)
1. ✅ Delete duplicate InterestsSection files
2. ✅ Remove all migration scripts
3. ✅ Delete routes.backup.ts
4. ✅ Remove test.js
5. ✅ Add .gitignore entries for temp files