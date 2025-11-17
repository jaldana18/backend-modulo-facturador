# Sistema de Inventario Multi-Compañía - Diseño Técnico

## Resumen Ejecutivo

Sistema de gestión de inventario multi-tenant con soporte para múltiples compañías, almacenes y trazabilidad completa. Arquitectura basada en Node.js/TypeScript, SQL Server, con enfoque en seguridad, auditoría y escalabilidad.

### Características Clave
- **Multi-tenant**: Tabla única con tenant_id (company_id) y Row-Level Security
- **Multi-almacén**: Soporte para múltiples ubicaciones por compañía
- **Auditoría completa**: Logging de todas las operaciones críticas
- **Seguridad**: JWT + RBAC + encriptación de datos sensibles
- **Escalabilidad**: Diseño para 5-50 compañías, 10-100 usuarios concurrentes

---

## 1. Stack Tecnológico

### Backend Core
- **Runtime**: Node.js 20 LTS
- **Lenguaje**: TypeScript 5.x (strict mode)
- **Framework**: Express.js 4.x
- **ORM**: **TypeORM** (recomendado para SQL Server + TypeScript)
  - Excelente soporte para SQL Server
  - Migrations robustas
  - Decoradores TypeScript nativos
  - Soporte para Row-Level Security

### Base de Datos
- **DBMS**: SQL Server 2019+
- **Features utilizadas**:
  - Row-Level Security (RLS) para multi-tenancy
  - Temporal Tables para auditoría automática
  - Índices filtrados para performance por tenant
  - Stored Procedures para operaciones complejas

