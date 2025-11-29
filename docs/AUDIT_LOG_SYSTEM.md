# Sistema de Auditoría de Logs - Implementación Completa

## 📋 Resumen

Se ha implementado un **sistema completo de auditoría de operaciones de usuario** que registra y permite consultar todas las acciones realizadas en el sistema de inventario.

**Fecha de implementación:** 26/11/2025
**Versión:** 1.0

---

## ✅ Logs Agregados

### Nuevos Logs en BulkInventoryService

Se agregaron 3 nuevos tipos de logs de auditoría:

1. **`bulk_inventory_upload`** - Registro completo de carga masiva de inventario
   - Ubicación: `src/services/BulkInventoryService.ts:324`
   - Detalles registrados:
     - Total de filas procesadas
     - Éxitos y errores
     - Productos creados automáticamente
     - Lotes creados
     - Cantidad total y costo total
     - Configuración (autoCreateProducts, skipErrors)

2. **`product_auto_created`** - Producto creado automáticamente durante carga masiva
   - Ubicación: `src/services/BulkInventoryService.ts:186`
   - Detalles registrados:
     - ID del producto
     - SKU y nombre
     - Fuente (bulk_inventory_upload)
     - Número de fila en el archivo Excel

3. **`bulk_inventory_upload_row_error`** - Errores individuales durante procesamiento
   - Ubicación: `src/services/BulkInventoryService.ts:325`
   - Se registra el primer error y errores críticos
   - Incluye contexto completo del error

---

## 🎯 Operaciones de Usuario Registradas (Total: 45)

### Ventas (11 operaciones)
- ✅ `sale_created` - Venta creada
- ✅ `sale_updated` - Venta actualizada
- ✅ `sale_deleted` - Venta eliminada (solo borradores)
- ✅ `sale_confirmed` - Venta confirmada (afecta inventario)
- ✅ `sale_cancelled` - Venta cancelada
- ✅ `quote_converted_to_invoice` - Cotización → Factura
- ✅ `quote_converted_to_proforma` - Cotización → Proforma
- ✅ `credit_note_created` - Nota crédito creada
- ✅ `remission_created` - Remisión creada
- ✅ `sale_dispatched` - Venta despachada
- ✅ `sale_delivered` - Venta entregada

### Inventario (6 operaciones)
- ✅ `inventory_transaction_created` - Transacción de inventario
- ✅ `bulk_inbound_created` - Carga masiva entrada
- ✅ `bulk_outbound_created` - Carga masiva salida
- ✅ `warehouse_transfer` - Transferencia entre almacenes
- ✅ `bulk_inventory_upload` - Carga masiva desde Excel (**NUEVO**)
- ✅ `product_auto_created` - Auto-creación producto (**NUEVO**)

### Pagos (3 operaciones)
- ✅ `payment_created` - Pago registrado
- ✅ `payment_refunded` - Pago reembolsado
- ✅ `payment_cancelled` - Pago cancelado

### Productos (4 operaciones)
- ✅ `product_created` - Producto creado
- ✅ `product_updated` - Producto actualizado
- ✅ `product_deleted` - Producto desactivado
- ✅ `product_permanently_deleted` - Producto eliminado permanentemente

### Usuarios (3 operaciones)
- ✅ `user_created` - Usuario creado
- ✅ `user_updated` - Usuario actualizado
- ✅ `user_deleted` - Usuario eliminado

### Clientes (4 operaciones)
- ✅ `customer_created` - Cliente creado
- ✅ `customer_updated` - Cliente actualizado
- ✅ `customer_activated` - Cliente activado
- ✅ `customer_deactivated` - Cliente desactivado

### Empresas (3 operaciones)
- ✅ `company_created` - Empresa creada
- ✅ `company_updated` - Empresa actualizada
- ✅ `company_deleted` - Empresa eliminada

### Almacenes (3 operaciones)
- ✅ `warehouse_created` - Almacén creado
- ✅ `warehouse_updated` - Almacén actualizado
- ✅ `warehouse_deleted` - Almacén eliminado

### Categorías (3 operaciones)
- ✅ `category_created` - Categoría creada
- ✅ `category_updated` - Categoría actualizada
- ✅ `category_deleted` - Categoría eliminada/desactivada

