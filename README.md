
# Employee Engagement Platform

A comprehensive, modular employee engagement platform built with React, TypeScript, Express, and modern web technologies. This platform provides social features, recognition systems, leave management, spaces/groups, surveys, and administrative tools for modern workplaces.

## 🚀 Features

### Core Modules
- **Social Feed & Engagement** - Real-time social interactions, posts, comments, and reactions
- **Recognition & Rewards System** - Peer-to-peer recognition with points-based rewards
- **Leave Management** - Complete leave request and approval workflow
- **Spaces & Groups Management** - Workplace communities and interest groups
- **Survey System** - Custom surveys with multiple question types and analytics
- **Employee Directory** - Comprehensive employee management and profiles
- **Admin Dashboard** - Full administrative control panel
- **Shop & Marketplace** - Points redemption system with rewards catalog

### Technical Features
- **Microservices Architecture** - Modular, scalable backend services
- **Real-time Communication** - WebSocket support for live updates
- **Multi-tenant SaaS** - Support for multiple organizations
- **Role-based Access Control** - Granular permissions system
- **File Upload & Management** - Avatar and document handling
- **Internationalization** - Multi-language support (EN, ES, FR, AR, RU)
- **Responsive Design** - Mobile-first, modern UI

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Shadcn/UI** component library
- **TanStack Query** for data fetching
- **Wouter** for routing
- **React Hook Form** for form management

### Backend
- **Node.js** with Express
- **TypeScript** throughout
- **PostgreSQL** with Drizzle ORM
- **MongoDB** for social features
- **Redis** for caching (optional)
- **NestJS** microservices
- **WebSocket** for real-time features

### Infrastructure
- **Vite** for development and build
- **ESLint & Prettier** for code quality
- **File upload** handling with multer
- **JWT** authentication

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- PostgreSQL database
- MongoDB database (optional, for social features)

### Installation

1. **Clone and Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   ```bash
   # Run database migrations
   npm run migrate
   
   # Seed sample data (optional)
   node create-saas-sample-data.js
   ```

3. **Environment Configuration**
   Create a `.env` file with your database configurations:
   ```env
   DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
   MONGODB_URI="mongodb://localhost:27017/social_db"
   REDIS_URL="redis://localhost:6379" # Optional
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5000`

## 🏗 Architecture

### Project Structure
```
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and configurations
├── server/                # Backend services
│   ├── services/          # Microservices (social, recognition, leave)
│   ├── api/              # API route handlers
│   ├── middleware/       # Express middleware
│   └── mongodb/          # MongoDB integration
├── shared/               # Shared types and schemas
└── docs/                # Documentation
```

### Microservices
The platform uses a hybrid monolithic + microservices architecture:

- **Main Server** (`server/index.ts`) - Primary API and routing
- **Social Service** - Handles posts, comments, reactions
- **Recognition Service** - Manages peer recognition and rewards
- **Leave Service** - Leave request workflows

## 📱 Available Scripts

### Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Database
- `npm run migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle studio for database management

### Utilities
- `node create-saas-sample-data.js` - Generate sample data
- `node setup-tenant-companies.js` - Set up multi-tenant data

## 🔧 Configuration

### Workflows
The project includes several predefined workflows accessible via the Run button:

- **Hybrid System** (Default) - Runs main server + client
- **Current System** - Legacy monolithic setup
- **All Microservices** - Full microservices architecture
- **Microservices** - Core microservices only

### Database Schema
The platform uses:
- **PostgreSQL** - Primary database for users, organizations, core data
- **MongoDB** - Social features, posts, comments (optional)
- **Redis** - Caching and session management (optional)

## 🎯 Key Features

### Employee Management
- Complete employee directory with search and filters
- Bulk import from CSV/Excel
- Role-based permissions (Admin, Manager, Employee)
- Department and location-based access controls

### Social Features
- Real-time social feed with posts, comments, likes
- Photo and file sharing
- @mentions and notifications
- Interest-based groups and spaces

### Recognition System
- Peer-to-peer recognition with customizable categories
- Points-based reward system
- Recognition analytics and leaderboards
- Manager recognition tools

### Leave Management
- Leave request submission and approval workflows
- Holiday calendar integration
- Leave balance tracking
- Email notifications

### Surveys & Analytics
- Drag-and-drop survey builder
- Multiple question types (single choice, multiple choice, rating, text)
- Real-time response analytics
- Template library for common surveys

## 🔐 Authentication & Security

- JWT-based authentication
- Role-based access control (RBAC)
- Multi-tenant data isolation
- File upload security and validation
- SQL injection protection with prepared statements

## 🌍 Internationalization

Supports multiple languages:
- English (en)
- Spanish (es) 
- French (fr)
- Arabic (ar)
- Russian (ru)

## 📊 Admin Features

- **Dashboard** - Key metrics and system overview
- **User Management** - Employee lifecycle management
- **Group Management** - Spaces and community oversight
- **Survey Management** - Survey creation and analytics
- **Recognition Settings** - Configure recognition categories and points
- **Shop Configuration** - Manage rewards catalog
- **Branding** - Customize company branding and themes

## 🚀 Deployment

The application is designed to run on Replit with optimized configurations:

- Single port (5000) serves both API and frontend
- Automatic static file serving in production
- Health check endpoints for monitoring
- Optimized for Replit's infrastructure

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support and questions:
- Check the `docs/` directory for detailed documentation
- Review the user journey documentation
- Contact the development team

---

**Built with ❤️ for modern workplace engagement**
