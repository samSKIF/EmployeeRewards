# Screen Capture Guide for ThrivioHR Platform

## How to Capture All Screens

### Method 1: Manual Navigation and Screenshots

1. **Open the application** at http://localhost:5000

2. **For each screen below, navigate to the URL and take a screenshot:**

### Authentication Screens
- [ ] `/auth` - Main login with marketing sidebar
- [ ] `/corporate-login` - Corporate admin login
- [ ] `/management` - Management dashboard login

### Main Application (after login)
- [ ] `/dashboard` - Main dashboard
- [ ] `/social` - Social feed with posts
- [ ] `/profile/1` - User profile page
- [ ] `/spaces` - Spaces/Groups page
- [ ] `/org-chart` - Organization chart

### Admin Screens
- [ ] `/admin/dashboard` - Admin dashboard
- [ ] `/admin/people` - Employee directory
- [ ] `/admin/people/mass-upload` - Bulk upload
- [ ] `/admin/settings/departments` - Department management
- [ ] `/admin/settings/locations` - Location management
- [ ] `/admin/system/organization` - Organization settings
- [ ] `/admin/branding` - Branding configuration
- [ ] `/admin/recognition-settings` - Recognition settings

### HR Features
- [ ] `/leave-management` - Leave management
- [ ] `/hr-config` - HR configuration

### Survey System
- [ ] `/admin/surveys` - Survey management
- [ ] `/admin/survey-creator` - Create surveys
- [ ] `/admin/survey-templates` - Survey templates

### Other Features
- [ ] `/shop` - Marketplace/Shop
- [ ] `/transactions` - Transaction history
- [ ] `/recognition` - Recognition page
- [ ] `/recognition-analytics` - Recognition analytics

## Method 2: Browser Extension
Use a full-page screenshot extension like:
- GoFullPage (Chrome)
- Fireshot (Firefox/Chrome)
- Awesome Screenshot

## Method 3: Automated Tool
You can use tools like:
- Playwright or Puppeteer for automated screenshots
- Chrome DevTools Protocol

## Tips for Good Screenshots
1. Use consistent window size (e.g., 1920x1080)
2. Clear browser cache before starting
3. Login with a test account that has data
4. Capture both empty and populated states
5. Document any special interactions or modals

## Organizing Your Screenshots
Create folders like:
```
screenshots/
├── auth/
├── admin/
├── employee/
├── social/
├── hr/
├── surveys/
└── misc/
```

