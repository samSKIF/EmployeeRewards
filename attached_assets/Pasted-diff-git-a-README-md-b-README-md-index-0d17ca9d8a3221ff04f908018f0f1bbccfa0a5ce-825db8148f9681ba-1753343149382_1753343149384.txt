diff --git a/README.md b/README.md
index 0d17ca9d8a3221ff04f908018f0f1bbccfa0a5ce..825db8148f9681bacb0710d132213e1d3dc759c3 100644
--- a/README.md
+++ b/README.md
@@ -49,56 +49,56 @@ A comprehensive, modular HR and employee engagement platform built with React, T
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
    npm run db:push
    ```
 
 3. **Environment Configuration**
-   Create a `.env` file with your database configurations:
-   ```env
-   DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
-   MONGODB_URI="mongodb://localhost:27017/social_db"
-   REDIS_URL="redis://localhost:6379" # Optional
+   Copy the provided example and update the values:
+   ```bash
+   cp .env.example .env
    ```
+   Edit `.env` to set your database connection strings and secrets.
+   See [docs/development.md](docs/development.md) for a full explanation.
 
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
