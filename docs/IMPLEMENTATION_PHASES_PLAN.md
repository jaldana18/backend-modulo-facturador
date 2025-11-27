# Plan de Distribución de Fases - Módulo de Ventas y Facturación

**Fecha:** 2025-11-20
**Proyecto:** Sistema de Inventario Multi-Empresa - Módulo de Ventas
**Documento Base:** SALES_MODULE_DESIGN.md

---

## Resumen Ejecutivo

Este documento presenta la distribución **PRÁCTICA** de las 6 fases de implementación, con enfoque en desarrollo incremental, validación continua y entrega de valor por fase.

**Tiempo Total Estimado:** 13 semanas
**Entidades a Crear:** 13 nuevas + 2 modificaciones
**Endpoints:** ~75 nuevos
**Complejidad:** Media-Alta

**NOTA IMPORTANTE:** La integración con DIAN para facturación electrónica se dejará para una futura implementación. Este plan se enfoca en el sistema de ventas completo sin componente de facturación electrónica.

---

## Estrategia de Implementación

### Principios Clave

1. **Incremental**: Cada fase entrega funcionalidad completa y probada
2. **Testeable**: Todas las fases incluyen pruebas funcionales
3. **Documentado**: Swagger actualizado al final de cada fase
4. **Reversible**: Migraciones con rollback para cada fase
5. **Seguro**: Validaciones de seguridad desde la Fase 1

### Enfoque de Desarrollo

- **Base de Datos First**: Crear entidades y migraciones antes de servicios
- **Service Layer First**: Lógica de negocio antes de controladores
- **API Documentation**: Swagger paralelo al desarrollo de endpoints
- **Testing Continuo**: Pruebas manuales en Postman durante desarrollo

---

## FASE 1: Fundamentos (Semanas 1-3)

### Objetivo
Establecer la base de datos y servicios fundamentales para clientes, métodos de pago y ventas básicas.

### Semana 1: Modelo de Datos Core (Días 1-5)

#### Día 1-2: Entidades TypeORM Básicas
**Archivos a crear:**
```
src/entities/
├── Customer.entity.ts          [NUEVO]
├── PaymentMethod.entity.ts     [NUEVO]
├── Sale.entity.ts              [NUEVO]
├── SaleDetail.entity.ts        [NUEVO]
└── Payment.entity.ts           [NUEVO]
```

**Tareas:**
- [ ] Crear `Customer.entity.ts` con todos los campos del diseño
- [ ] Crear `PaymentMethod.entity.ts`
- [ ] Crear `Sale.entity.ts` con enums `SaleStatus` y `SaleType`
- [ ] Crear `SaleDetail.entity.ts` con relación a Sale y Product
- [ ] Crear `Payment.entity.ts` con enum `PaymentStatus`
- [ ] Configurar relaciones entre entidades

**Validaciones:**
- Índices compuestos en Customer (companyId + code)
- Índices en Sale (companyId + saleNumber, companyId + customerId)
- Foreign keys configuradas correctamente

#### Día 3-4: Migraciones SQL Server
**Archivos a crear:**
```
src/migrations/
└── YYYYMMDDHHMMSS-CreateSalesModule.ts  [NUEVO]
```

**Tareas:**
- [ ] Generar migración con TypeORM CLI
- [ ] Validar tipos de datos para SQL Server
- [ ] Crear índices optimizados
- [ ] Ejecutar migración en BD desarrollo
- [ ] Verificar estructura en SQL Server Management Studio
- [ ] Crear script de rollback

**Validaciones:**
- Todas las tablas creadas correctamente
- Índices aplicados
- Foreign keys funcionando
- Migración reversible probada

#### Día 5: DTOs y Validaciones
**Archivos a crear:**
```
src/dto/customer/
├── create-customer.dto.ts       [NUEVO]
├── update-customer.dto.ts       [NUEVO]
└── get-customers-query.dto.ts   [NUEVO]

src/dto/payment-method/
├── create-payment-method.dto.ts [NUEVO]
└── update-payment-method.dto.ts [NUEVO]

src/dto/sale/
├── create-sale.dto.ts           [NUEVO]
├── update-sale.dto.ts           [NUEVO]
├── create-sale-detail.dto.ts    [NUEVO]
└── get-sales-query.dto.ts       [NUEVO]

src/dto/payment/
├── create-payment.dto.ts        [NUEVO]
└── payment-detail.dto.ts        [NUEVO]
```

**Tareas:**
- [ ] Implementar DTOs con class-validator
- [ ] Validaciones de documentType (CC, NIT, CE, PASSPORT)
- [ ] Validaciones de rangos numéricos (creditLimit >= 0)
- [ ] Validaciones de fechas (dueDate > saleDate)
- [ ] Validaciones de enums
- [ ] Crear DTOs de consulta con paginación

**Validaciones:**
- Probar validaciones con datos inválidos
- Verificar mensajes de error claros

### Semana 2: Servicios Base (Días 6-10)

#### Día 6-7: CustomerService
**Archivos a crear:**
```
src/services/
└── CustomerService.ts  [NUEVO]
```

**Funcionalidades:**
```typescript
class CustomerService {
  // CRUD básico
  async create(companyId: number, dto: CreateCustomerDto): Promise<Customer>
  async findAll(companyId: number, query: GetCustomersQuery): Promise<PaginatedResult<Customer>>
  async findOne(companyId: number, id: number): Promise<Customer>
  async update(companyId: number, id: number, dto: UpdateCustomerDto): Promise<Customer>
  async deactivate(companyId: number, id: number): Promise<void>

  // Funcionalidades avanzadas
  async getSalesHistory(companyId: number, customerId: number): Promise<Sale[]>
  async updateCreditBalance(customerId: number, amount: number): Promise<void>
  async validateCreditLimit(customerId: number, saleAmount: number): Promise<boolean>

  // Generación de código único
  private async generateCustomerCode(companyId: number): Promise<string>
}
```

**Tareas:**
- [ ] Implementar CRUD completo
- [ ] Auto-generación de código de cliente
- [ ] Validación de límite de crédito
- [ ] Actualización de balance de crédito
- [ ] Filtros de búsqueda (nombre, documento, tipo)
- [ ] Paginación
- [ ] Manejo de errores

**Validaciones:**
- Código de cliente único por empresa
- No permitir duplicados de documento por empresa
- Balance no puede exceder límite de crédito

