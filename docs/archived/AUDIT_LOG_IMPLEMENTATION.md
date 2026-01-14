# Sistema de Audit Logs en Base de Datos

## 📋 Resumen

Se ha implementado un sistema completo de audit logs almacenado en base de datos SQL Server para rastrear todas las acciones de los usuarios en el sistema de inventario.

## ✅ Componentes Implementados

### 1. **Entidad AuditLog** (`src/entities/AuditLog.entity.ts`)
Tabla optimizada con índices para queries eficientes:
- **Índices compuestos**: `company_id + created_at`, `user_id + created_at`
- **Índices simples**: `action`, `entity_type + entity_id`, `module`, `created_at`
- **Relaciones**: Foreign keys a `companies` y `users`

### 2. **Migración** (`src/migrations/1764200000000-CreateAuditLogs.ts`)
✅ **Ejecutada exitosamente** - Tabla `audit_logs` creada con:
- 15 columnas optimizadas
- 6 índices estratégicos
- 2 foreign keys con políticas de eliminación

### 3. **Servicio AuditLogDatabaseService** (`src/services/AuditLogDatabaseService.ts`)
Métodos principales:
- `createLog()` - Crear registro de auditoría
- `getLogs()` - Consulta con filtros avanzados y paginación
- `getEntityHistory()` - Historial de una entidad específica
- `getUserActivity()` - Actividad de un usuario
- `getStats()` - Estadísticas agregadas
- `deleteOldLogs()` - Política de retención

### 4. **Utilidades de Logging** (`src/utils/audit-log.util.ts`)
Funciones helper pre-configuradas:
- `logUserCreation()`, `logUserUpdate()`, `logUserStatusChange()`
- `logProductCreation()`, `logProductUpdate()`, `logProductStatusChange()`
- `logInventoryTransaction()`
- `logCustomerCreation()`, `logCustomerUpdate()`
- `logWarehouseCreation()`, `logWarehouseUpdate()`
- `logSaleCreation()`
- `logAuthAttempt()`
- `logBulkOperation()`

### 5. **Controlador y Rutas** (`src/controllers/AuditLogDatabaseController.ts`, `src/routes/audit-log-db.routes.ts`)
Endpoints REST disponibles:
- `GET /api/v1/audit-logs-db` - Listado con filtros
- `GET /api/v1/audit-logs-db/entity/:entityType/:entityId` - Historial de entidad
- `GET /api/v1/audit-logs-db/user/:userId` - Actividad de usuario
- `GET /api/v1/audit-logs-db/stats` - Estadísticas
- `GET /api/v1/audit-logs-db/filters/actions` - Acciones disponibles
- `GET /api/v1/audit-logs-db/filters/entity-types` - Tipos de entidad
- `GET /api/v1/audit-logs-db/filters/modules` - Módulos disponibles

### 6. **Documentación Swagger**
✅ Actualizado en `src/config/swagger.ts` con:
- Tag "Audit Logs Database"
- Schema `AuditLog` completo
- Documentación de todos los endpoints

## 📊 Estructura de Datos

### Campos Principales

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int | ID autoincremental |
| `companyId` | int | Empresa (multi-tenancy) |
| `userId` | int | Usuario que realizó la acción |
| `action` | varchar(50) | Tipo de acción (CREATE, UPDATE, DELETE, etc.) |
| `entityType` | varchar(100) | Tipo de entidad afectada |
| `entityId` | int | ID de la entidad afectada |
| `description` | nvarchar(500) | Descripción legible |
| `ipAddress` | varchar(45) | IP del usuario |
| `userAgent` | nvarchar(500) | Navegador/cliente |
| `oldValues` | nvarchar(MAX) | Valores anteriores (JSON) |
| `newValues` | nvarchar(MAX) | Valores nuevos (JSON) |
| `metadata` | nvarchar(MAX) | Metadatos adicionales (JSON) |
| `severity` | varchar(20) | info, warning, critical |
| `module` | varchar(50) | Módulo del sistema |
| `createdAt` | datetime2 | Timestamp |

