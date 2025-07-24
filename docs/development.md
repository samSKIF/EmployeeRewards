# Development Setup

This project relies on environment variables for connecting to databases and other services. A sample configuration is provided in `.env.example`.

## 1. Create your `.env` file

Copy the example file and modify the values for your local environment:

```bash
cp .env.example .env
```

Edit `.env` and update the connection strings for PostgreSQL, MongoDB and any optional services such as Redis or Elasticsearch. At a minimum you should provide:

- `DATABASE_URL` – PostgreSQL connection string
- `MONGODB_URL` or `MONGODB_URI` – MongoDB connection string (optional if you don't need social features)
- `REDIS_URL` – Redis connection string (optional)
- `JWT_SECRET` – secret used to sign JSON Web Tokens

Additional variables are included in the example file with placeholder values. Replace them as needed for your environment.

## 2. Provision the databases

After configuring the `.env` file, run the migrations to create the required tables:

```bash
npm run db:push
```

This sets up the PostgreSQL schema. MongoDB collections are created automatically on first use.

## 3. Start the development server

With the databases configured you can start the application:

```bash
npm run dev
```

The API and frontend will be available at `http://localhost:5000`.