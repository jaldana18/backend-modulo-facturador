# Sistema de Logs de Actividad de Usuarios

## Descripción General

Este sistema permite rastrear y almacenar las acciones de negocio que realizan los usuarios en el sistema, complementando los logs técnicos de Winston. Los logs de actividad se almacenan en una tabla dedicada (`activity_logs`) para facilitar su consulta desde el frontend.

## Características

- **Logs de Negocio**: Registra acciones comprensibles para usuarios finales
- **Logs Técnicos**: Los logs de Winston siguen funcionando para debugging
- **Doble Registro**: Cada actividad se guarda en ambos sistemas
- **Consultas Optimizadas**: Índices para búsquedas rápidas
- **Estadísticas**: Métricas de actividad por tipo y usuario

## Tipos de Actividad

### Inventario
- `inventory_upload`: Carga masiva de inventario
- `inventory_adjustment`: Ajuste de inventario
- `inventory_transfer`: Transferencia entre bodegas
- `inventory_receive`: Recepción de mercancía

### Productos
- `product_create`: Creación de producto
- `product_update`: Actualización de producto
- `product_delete`: Eliminación de producto
- `product_bulk_upload`: Carga masiva de productos

### Ventas
- `sale_create`: Nueva venta
- `sale_cancel`: Cancelación de venta
- `sale_payment_received`: Pago recibido

### Clientes
- `customer_create`: Nuevo cliente
- `customer_update`: Actualización de cliente
- `customer_credit_increase`: Aumento de crédito
- `customer_credit_decrease`: Descuento de cartera

### Usuarios
- `user_login`: Inicio de sesión
- `user_logout`: Cierre de sesión
- `user_create`: Nuevo usuario
- `user_update`: Actualización de usuario
- `user_password_reset`: Restablecimiento de contraseña

### Bodegas
- `warehouse_create`: Nueva bodega
- `warehouse_update`: Actualización de bodega

### Lotes
- `batch_create`: Nuevo lote
- `batch_allocate`: Asignación de lote
- `batch_expire`: Lote expirado

### Pagos
- `payment_create`: Nuevo pago
- `payment_void`: Anulación de pago

## Uso en el Código

### Ejemplo 1: Registrar carga masiva de inventario