### Métodos de Pago (3 operaciones)
- ✅ `payment_method_created` - Método de pago creado
- ✅ `payment_method_updated` - Método de pago actualizado
- ✅ `payment_method_deactivated` - Método de pago desactivado

### Autenticación (5 operaciones)
- ✅ `login_success` - Login exitoso
- ✅ `login_failed` - Login fallido
- ✅ `token_refreshed` - Token renovado
- ✅ `logout_success` - Logout exitoso
- ✅ `company_registration_success` - Registro de empresa

---

## 🚀 Nuevos Endpoints de Auditoría

### 1. GET `/api/audit-logs`
**Descripción:** Obtener logs de auditoría con filtros avanzados

**Autenticación:** Bearer Token (todos los roles)

**Query Parameters:**
```typescript
{
  startDate?: string;        // ISO 8601: "2025-11-01T00:00:00Z"
  endDate?: string;          // ISO 8601: "2025-11-26T23:59:59Z"
  level?: LogLevel[];        // ["error", "warn", "info", "http", "debug"]
  type?: LogType[];          // ["business_operation", "authentication", ...]
  operation?: string[];      // ["sale_created", "bulk_inventory_upload", ...]
  userId?: number;           // Filtrar por usuario
  companyId?: number;        // Filtrar por empresa (solo admin)
  search?: string;           // Búsqueda de texto
  page?: number;             // Página (default: 1)
  limit?: number;            // Registros por página (default: 50, max: 500)
  sortOrder?: 'asc' | 'desc'; // Ordenamiento (default: 'desc')
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "1732659347000-abc123",
        "level": "info",
        "message": "Business operation logged",
        "timestamp": "2025-11-26T19:55:47.000Z",
        "service": "inventory-api",
        "environment": "development",
        "type": "business_operation",
        "operation": "sale_created",
        "userId": 123,
        "companyId": 1,
        "details": {
          "saleId": 456,
          "saleNumber": "FAC-2025-001",
          "total": 1500.50
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1250,
      "totalPages": 25
    },
    "filters": {
      "level": ["error", "warn"],
      "type": ["business_operation"],
      "startDate": "2025-11-01T00:00:00.000Z",
      "endDate": "2025-11-26T23:59:59.000Z"
    }
  }
}
```

**Ejemplo de uso:**
```bash
# Obtener ventas de los últimos 7 días
GET /api/audit-logs?operation[]=sale_created&operation[]=sale_confirmed&startDate=2025-11-19T00:00:00Z&endDate=2025-11-26T23:59:59Z

# Obtener errores del último mes
GET /api/audit-logs?level[]=error&startDate=2025-10-26T00:00:00Z&endDate=2025-11-26T23:59:59Z

# Buscar operaciones de un usuario específico
GET /api/audit-logs?userId=123&type[]=business_operation&page=1&limit=100
```

---

### 2. GET `/api/audit-logs/stats`
**Descripción:** Obtener estadísticas de logs de auditoría

