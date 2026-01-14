# Resumen de Implementación de Logs de Actividad

## ✅ Logs Implementados

### 1. **Carga Masiva de Inventario** (`BulkInventoryService`)
- **Acción:** Carga masiva de productos al inventario
- **Tipo:** `INVENTORY_UPLOAD`
- **Descripción:** "Cargó X productos al inventario (Y unidades, $Z)"
- **Metadata:** totalRows, successCount, errorCount, totalQuantity, totalCost, batchesCreated

### 2. **Ventas** (`SaleService`)

#### a. Crear Venta
- **Acción:** Creación de factura/cotización
- **Tipo:** `SALE_CREATE`
- **Descripción:** "Creó factura/cotización NUMERO por $MONTO"
- **Metadata:** saleType, customerId, totalAmount, itemCount

#### b. Cancelar Venta
- **Acción:** Cancelación de venta
- **Tipo:** `SALE_CANCEL`
- **Descripción:** "Canceló factura/cotización NUMERO por $MONTO"
- **Metadata:** saleType, totalAmount, inventoryReversed

### 3. **Clientes** (`CustomerService`)

#### a. Crear Cliente
- **Acción:** Creación de nuevo cliente
- **Tipo:** `CUSTOMER_CREATE`
- **Descripción:** "Creó cliente NOMBRE (CODIGO)"
- **Metadata:** code, documentType, documentNumber, customerType

#### b. Actualizar Cliente
- **Acción:** Actualización de datos del cliente
- **Tipo:** `CUSTOMER_UPDATE`
- **Descripción:** "Actualizó cliente NOMBRE (CODIGO)"
- **Metadata:** code, updatedFields

### 4. **Usuarios** (`UserService`)

#### a. Crear Usuario
- **Acción:** Creación de nuevo usuario
- **Tipo:** `USER_CREATE`
- **Descripción:** "Creó usuario NOMBRE (EMAIL)"
- **Metadata:** email, role

#### b. Actualizar Usuario
- **Acción:** Modificación de datos del usuario
- **Tipo:** `USER_UPDATE`
- **Descripción:** "Actualizó usuario NOMBRE (EMAIL)"
- **Metadata:** updatedFields

### 5. **Inventario - Entradas y Salidas** (`InventoryService`)

#### a. Entrada de Inventario
- **Acción:** Recepción de mercancía
- **Tipo:** `INVENTORY_RECEIVE`
- **Descripción:** "Recibió X unidades de PRODUCTO en BODEGA"
- **Metadata:** warehouseId, warehouseName, type, reason, quantity, previousStock, newStock

#### b. Salida de Inventario
- **Acción:** Retiro de mercancía
- **Tipo:** `INVENTORY_RECEIVE`
- **Descripción:** "Retiró X unidades de PRODUCTO en BODEGA"
- **Metadata:** warehouseId, warehouseName, type, reason, quantity, previousStock, newStock

#### c. Ajuste de Inventario
- **Acción:** Ajuste de stock
- **Tipo:** `INVENTORY_ADJUSTMENT`
- **Descripción:** "Ajustó X unidades de PRODUCTO en BODEGA"
- **Metadata:** warehouseId, warehouseName, type, reason, quantity, previousStock, newStock

### 6. **Pagos** (`PaymentService`)
- **Acción:** Registro de pago
- **Tipo:** `SALE_PAYMENT_RECEIVED`
- **Descripción:** "Registró pago de $MONTO para VENTA"
- **Metadata:** saleId, saleNumber, amount, paymentMethodId, customerId

## 📊 Endpoints Disponibles

### GET /api/v1/activity-logs
Consultar logs con filtros:
- `page`, `limit` - Paginación
- `userId` - Filtrar por usuario
- `activityType` - Filtrar por tipo
- `entityType` - Filtrar por entidad (product, sale, customer, etc.)
- `startDate`, `endDate` - Rango de fechas
- `search` - Buscar en descripción

### GET /api/v1/activity-logs/stats
Estadísticas de actividad por tipo (últimos 30 días por defecto)

### GET /api/v1/activity-logs/most-active-users
Usuarios más activos (últimos 30 días por defecto)

### GET /api/v1/activity-logs/my-recent
Actividades recientes del usuario actual

## 🗄️ Estructura de Datos

### Tabla: activity_logs
```sql
- id (INT, PRIMARY KEY, IDENTITY)
- company_id (INT, NOT NULL)
- user_id (INT, NOT NULL)
- activity_type (NVARCHAR(50), NOT NULL)
- activity_description (NVARCHAR(500), NOT NULL)
- entity_type (NVARCHAR(50), NULL)
- entity_id (INT, NULL)
- entity_name (NVARCHAR(200), NULL)
- metadata (NVARCHAR(MAX), NULL) -- JSON
- ip_address (NVARCHAR(50), NULL)
- user_agent (NVARCHAR(500), NULL)
- created_at (DATETIME2, DEFAULT GETDATE())
```

### Índices para Performance
- `idx_activity_logs_company_created` - (company_id, created_at)
- `idx_activity_logs_user_created` - (user_id, created_at)
- `idx_activity_logs_type_created` - (activity_type, created_at)
- `idx_activity_logs_company_type` - (company_id, activity_type)

## 🚀 Cómo Usar en el Frontend

### Ejemplo 1: Timeline de Actividad Reciente
```typescript
GET /api/v1/activity-logs/my-recent?limit=10
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "activityType": "sale_create",
      "activityDescription": "Creó factura FAC-0045 por $1,250,000.00",
      "entityType": "sale",
      "entityId": 45,
      "entityName": "FAC-0045",
      "createdAt": "2025-11-27T22:30:00Z",
      "user": {
        "firstName": "Juan",
        "lastName": "Pérez",
        "email": "juan@example.com"
      }
    }
  ]
}
```

### Ejemplo 2: Dashboard de Administrador
```typescript
// Estadísticas de actividad
GET /api/v1/activity-logs/stats?days=7

// Usuarios más activos
GET /api/v1/activity-logs/most-active-users?days=7&limit=5
```

### Ejemplo 3: Auditoría de Ventas
```typescript
GET /api/v1/activity-logs?activityType=sale_create&startDate=2025-11-01&endDate=2025-11-30&page=1&limit=50
```

### Ejemplo 4: Buscar Actividad de Cliente Específico
```typescript
GET /api/v1/activity-logs?entityType=customer&search=Juan+Perez
```

## 📝 Datos Capturados en Metadata

Cada actividad incluye metadata relevante:

- **Ventas:** saleType, customerId, totalAmount, itemCount
- **Pagos:** saleId, amount, paymentMethodId
- **Inventario:** warehouseId, quantity, previousStock, newStock
- **Clientes:** code, documentType, customerType
- **Usuarios:** email, role

## 🔄 Migración Requerida

Para aplicar la tabla de activity_logs:

```bash
npm run build
npm run migration:run
```

## ⚡ Performance

- Los logs NO bloquean las operaciones principales
- Se guardan de forma asíncrona
- Si falla el guardado, se registra en Winston pero no interrumpe la operación
- Índices optimizados para consultas por fecha, usuario y tipo

## 🎯 Próximos Pasos Sugeridos

1. **Implementar en Frontend:**
   - Timeline de actividad en dashboard
   - Panel de auditoría para administradores
   - Historial de actividad en perfil de usuario
   - Filtros avanzados para búsqueda

2. **Mejoras Futuras:**
   - Exportar logs a Excel/PDF
   - Alertas automáticas para acciones críticas
   - Retención de datos (limpiar logs > 6 meses)
   - Gráficas de actividad por período