#### Día 8-9: PaymentMethodService y SaleService Base
**Archivos a crear:**
```
src/services/
├── PaymentMethodService.ts  [NUEVO]
└── SaleService.ts          [NUEVO] (versión inicial)
```

**PaymentMethodService:**
```typescript
class PaymentMethodService {
  async create(companyId: number, dto: CreatePaymentMethodDto): Promise<PaymentMethod>
  async findAll(companyId: number, activeOnly?: boolean): Promise<PaymentMethod[]>
  async findOne(companyId: number, id: number): Promise<PaymentMethod>
  async update(companyId: number, id: number, dto: UpdatePaymentMethodDto): Promise<PaymentMethod>
  async deactivate(companyId: number, id: number): Promise<void>
}
```

**SaleService (versión inicial):**
```typescript
class SaleService {
  // Solo borradores en Fase 1
  async createDraft(companyId: number, userId: number, dto: CreateSaleDto): Promise<Sale>
  async updateDraft(companyId: number, saleId: number, dto: UpdateSaleDto): Promise<Sale>
  async deleteDraft(companyId: number, saleId: number): Promise<void>
  async findAll(companyId: number, query: GetSalesQuery): Promise<PaginatedResult<Sale>>
  async findOne(companyId: number, id: number): Promise<Sale>

  // Helpers internos
  private async generateSaleNumber(companyId: number, type: SaleType): Promise<string>
  private calculateTotals(details: SaleDetail[], taxPercentage: number, discountAmount: number): SaleTotals
}
```

**Tareas:**
- [ ] Implementar CRUD de métodos de pago
- [ ] Implementar creación de venta borrador
- [ ] Auto-generación de número de venta
- [ ] Cálculo automático de totales (subtotal, IVA, total)
- [ ] Validación de productos en detalles
- [ ] Validación de cliente activo
- [ ] Transacciones para crear venta + detalles

**Validaciones:**
- Solo permitir editar/eliminar ventas en estado 'draft'
- Número de venta único por empresa
- Totales calculados correctamente

#### Día 10: Pruebas de Servicios
**Tareas:**
- [ ] Crear suite de pruebas unitarias para CustomerService
- [ ] Crear suite de pruebas unitarias para PaymentMethodService
- [ ] Crear suite de pruebas unitarias para SaleService
- [ ] Probar casos de error (cliente no existe, etc.)
- [ ] Probar validaciones de negocio

### Semana 3: APIs y Controladores (Días 11-15)

#### Día 11-12: CustomerController
**Archivos a crear:**
```
src/controllers/
└── CustomerController.ts  [NUEVO]

src/routes/
└── customer.routes.ts     [NUEVO]

src/docs/
└── customer.swagger.ts    [NUEVO]
```

**Endpoints:**
```
GET    /api/v1/customers              - Listar clientes
POST   /api/v1/customers              - Crear cliente
GET    /api/v1/customers/:id          - Obtener cliente
PUT    /api/v1/customers/:id          - Actualizar cliente
PATCH  /api/v1/customers/:id/deactivate - Inhabilitar cliente
GET    /api/v1/customers/:id/sales-history - Historial de compras
```

**Tareas:**
- [ ] Implementar todos los endpoints
- [ ] Middleware de autenticación
- [ ] Middleware de autorización por rol
- [ ] Validación de companyId desde token JWT
- [ ] Documentación Swagger completa
- [ ] Manejo de errores HTTP apropiados

#### Día 13: PaymentMethodController
**Archivos a crear:**
```
src/controllers/
└── PaymentMethodController.ts  [NUEVO]

src/routes/
└── payment-method.routes.ts    [NUEVO]

src/docs/
└── payment-method.swagger.ts   [NUEVO]
```

**Endpoints:**
```
GET    /api/v1/payment-methods         - Listar métodos de pago
POST   /api/v1/payment-methods         - Crear método de pago
PUT    /api/v1/payment-methods/:id     - Actualizar método
PATCH  /api/v1/payment-methods/:id/deactivate - Desactivar método
```

#### Día 14-15: SaleController (básico)
**Archivos a crear:**
```
src/controllers/
└── SaleController.ts      [NUEVO]

src/routes/
└── sale.routes.ts         [NUEVO]

src/docs/
└── sale.swagger.ts        [NUEVO]
```

**Endpoints (solo borradores):**
```
GET    /api/v1/sales       - Listar ventas
POST   /api/v1/sales       - Crear venta borrador
GET    /api/v1/sales/:id   - Obtener venta
PUT    /api/v1/sales/:id   - Actualizar borrador
DELETE /api/v1/sales/:id   - Eliminar borrador
```

**Tareas:**
- [ ] Implementar endpoints básicos
- [ ] Integrar con route index
- [ ] Documentación Swagger
- [ ] Pruebas en Postman

### Entregables Fase 1
- [x] 5 entidades creadas y migradas
- [x] 3 servicios funcionales
- [x] 3 controladores con endpoints
- [x] ~15 endpoints REST funcionales
- [x] Documentación Swagger actualizada
- [x] Migraciones con rollback probado

### Criterios de Aceptación Fase 1
- [ ] Crear cliente nuevo vía API
- [ ] Crear método de pago vía API
- [ ] Crear venta borrador con 3 productos
- [ ] Consultar historial de ventas con filtros
- [ ] Actualizar y eliminar venta borrador
- [ ] Documentación Swagger 100% funcional

---

## FASE 2: Ventas y Facturación Básica (Semanas 4-6)

### Objetivo
Implementar flujo completo de ventas, pagos y documentos comerciales (sin DIAN).

### Semana 4: Lógica de Ventas Completa (Días 16-20)

#### Día 16-17: Confirmación de Ventas
**Archivos a modificar:**
```
src/services/SaleService.ts  [MODIFICAR]
src/services/InventoryService.ts  [MODIFICAR]
```

**Nuevas funcionalidades en SaleService:**
```typescript
// Nuevo método
async confirmSale(companyId: number, saleId: number, userId: number): Promise<Sale>

// Proceso interno:
// 1. Validar estado = 'draft'
// 2. Validar inventario disponible
// 3. Iniciar transacción DB
// 4. Actualizar estado a 'confirmed'
// 5. Crear transacciones de inventario (OUTBOUND)
// 6. Descontar inventario
// 7. Commit transacción
// 8. Retornar venta confirmada
```

**Tareas:**
- [ ] Implementar lógica de confirmación
- [ ] Integrar con InventoryService
- [ ] Crear transacciones de inventario
- [ ] Manejo de transacciones ACID
- [ ] Validar stock disponible
- [ ] Rollback automático en caso de error
- [ ] Registrar usuario que confirmó