### Librerías Principales
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "typeorm": "^0.3.17",
    "mssql": "^10.0.0",
    "reflect-metadata": "^0.1.13",
    "axios": "^1.6.0",
    "winston": "^3.11.0",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.1.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/express": "^4.17.21",
    "typescript": "^5.3.0",
    "ts-node": "^10.9.0",
    "nodemon": "^3.0.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "eslint": "^8.55.0",
    "@typescript-eslint/parser": "^6.15.0",
    "@typescript-eslint/eslint-plugin": "^6.15.0"
  }
}
```

---

## 2. Arquitectura del Sistema

### 2.1 Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                     Cliente (Frontend)                       │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS/JWT
┌────────────────────────▼────────────────────────────────────┐
│                   API Gateway / Load Balancer                │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Express.js API Server                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Middleware Layer                            │   │
│  │  • JWT Validation    • Rate Limiting                 │   │
│  │  • Tenant Context    • Request Logging               │   │
│  │  • Error Handling    • Security Headers              │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Controller Layer                            │   │
│  │  Companies | Users | Warehouses | Products |         │   │
│  │  Inventory | Movements | Reports                     │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Service Layer (Business Logic)              │   │
│  │  • Multi-tenant isolation • Business rules           │   │
│  │  • Transaction management • Validations              │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Repository Layer (Data Access)              │   │
│  │  TypeORM Repositories + Custom Queries               │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   SQL Server Database                        │
│  • Row-Level Security  • Temporal Tables                    │
│  • Filtered Indexes    • Audit Logs                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 External Integrations                        │
│  • Axios HTTP Client  • Third-party APIs                    │
│  • Winston Logger (File + Console)                          │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Estructura de Directorios

```
backend/
├── src/
│   ├── config/              # Configuración centralizada
│   │   ├── database.ts      # TypeORM config
│   │   ├── logger.ts        # Winston logger setup
│   │   └── environment.ts   # Env variables validation
│   │
│   ├── entities/            # TypeORM entities (modelos de BD)
│   │   ├── Company.entity.ts
│   │   ├── User.entity.ts
│   │   ├── Warehouse.entity.ts
│   │   ├── Product.entity.ts
│   │   ├── InventoryMovement.entity.ts
│   │   └── AuditLog.entity.ts
│   │
│   ├── repositories/        # Data access layer
│   │   ├── BaseRepository.ts
│   │   ├── CompanyRepository.ts
│   │   ├── ProductRepository.ts
│   │   └── InventoryRepository.ts
│   │
│   ├── services/            # Business logic
│   │   ├── AuthService.ts
│   │   ├── CompanyService.ts
│   │   ├── InventoryService.ts
│   │   ├── WarehouseService.ts
│   │   └── AuditService.ts
│   │
│   ├── controllers/         # HTTP request handlers
│   │   ├── AuthController.ts
│   │   ├── CompanyController.ts
│   │   ├── ProductController.ts
│   │   ├── InventoryController.ts
│   │   └── WarehouseController.ts
│   │
│   ├── middleware/          # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── tenantContext.middleware.ts
│   │   ├── errorHandler.middleware.ts
│   │   ├── requestLogger.middleware.ts
│   │   └── rateLimiter.middleware.ts
│   │
│   ├── dto/                 # Data Transfer Objects
│   │   ├── auth/
│   │   ├── product/
│   │   └── inventory/
│   │
│   ├── types/               # TypeScript types & interfaces
│   │   ├── express.d.ts     # Express request extensions
│   │   └── common.types.ts
│   │
│   ├── utils/               # Utilidades
│   │   ├── encryption.util.ts
│   │   ├── jwt.util.ts
│   │   └── validators.util.ts
│   │
│   ├── routes/              # Definición de rutas
│   │   ├── index.ts         # Router principal
│   │   ├── auth.routes.ts
│   │   ├── company.routes.ts
│   │   ├── product.routes.ts
│   │   └── inventory.routes.ts
│   │
│   ├── migrations/          # TypeORM migrations
│   │   └── YYYYMMDDHHMMSS-*.ts
│   │
│   ├── seeds/               # Data seeding
│   │   └── initial-data.seed.ts
│   │
│   ├── app.ts               # Express app setup
│   └── server.ts            # Entry point
│
├── tests/                   # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── logs/                    # Application logs
├── .env.example
├── .env
├── .gitignore
├── tsconfig.json
├── package.json
├── jest.config.js
└── README.md
```

---

## 3. Modelo de Datos

### 3.1 Esquema de Base de Datos

#### Tabla: Companies (Compañías)
```sql
CREATE TABLE companies (
    id INT PRIMARY KEY IDENTITY(1,1),
    name NVARCHAR(200) NOT NULL,
    legal_name NVARCHAR(300),
    tax_id NVARCHAR(50) UNIQUE NOT NULL, -- Encriptado
    email NVARCHAR(200),
    phone NVARCHAR(50),
    address NVARCHAR(500),
    is_active BIT DEFAULT 1,
    settings NVARCHAR(MAX), -- JSON con configuraciones
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),

    INDEX idx_companies_active (is_active),
    INDEX idx_companies_tax_id (tax_id)
);
```

#### Tabla: Users (Usuarios)
```sql
CREATE TABLE users (
    id INT PRIMARY KEY IDENTITY(1,1),
    company_id INT NOT NULL,
    email NVARCHAR(200) UNIQUE NOT NULL,
    password_hash NVARCHAR(500) NOT NULL,
    first_name NVARCHAR(100) NOT NULL,
    last_name NVARCHAR(100) NOT NULL,
    role NVARCHAR(50) NOT NULL, -- admin, manager, user
    is_active BIT DEFAULT 1,
    last_login DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),

    FOREIGN KEY (company_id) REFERENCES companies(id),
    INDEX idx_users_company (company_id),
    INDEX idx_users_email (email),
    INDEX idx_users_active (company_id, is_active)
);
```

#### Tabla: Warehouses (Almacenes)
```sql
CREATE TABLE warehouses (
    id INT PRIMARY KEY IDENTITY(1,1),
    company_id INT NOT NULL,
    code NVARCHAR(50) NOT NULL,
    name NVARCHAR(200) NOT NULL,
    address NVARCHAR(500),
    city NVARCHAR(100),
    state NVARCHAR(100),
    country NVARCHAR(100),
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),

    FOREIGN KEY (company_id) REFERENCES companies(id),
    UNIQUE (company_id, code),
    INDEX idx_warehouses_company (company_id),
    INDEX idx_warehouses_active (company_id, is_active)
);
```

#### Tabla: Products (Productos)
```sql
CREATE TABLE products (
    id INT PRIMARY KEY IDENTITY(1,1),
    company_id INT NOT NULL,
    sku NVARCHAR(100) NOT NULL,
    name NVARCHAR(300) NOT NULL,
    description NVARCHAR(MAX),
    category NVARCHAR(100),
    unit_of_measure NVARCHAR(50) NOT NULL, -- unit, kg, liter, etc.
    minimum_stock DECIMAL(18,4) DEFAULT 0,
    reorder_point DECIMAL(18,4) DEFAULT 0,
    cost DECIMAL(18,4), -- Encriptado
    price DECIMAL(18,4), -- Encriptado
    is_active BIT DEFAULT 1,
    metadata NVARCHAR(MAX), -- JSON para campos adicionales
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),

    FOREIGN KEY (company_id) REFERENCES companies(id),
    UNIQUE (company_id, sku),
    INDEX idx_products_company (company_id),
    INDEX idx_products_sku (company_id, sku),
    INDEX idx_products_active (company_id, is_active),
    INDEX idx_products_category (company_id, category)
);
```

#### Tabla: Inventory (Inventario por Almacén)
```sql
CREATE TABLE inventory (
    id INT PRIMARY KEY IDENTITY(1,1),
    company_id INT NOT NULL,
    product_id INT NOT NULL,
    warehouse_id INT NOT NULL,
    quantity DECIMAL(18,4) DEFAULT 0,
    reserved_quantity DECIMAL(18,4) DEFAULT 0,
    available_quantity AS (quantity - reserved_quantity) PERSISTED,
    last_movement_date DATETIME2,
    updated_at DATETIME2 DEFAULT GETDATE(),

    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    UNIQUE (company_id, product_id, warehouse_id),
    INDEX idx_inventory_company (company_id),
    INDEX idx_inventory_product (company_id, product_id),
    INDEX idx_inventory_warehouse (company_id, warehouse_id),
    INDEX idx_inventory_available (company_id, available_quantity)
);
```

#### Tabla: Inventory_Movements (Movimientos de Inventario)
```sql
CREATE TABLE inventory_movements (
    id INT PRIMARY KEY IDENTITY(1,1),
    company_id INT NOT NULL,
    product_id INT NOT NULL,
    warehouse_id INT NOT NULL,
    movement_type NVARCHAR(50) NOT NULL, -- in, out, transfer, adjustment
    quantity DECIMAL(18,4) NOT NULL,
    reference_number NVARCHAR(100),
    notes NVARCHAR(1000),
    created_by INT NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),

    -- Para transferencias entre almacenes
    destination_warehouse_id INT,

    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (destination_warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (created_by) REFERENCES users(id),

    INDEX idx_movements_company (company_id),
    INDEX idx_movements_product (company_id, product_id),
    INDEX idx_movements_warehouse (company_id, warehouse_id),
    INDEX idx_movements_date (company_id, created_at DESC),
    INDEX idx_movements_type (company_id, movement_type)
);
```

#### Tabla: Audit_Logs (Auditoría)
```sql
CREATE TABLE audit_logs (
    id INT PRIMARY KEY IDENTITY(1,1),
    company_id INT NOT NULL,
    user_id INT NOT NULL,
    entity_type NVARCHAR(100) NOT NULL, -- Company, Product, Inventory, etc.
    entity_id INT NOT NULL,
    action NVARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE
    old_values NVARCHAR(MAX), -- JSON
    new_values NVARCHAR(MAX), -- JSON
    ip_address NVARCHAR(50),
    user_agent NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE(),

    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (user_id) REFERENCES users(id),

    INDEX idx_audit_company (company_id),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_date (company_id, created_at DESC)
);
```

### 3.2 Row-Level Security (RLS)

```sql
-- Crear función de seguridad inline
CREATE FUNCTION dbo.fn_tenantAccessPredicate(@company_id INT)
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN (
    SELECT 1 AS fn_securitypredicate_result
    WHERE @company_id = CAST(SESSION_CONTEXT(N'TenantId') AS INT)
        OR IS_MEMBER('db_owner') = 1
);
GO