**Autenticación:** Bearer Token (todos los roles)

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "totalLogs": 15420,
    "byLevel": {
      "error": 45,
      "warn": 120,
      "info": 14500,
      "http": 650,
      "debug": 105
    },
    "byType": {
      "business_operation": 12000,
      "authentication": 1500,
      "http_request": 1800,
      "application_error": 120
    },
    "byOperation": {
      "sale_created": 3500,
      "inventory_transaction_created": 4200,
      "bulk_inventory_upload": 25,
      "product_created": 850
    },
    "lastHour": 45,
    "last24Hours": 1250,
    "last7Days": 8500
  }
}
```

---

### 3. GET `/api/audit-logs/export`
**Descripción:** Exportar logs de auditoría en formato CSV

**Autenticación:** Bearer Token (todos los roles)

**Query Parameters:** Mismos que `/api/audit-logs`

**Respuesta:** Archivo CSV
```csv
Timestamp,Level,Type,Operation,Message,User ID,Company ID,Details
2025-11-26T19:55:47.000Z,info,business_operation,sale_created,Business operation logged,123,1,"{""saleId"":456}"
```

**Ejemplo de uso:**
```bash
# Exportar todas las ventas del mes
GET /api/audit-logs/export?operation[]=sale_created&startDate=2025-11-01T00:00:00Z&endDate=2025-11-30T23:59:59Z
```

---

### 4. GET `/api/audit-logs/operations`
**Descripción:** Obtener lista de operaciones disponibles para filtros

**Autenticación:** Bearer Token (todos los roles)

**Respuesta:**
```json
{
  "success": true,
  "data": [
    "bulk_inventory_upload",
    "category_created",
    "category_updated",
    "company_created",
    "payment_created",
    "product_auto_created",
    "product_created",
    "sale_created",
    "sale_confirmed",
    "warehouse_transfer"
  ]
}
```

---

### 5. GET `/api/audit-logs/types`
**Descripción:** Obtener lista de tipos de log disponibles

**Autenticación:** Bearer Token (todos los roles)

**Respuesta:**
```json
{
  "success": true,
  "data": [
    "business_operation",
    "authentication",
    "http_request",
    "security_event",
    "application_error"
  ]
}
```

---

## 🔒 Control de Acceso

### Usuarios Normales (role: user/manager)
- ✅ Pueden ver logs de su propia empresa (`companyId` automático)
- ❌ No pueden ver logs de otras empresas
- ✅ Pueden filtrar por usuario, operación, tipo, fecha
- ✅ Pueden exportar sus propios logs

### Administradores (role: admin)
- ✅ Pueden ver logs de todas las empresas
- ✅ Pueden filtrar por `companyId` específico
- ✅ Acceso completo a todas las operaciones
- ✅ Pueden exportar logs de cualquier empresa

---

## 📁 Archivos Creados/Modificados

### Archivos Nuevos
1. ✅ `src/services/AuditLogService.ts` - Servicio de consulta de logs
2. ✅ `src/controllers/AuditLogController.ts` - Controlador de endpoints
3. ✅ `src/routes/audit-log.routes.ts` - Rutas de auditoría
4. ✅ `src/dto/audit-log/get-audit-logs.dto.ts` - DTO de validación
5. ✅ `docs/AUDIT_LOG_SYSTEM.md` - Esta documentación

### Archivos Modificados
1. ✅ `src/services/BulkInventoryService.ts` - Agregados 3 nuevos logs
2. ✅ `src/routes/index.ts` - Montada ruta `/api/audit-logs`

---

## 🧪 Pruebas

### Prueba 1: Obtener logs de operaciones de negocio
```bash
curl -X GET "http://localhost:3000/api/v1/audit-logs?type[]=business_operation&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Resultado esperado:** Lista de 10 operaciones de negocio más recientes

### Prueba 2: Obtener estadísticas
```bash
curl -X GET "http://localhost:3000/api/v1/audit-logs/stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Resultado esperado:** Estadísticas completas de logs

### Prueba 3: Exportar logs del último mes
```bash
curl -X GET "http://localhost:3000/api/v1/audit-logs/export?startDate=2025-10-26T00:00:00Z&endDate=2025-11-26T23:59:59Z" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o audit-logs.csv
```

**Resultado esperado:** Archivo CSV con logs del último mes

### Prueba 4: Obtener operaciones disponibles
```bash
curl -X GET "http://localhost:3000/api/v1/audit-logs/operations" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Resultado esperado:** Lista de todas las operaciones registradas