**Validaciones:**
- Solo confirmar ventas en 'draft'
- Stock suficiente para todos los productos
- Transacción atómica (todo o nada)

#### Día 18-19: Cotizaciones y Conversión
**Nuevas funcionalidades:**
```typescript
// SaleService
async convertQuoteToSale(companyId: number, quoteId: number, userId: number): Promise<Sale>
async convertQuoteToInvoice(companyId: number, quoteId: number, userId: number): Promise<Sale>

// Proceso:
// 1. Validar quote existe y tipo = 'quote'
// 2. Crear nueva venta con tipo destino
// 3. Copiar todos los detalles
// 4. Generar nuevo número de venta
// 5. Actualizar referencia en quote original
```

**Tareas:**
- [ ] Implementar conversión de cotizaciones
- [ ] Manejar diferentes tipos de conversión (quote → sale, quote → invoice)
- [ ] Mantener referencia a cotización original
- [ ] Validar que cotización no haya sido convertida previamente
- [ ] Actualizar endpoint POST /api/v1/sales/:id/convert

#### Día 20: Factura Proforma y Remisiones
**Tareas:**
- [ ] Implementar lógica para proformas (sin afectar inventario)
- [ ] Implementar lógica para remisiones
- [ ] Diferenciar comportamiento según `saleType`
- [ ] Actualizar endpoints en SaleController

### Semana 5: Pagos y Notas Crédito (Días 21-25)

#### Día 21-22: PaymentService
**Archivos a crear:**
```
src/services/PaymentService.ts  [NUEVO]
src/controllers/PaymentController.ts  [NUEVO]
src/routes/payment.routes.ts  [NUEVO]
src/dto/payment/  [VARIOS]
```

**PaymentService:**
```typescript
class PaymentService {
  async registerPayment(companyId: number, dto: CreatePaymentDto): Promise<Payment[]>

  // Proceso:
  // 1. Validar venta existe y está confirmada/invoiced
  // 2. Validar métodos de pago existen
  // 3. Validar suma de pagos <= saldo pendiente
  // 4. Iniciar transacción
  // 5. Crear registros de Payment
  // 6. Actualizar paidAmount en Sale
  // 7. Actualizar balance en Sale
  // 8. Actualizar paymentStatus (paid/partial/pending)
  // 9. Si cliente tiene crédito, actualizar currentBalance
  // 10. Commit transacción

  async findAll(companyId: number, query: GetPaymentsQuery): Promise<PaginatedResult<Payment>>
  async findOne(companyId: number, id: number): Promise<Payment>
  async refund(companyId: number, paymentId: number, userId: number): Promise<Payment>

  // Helpers
  private async updateSalePaymentStatus(sale: Sale): Promise<void>
  private async generatePaymentNumber(companyId: number): Promise<string>
}
```

**Endpoints:**
```
POST   /api/v1/payments              - Registrar pago
GET    /api/v1/payments              - Listar pagos
GET    /api/v1/payments/:id          - Obtener pago
POST   /api/v1/payments/:id/refund   - Reembolsar pago
```

**Tareas:**
- [ ] Implementar servicio de pagos
- [ ] Soporte para múltiples métodos de pago en un registro
- [ ] Actualización automática de estado de venta
- [ ] Actualización de balance de cliente
- [ ] Validación de límite de crédito
- [ ] Auto-generación de número de recibo
- [ ] Implementar endpoints

#### Día 23-24: Notas Crédito
**Archivos a modificar:**
```
src/services/SaleService.ts  [MODIFICAR]
```

**Nuevas funcionalidades:**
```typescript
async createCreditNote(
  companyId: number,
  referenceSaleId: number,
  dto: CreateCreditNoteDto,
  userId: number
): Promise<Sale>

// Proceso:
// 1. Validar venta original existe y está facturada
// 2. Validar no exceder cantidad vendida
// 3. Iniciar transacción
// 4. Crear venta tipo 'credit_note'
// 5. Referenciar venta original (referenceSaleId)
// 6. Crear transacciones de inventario INBOUND
// 7. Restaurar inventario
// 8. Actualizar balance de cliente (reducir deuda)
// 9. Actualizar estado venta original a 'credited'
// 10. Commit transacción
```

**Endpoints nuevos:**
```
POST   /api/v1/sales/:id/credit-note  - Crear nota crédito
```

**Tareas:**
- [ ] Implementar lógica de notas crédito
- [ ] Reversión de inventario
- [ ] Actualización de balance de cliente
- [ ] Validación de cantidades
- [ ] Soporte para notas crédito parciales y totales
- [ ] Marcar venta original como 'credited'

#### Día 25: Remisiones (completar)
**Tareas:**
- [ ] Finalizar lógica de remisiones
- [ ] Implementar endpoints específicos si es necesario
- [ ] Documentar flujo de remisión

### Semana 6: Validación de Despachos y Reportes (Días 26-30)

#### Día 26-27: Validación de Despachos
**Archivos a crear:**
```
src/entities/DispatchValidation.entity.ts  [NUEVO]
src/services/DispatchValidationService.ts  [NUEVO]
src/controllers/DispatchValidationController.ts  [NUEVO]
src/dto/dispatch-validation/  [VARIOS]
```

**Migración:**
```
src/migrations/YYYYMMDDHHMMSS-CreateDispatchValidation.ts  [NUEVO]
```

**DispatchValidationService:**
```typescript
class DispatchValidationService {
  async validateDispatch(
    companyId: number,
    saleId: number,
    dto: ValidateDispatchDto,
    userId: number
  ): Promise<DispatchValidation>

  // Proceso:
  // 1. Obtener venta con detalles
  // 2. Comparar cantidades vendidas vs despachadas
  // 3. Detectar discrepancias
  // 4. Crear registro de validación
  // 5. Actualizar estado de venta a 'dispatched' o 'discrepancy'

  async findBySale(companyId: number, saleId: number): Promise<DispatchValidation>
  async resolveDiscrepancy(companyId: number, id: number, notes: string): Promise<DispatchValidation>
}
```

**Endpoints:**
```
POST   /api/v1/sales/:id/dispatch-validation  - Validar despacho
GET    /api/v1/sales/:id/dispatch-validation  - Obtener validación
PATCH  /api/v1/dispatch-validations/:id/resolve - Resolver discrepancia
```

