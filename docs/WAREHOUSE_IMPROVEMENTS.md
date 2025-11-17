# Cambios Implementados - Sistema de Inventario Multi-Almacén

## Resumen de Cambios

Se implementaron 4 mejoras principales al sistema de inventario para mejorar el control de almacenes:

---

## 1. ✅ Campo `warehouse_id` en Token JWT

### Cambios realizados:
- **JWTPayload** (`common.types.ts`): Agregado campo opcional `warehouseId?: number | null`
- **User Entity** (`User.entity.ts`): Agregado campo `warehouseId` en la base de datos
- **AuthService**: El token ahora incluye el `warehouseId` del usuario
- **Auth Middleware**: Inyecta `warehouseId` en `req.user`

### Comportamiento:
- **Admin/Manager**: `warehouseId` es `null` (acceso a todos los almacenes)
- **User**: `warehouseId` contiene el ID del almacén asignado

### Migración requerida:
```bash
npm run migration:run
```

Archivo: `1731900000000-AddWarehouseIdToUsers.ts`

---

## 2. ✅ Campo `warehouseId` OBLIGATORIO en Carga Masiva

### Cambios realizados:
- **BulkTransactionDto**: Campo `warehouseId` ahora es **OBLIGATORIO**
- **InventoryService**: Métodos `bulkInbound` y `bulkOutbound` requieren `warehouseId`
- **InventoryController**: Pasa `warehouseId` a los servicios

### Endpoints afectados:

#### POST `/api/v1/inventory/bulk/inbound`
```json
{
  "warehouseId": 2,          // ← NUEVO: OBLIGATORIO
  "items": [
    {
      "productId": 1,
      "quantity": 100,
      "unitCost": 15.50,
      "reference": "FAC-001"
    }
  ],
  "reason": "PURCHASE",
  "notes": "Compra proveedor XYZ"
}
```

#### POST `/api/v1/inventory/bulk/outbound`
```json
{
  "warehouseId": 2,          // ← NUEVO: OBLIGATORIO
  "items": [
    {
      "productId": 1,
      "quantity": 10,
      "reference": "VENTA-001"
    }
  ],
  "reason": "SALE",
  "notes": "Venta cliente ABC"
}
```

---

## 3. ✅ Nuevos Endpoints de Administración de Inventario

### GET `/api/v1/inventory/warehouses/summary`
Retorna resumen de inventario de **TODOS** los almacenes.

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "warehouse": {
        "id": 1,
        "code": "BOD-001",
        "name": "Bodega Principal",
        "isMain": true,
        "address": "Calle 123, Ciudad",
        "managerName": "Juan Pérez"
      },
      "stats": {
        "currentStock": 5000,
        "totalInbound": 10000,
        "totalOutbound": 4500,
        "totalAdjustments": -500,
        "uniqueProducts": 150,
        "transactionCount": 850
      },
      "lastActivity": {
        "date": "2025-11-17T10:30:00Z",
        "type": "OUTBOUND",
        "reason": "SALE"
      }
    },
    {
      "warehouse": {
        "id": 2,
        "code": "PV-001",
        "name": "Punto de Venta Centro",
        "isMain": false,
        "address": "Av. Principal 456",
        "managerName": "María González"
      },
      "stats": {
        "currentStock": 1200,
        "totalInbound": 3000,
        "totalOutbound": 1750,
        "totalAdjustments": -50,
        "uniqueProducts": 80,
        "transactionCount": 320
      },
      "lastActivity": {
        "date": "2025-11-17T15:45:00Z",
        "type": "INBOUND",
        "reason": "TRANSFER_IN"
      }
    }
  ]
}
```

### GET `/api/v1/inventory/warehouses/:warehouseId/summary`
Retorna resumen **DETALLADO** de un almacén específico.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "warehouse": {
      "id": 2,
      "code": "PV-001",
      "name": "Punto de Venta Centro",
      "isMain": false,
      "address": "Av. Principal 456, Ciudad, Estado, 12345, País",
      "managerName": "María González",
      "phone": "555-1234",
      "email": "pv-centro@empresa.com"
    },
    "stats": {
      "currentStock": 1200,
      "totalInbound": 3000,
      "totalOutbound": 1750,
      "totalAdjustments": -50,
      "uniqueProducts": 80,
      "transactionCount": 320
    },
    "products": [
      {
        "productId": 1,
        "productName": "Producto A",
        "productSku": "SKU-001",
        "currentStock": 50,
        "lastUpdated": "2025-11-17T10:30:00Z"
      },
      {
        "productId": 2,
        "productName": "Producto B",
        "productSku": "SKU-002",
        "currentStock": 30,
        "lastUpdated": "2025-11-17T09:15:00Z"
      }
    ],
    "recentTransactions": [
      {
        "id": 1234,
        "type": "OUTBOUND",
        "reason": "SALE",
        "quantity": -5,
        "productName": "Producto A",
        "reference": "VENTA-001",
        "createdAt": "2025-11-17T15:45:00Z"
      }
    ]
  }
}
```