-- Aplicar políticas de seguridad a las tablas principales
CREATE SECURITY POLICY TenantAccessPolicy
    ADD FILTER PREDICATE dbo.fn_tenantAccessPredicate(company_id) ON dbo.products,
    ADD FILTER PREDICATE dbo.fn_tenantAccessPredicate(company_id) ON dbo.inventory,
    ADD FILTER PREDICATE dbo.fn_tenantAccessPredicate(company_id) ON dbo.inventory_movements,
    ADD FILTER PREDICATE dbo.fn_tenantAccessPredicate(company_id) ON dbo.warehouses,
    ADD FILTER PREDICATE dbo.fn_tenantAccessPredicate(company_id) ON dbo.users
WITH (STATE = ON);
GO
```

### 3.3 Temporal Tables para Auditoría Automática

```sql
-- Habilitar versionado temporal en tablas críticas
ALTER TABLE products
ADD
    ValidFrom DATETIME2 GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    ValidTo DATETIME2 GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (ValidFrom, ValidTo);
GO

ALTER TABLE products
SET (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.products_history));
GO
```

---

## 4. API REST - Especificación de Endpoints

### 4.1 Autenticación

#### POST /api/auth/login
```typescript
Request:
{
  "email": "user@company.com",
  "password": "securePassword123"
}