**Tareas:**
- [ ] Crear entidad y migración
- [ ] Implementar servicio de validación
- [ ] Detectar discrepancias automáticamente
- [ ] Generar JSON con detalles de discrepancias
- [ ] Implementar endpoints
- [ ] Actualizar estado de venta según validación

#### Día 28-29: Reportes Básicos
**Archivos a crear:**
```
src/controllers/ReportController.ts  [NUEVO]
src/routes/report.routes.ts  [NUEVO]
src/services/ReportService.ts  [NUEVO]
```

**ReportService:**
```typescript
class ReportService {
  async getSalesSummary(companyId: number, query: SalesSummaryQuery): Promise<SalesSummary>
  async getSalesByCustomer(companyId: number, startDate: Date, endDate: Date): Promise<CustomerSalesReport[]>
  async getSalesByProduct(companyId: number, startDate: Date, endDate: Date): Promise<ProductSalesReport[]>
  async getSalesByPeriod(companyId: number, query: SalesPeriodQuery): Promise<PeriodSalesReport[]>
}
```

**Endpoints:**
```
GET    /api/v1/reports/sales-summary     - Resumen de ventas
GET    /api/v1/reports/sales-by-customer - Ventas por cliente
GET    /api/v1/reports/sales-by-product  - Ventas por producto
GET    /api/v1/reports/sales-by-period   - Ventas por período
```

**Tareas:**
- [ ] Implementar reportes con agregación SQL
- [ ] Filtros por fecha, cliente, producto
- [ ] Agrupación por día/semana/mes
- [ ] Totales y subtotales
- [ ] Optimización de consultas

#### Día 30: Pruebas Integrales Fase 2
**Tareas:**
- [ ] Crear casos de prueba end-to-end
- [ ] Probar flujo completo: cotización → venta → pago → despacho
- [ ] Probar notas crédito con reversión de inventario
- [ ] Probar reportes con datos reales
- [ ] Validar integridad de transacciones
- [ ] Documentar bugs encontrados y corregir

### Entregables Fase 2
- [x] Confirmación de ventas con afectación de inventario
- [x] Conversión de cotizaciones
- [x] Sistema de pagos múltiples
- [x] Notas crédito con reversión
- [x] Validación de despachos
- [x] Reportes básicos de ventas

### Criterios de Aceptación Fase 2
- [ ] Crear cotización y convertirla a factura
- [ ] Confirmar venta y verificar descuento de inventario
- [ ] Registrar pago con 2 métodos diferentes
- [ ] Generar nota crédito y verificar restauración de inventario
- [ ] Validar despacho con discrepancia
- [ ] Consultar reporte de ventas por período

---

## FASE 3: Inventario Avanzado (Semanas 7-9)

### Objetivo
Mejoras al módulo de inventario: compras, kits, préstamos, kardex.

### Semana 7: Compras y Kardex (Días 31-35)

#### Día 31-32: Purchase Module
**Archivos a crear:**
```
src/entities/Purchase.entity.ts         [NUEVO]
src/entities/PurchaseDetail.entity.ts   [NUEVO]
src/services/PurchaseService.ts         [NUEVO]
src/controllers/PurchaseController.ts   [NUEVO]
src/dto/purchase/  [VARIOS]
```

**Migración:**
```
src/migrations/YYYYMMDDHHMMSS-CreatePurchases.ts  [NUEVO]
```

**PurchaseService:**
```typescript
class PurchaseService {
  async create(companyId: number, dto: CreatePurchaseDto, userId: number): Promise<Purchase>

  // Proceso:
  // 1. Crear registro de Purchase
  // 2. Crear PurchaseDetails
  // 3. Si status = 'received':
  //    a. Crear transacciones de inventario INBOUND
  //    b. Actualizar stock
  //    c. Actualizar costo del producto si es necesario

  async receive(companyId: number, purchaseId: number, userId: number): Promise<Purchase>
  async findAll(companyId: number, query: GetPurchasesQuery): Promise<PaginatedResult<Purchase>>
  async findOne(companyId: number, id: number): Promise<Purchase>
}
```

**Tareas:**
- [ ] Crear entidades y migración
- [ ] Implementar servicio de compras
- [ ] Actualización automática de inventario al recibir
- [ ] Actualización de costo promedio
- [ ] Implementar controlador y endpoints
- [ ] Documentación Swagger

#### Día 33-34: Kardex
**Archivos a crear:**
```
src/services/KardexService.ts  [NUEVO]
src/controllers/KardexController.ts  [NUEVO]
```

**KardexService:**
```typescript
class KardexService {
  async getProductKardex(
    companyId: number,
    productId: number,
    startDate?: Date,
    endDate?: Date,
    warehouseId?: number
  ): Promise<KardexReport>

  // Proceso:
  // 1. Obtener todas las transacciones del producto
  // 2. Ordenar por fecha
  // 3. Calcular saldo acumulado
  // 4. Calcular costo promedio FIFO/LIFO según configuración
  // 5. Generar reporte con movimientos detallados

  async getMultiProductKardex(
    companyId: number,
    productIds: number[],
    startDate: Date,
    endDate: Date
  ): Promise<MultiKardexReport>
}
```

**Endpoints:**
```
GET    /api/v1/reports/kardex/:productId  - Kardex de producto
GET    /api/v1/reports/kardex-multi       - Kardex de múltiples productos
```

**Tareas:**
- [ ] Implementar lógica de kardex
- [ ] Soporte para FIFO/LIFO/Promedio
- [ ] Cálculo de saldos acumulados
- [ ] Filtros por fecha y almacén
- [ ] Optimización de consultas
- [ ] Formato de reporte detallado

#### Día 35: Inventario Negativo
**Archivos a modificar:**
```
src/entities/Company.entity.ts  [MODIFICAR - settings]
src/services/InventoryService.ts  [MODIFICAR]
src/services/SaleService.ts  [MODIFICAR]
```

**Tareas:**
- [ ] Agregar configuración `allowNegativeStock` en Company.settings
- [ ] Modificar validaciones en SaleService
- [ ] Permitir ventas con stock negativo si está habilitado
- [ ] Validar configuración al confirmar venta
- [ ] Documentar comportamiento

### Semana 8: Productos Avanzados (Días 36-40)

#### Día 36-37: Product Kits (BOM)
**Archivos a crear:**
```
src/entities/ProductKit.entity.ts       [NUEVO]
src/services/ProductKitService.ts       [NUEVO]
src/controllers/ProductKitController.ts [NUEVO]
src/dto/product-kit/  [VARIOS]
```