**Casos de uso:**
- Dashboard de administración para visualizar estado de todos los almacenes
- Reportes de inventario por ubicación
- Monitoreo de actividad por almacén

---

## 4. ✅ Middleware de Filtrado por Almacén

### Archivo: `warehouseFilter.middleware.ts`

### Dos variantes de middleware:

#### A. `warehouseFilterMiddleware`
- **Auto-asigna** el `warehouseId` del usuario si no se proporciona
- **Valida** que el usuario solo acceda a su almacén asignado
- Uso: Endpoints de escritura (POST, PUT)

#### B. `validateWarehouseAccess`
- **Solo valida** sin auto-asignar
- **No modifica** la petición
- Uso: Endpoints de lectura (GET)

### Lógica de permisos:

| Rol       | Comportamiento                                |
|-----------|-----------------------------------------------|
| **admin** | ✅ Acceso a TODOS los almacenes (sin filtro) |
| **manager** | ✅ Acceso a TODOS los almacenes (sin filtro) |
| **user**  | ⚠️ Solo acceso a SU almacén asignado         |

### Validaciones para usuarios 'user':

1. **Si `warehouseId` en body:**
   - Valida que coincida con el almacén asignado
   - Rechaza si es diferente (403)

2. **Si NO hay `warehouseId` en body:**
   - Auto-asigna el almacén del usuario

3. **Si `warehouseId` en query/params:**
   - Valida que coincida con el almacén asignado
   - Rechaza si es diferente (403)

### Endpoints protegidos:

```typescript
// Con auto-asignación
router.post('/adjust', requireRole('admin', 'manager', 'user'), 
  warehouseFilterMiddleware, inventoryController.adjustStock);

router.post('/bulk/inbound', requireRole('admin', 'manager', 'user'), 
  warehouseFilterMiddleware, inventoryController.bulkInbound);

router.post('/bulk/outbound', requireRole('admin', 'manager', 'user'), 
  warehouseFilterMiddleware, inventoryController.bulkOutbound);

router.post('/transactions', requireRole('admin', 'manager', 'user'), 
  warehouseFilterMiddleware, inventoryController.createTransaction);

router.post('/transfer', requireRole('admin', 'manager', 'user'), 
  warehouseFilterMiddleware, inventoryController.transferBetweenWarehouses);
```

### Respuestas de error:

```json
// Usuario sin almacén asignado
{
  "success": false,
  "error": {
    "code": "NO_WAREHOUSE_ASSIGNED",
    "message": "User does not have a warehouse assigned"
  }
}

// Intento de acceder a otro almacén
{
  "success": false,
  "error": {
    "code": "WAREHOUSE_ACCESS_DENIED",
    "message": "You can only access your assigned warehouse"
  }
}
```

---

## Configuración de Usuarios

### Asignar almacén a un usuario:

**Opción 1: Al crear usuario (endpoint admin)**
```json
POST /api/v1/users
{
  "email": "usuario@empresa.com",
  "password": "password123",
  "firstName": "Juan",
  "lastName": "Operador",
  "role": "user",
  "warehouseId": 2  // ← Asignar almacén
}
```

**Opción 2: Actualizar usuario existente**
```json
PUT /api/v1/users/:id
{
  "warehouseId": 2
}
```

**Opción 3: Directamente en base de datos**
```sql
UPDATE users 
SET warehouse_id = 2 
WHERE id = 123 AND role = 'user';
```

---

## Migración a Producción

### 1. Ejecutar migración
```bash
npm run migration:run
```

### 2. Asignar almacenes a usuarios existentes con rol 'user'
```sql
-- Ver usuarios sin almacén asignado
SELECT id, email, first_name, last_name, role 
FROM users 
WHERE role = 'user' AND warehouse_id IS NULL;

-- Asignar almacén según necesidad
UPDATE users 
SET warehouse_id = 1 -- ID del almacén principal
WHERE role = 'user' AND warehouse_id IS NULL;
```

### 3. Reiniciar servidor
```bash
npm run dev
```

---

## Ejemplos de Uso

### Escenario 1: Usuario de punto de venta

**Usuario:**
- Email: `operador-pv@empresa.com`
- Role: `user`
- Warehouse: `2` (Punto de Venta Centro)

**Operación permitida:**
```json
POST /api/v1/inventory/transactions
{
  "productId": 1,
  "warehouseId": 2,  // ✅ Su almacén
  "type": "OUTBOUND",
  "reason": "SALE",
  "quantity": 5
}
```

**Operación bloqueada:**
```json
POST /api/v1/inventory/transactions
{
  "productId": 1,
  "warehouseId": 1,  // ❌ Otro almacén
  "type": "OUTBOUND",
  "reason": "SALE",
  "quantity": 5
}
// Error 403: WAREHOUSE_ACCESS_DENIED
```

**Operación con auto-asignación:**
```json
POST /api/v1/inventory/transactions
{
  "productId": 1,
  // Sin warehouseId
  "type": "OUTBOUND",
  "reason": "SALE",
  "quantity": 5
}
// ✅ Sistema auto-asigna warehouseId: 2
```

### Escenario 2: Manager/Admin

**Usuario:**
- Email: `admin@empresa.com`
- Role: `admin`
- Warehouse: `null`

**Operación en cualquier almacén:**
```json
POST /api/v1/inventory/transactions
{
  "productId": 1,
  "warehouseId": 1,  // ✅ Cualquier almacén
  "type": "INBOUND",
  "reason": "PURCHASE",
  "quantity": 100
}

POST /api/v1/inventory/transactions
{
  "productId": 2,
  "warehouseId": 2,  // ✅ Cualquier almacén
  "type": "OUTBOUND",
  "reason": "SALE",
  "quantity": 10
}
```

---

## Verificación

### 1. Verificar migración
```sql
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'warehouse_id';
```

### 2. Verificar token JWT
```bash
# Hacer login y decodificar token en jwt.io
# Debe contener: { warehouseId: 2 } para usuarios 'user'
```

### 3. Probar endpoints
```bash
# GET resumen de todos los almacenes
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/api/v1/inventory/warehouses/summary

# GET resumen de almacén específico
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/api/v1/inventory/warehouses/2/summary
```

---

## Notas Importantes

⚠️ **Breaking Changes:**
- `BulkTransactionDto` ahora REQUIERE `warehouseId`
- Actualizar clientes/frontend para enviar `warehouseId` en bulk operations

✅ **Retrocompatibilidad:**
- Endpoints individuales siguen funcionando con `warehouseId` opcional
- Si no se envía, usa almacén principal (como antes)

🔒 **Seguridad:**
- Usuarios 'user' NO pueden acceder a datos de otros almacenes
- Intentos de acceso se registran en logs de seguridad