Response:
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": 1,
      "email": "user@company.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "companyId": 1
    }
  }
}
```

#### POST /api/auth/refresh
```typescript
Request:
{
  "refreshToken": "eyJhbGc..."
}

Response:
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc..."
  }
}
```

#### POST /api/auth/logout
```typescript
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Logout successful"
}
```

### 4.2 Compañías

#### GET /api/companies/:id
```typescript
Headers: Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Acme Corp",
    "legalName": "Acme Corporation Inc.",
    "email": "info@acme.com",
    "phone": "+1-555-0123",
    "isActive": true
  }
}
```

#### PUT /api/companies/:id
```typescript
Request:
{
  "name": "Acme Corporation",
  "phone": "+1-555-0124"
}

Response:
{
  "success": true,
  "data": { /* updated company */ }
}
```

### 4.3 Productos

#### GET /api/products
```typescript
Query params:
  - page=1
  - limit=20
  - search=keyword
  - category=electronics
  - isActive=true

Response:
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "sku": "PROD-001",
        "name": "Product Name",
        "category": "electronics",
        "unitOfMeasure": "unit",
        "price": 99.99,
        "isActive": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

#### POST /api/products
```typescript
Request:
{
  "sku": "PROD-002",
  "name": "New Product",
  "description": "Product description",
  "category": "electronics",
  "unitOfMeasure": "unit",
  "minimumStock": 10,
  "reorderPoint": 20,
  "cost": 50.00,
  "price": 99.99
}

Response:
{
  "success": true,
  "data": { /* created product */ }
}
```

#### PUT /api/products/:id
#### DELETE /api/products/:id

### 4.4 Almacenes

#### GET /api/warehouses
```typescript
Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "WH-01",
      "name": "Main Warehouse",
      "address": "123 Main St",
      "city": "New York",
      "isActive": true
    }
  ]
}
```

#### POST /api/warehouses
#### PUT /api/warehouses/:id
#### DELETE /api/warehouses/:id

### 4.5 Inventario