**Archivos a modificar:**
```
src/entities/Product.entity.ts  [MODIFICAR - agregar isKit]
src/services/SaleService.ts     [MODIFICAR - descontar componentes]
```

**Migración:**
```
src/migrations/YYYYMMDDHHMMSS-CreateProductKits.ts  [NUEVO]
```

**ProductKitService:**
```typescript
class ProductKitService {
  async createKit(companyId: number, dto: CreateProductKitDto): Promise<ProductKit[]>
  async getKitComponents(companyId: number, kitProductId: number): Promise<ProductKit[]>
  async deleteComponent(companyId: number, id: number): Promise<void>
  async validateKitStock(companyId: number, kitProductId: number, quantity: number): Promise<boolean>
}
```

**Modificación en SaleService:**
```typescript
// En confirmSale(), al procesar detalles:
if (product.isKit) {
  // 1. Obtener componentes del kit
  const components = await productKitService.getKitComponents(product.id);

  // 2. Por cada componente, crear transacción de inventario
  for (const component of components) {
    const componentQuantity = detail.quantity * component.quantity;
    await inventoryService.createTransaction({
      type: 'outbound',
      reason: 'sale',
      productId: component.componentProductId,
      quantity: componentQuantity,
      // ...
    });
  }
}
```

**Tareas:**
- [ ] Crear entidad y migración
- [ ] Implementar servicio de kits
- [ ] Modificar Product para agregar flag `isKit`
- [ ] Modificar SaleService para descontar componentes
- [ ] Validar stock de componentes antes de confirmar venta
- [ ] Implementar endpoints
- [ ] Documentación

#### Día 38-39: Fichas Técnicas
**Archivos a crear:**
```
src/entities/ProductTechnicalSheet.entity.ts  [NUEVO]
src/services/TechnicalSheetService.ts         [NUEVO]
src/controllers/TechnicalSheetController.ts   [NUEVO]
src/dto/technical-sheet/  [VARIOS]
```

**Migración:**
```
src/migrations/YYYYMMDDHHMMSS-CreateTechnicalSheets.ts  [NUEVO]
```

**TechnicalSheetService:**
```typescript
class TechnicalSheetService {
  async upsert(companyId: number, dto: UpsertTechnicalSheetDto): Promise<ProductTechnicalSheet>
  async findByProduct(companyId: number, productId: number): Promise<ProductTechnicalSheet | null>
  async delete(companyId: number, productId: number): Promise<void>
}
```

**Endpoints:**
```
POST   /api/v1/technical-sheets        - Crear/Actualizar ficha
GET    /api/v1/technical-sheets/:productId - Obtener ficha
DELETE /api/v1/technical-sheets/:productId - Eliminar ficha
```

**Tareas:**
- [ ] Crear entidad y migración
- [ ] Implementar CRUD
- [ ] Relación 1:1 con Product
- [ ] Validar que producto existe
- [ ] Implementar endpoints
- [ ] Documentación

#### Día 40: Préstamo de Productos
**Archivos a crear:**
```
src/entities/ProductLoan.entity.ts       [NUEVO]
src/services/ProductLoanService.ts       [NUEVO]
src/controllers/ProductLoanController.ts [NUEVO]
src/dto/product-loan/  [VARIOS]
```

**Migración:**
```
src/migrations/YYYYMMDDHHMMSS-CreateProductLoans.ts  [NUEVO]
```

**ProductLoanService:**
```typescript
class ProductLoanService {
  async createLoan(companyId: number, dto: CreateProductLoanDto, userId: number): Promise<ProductLoan>

  // Proceso:
  // 1. Validar stock disponible
  // 2. Crear registro de préstamo
  // 3. Crear transacción de inventario OUTBOUND (reason: 'loan')
  // 4. Descontar inventario

  async returnLoan(companyId: number, loanId: number, dto: ReturnProductLoanDto, userId: number): Promise<ProductLoan>

  // Proceso:
  // 1. Validar préstamo activo
  // 2. Validar cantidad devuelta <= cantidad prestada
  // 3. Crear transacción de inventario INBOUND (reason: 'loan_return')
  // 4. Actualizar returnedQuantity
  // 5. Si returnedQuantity = quantity, marcar como 'returned'

  async findAll(companyId: number, query: GetProductLoansQuery): Promise<PaginatedResult<ProductLoan>>
  async findOverdue(companyId: number): Promise<ProductLoan[]>
}
```

**Endpoints:**
```
POST   /api/v1/product-loans              - Registrar préstamo
POST   /api/v1/product-loans/:id/return   - Registrar devolución
GET    /api/v1/product-loans              - Listar préstamos
GET    /api/v1/product-loans/overdue      - Listar vencidos
```

**Tareas:**
- [ ] Crear entidad y migración
- [ ] Implementar servicio
- [ ] Afectación de inventario en préstamo
- [ ] Restauración en devolución
- [ ] Soporte para devoluciones parciales
- [ ] Detección de préstamos vencidos
- [ ] Implementar endpoints

### Semana 9: Cierre de Inventario (Días 41-45)

#### Día 41-42: Cierre de Inventario
**Archivos a crear:**
```
src/services/InventoryClosingService.ts  [NUEVO]
src/controllers/InventoryClosingController.ts  [NUEVO]
```

**InventoryClosingService:**
```typescript
class InventoryClosingService {
  async generateClosingReport(
    companyId: number,
    date: Date,
    warehouseId?: number
  ): Promise<InventoryClosingReport>

  // Proceso:
  // 1. Obtener stock actual de todos los productos
  // 2. Calcular valor de inventario (cantidad * costo)
  // 3. Comparar con stock teórico (stock inicial + entradas - salidas)
  // 4. Detectar diferencias
  // 5. Generar reporte detallado

  async createAdjustment(
    companyId: number,
    dto: CreateInventoryAdjustmentDto,
    userId: number
  ): Promise<InventoryTransaction[]>

  // Proceso:
  // 1. Validar ajustes
  // 2. Crear transacciones tipo 'adjustment'
  // 3. Actualizar stock según ajustes
  // 4. Registrar en auditoría
}
```

**Endpoints:**
```
GET    /api/v1/reports/inventory-closing  - Reporte de cierre
POST   /api/v1/inventory/adjustments      - Crear ajustes
```