### Prueba 5: Filtrar por carga masiva
```bash
curl -X GET "http://localhost:3000/api/v1/audit-logs?operation[]=bulk_inventory_upload&operation[]=product_auto_created" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Resultado esperado:** Todos los logs de carga masiva y productos auto-creados

---

## 📊 Estructura de Log de Auditoría

Cada log de operación tiene la siguiente estructura:

```typescript
{
  id: string;              // UUID único generado
  level: LogLevel;         // error | warn | info | http | debug
  message: string;         // Mensaje descriptivo
  timestamp: string;       // ISO 8601 timestamp
  service: string;         // "inventory-api"
  environment: string;     // development | production
  type: LogType;          // Tipo de log
  operation?: string;     // Nombre de la operación
  userId?: number;        // ID del usuario que realizó la acción
  companyId?: number;     // ID de la empresa
  details?: object;       // Detalles específicos de la operación
}
```

### Ejemplo de Log de Venta:
```json
{
  "id": "1732659347000-abc123",
  "level": "info",
  "message": "Business operation logged",
  "timestamp": "2025-11-26T19:55:47.000Z",
  "service": "inventory-api",
  "environment": "development",
  "type": "business_operation",
  "operation": "sale_created",
  "userId": 5,
  "companyId": 1,
  "details": {
    "saleId": 123,
    "saleNumber": "FAC-2025-001",
    "saleType": "invoice",
    "total": 1500.50,
    "customerId": 45,
    "warehouseId": 2
  }
}
```

### Ejemplo de Log de Carga Masiva:
```json
{
  "id": "1732659400000-xyz789",
  "level": "info",
  "message": "Business operation logged",
  "timestamp": "2025-11-26T20:10:00.000Z",
  "service": "inventory-api",
  "environment": "development",
  "type": "business_operation",
  "operation": "bulk_inventory_upload",
  "userId": 3,
  "companyId": 1,
  "details": {
    "totalRows": 150,
    "successCount": 145,
    "errorCount": 5,
    "productsCreated": 12,
    "productsAffected": 48,
    "batchesCreated": 145,
    "totalQuantity": 5420,
    "totalCost": 2845000,
    "autoCreateProducts": true,
    "skipErrors": true,
    "hasErrors": true
  }
}
```

---

## 🔄 Integración con Frontend

Para la integración con el frontend, se recomienda usar el documento:
- **`docs/LOGS_FRONTEND_INTEGRATION.md`** - Guía completa de integración frontend

**Nota importante:** El documento de integración frontend necesita ser actualizado para enfocarse en **auditoría de operaciones de usuario** en lugar de solo logs técnicos.

---

## 🛡️ Seguridad

### Limitaciones de Acceso
- ✅ Los logs NO contienen información sensible (passwords, tokens)
- ✅ Control de acceso por rol (admin vs user)
- ✅ Usuarios solo ven logs de su empresa
- ✅ Rate limiting en endpoints de exportación

### Protección de Datos
- ✅ Los logs se almacenan en archivos locales con rotación diaria
- ✅ Retención configurable (default: según `logger.ts`)
- ✅ Sin exposición de información sensible en detalles

---

## 📈 Métricas de Performance

### Límites de Rendimiento
- **Paginación máxima:** 500 registros por página
- **Exportación máxima:** 10,000 registros
- **Rango de fechas recomendado:** 90 días
- **Archivos de log procesados:** Basado en rango de fechas

### Optimizaciones
- ✅ Lectura eficiente de archivos JSON línea por línea
- ✅ Filtrado en memoria para consultas rápidas
- ✅ Caché de archivos de log procesados (próxima mejora)
- ✅ Índices temporales para búsquedas repetidas (próxima mejora)

---

## 🚧 Próximas Mejoras

### Funcionalidades Planeadas
1. ⏳ **Dashboard de Auditoría** - Visualización en tiempo real
2. ⏳ **Alertas Automáticas** - Notificaciones para operaciones críticas
3. ⏳ **Retención Configurable** - Política de retención de logs por empresa
4. ⏳ **Búsqueda Avanzada** - Elasticsearch para búsquedas complejas
5. ⏳ **Reportes Programados** - Exportación automática semanal/mensual
6. ⏳ **Auditoría de Cambios** - Comparación antes/después en actualizaciones
7. ⏳ **Logs en Base de Datos** - Opción de persistir en SQL Server

### Optimizaciones de Performance
1. ⏳ **Caché de Resultados** - Redis para consultas frecuentes
2. ⏳ **Índices Temporales** - Acelerar búsquedas repetidas
3. ⏳ **Paginación de Archivos** - Lectura incremental de archivos grandes
4. ⏳ **Compresión de Logs** - Archivos antiguos comprimidos

---

## 📞 Soporte

Para preguntas o problemas con el sistema de auditoría:
- **Documentación técnica:** `docs/LOGS_FRONTEND_INTEGRATION.md`
- **Código fuente:** `src/services/AuditLogService.ts`
- **Ejemplos de uso:** Ver sección de Pruebas en este documento

---

**Versión del documento:** 1.0
**Última actualización:** 26/11/2025
**Autor:** Sistema de Inventario Multi-Empresa