#### GET /api/inventory
```typescript
Query params:
  - warehouseId=1
  - productId=5
  - minQuantity=10
  - page=1
  - limit=50

Response:
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "product": {
          "id": 1,
          "sku": "PROD-001",
          "name": "Product Name"
        },
        "warehouse": {
          "id": 1,
          "code": "WH-01",
          "name": "Main Warehouse"
        },
        "quantity": 100,
        "reservedQuantity": 10,
        "availableQuantity": 90,
        "lastMovementDate": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": { /* ... */ }
  }
}
```

#### GET /api/inventory/low-stock
```typescript
Response:
{
  "success": true,
  "data": [
    {
      "product": { /* ... */ },
      "warehouse": { /* ... */ },
      "availableQuantity": 5,
      "minimumStock": 10,
      "reorderPoint": 20,
      "deficit": 5
    }
  ]
}
```

#### POST /api/inventory/movements
```typescript
Request:
{
  "productId": 1,
  "warehouseId": 1,
  "movementType": "in", // in, out, transfer, adjustment
  "quantity": 50,
  "referenceNumber": "PO-2024-001",
  "notes": "Purchase order receipt",
  "destinationWarehouseId": null // solo para transfers
}

Response:
{
  "success": true,
  "data": {
    "movement": { /* created movement */ },
    "updatedInventory": { /* updated inventory record */ }
  }
}
```

#### POST /api/inventory/transfer
```typescript
Request:
{
  "productId": 1,
  "sourceWarehouseId": 1,
  "destinationWarehouseId": 2,
  "quantity": 10,
  "referenceNumber": "TRF-2024-001",
  "notes": "Transfer between warehouses"
}

Response:
{
  "success": true,
  "data": {
    "sourceMovement": { /* ... */ },
    "destinationMovement": { /* ... */ },
    "sourceInventory": { /* ... */ },
    "destinationInventory": { /* ... */ }
  }
}
```

#### GET /api/inventory/movements
```typescript
Query params:
  - warehouseId=1
  - productId=5
  - movementType=in
  - startDate=2024-01-01
  - endDate=2024-01-31
  - page=1
  - limit=50

Response:
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "product": { /* ... */ },
        "warehouse": { /* ... */ },
        "movementType": "in",
        "quantity": 50,
        "referenceNumber": "PO-2024-001",
        "notes": "Purchase order receipt",
        "createdBy": {
          "id": 1,
          "firstName": "John",
          "lastName": "Doe"
        },
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": { /* ... */ }
  }
}
```

### 4.6 Reportes

#### GET /api/reports/inventory-value
```typescript
Query params:
  - warehouseId=1 (optional)
  - asOfDate=2024-01-31 (optional)

Response:
{
  "success": true,
  "data": {
    "totalValue": 125000.50,
    "byWarehouse": [
      {
        "warehouse": { /* ... */ },
        "value": 75000.30,
        "itemCount": 150
      }
    ],
    "byCategory": [
      {
        "category": "electronics",
        "value": 50000.20,
        "itemCount": 80
      }
    ]
  }
}
```

#### GET /api/reports/movement-history
```typescript
Query params:
  - startDate=2024-01-01
  - endDate=2024-01-31
  - groupBy=day|week|month

Response:
{
  "success": true,
  "data": {
    "period": "2024-01",
    "summary": {
      "totalIn": 1500,
      "totalOut": 1200,
      "totalTransfers": 50
    },
    "byDay": [
      {
        "date": "2024-01-15",
        "in": 100,
        "out": 80,
        "transfers": 5
      }
    ]
  }
}
```

---

## 5. Implementación de Seguridad

### 5.1 JWT Authentication

```typescript
// src/utils/jwt.util.ts
interface JWTPayload {
  userId: number;
  companyId: number;
  role: string;
  email: string;
}

export const generateAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: '15m'
  });
};

export const generateRefreshToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: '7d'
  });
};
```

