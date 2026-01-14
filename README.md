# Inventory Management API

Multi-company inventory management system built with Node.js, TypeScript, Express, and SQL Server.

## Features

- ✅ Multi-tenant architecture with Row-Level Security
- ✅ JWT authentication with refresh tokens
- ✅ Multi-warehouse support
- ✅ Complete audit trail
- ✅ Data encryption for sensitive fields
- ✅ Role-based access control (RBAC)
- ✅ Comprehensive logging with Winston
- ✅ Rate limiting and security best practices

## Tech Stack

- **Runtime**: Node.js 20 LTS
- **Language**: TypeScript 5.x
- **Framework**: Express.js
- **ORM**: TypeORM
- **Database**: SQL Server 2019+
- **Logger**: Winston
- **Authentication**: JWT (jsonwebtoken)

## Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- SQL Server 2019+ or Azure SQL Database
- Git

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` and set your configuration:

```env
# Database
DB_HOST=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=YourStrongPassword123!
DB_NAME=inventory_db

# JWT Secrets (change these in production!)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-characters-long

# Encryption Key (generate a secure 64-char hex key)
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

**⚠️ Security Note**: Generate secure random keys for production:

```bash
# Generate JWT secret (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate encryption key (64 hex chars = 32 bytes for AES-256)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Database Setup

#### Option A: SQL Server on Windows

1. Install SQL Server 2019+ Developer Edition
2. Enable SQL Server Authentication
3. Create a new database:

```sql
CREATE DATABASE inventory_db;
```

#### Option B: SQL Server on Docker

```bash
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourStrongPassword123!" \
  -p 1433:1433 --name sql-server \
  -d mcr.microsoft.com/mssql/server:2019-latest
```

Create database:

```bash
docker exec -it sql-server /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P "YourStrongPassword123!" \
  -Q "CREATE DATABASE inventory_db"
```

### 5. Run Migrations

```bash
npm run migration:run
```

## Development

### Start development server

```bash
npm run dev
```

The server will start on `http://localhost:3000` with hot-reload enabled.

### Build for production

```bash
npm run build
```

### Start production server

```bash
npm start
```

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.ts   # TypeORM configuration
│   │   ├── logger.ts     # Winston logger setup
│   │   └── environment.ts # Environment variables
│   ├── entities/         # TypeORM entities
│   ├── repositories/     # Data access layer
│   ├── services/         # Business logic
│   ├── controllers/      # HTTP request handlers
│   ├── middleware/       # Express middleware
│   ├── dto/              # Data Transfer Objects
│   ├── types/            # TypeScript types
│   ├── utils/            # Utilities
│   ├── routes/           # Route definitions
│   ├── migrations/       # Database migrations
│   ├── app.ts            # Express app setup
│   └── server.ts         # Entry point
├── tests/                # Test files
├── logs/                 # Application logs
└── dist/                 # Compiled JavaScript (generated)
```

## Available Scripts

- `npm run dev` - Start development server with hot-reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run migration:generate` - Generate migration from entities
- `npm run migration:run` - Run pending migrations
- `npm run migration:revert` - Revert last migration

## API Endpoints

### Health Check

```
GET /health
```

### Authentication (Coming soon)

```
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

### Companies (Coming soon)

```
GET    /api/v1/companies/:id
PUT    /api/v1/companies/:id
```

### Products (Coming soon)

```
GET    /api/v1/products
POST   /api/v1/products
GET    /api/v1/products/:id
PUT    /api/v1/products/:id
DELETE /api/v1/products/:id
```

### Inventory (Coming soon)

```
GET    /api/v1/inventory
GET    /api/v1/inventory/low-stock
POST   /api/v1/inventory/movements
POST   /api/v1/inventory/transfer
GET    /api/v1/inventory/movements
```

## Testing

Run tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

## Logging

Logs are stored in the `logs/` directory:

- `error-YYYY-MM-DD.log` - Error logs only
- `combined-YYYY-MM-DD.log` - All logs

Logs rotate daily with retention of 10 days.

## Security Features

- **Helmet.js** - Security headers
- **CORS** - Configured cross-origin resource sharing
- **Rate Limiting** - Prevent abuse
- **JWT Authentication** - Secure token-based auth
- **AES-256-GCM Encryption** - Sensitive data encryption
- **Row-Level Security** - Database-level tenant isolation
- **Input Validation** - class-validator for DTOs
- **SQL Injection Prevention** - TypeORM parameterized queries

## Multi-Tenant Architecture

This system uses a **single-table multi-tenancy** approach:

- All companies share the same tables
- `company_id` column in all tenant-scoped tables
- SQL Server Row-Level Security (RLS) enforces tenant isolation
- Session context automatically filters queries by tenant

## Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Run linter: `npm run lint:fix`
5. Ensure tests pass: `npm test`
6. Submit a pull request

## License

MIT

## Documentation

### 📚 Complete Technical Documentation

This project includes comprehensive technical documentation organized in the `/docs` folder:

- **[DESCRIPCION_PROYECTO.md](DESCRIPCION_PROYECTO.md)** - Executive summary and project overview (Spanish)
- **[DESIGN.md](DESIGN.md)** - Complete system architecture design (1317 lines)
- **[docs/README.md](docs/README.md)** - Documentation index and navigation guide

### 📂 Documentation Structure

```
docs/
├── README.md                    # Documentation index
├── features/                    # Specific feature docs
│   ├── DESCUENTOS_MANUALES.md
│   ├── METODOS_PAGO.md
│   └── TRANSACCIONES_INVENTARIO.md
├── frontend/                    # Frontend integration guides
│   ├── INTEGRATION_GUIDE.md
│   ├── CODE_EXAMPLES.md
│   └── OPTIMIZATION_GUIDE.md
├── AUDIT_LOG_SYSTEM.md          # Complete audit system
├── ACTIVITY_LOGS_SYSTEM.md      # Activity logging
├── BULK_INVENTORY_UPLOAD.md     # Bulk upload feature
├── SALES_MODULE_DESIGN.md       # Sales module design
└── WAREHOUSE_IMPROVEMENTS.md    # Warehouse improvements
```

### 🚀 Quick Links

- [API Documentation (Swagger)](http://localhost:3000/api-docs) - Interactive API docs
- [Sales Module Design](docs/SALES_MODULE_DESIGN.md) - Complete sales module specification
- [Frontend Integration](docs/frontend/INTEGRATION_GUIDE.md) - Frontend developer guide
- [Audit System](docs/AUDIT_LOG_SYSTEM.md) - Audit and logging implementation

## Support

For questions or issues, please contact the development team.

---

**Version**: 1.0.0
**Last Updated**: 2026-01-11