### Acciones Soportadas (Enum `AuditAction`)
- **CRUD**: CREATE, UPDATE, DELETE, READ
- **Estado**: ACTIVATE, DEACTIVATE
- **Auth**: LOGIN, LOGOUT, LOGIN_FAILED, PASSWORD_RESET
- **Inventario**: STOCK_IN, STOCK_OUT, STOCK_ADJUSTMENT, STOCK_TRANSFER
- **Ventas**: SALE_CREATED, SALE_CANCELLED, PAYMENT_RECEIVED
- **Bulk**: BULK_IMPORT, BULK_UPDATE, BULK_DELETE
- **Config**: CONFIG_CHANGE

### Entidades Rastreadas (Enum `AuditEntity`)
- User, Product, Customer, Warehouse
- InventoryTransaction, Sale, SaleDetail, Payment
- PaymentMethod, Category, UnitOfMeasure, Company, InventoryBatch

## 🔧 Guía de Integración

### Ejemplo 1: Logging Manual en un Servicio

```typescript
import { logProductCreation, AuditAction, AuditEntity } from '../utils/audit-log.util';

// En ProductService.ts
async create(req: Request, data: CreateProductDto) {
  const product = await this.repository.save(data);

  // Log de auditoría
  await logProductCreation(req, product.id, {
    sku: product.sku,
    name: product.name,
    price: product.price
  });

  return product;
}
```

### Ejemplo 2: Logging de Actualización con Cambios

```typescript
import { logProductUpdate } from '../utils/audit-log.util';

async update(req: Request, id: number, data: UpdateProductDto) {
  const product = await this.repository.findOne({ where: { id } });

  const oldData = { ...product };
  Object.assign(product, data);
  await this.repository.save(product);

  // Log con valores anteriores y nuevos
  await logProductUpdate(req, product.id, oldData, data, product.name);

  return product;
}
```

### Ejemplo 3: Logging de Transacción de Inventario

```typescript
import { logInventoryTransaction } from '../utils/audit-log.util';

async createTransaction(req: Request, data: CreateTransactionDto) {
  const transaction = await this.repository.save(data);
  const product = await this.productRepo.findOne({ where: { id: data.productId } });

  await logInventoryTransaction(
    req,
    transaction.id,
    transaction.type, // 'inbound', 'outbound', etc.
    product.name,
    transaction.quantity,
    transaction.warehouseId
  );

  return transaction;
}
```

### Ejemplo 4: Logging de Autenticación

```typescript
import { logAuthAttempt } from '../utils/audit-log.util';

async login(req: Request, credentials: LoginDto) {
  try {
    const user = await this.validateCredentials(credentials);

    await logAuthAttempt(req, true, credentials.email, user.id);

    return { token: this.generateToken(user) };
  } catch (error) {
    await logAuthAttempt(req, false, credentials.email);
    throw error;
  }
}
```

## 🔍 Consultas al Frontend

### Endpoint Principal para el Frontend
```
GET /api/v1/audit-logs-db?page=1&limit=50&sortOrder=DESC
```

### Filtros Disponibles
```typescript
interface QueryParams {
  // Filtros
  userId?: number;              // Filtrar por usuario específico
  action?: string[];            // CREATE, UPDATE, DELETE, etc.
  entityType?: string[];        // Product, User, Customer, etc.
  entityId?: number;            // ID de entidad específica
  severity?: string[];          // info, warning, critical
  module?: string[];            // inventory, sales, users, etc.
  startDate?: string;           // ISO 8601 date
  endDate?: string;             // ISO 8601 date
  search?: string;              // Búsqueda en description

  // Paginación
  page?: number;                // Default: 1
  limit?: number;               // Default: 50, Max: 500
  sortOrder?: 'ASC' | 'DESC';   // Default: DESC

  // Admin only
  companyId?: number;           // Filtrar por empresa
}
```