### 5.2 Tenant Context Middleware

```typescript
// src/middleware/tenantContext.middleware.ts
import { Request, Response, NextFunction } from 'express';

export const tenantContextMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user; // Desde auth middleware

    // Establecer contexto de tenant en SQL Server
    await req.dataSource.query(
      `EXEC sp_set_session_context @key = N'TenantId', @value = @0`,
      [user.companyId]
    );

    next();
  } catch (error) {
    next(error);
  }
};
```

### 5.3 Encriptación de Datos Sensibles

```typescript
// src/utils/encryption.util.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

export const decrypt = (encryptedData: string): string => {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};
```

### 5.4 RBAC (Role-Based Access Control)

```typescript
// src/middleware/auth.middleware.ts
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      });
    }

    next();
  };
};

// Uso en rutas:
router.delete('/products/:id',
  authenticateToken,
  requireRole('admin', 'manager'),
  ProductController.delete
);
```

---

## 6. Logger Configuration (Winston)

```typescript
// src/config/logger.ts
import winston from 'winston';
import path from 'path';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'inventory-api' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Combined logs
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      maxsize: 5242880,
      maxFiles: 10
    }),
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.userId,
      companyId: req.user?.companyId
    });
  });

  next();
};
```

---

## 7. Plan de Implementación (Roadmap)

### Fase 1: Infraestructura Base (Semana 1)
- [ ] Setup del proyecto (package.json, tsconfig, estructura de directorios)
- [ ] Configuración de TypeORM + SQL Server
- [ ] Configuración de Winston Logger
- [ ] Setup de variables de entorno
- [ ] Middleware básicos (CORS, helmet, rate limiting)
- [ ] Error handling global

### Fase 2: Autenticación y Seguridad (Semana 2)
- [ ] Implementar entities: Company, User
- [ ] Sistema de autenticación JWT
- [ ] Middleware de tenant context
- [ ] Row-Level Security en SQL Server
- [ ] Encriptación de campos sensibles
- [ ] Sistema de roles y permisos

### Fase 3: Módulo de Productos (Semana 3)
- [ ] Entity Product
- [ ] CRUD completo de productos
- [ ] Validaciones con class-validator
- [ ] Búsqueda y filtrado
- [ ] Tests unitarios

### Fase 4: Módulo de Almacenes (Semana 3-4)
- [ ] Entity Warehouse
- [ ] CRUD de almacenes
- [ ] Validaciones multi-tenant
- [ ] Tests

### Fase 5: Módulo de Inventario (Semana 4-5)
- [ ] Entities: Inventory, InventoryMovement
- [ ] Sistema de movimientos (in, out, transfer, adjustment)
- [ ] Actualización automática de stock
- [ ] Validación de stock disponible
- [ ] Reservas de inventario
- [ ] Tests de lógica de negocio

### Fase 6: Auditoría Completa (Semana 5-6)
- [ ] Entity AuditLog
- [ ] Service de auditoría
- [ ] Decoradores para auditoria automática
- [ ] Temporal tables setup
- [ ] Consultas de historial

### Fase 7: Reportes (Semana 6)
- [ ] Reporte de valor de inventario
- [ ] Reporte de movimientos
- [ ] Stock bajo / reorder alerts
- [ ] Dashboard stats

### Fase 8: Testing y Optimización (Semana 7)
- [ ] Tests de integración
- [ ] Tests E2E
- [ ] Optimización de queries
- [ ] Performance profiling
- [ ] Documentación API (Swagger)

### Fase 9: Deployment (Semana 8)
- [ ] Docker setup
- [ ] CI/CD pipeline
- [ ] Monitoring setup
- [ ] Backup strategy
- [ ] Documentation final

---

## 8. Configuración de Desarrollo

### 8.1 TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strictPropertyInitialization": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 8.2 TypeORM Configuration