\`\`\`typescript
import { loggers } from '../config/logger';
import { ActivityType } from '../entities/ActivityLog.entity';

// En BulkInventoryService.ts
await loggers.logActivity({
  companyId,
  userId,
  activityType: ActivityType.INVENTORY_UPLOAD,
  description: `Cargó ${successCount} productos al inventario`,
  entityType: 'inventory',
  metadata: {
    totalRows: data.length,
    successCount,
    errorCount,
    totalQuantity: result.summary.totalQuantity,
    totalCost: result.summary.totalCost,
  },
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
});
\`\`\`

### Ejemplo 2: Registrar creación de venta

\`\`\`typescript
await loggers.logActivity({
  companyId,
  userId,
  activityType: ActivityType.SALE_CREATE,
  description: `Creó venta #${sale.saleNumber} por $${sale.totalAmount}`,
  entityType: 'sale',
  entityId: sale.id,
  entityName: sale.saleNumber,
  metadata: {
    customerId: sale.customerId,
    customerName: sale.customer.name,
    totalAmount: sale.totalAmount,
    productCount: sale.items.length,
  },
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
});
\`\`\`

### Ejemplo 3: Registrar descuento de cartera

\`\`\`typescript
await loggers.logActivity({
  companyId,
  userId,
  activityType: ActivityType.CUSTOMER_CREDIT_DECREASE,
  description: `Aplicó descuento de $${payment.amount} a ${customer.name}`,
  entityType: 'customer',
  entityId: customer.id,
  entityName: customer.name,
  metadata: {
    paymentId: payment.id,
    amount: payment.amount,
    previousBalance: customer.currentBalance + payment.amount,
    newBalance: customer.currentBalance,
  },
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
});
\`\`\`

### Ejemplo 4: Registrar ajuste de inventario

\`\`\`typescript
await loggers.logActivity({
  companyId,
  userId,
  activityType: ActivityType.INVENTORY_ADJUSTMENT,
  description: `Ajustó inventario de ${product.name}: ${previousStock} → ${newStock}`,
  entityType: 'product',
  entityId: product.id,
  entityName: product.name,
  metadata: {
    warehouseId,
    warehouseName: warehouse.name,
    previousStock,
    newStock,
    difference: newStock - previousStock,
    reason: dto.reason,
  },
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
});
\`\`\`

## Endpoints API

### GET /api/v1/activity-logs
Obtener logs de actividad con paginación y filtros

**Query Parameters:**
- `page`: Número de página (default: 1)
- `limit`: Items por página (default: 50)
- `userId`: Filtrar por usuario
- `activityType`: Filtrar por tipo de actividad
- `entityType`: Filtrar por tipo de entidad (product, sale, customer, etc.)
- `startDate`: Fecha inicial
- `endDate`: Fecha final
- `search`: Buscar en descripción y nombre de entidad

**Ejemplo:**
\`\`\`bash
GET /api/v1/activity-logs?page=1&limit=20&activityType=sale_create&startDate=2025-11-01
\`\`\`

### GET /api/v1/activity-logs/stats
Obtener estadísticas de actividad agrupadas por tipo

**Query Parameters:**
- `days`: Días a incluir en estadísticas (default: 30)

**Respuesta:**
\`\`\`json
[
  {
    "activityType": "sale_create",
    "count": 145
  },
  {
    "activityType": "inventory_upload",
    "count": 23
  }
]
\`\`\`

### GET /api/v1/activity-logs/most-active-users
Obtener usuarios más activos

**Query Parameters:**
- `days`: Días a analizar (default: 30)
- `limit`: Número de usuarios (default: 10)

**Respuesta:**
\`\`\`json
[
  {
    "userId": 5,
    "firstName": "Juan",
    "lastName": "Pérez",
    "email": "juan@example.com",
    "activityCount": 342
  }
]
\`\`\`

### GET /api/v1/activity-logs/my-recent
Obtener actividades recientes del usuario actual

**Query Parameters:**
- `limit`: Número de actividades (default: 10)

## Implementación en Servicios Existentes

### Lugares donde agregar logs de actividad:

1. **BulkInventoryService** - Al completar carga masiva ✅
2. **BulkProductService** - Al completar carga masiva de productos
3. **SaleService** - Al crear/cancelar ventas
4. **PaymentService** - Al registrar pagos
5. **CustomerService** - Al crear/actualizar/ajustar crédito
6. **ProductService** - Al crear/actualizar/eliminar productos
7. **InventoryService** - Al hacer ajustes/transferencias
8. **AuthService** - Al login/logout/reset password
9. **BatchService** - Al crear/asignar lotes

## Consideraciones

1. **Rendimiento**: Los logs se guardan de forma asíncrona para no afectar el performance
2. **Errores**: Si falla el guardado en BD, se registra en Winston pero no se interrumpe la operación
3. **Retención**: Considerar política de limpieza de logs antiguos (ej: 6 meses)
4. **Privacidad**: No guardar datos sensibles en metadata (contraseñas, tokens, etc.)
5. **Descripción**: Usar lenguaje claro y orientado al usuario final

## Frontend Integration

Los logs pueden mostrarse en:
- Dashboard con actividad reciente
- Panel de auditoría para administradores
- Perfil de usuario con su historial
- Reportes de actividad por período
- Notificaciones de acciones importantes

## Migración

Para aplicar la tabla de activity_logs:

\`\`\`bash
npm run build
npm run migration:run
\`\`\`

La migración `1732748000000-CreateActivityLogs.ts` creará la tabla y los índices necesarios.
