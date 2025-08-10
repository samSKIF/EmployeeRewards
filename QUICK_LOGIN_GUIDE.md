# Quick Login Guide for Screenshot Capture

## 🚀 READY TO CAPTURE SCREENSHOTS!

### Test Credentials
- **Email**: `admin@test.com`
- **Password**: `admin123`
- **Tenant ID**: Use the org ID from database (usually `1`)

### Quick Login URLs

**MAIN AUTH PAGE (with marketing sidebar):**
```
http://localhost:5000/auth?tenant_id=1
```

**MANAGEMENT PAGE:**
```
http://localhost:5000/management?tenant_id=1
```

**CORPORATE LOGIN:**
```
http://localhost:5000/corporate-login?tenant_id=1
```

## All Pages for Screenshots

Add `?tenant_id=1` to each URL:

### Authentication Pages
- `/auth` - Main auth with "Empower Your Workplace" marketing
- `/management` - Management login
- `/corporate-login` - Corporate admin login

### Main Application
- `/dashboard` - Main dashboard
- `/social` - Social feed with posts
- `/profile/1` - User profile

### Admin Screens  
- `/admin/dashboard` - Admin dashboard
- `/admin/people` - Employee directory
- `/admin/settings/departments` - Department management
- `/admin/settings/locations` - Location management
- `/admin/branding` - Branding settings

### Features
- `/shop` - Marketplace/Shop
- `/leave-management` - Leave management
- `/recognition` - Recognition page
- `/org-chart` - Organization chart
- `/surveys` - Survey system

## Start Here
1. Go to: `http://localhost:5000/auth?tenant_id=1`
2. Login with: `admin@test.com` / `admin123`
3. Navigate to other pages for screenshots