**Tareas:**
- [ ] Implementar lógica de cierre
- [ ] Comparación de stock teórico vs físico
- [ ] Detección de diferencias
- [ ] Creación de ajustes manuales
- [ ] Validación de autorización para ajustes
- [ ] Implementar endpoints

#### Día 43-44: Inhabilitar Productos
**Archivos a modificar:**
```
src/services/ProductService.ts  [MODIFICAR]
src/controllers/ProductController.ts  [MODIFICAR]
```

**Tareas:**
- [ ] Implementar soft delete (isActive = false)
- [ ] Validar que productos inactivos no aparezcan en ventas
- [ ] Permitir consultar productos inactivos con filtro
- [ ] Preservar histórico de transacciones
- [ ] Endpoint PATCH /api/v1/products/:id/deactivate
- [ ] Endpoint PATCH /api/v1/products/:id/reactivate

#### Día 45: Pruebas Integrales Fase 3
**Tareas:**
- [ ] Probar compra con actualización de inventario
- [ ] Probar kardex con múltiples movimientos
- [ ] Probar venta de kit con descuento de componentes
- [ ] Probar préstamo y devolución parcial
- [ ] Probar cierre de inventario con ajustes
- [ ] Validar todas las transacciones de inventario

### Entregables Fase 3
- [x] Sistema de compras funcional
- [x] Kardex con FIFO/LIFO/Promedio
- [x] Kits de productos (BOM)
- [x] Fichas técnicas
- [x] Préstamos de productos
- [x] Cierre de inventario con ajustes

### Criterios de Aceptación Fase 3
- [ ] Registrar compra y verificar actualización de inventario
- [ ] Consultar kardex de producto con movimientos
- [ ] Vender kit y verificar descuento automático de componentes
- [ ] Registrar préstamo, devolver parcialmente
- [ ] Generar cierre de inventario y crear ajustes

---

## FASE 4: Documentos y Auditoría (Semanas 10-11)

### Objetivo
Sistema de generación de PDFs con plantillas configurables y auditoría completa.

### Semana 10: Generación de Documentos (Días 46-50)

#### Día 46-47: DocumentService y PDF Generation

**Archivos a crear:**
```
src/services/DocumentService.ts  [NUEVO]
src/utils/pdf.util.ts           [NUEVO]
src/controllers/DocumentController.ts  [NUEVO]
```

**Dependencias:**
```json
{
  "puppeteer": "^21.0.0"  // O "pdfmake": "^0.2.7" si se prefiere
}
```

**DocumentService:**
```typescript
class DocumentService {
  async generateSalePDF(companyId: number, saleId: number, templateId?: number): Promise<Buffer>

  // Proceso:
  // 1. Obtener venta con detalles, cliente, empresa
  // 2. Obtener plantilla (o usar predeterminada)
  // 3. Reemplazar variables en plantilla
  // 4. Generar PDF con puppeteer o pdfmake
  // 5. Retornar buffer del PDF

  async generateCustomerReport(companyId: number, customerId: number): Promise<Buffer>
  async generateInventoryReport(companyId: number, warehouseId?: number): Promise<Buffer>

  private async renderTemplate(template: string, data: any): Promise<string>
  private async htmlToPDF(html: string): Promise<Buffer>
}
```

**Endpoints:**
```
GET    /api/v1/documents/sale/:id/pdf         - PDF de venta
GET    /api/v1/documents/customer/:id/report  - Reporte de cliente
GET    /api/v1/documents/inventory/report     - Reporte de inventario
```

**Tareas:**
- [ ] Implementar generación de PDF
- [ ] Sistema de plantillas con variables
- [ ] Soporte para Puppeteer (HTML → PDF)
- [ ] Implementar controlador
- [ ] Configuración de estilos CSS

#### Día 48-49: TemplateService
**Archivos a crear:**
```
src/entities/DocumentTemplate.entity.ts  [NUEVO]
src/services/TemplateService.ts         [NUEVO]
src/controllers/TemplateController.ts   [NUEVO]
src/dto/template/  [VARIOS]
```

**Migración:**
```
src/migrations/YYYYMMDDHHMMSS-CreateDocumentTemplates.ts  [NUEVO]
```

**TemplateService:**
```typescript
class TemplateService {
  async create(companyId: number, dto: CreateTemplateDto): Promise<DocumentTemplate>
  async findAll(companyId: number, type?: TemplateType): Promise<DocumentTemplate[]>
  async findOne(companyId: number, id: number): Promise<DocumentTemplate>
  async update(companyId: number, id: number, dto: UpdateTemplateDto): Promise<DocumentTemplate>
  async delete(companyId: number, id: number): Promise<void>
  async setAsDefault(companyId: number, id: number, type: TemplateType): Promise<void>
  async getDefaultTemplate(companyId: number, type: TemplateType): Promise<DocumentTemplate>

  // Plantillas predeterminadas
  async seedDefaultTemplates(companyId: number): Promise<void>
}
```

**Endpoints:**
```
POST   /api/v1/templates           - Crear plantilla
GET    /api/v1/templates           - Listar plantillas
GET    /api/v1/templates/:id       - Obtener plantilla
PUT    /api/v1/templates/:id       - Actualizar plantilla
DELETE /api/v1/templates/:id       - Eliminar plantilla
PATCH  /api/v1/templates/:id/set-default - Marcar como predeterminada
```

**Tareas:**
- [ ] Crear entidad y migración
- [ ] Implementar CRUD de plantillas
- [ ] Sistema de plantillas predeterminadas
- [ ] Variables dinámicas ({{variableName}})
- [ ] Validación de sintaxis HTML
- [ ] Implementar endpoints

#### Día 50: Adjuntos e Imágenes
**Archivos a modificar:**
```
src/middleware/upload.middleware.ts  [YA EXISTE - reutilizar]
src/controllers/DocumentController.ts  [MODIFICAR]
```

**Nuevos endpoints:**
```
POST   /api/v1/documents/attach/:entity/:entityId  - Subir adjunto
GET    /api/v1/documents/attach/:entity/:entityId  - Listar adjuntos
DELETE /api/v1/documents/attach/:id                - Eliminar adjunto
```

**Tareas:**
- [ ] Reutilizar middleware de upload existente
- [ ] Asociar archivos a entidades (sale, customer, product)
- [ ] Almacenamiento organizado por entidad
- [ ] Validación de tipos de archivo
- [ ] Límite de tamaño
- [ ] Listado de adjuntos por entidad

### Semana 11: Auditoría (Días 51-55)