```typescript
// src/config/database.ts
import { DataSource } from 'typeorm';
import { join } from 'path';

export const AppDataSource = new DataSource({
  type: 'mssql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [join(__dirname, '../entities/**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../migrations/**/*{.ts,.js}')],
  synchronize: false, // NUNCA usar en producción
  logging: process.env.NODE_ENV === 'development',
  options: {
    encrypt: true, // Para Azure SQL
    trustServerCertificate: process.env.NODE_ENV === 'development'
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000
  }
});
```

### 8.3 Environment Variables

```bash
# .env.example
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=YourStrongPassword123
DB_NAME=inventory_db

# JWT
JWT_SECRET=your-secret-key-min-32-chars-long
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=your-64-char-hex-key-for-aes-256

# Logger
LOG_LEVEL=debug

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3001
```

---

## 9. Mejores Prácticas y Consideraciones

### 9.1 Performance
- **Índices filtrados**: Crear índices con `WHERE company_id = X` para queries por tenant
- **Paginación obligatoria**: Nunca retornar listas completas sin paginación
- **Caching**: Implementar Redis para catálogos que no cambian frecuentemente
- **Connection pooling**: Configurar pool size según carga esperada
- **Query optimization**: Usar EXPLAIN para analizar queries lentas

### 9.2 Seguridad
- **Principio de menor privilegio**: Usuario de BD con permisos mínimos necesarios
- **Input validation**: Validar TODOS los inputs con class-validator
- **SQL Injection**: TypeORM previene la mayoría, pero cuidado con queries raw
- **Rate limiting**: Implementar límites por IP y por usuario
- **HTTPS obligatorio**: Nunca exponer API sin TLS en producción

### 9.3 Escalabilidad
- **Stateless API**: Diseñar para poder escalar horizontalmente
- **Database read replicas**: Considerar replicas para reportes pesados
- **Background jobs**: Usar bull/agenda para procesos asíncronos
- **Monitoring**: Implementar APM (Application Performance Monitoring)

### 9.4 Mantenibilidad
- **Migrations**: NUNCA modificar migrations aplicadas, crear nuevas
- **Semantic versioning**: Versionar API (v1, v2)
- **Documentation**: Mantener Swagger/OpenAPI actualizado
- **Tests**: Mínimo 80% code coverage

---

## 10. Ejemplo de Entity con TypeORM

```typescript
// src/entities/Product.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';
import { Company } from './Company.entity';

@Entity('products')
@Index(['companyId', 'sku'], { unique: true })
@Index(['companyId', 'isActive'])
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @ManyToOne(() => Company)
  company: Company;

  @Column({ length: 100 })
  sku: string;

  @Column({ length: 300 })
  name: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  description: string;

  @Column({ length: 100, nullable: true })
  category: string;

  @Column({ name: 'unit_of_measure', length: 50 })
  unitOfMeasure: string;

  @Column({
    name: 'minimum_stock',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0
  })
  minimumStock: number;

  @Column({
    name: 'reorder_point',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0
  })
  reorderPoint: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
    transformer: {
      to: (value: number) => encrypt(value?.toString() || ''),
      from: (value: string) => parseFloat(decrypt(value))
    }
  })
  cost: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
    transformer: {
      to: (value: number) => encrypt(value?.toString() || ''),
      from: (value: string) => parseFloat(decrypt(value))
    }
  })
  price: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  metadata: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

---

## 11. Próximos Pasos

1. **Revisión y aprobación** de este diseño
2. **Preguntas de aclaración** adicionales si es necesario
3. **Iniciar Fase 1** del plan de implementación
4. **Setup del repositorio** y configuración inicial

---

## Contacto y Soporte

Para preguntas o aclaraciones sobre este diseño:
- Revisar secciones específicas del documento
- Solicitar ejemplos de código adicionales
- Ajustar alcance o tecnologías según necesidades

**Versión del documento**: 1.0
**Fecha**: 2025-01-12
**Estado**: Pendiente de aprobación
