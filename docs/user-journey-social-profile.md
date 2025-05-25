
# User Journey: Social Feed & Profile Pages

## Social Feed Page Journey

### Entry Points
1. **Direct Navigation**: User clicks on social navigation from sidebar
2. **Post Notification**: User clicks on notification about a post/comment
3. **Recognition Link**: User clicks on recognition from celebration center

### Main User Flow - Social Feed (`/social`)

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Landing on    │    │  Authentication  │    │   Social Feed   │
│  Social Page    │───▶│     Check        │───▶│    Loaded       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   Redirect to    │    │  User Sees:     │
                       │   Auth Page      │    │  • Posts        │
                       │ (if not logged)  │    │  • Wallet       │
                       └──────────────────┘    │  • Celebrations │
                                               │  • Sidebar      │
                                               └─────────────────┘
```

### User Actions on Social Feed

#### 1. Creating Content
```
Post Creation Flow:
User clicks "What's on your mind?" → Opens post creator → Types content → Clicks "Post" → Post appears in feed

Recognition Flow:
User clicks "Recognize Someone" → Opens recognition modal → Selects recipient → Chooses badge → Adds message → Sends recognition → Recognition post appears

Poll Flow:
User clicks "Create Poll" → Opens poll modal → Adds question & options → Publishes → Poll appears in feed
```

#### 2. Engaging with Content
```
Reaction Flow:
User sees post → Clicks like/celebrate → Reaction counter updates → User's reaction highlighted

Comment Flow:
User sees post → Clicks comment → Types response → Submits → Comment appears below post

Poll Participation:
User sees poll → Clicks option → Vote registered → Results update with percentages
```

#### 3. Sidebar Interactions
```
Wallet Widget:
User sees balance → Can click to view transactions → Links to shop for spending

Celebrations:
User sees birthdays/anniversaries → Can click "Celebrate" → Sends celebration reaction

Last Thanked:
User sees team members → Can click "+" to recognize → Opens recognition modal
```

---

## Profile Page Journey (`/user/profile`)

### Entry Points
1. **Avatar Click**: User clicks on their avatar in navigation
2. **Profile Link**: User clicks "Profile" in sidebar menu
3. **Direct URL**: User navigates directly to profile URL

### Main User Flow - Profile Page

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Click Profile │    │    Load User     │    │   Profile Page  │
│     Avatar      │───▶│      Data        │───▶│    Rendered     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │  Show Loading    │    │  User Sees:     │
                       │    Spinner       │    │  • Cover Photo  │
                       │ (if data slow)   │    │  • Avatar       │
                       └──────────────────┘    │  • Tabs         │
                                               │  • Contact Info │
                                               └─────────────────┘
```

### Profile Page Sections & User Actions

#### 1. Header Section
```
Cover Photo Area:
User sees gradient background → Can click "Edit User" → Toggles edit mode

Avatar Management:
User sees current avatar → Clicks camera icon → Selects new image → Image compressed & uploaded → Avatar updates

Profile Info Display:
User sees name, title, completion percentage → Edit mode allows updating fields
```

#### 2. Tab Navigation
```
About Me Tab (Default):
├── Contact Information
│   ├── Email (read-only)
│   ├── Phone (editable)
│   ├── Title (editable)
│   └── Department (editable)
├── Responsibilities (editable text area)
├── Important Dates
│   ├── Hire Date (display only)
│   └── Birthday (display only)
└── History Section (placeholder)

Appreciations Tab:
└── Placeholder for recognition received

Highlights Tab:
└── Placeholder for achievements
```

#### 3. Right Sidebar
```
Personality Section:
User sees "The Champion" type → Description of personality traits

People Like You:
User sees similar colleagues → Avatars of similar personality types

Interests Section:
User sees interest badges → Each shows count of people with same interest → Link to company-wide interests

Strengths Section:
User sees strength badges → Each shows count → Similar to interests display
```

#### 4. Edit Mode Flow
```
Edit Toggle:
User clicks "Edit User" → Form fields become editable → Save/Cancel buttons appear

Field Updates:
User modifies fields → Clicks "Edit Profile" → API call sent → Success toast shown → Edit mode disabled

Avatar Upload:
User clicks camera → File picker opens → Image selected → Compression applied → Upload API called → UI updates
```

---

## Key User Experience Patterns

### Loading States
- **Skeleton Loading**: Social feed shows animated placeholders while posts load
- **Spinner Loading**: Profile page shows spinner while user data loads
- **Progressive Loading**: Images load after text content

### Error Handling
- **Auth Redirect**: Unauthenticated users redirected to `/auth`
- **Toast Notifications**: Success/error messages for all actions
- **Fallback Data**: Default values shown when data missing

### Responsive Behavior
- **Mobile**: Sidebar collapses, three-column layout becomes single column
- **Tablet**: Adjusted spacing and component sizing
- **Desktop**: Full three-column layout with sidebars

### Real-time Updates
- **Live Feed**: New posts appear without refresh
- **Reaction Updates**: Like counts update in real-time
- **Comment Sync**: New comments appear immediately

---

## Technical Implementation Notes

### Key Components Used
- **Social Page**: `PostCreator`, `Post`, `Comments`, `RecognitionModal`, `PollModal`, `WalletWidget`, `CelebrationCenter`
- **Profile Page**: Tabs, Avatar upload, Form handling, Progress indicators

### API Endpoints
- **Social**: `/api/social/posts`, `/api/social/comments`, `/api/social/reactions`
- **Profile**: `/api/users/me`, `/api/users/avatar`
- **Points**: `/api/points/balance`

### State Management
- **React Query**: Caching and synchronization
- **Local State**: Form data and UI toggles
- **Session Storage**: Authentication state