#### Día 51-52: AuditService
**Archivos a crear:**
```
src/entities/AuditLog.entity.ts  [NUEVO]
src/services/AuditService.ts     [NUEVO]
src/middleware/audit.interceptor.ts  [NUEVO]
```

**Migración:**
```
src/migrations/YYYYMMDDHHMMSS-CreateAuditLogs.ts  [NUEVO]
```

**AuditService:**
```typescript
class AuditService {
  async log(data: CreateAuditLogDto): Promise<AuditLog>

  // Proceso:
  // 1. Capturar datos de la request (IP, user-agent)
  // 2. Capturar usuario del token JWT
  // 3. Capturar entidad y acción
  // 4. Si es UPDATE, comparar oldValues vs newValues
  // 5. Crear registro de auditoría

  async findAll(companyId: number, query: GetAuditLogsQuery): Promise<PaginatedResult<AuditLog>>
  async findByEntity(companyId: number, entity: AuditEntity, entityId: number): Promise<AuditLog[]>
  async export(companyId: number, query: GetAuditLogsQuery, format: 'excel' | 'csv'): Promise<Buffer>
}
```

**Audit Interceptor:**
```typescript
// Middleware para auditoría automática
export function auditInterceptor(entity: AuditEntity) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Capturar datos antes de la operación
    const oldData = req.body._oldData;

    // Después de la operación (en el controller):
    // auditService.log({
    //   companyId,
    //   userId,
    //   entity,
    //   entityId,
    //   action,
    //   ipAddress: req.ip,
    //   userAgent: req.headers['user-agent'],
    //   oldValues: oldData,
    //   newValues: newData
    // });
  };
}
```

**Tareas:**
- [ ] Crear entidad y migración
- [ ] Implementar servicio de auditoría
- [ ] Crear interceptor para auditoría automática
- [ ] Integrar en controladores críticos (Sale, Customer, Payment, Product)
- [ ] Captura de IP y user-agent
- [ ] Comparación de valores antes/después

#### Día 53-54: APIs de Auditoría
**Archivos a crear:**
```
src/controllers/AuditLogController.ts  [NUEVO]
src/routes/audit-log.routes.ts        [NUEVO]
```

**Endpoints:**
```
GET    /api/v1/audit-logs                    - Listar logs
GET    /api/v1/audit-logs/entity/:entity/:id - Logs por entidad
GET    /api/v1/audit-logs/export             - Exportar logs
```

**Tareas:**
- [ ] Implementar controlador
- [ ] Filtros avanzados (usuario, entidad, acción, fecha)
- [ ] Paginación
- [ ] Exportación a Excel/CSV
- [ ] Documentación Swagger

#### Día 55: Configuración de Exportación
**Archivos a crear:**
```
src/services/ExportService.ts  [NUEVO]
src/utils/excel.util.ts       [NUEVO]
```

**Dependencias:**
```json
{
  "xlsx": "^0.18.5"  // YA EXISTE
}
```

**ExportService:**
```typescript
class ExportService {
  async exportToExcel(data: any[], config: ExportConfig): Promise<Buffer>
  async exportToCSV(data: any[], config: ExportConfig): Promise<string>
  async exportToPDF(data: any[], config: ExportConfig): Promise<Buffer>

  private applyConfiguration(data: any[], config: ExportConfig): any[]
}

interface ExportConfig {
  columns: ColumnConfig[];
  includeHeaders: boolean;
  dateFormat?: string;
  numberFormat?: string;
}
```

**Endpoints:**
```
POST   /api/v1/export/sales      - Exportar ventas
POST   /api/v1/export/customers  - Exportar clientes
POST   /api/v1/export/inventory  - Exportar inventario
```

**Tareas:**
- [ ] Implementar exportación a Excel
- [ ] Implementar exportación a CSV
- [ ] Implementar exportación a PDF
- [ ] Configuración de columnas
- [ ] Formato de fechas y números
- [ ] Implementar endpoints

### Entregables Fase 4
- [x] Generación de PDF funcional
- [x] Plantillas configurables
- [x] Sistema de adjuntos
- [x] Auditoría automática
- [x] Exportación en múltiples formatos

### Criterios de Aceptación Fase 4
- [ ] Generar PDF de venta con plantilla
- [ ] Crear plantilla personalizada
- [ ] Adjuntar imagen a producto
- [ ] Consultar logs de auditoría con filtros
- [ ] Exportar ventas a Excel con configuración personalizada

---

## FASE 5: Ventas Masivas y Optimización (Semanas 12-13)

### Objetivo
Carga masiva de ventas y optimización de performance.

### Semana 12: Ventas Masivas (Días 56-60)

#### Día 56-57: BulkSalesService
**Archivos a crear:**
```
src/services/BulkSalesService.ts  [NUEVO]
src/controllers/BulkSalesController.ts  [NUEVO]
src/dto/bulk-sales/  [VARIOS]
```

**BulkSalesService:**
```typescript
class BulkSalesService {
  async uploadFromExcel(companyId: number, file: Express.Multer.File, userId: number): Promise<BulkSalesResult>

  // Proceso:
  // 1. Leer archivo Excel/CSV
  // 2. Validar formato
  // 3. Validar datos (clientes, productos, cantidades)
  // 4. Procesar en lotes de 50 registros
  // 5. Por cada lote:
  //    a. Iniciar transacción
  //    b. Crear ventas
  //    c. Si hay error, registrar y continuar
  //    d. Commit transacción
  // 6. Generar reporte de resultados

  async processJSONBatch(companyId: number, sales: CreateSaleDto[], userId: number): Promise<BulkSalesResult>

  private async validateBulkData(data: any[]): Promise<ValidationResult>
  private async processBatch(batch: CreateSaleDto[], companyId: number, userId: number): Promise<BatchResult>
}

interface BulkSalesResult {
  totalProcessed: number;
  totalSuccess: number;
  totalFailed: number;
  errors: BulkError[];
  successIds: number[];
}
```

**Endpoints:**
```
POST   /api/v1/sales/bulk/upload   - Cargar Excel/CSV
POST   /api/v1/sales/bulk/json     - Procesar JSON
```

**Tareas:**
- [ ] Implementar carga desde Excel
- [ ] Implementar carga desde CSV
- [ ] Implementar carga desde JSON
- [ ] Validación de datos por lote
- [ ] Procesamiento en transacciones separadas
- [ ] Reporte detallado de errores
- [ ] Optimización de consultas