### Respuesta del Endpoint
```typescript
{
  success: true,
  data: {
    logs: [
      {
        id: 1,
        companyId: 1,
        userId: 5,
        user: {
          id: 5,
          email: "usuario@example.com",
          firstName: "Juan",
          lastName: "Pérez"
        },
        action: "CREATE",
        entityType: "Product",
        entityId: 123,
        description: "Usuario creó producto 'Laptop Dell XPS 15' (SKU: PROD-001)",
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0...",
        oldValues: null,
        newValues: "{\"sku\":\"PROD-001\",\"name\":\"Laptop Dell XPS 15\",\"price\":1299.99}",
        metadata: "{\"warehouseId\":1}",
        severity: "info",
        module: "products",
        createdAt: "2024-01-15T10:30:00.000Z"
      }
    ],
    pagination: {
      page: 1,
      limit: 50,
      total: 150,
      totalPages: 3
    }
  }
}
```

## 📈 Performance y Escalabilidad

### Optimizaciones Implementadas
1. **Índices Compuestos**: Queries por empresa + fecha son O(log n)
2. **Paginación Eficiente**: OFFSET/FETCH en BD, no en memoria
3. **Lazy Loading**: Relación `user` cargada solo cuando se necesita
4. **Política de Retención**: Método `deleteOldLogs()` para limpiar datos antiguos

### Políticas de Retención Recomendadas
```typescript
// Ejecutar como cron job mensual
const auditService = new AuditLogDatabaseService();
await auditService.deleteOldLogs(90); // Mantener últimos 90 días
```

### Estimación de Almacenamiento
- Promedio por registro: ~2 KB
- 10,000 acciones/día: ~20 MB/día
- 90 días de retención: ~1.8 GB

## 🚀 Próximos Pasos

### Recomendaciones de Implementación

1. **Integrar en Servicios Existentes** (Prioridad Alta)
   - [ ] ProductService - CREATE, UPDATE, DELETE, ACTIVATE/DEACTIVATE
   - [ ] UserService - CREATE, UPDATE, DELETE, ACTIVATE/DEACTIVATE
   - [ ] CustomerService - CREATE, UPDATE, DELETE
   - [ ] WarehouseService - CREATE, UPDATE, DELETE
   - [ ] InventoryService - Todas las transacciones
   - [ ] SaleService - CREATE, CANCEL
   - [ ] AuthService - LOGIN, LOGOUT, LOGIN_FAILED

2. **Configurar Política de Retención** (Prioridad Media)
   ```typescript
   // Agregar a un cron job o tarea programada
   import { AuditLogDatabaseService } from '../services/AuditLogDatabaseService';

   async function cleanupOldLogs() {
     const service = new AuditLogDatabaseService();
     const deleted = await service.deleteOldLogs(90); // 90 días
     console.log(`Deleted ${deleted} old audit logs`);
   }
   ```

3. **Crear Panel de Auditoría en Frontend** (Prioridad Media)
   - Dashboard con estadísticas en tiempo real
   - Filtros avanzados por usuario, acción, entidad, fecha
   - Visualización de historial de cambios (diff de oldValues vs newValues)
   - Exportación a CSV/Excel

4. **Implementar Alertas** (Prioridad Baja)
   - Alertas en tiempo real para acciones críticas
   - Detección de patrones sospechosos
   - Notificaciones para múltiples intentos de login fallidos

## 📝 Notas Importantes

- **Multi-tenancy**: Todos los logs están aislados por `companyId`
- **Usuarios No-Admin**: Solo pueden ver logs de su empresa
- **Usuarios Admin**: Pueden ver logs de todas las empresas con filtro `?companyId=X`
- **Seguridad**: IPs y User-Agents almacenados para análisis forense
- **JSON Fields**: `oldValues`, `newValues`, `metadata` son strings JSON, parsear en frontend

## 🎯 Ventajas del Sistema

✅ **Escalable**: Índices optimizados para millones de registros
✅ **Eficiente**: Paginación real en BD, no en memoria
✅ **Auditable**: Cumple con requisitos de auditoría y compliance
✅ **Rastreable**: Historial completo de quién hizo qué y cuándo
✅ **Forense**: IPs y user agents para investigación de seguridad
✅ **Flexible**: Metadata JSON permite extensión sin cambios de schema

## 📞 Soporte

Para consultas o problemas con el sistema de audit logs, referirse a:
- Entidad: `src/entities/AuditLog.entity.ts`
- Servicio: `src/services/AuditLogDatabaseService.ts`
- Rutas: `src/routes/audit-log-db.routes.ts`
- Utils: `src/utils/audit-log.util.ts`
