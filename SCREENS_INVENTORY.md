# ThrivioHR Platform - Screens Inventory

## Authentication Screens
1. **Main Auth Page** (/auth)
   - Two-column layout with marketing on right
   - "Empower Your Workplace" messaging
   - Feature cards: Peer Recognition, Rewards & Redemption, Polls & Surveys
   
2. **Corporate Login** (/corporate-login)
   - ThrivioHR Corporate admin access
   - Two-step process: Create admin, then login

3. **Management Login** (/management)
   - Management dashboard access

## Main Application Screens

### Social/Feed
4. **Social Feed** (/social)
   - Main feed with posts, comments, likes
   - Post creator with rich text
   - Recognition modal
   - Poll creation
   - Sidebar with navigation
   - Wallet widget showing points

5. **Spaces/Groups** (/spaces)
   - Spaces discovery
   - Space listings
   - Join/leave functionality

### Employee Management
6. **Employee Directory** (/admin/people)
   - Employee table with filters
   - Search functionality
   - Bulk actions

7. **Employee Profile** (/profile/:id)
   - User details
   - Interests section
   - Activity history

8. **Mass Upload** (/admin/people/mass-upload)
   - CSV upload interface
   - Validation and preview

### Admin Screens
9. **Admin Dashboard** (/admin/dashboard)
   - Statistics overview
   - Charts and metrics
   - Quick actions

10. **Organization Settings** (/admin/system/organization)
    - Company details
    - Branding configuration
    - System settings

11. **Department Management** (/admin/settings/departments)
    - CRUD for departments

12. **Location Management** (/admin/settings/locations)
    - Office locations management

### HR Features
13. **Leave Management** (/leave-management)
    - Leave requests
    - Calendar view
    - Approval workflow

14. **Recognition Settings** (/admin/recognition-settings)
    - Points configuration
    - Badge management

### Survey System
15. **Survey Management** (/admin/surveys)
    - Survey list
    - Create/edit surveys
    - Response analytics

16. **Survey Templates** (/admin/survey-templates)
    - Pre-built templates
    - Template customization

### Other Features
17. **Shop/Marketplace** (/shop)
    - Product listings
    - Points redemption

18. **Transactions** (/transactions)
    - Transaction history
    - Points ledger

19. **Org Chart** (/org-chart)
    - Hierarchical view
    - Reporting structure

## Key UI Components Used
- Shadcn/UI components throughout
- Tailwind CSS styling
- React Hook Form for forms
- TanStack Query for data fetching
- Wouter for routing
- Lucide icons

## Color Scheme & Branding
- Primary: Teal/Blue tones
- Gray scale for UI elements
- White backgrounds with subtle borders
- Card-based layouts

## Notable Features
- Multi-tenant architecture
- Role-based access control
- Real-time notifications
- Points/rewards system
- Social engagement features
- Employee recognition
- Survey capabilities