#### Día 58-59: Manejo de Errores y Reportes
**Tareas:**
- [ ] Generar reporte de errores detallado
- [ ] Identificar fila exacta con error
- [ ] Descripción clara de cada error
- [ ] Exportar reporte de errores a Excel
- [ ] Continuar procesamiento tras error
- [ ] Rollback solo del registro fallido
- [ ] Logging detallado

#### Día 60: Optimización de Consultas
**Archivos a modificar:**
```
src/services/*.ts  [REVISAR TODOS]
```

**Tareas:**
- [ ] Revisar índices en todas las tablas
- [ ] Optimizar consultas con JOIN
- [ ] Implementar eager loading donde necesario
- [ ] Evitar N+1 queries
- [ ] Agregar índices compuestos críticos
- [ ] Validar planes de ejecución en SQL Server

**Índices críticos a revisar:**
```sql
-- Sales
CREATE INDEX idx_sales_company_date ON sales(company_id, sale_date);
CREATE INDEX idx_sales_company_customer ON sales(company_id, customer_id);
CREATE INDEX idx_sales_company_status ON sales(company_id, status);

-- Customers
CREATE INDEX idx_customers_company_active ON customers(company_id, is_active);
CREATE INDEX idx_customers_company_type ON customers(company_id, customer_type);

-- SaleDetails
CREATE INDEX idx_sale_details_sale ON sale_details(sale_id);
CREATE INDEX idx_sale_details_product ON sale_details(product_id);

-- Payments
CREATE INDEX idx_payments_company_date ON payments(company_id, payment_date);
CREATE INDEX idx_payments_sale ON payments(sale_id);

-- InventoryTransactions
CREATE INDEX idx_inv_trans_company_product ON inventory_transactions(company_id, product_id);
CREATE INDEX idx_inv_trans_company_date ON inventory_transactions(company_id, created_at);
```

### Semana 13: Pruebas y Documentación (Días 61-65)

#### Día 61-62: Pruebas de Carga
**Tareas:**
- [ ] Preparar dataset de 1000 ventas
- [ ] Probar carga masiva de 500 ventas
- [ ] Validar tiempo de procesamiento (<2 min)
- [ ] Probar con archivo con errores
- [ ] Validar reporte de errores
- [ ] Medir uso de memoria
- [ ] Medir uso de CPU
- [ ] Probar consultas concurrentes
- [ ] Validar integridad de datos

#### Día 63-64: Documentación Completa
**Archivos a crear/actualizar:**
```
docs/
├── API_DOCUMENTATION.md        [NUEVO]
├── DEPLOYMENT_GUIDE.md         [NUEVO]
├── TESTING_GUIDE.md            [NUEVO]
└── USER_MANUAL.md              [NUEVO]
```

**Tareas:**
- [ ] Actualizar Swagger 100%
- [ ] Generar colección de Postman completa
- [ ] Documentar flujos de negocio
- [ ] Guía de despliegue
- [ ] Guía de pruebas
- [ ] Manual de usuario
- [ ] Diagramas actualizados
- [ ] Changelog completo

#### Día 65: Capacitación y Entrega
**Tareas:**
- [ ] Preparar presentación del sistema
- [ ] Demo en vivo de funcionalidades
- [ ] Capacitación a usuarios
- [ ] Transferencia de conocimiento
- [ ] Entrega de credenciales
- [ ] Entrega de documentación
- [ ] Plan de soporte post-implementación

### Entregables Fase 5
- [x] Sistema de carga masiva funcional
- [x] Performance optimizado
- [x] Índices optimizados
- [x] Documentación completa
- [x] Colección de Postman
- [x] Sistema listo para producción

### Criterios de Aceptación Fase 5
- [ ] Cargar 500 ventas en <2 minutos
- [ ] Procesar archivo con errores y generar reporte
- [ ] Documentación Swagger 100% completa
- [ ] Colección de Postman con todos los endpoints
- [ ] Sistema funcionando en ambiente de prueba
- [ ] Capacitación entregada

---

## Resumen de Fases

| Fase | Semanas | Entidades | Endpoints | Complejidad | Dependencias |
|------|---------|-----------|-----------|-------------|--------------|
| 1 - Fundamentos | 1-3 | 5 | ~15 | Media | Ninguna |
| 2 - Ventas Básicas | 4-6 | 1 | ~20 | Alta | Fase 1 |
| 3 - Inventario Avanzado | 7-9 | 5 | ~25 | Media-Alta | Fase 1, 2 |
| 4 - Documentos y Auditoría | 10-11 | 2 | ~15 | Media | Fase 2 |
| 5 - Ventas Masivas | 12-13 | 0 | ~5 | Media | Todas anteriores |

**Total:** 13 entidades nuevas, ~80 endpoints, 13 semanas

**Nota:** Facturación electrónica DIAN se implementará en una fase futura separada.

---

## Dependencias entre Fases

```
Fase 1 (Fundamentos)
  ├─> Fase 2 (Ventas Básicas)
  │     ├─> Fase 4 (DIAN)
  │     └─> Fase 5 (Documentos)
  └─> Fase 3 (Inventario)

Fase 6 (Masivas) depende de todas las anteriores
```

---

## Recomendaciones de Implementación

### Equipo Recomendado
- 1-2 Desarrolladores Backend (TypeScript/Node.js)
- 1 QA Tester (a partir de Fase 2)
- 1 Consultor DIAN (solo Fase 4)

### Herramientas
- **IDE:** VSCode con extensiones TypeScript
- **Base de Datos:** SQL Server Management Studio
- **Testing:** Postman/Insomnia
- **Versionamiento:** Git + GitHub/GitLab
- **Documentación:** Swagger UI integrado
- **CI/CD:** GitHub Actions o GitLab CI (opcional)

### Estrategia de Testing
- **Durante desarrollo:** Pruebas manuales en Postman
- **Fin de fase:** Pruebas integrales de flujos completos
- **Fase 6:** Pruebas de carga y stress
- **Opcional:** Jest para pruebas unitarias críticas

### Riesgos y Mitigación
1. **Complejidad DIAN** (Fase 4)
   - Mitigación: Comenzar configuración temprano, consultor DIAN
2. **Performance con datos masivos** (Fase 6)
   - Mitigación: Optimización de índices desde Fase 1
3. **Reversión de transacciones complejas**
   - Mitigación: Transacciones ACID bien diseñadas, pruebas exhaustivas

---

**Siguiente Paso:** ¿Deseas que comience la implementación de la Fase 1? 🚀
