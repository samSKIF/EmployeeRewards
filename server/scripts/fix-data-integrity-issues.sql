-- DATA INTEGRITY FIX SCRIPT
-- Fixes user organization assignments and removes invalid accounts

-- 1. DELETE invalid users as requested
DELETE FROM users WHERE email = 'admin@democorp.com';
DELETE FROM users WHERE email = 'admin@monday.com'; 
DELETE FROM users WHERE email = 'test@company.com';
DELETE FROM users WHERE email = 'admin@empulse.com';

-- 2. FIX Admin@loylogic.com organization assignment
-- First, get Loylogic organization ID
UPDATE users 
SET organization_id = (SELECT id FROM organizations WHERE name = 'Loylogic')
WHERE email = 'Admin@loylogic.com';

-- 3. DIAGNOSE admin@thriviohr.com corporate admin issue
-- Corporate admins should not have organization_id - this is correct
-- But we need to ensure they're properly categorized

-- Show current state for verification
SELECT 'After fixes - remaining NULL org users:' as status;
SELECT 
  id,
  email,
  username,
  organization_id,
  role_type,
  admin_scope,
  is_admin
FROM users 
WHERE organization_id IS NULL
ORDER BY email;

SELECT 'Loylogic users after fix:' as status;
SELECT 
  id,
  email,
  username,
  organization_id,
  role_type
FROM users 
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Loylogic')
ORDER BY email;