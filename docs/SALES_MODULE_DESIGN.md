# Diseño del Módulo de Ventas y Facturación

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Análisis de Requerimientos](#análisis-de-requerimientos)
3. [Diseño de Arquitectura](#diseño-de-arquitectura)
4. [Modelo de Datos](#modelo-de-datos)
5. [Diseño de APIs](#diseño-de-apis)
6. [Integración DIAN (Facturación Electrónica)](#integración-dian)
7. [Plan de Implementación por Fases](#plan-de-implementación-por-fases)
8. [Consideraciones de Seguridad](#consideraciones-de-seguridad)
9. [Pruebas y Validación](#pruebas-y-validación)

---

## Resumen Ejecutivo

Este documento define el diseño arquitectónico completo para implementar el módulo de ventas, facturación, gestión de clientes y mejoras al módulo de inventario en el sistema multi-empresa existente.

**Alcance del Proyecto:**
- 35 funcionalidades distribuidas en 5 módulos principales
- Integración con DIAN para facturación electrónica
- Soporte multi-empresa con aislamiento de datos
- Sistema de permisos basado en roles

**Estimación Total:** 12-16 semanas de desarrollo

---

## Análisis de Requerimientos

### Módulo 1: Ventas y Facturación (13 funcionalidades)

#### 1.1 Gestión de Ventas
- **Historial de ventas**: Consulta con filtros avanzados (fecha, cliente, estado, usuario)
- **Ventas en borrador**: Guardar y reanudar ventas incompletas
- **Validación de despachos**: Verificar productos enviados vs registrados
- **Ventas masivas**: Carga en lote de múltiples facturas (Excel/CSV)

#### 1.2 Documentos Comerciales
- **Cotizaciones**: Crear, editar, imprimir, convertir a venta/factura
- **Factura proforma**: Documentos preliminares sin afectar inventario
- **Factura electrónica**: Integración DIAN con firma digital
- **Notas crédito**: Devoluciones y ajustes con reversión de inventario
- **Remisiones**: Entregas sin factura inmediata

#### 1.3 Procesamiento de Pagos
- **Métodos de pago configurables**: Gestión de medios de pago
- **Pagos múltiples**: División de pago en varios métodos

### Módulo 2: Gestión de Clientes (1 funcionalidad)

- **CRUD completo**: Crear, editar, consultar, inhabilitar
- **Historial de compras**: Todas las transacciones del cliente
- **Clasificación**: Segmentación por volumen/frecuencia
- **Crédito**: Control de límite de crédito y cuentas por cobrar

### Módulo 3: Mejoras de Inventario (11 funcionalidades)

#### 3.1 Gestión de Compras
- **Cargar con factura**: Registrar factura de proveedor y actualizar stock
- **Ingreso de inventario**: Compras con actualización automática

#### 3.2 Control y Reportes
- **Kardex por producto**: Seguimiento detallado FIFO/LIFO/Promedio
- **Cierre de inventario**: Reporte y ajustes de fin de período
- **Inventario negativo**: Configuración opcional para ventas sin stock

#### 3.3 Productos Avanzados
- **Inhabilitar productos**: Desactivación sin eliminar histórico
- **Ficha técnica**: Especificaciones y documentación del producto
- **Kits/BOM**: Productos compuestos con descuento automático de insumos
- **Préstamo de productos**: Control de salidas temporales

### Módulo 4: Documentos y Archivos (4 funcionalidades)

- **Generación PDF**: Exportar documentos comerciales
- **Adjuntos**: Imágenes y documentos relacionados
- **Plantillas configurables**: Personalización de diseño de documentos
- **Parámetros de exportación**: Configuración de columnas para exportaciones

### Módulo 5: Auditoría y Eventos (1 funcionalidad)

- **Sistema de logs**: Registro de acciones (CRUD de documentos)
- **Trazabilidad**: Quién, cuándo, qué cambió

---

## Diseño de Arquitectura

### Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                      │
│  Frontend (React/Vue/Angular) - No incluido en este diseño  │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE API REST                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Sales   │  │ Customer │  │ Payment  │  │ Document │   │
│  │Controller│  │Controller│  │Controller│  │Controller│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE NEGOCIO                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Sales   │  │ Customer │  │ Payment  │  │ Document │   │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Quote   │  │ Invoice  │  │   Kit    │  │  Audit   │   │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                INTEGRACIONES EXTERNAS                        │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │   DIAN Service   │  │   PDF Service    │                │
│  │ (Factura Elec.)  │  │  (Generación)    │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE DATOS                             │
│           TypeORM + SQL Server + Transacciones              │
└─────────────────────────────────────────────────────────────┘
```

### Principios Arquitectónicos

1. **Aislamiento Multi-Empresa**: Todas las entidades incluyen `companyId`
2. **Transaccionalidad**: Operaciones críticas usan transacciones ACID
3. **Auditoría**: Registro automático de cambios en entidades críticas
4. **Validación en Capas**: DTO → Service → Entity
5. **Escalabilidad**: Diseño preparado para microservicios futuros

---

## Modelo de Datos

### Diagrama Entidad-Relación

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Company   │────────<│    User     │         │  Customer   │
└─────────────┘         └─────────────┘         └─────────────┘
       │                       │                        │
       │                       │                        │
       ▼                       ▼                        ▼
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Product   │         │    Sale     │<────────│ SaleDetail  │
└─────────────┘         └─────────────┘         └─────────────┘
       │                       │                        │
       │                       ├────────────────────────┤
       ▼                       ▼                        ▼
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│ ProductKit  │         │   Payment   │         │  Dispatch   │
│  (BOM/Kit)  │         └─────────────┘         │ Validation  │
└─────────────┘                                  └─────────────┘
       │                       │
       ▼                       ▼
┌─────────────┐         ┌─────────────┐
│ProductTech  │         │InvoiceElec  │
│   Sheet     │         │    (DIAN)   │
└─────────────┘         └─────────────┘
```

### Entidades Principales

#### 1. Customer (Cliente)

```typescript
@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ length: 20, unique: true })
  code: string; // Código único del cliente

  @Column({ name: 'document_type', length: 20 })
  documentType: 'CC' | 'NIT' | 'CE' | 'PASSPORT'; // Tipo de documento

  @Column({ name: 'document_number', length: 50 })
  documentNumber: string; // Número de documento

  @Column({ length: 200 })
  name: string; // Nombre o razón social

  @Column({ length: 200, nullable: true })
  email: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ length: 500, nullable: true })
  address: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 100, nullable: true })
  state: string;

  @Column({ length: 20, nullable: true })
  zipCode: string;

  @Column({ name: 'credit_limit', type: 'decimal', precision: 18, scale: 2, default: 0 })
  creditLimit: number;

  @Column({ name: 'current_balance', type: 'decimal', precision: 18, scale: 2, default: 0 })
  currentBalance: number; // Saldo actual de crédito

  @Column({ name: 'customer_type', length: 50, default: 'retail' })
  customerType: 'retail' | 'wholesale' | 'vip' | 'distributor';

  @Column({ name: 'tax_responsible', default: false })
  taxResponsible: boolean; // Responsable de IVA

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  notes: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  metadata: string; // JSON para campos adicionales

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany(() => Sale, sale => sale.customer)
  sales: Sale[];
}
```

#### 2. Sale (Venta/Factura)

```typescript
export enum SaleStatus {
  DRAFT = 'draft',           // Borrador
  QUOTED = 'quoted',         // Cotización
  PROFORMA = 'proforma',     // Factura proforma
  CONFIRMED = 'confirmed',   // Confirmada
  INVOICED = 'invoiced',     // Facturada
  DISPATCHED = 'dispatched', // Despachada
  DELIVERED = 'delivered',   // Entregada
  CANCELLED = 'cancelled',   // Cancelada
  CREDITED = 'credited'      // Con nota crédito
}

export enum SaleType {
  QUOTE = 'quote',           // Cotización
  PROFORMA = 'proforma',     // Factura proforma
  INVOICE = 'invoice',       // Factura
  REMISSION = 'remission',   // Remisión
  CREDIT_NOTE = 'credit_note' // Nota crédito
}

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'sale_number', length: 50, unique: true })
  saleNumber: string; // Número de venta único

  @Column({ name: 'sale_type', length: 20 })
  saleType: SaleType;

  @Column({ length: 20 })
  status: SaleStatus;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ name: 'user_id' })
  userId: number; // Usuario que creó la venta

  @Column({ name: 'warehouse_id', nullable: true })
  warehouseId: number;

  @Column({ name: 'sale_date', type: 'datetime' })
  saleDate: Date;

  @Column({ name: 'due_date', type: 'datetime', nullable: true })
  dueDate: Date; // Fecha de vencimiento para crédito

  @Column({ name: 'subtotal', type: 'decimal', precision: 18, scale: 2 })
  subtotal: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  taxAmount: number; // IVA

  @Column({ name: 'tax_percentage', type: 'decimal', precision: 5, scale: 2, default: 19 })
  taxPercentage: number; // Porcentaje de IVA (19% en Colombia)

  @Column({ name: 'discount_amount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ name: 'total', type: 'decimal', precision: 18, scale: 2 })
  total: number;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ name: 'balance', type: 'decimal', precision: 18, scale: 2, default: 0 })
  balance: number; // Saldo pendiente

  @Column({ name: 'payment_status', length: 20, default: 'pending' })
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';

  @Column({ name: 'electronic_invoice_id', nullable: true })
  electronicInvoiceId: number; // Relación con factura electrónica

  @Column({ name: 'reference_sale_id', nullable: true })
  referenceSaleId: number; // Referencia a venta original (para notas crédito)

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  notes: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  metadata: string; // JSON

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @OneToMany(() => SaleDetail, detail => detail.sale, { cascade: true })
  details: SaleDetail[];

  @OneToMany(() => Payment, payment => payment.sale)
  payments: Payment[];

  @OneToOne(() => ElectronicInvoice, invoice => invoice.sale)
  electronicInvoice: ElectronicInvoice;

  @ManyToOne(() => Sale)
  @JoinColumn({ name: 'reference_sale_id' })
  referenceSale: Sale; // Venta original para notas crédito

  @OneToOne(() => DispatchValidation, dispatch => dispatch.sale)
  dispatchValidation: DispatchValidation;
}
```

#### 3. SaleDetail (Detalle de Venta)

```typescript
@Entity('sale_details')
export class SaleDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sale_id' })
  saleId: number;

  @Column({ name: 'product_id' })
  productId: number;

  @Column({ length: 300 })
  description: string; // Descripción del producto al momento de la venta

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 18, scale: 2 })
  unitPrice: number;

  @Column({ name: 'tax_percentage', type: 'decimal', precision: 5, scale: 2, default: 19 })
  taxPercentage: number;

  @Column({ name: 'discount_percentage', type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercentage: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ name: 'line_total', type: 'decimal', precision: 18, scale: 2 })
  lineTotal: number; // Total de la línea (cantidad * precio - descuento + impuesto)

  @Column({ name: 'is_kit', default: false })
  isKit: boolean; // Indica si es un kit que debe descontar componentes

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  metadata: string; // JSON

  // Relations
  @ManyToOne(() => Sale, sale => sale.details)
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
```

#### 4. Payment (Pago)

```typescript
export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'sale_id' })
  saleId: number;

  @Column({ name: 'payment_method_id' })
  paymentMethodId: number;

  @Column({ name: 'payment_number', length: 50, unique: true })
  paymentNumber: string; // Número de recibo de pago

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ name: 'payment_date', type: 'datetime' })
  paymentDate: Date;

  @Column({ length: 20 })
  status: PaymentStatus;

  @Column({ name: 'reference_number', length: 100, nullable: true })
  referenceNumber: string; // Número de transacción, cheque, etc.

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  notes: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  metadata: string; // JSON

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Sale, sale => sale.payments)
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @ManyToOne(() => PaymentMethod)
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethod: PaymentMethod;
}
```

#### 5. PaymentMethod (Método de Pago)

```typescript
@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ length: 100 })
  name: string; // Efectivo, Tarjeta, Transferencia, etc.

  @Column({ length: 50 })
  code: string; // cash, card, transfer, check

  @Column({ name: 'requires_reference', default: false })
  requiresReference: boolean; // Si requiere número de referencia

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  metadata: string; // JSON

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany(() => Payment, payment => payment.paymentMethod)
  payments: Payment[];
}
```

#### 6. ElectronicInvoice (Factura Electrónica DIAN)

```typescript
export enum DIANStatus {
  PENDING = 'pending',       // Pendiente de envío
  SENT = 'sent',             // Enviada a DIAN
  APPROVED = 'approved',     // Aprobada por DIAN
  REJECTED = 'rejected',     // Rechazada por DIAN
  CANCELLED = 'cancelled'    // Cancelada
}

@Entity('electronic_invoices')
export class ElectronicInvoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'sale_id', unique: true })
  saleId: number;

  @Column({ length: 50, unique: true })
  cufe: string; // Código Único de Facturación Electrónica

  @Column({ name: 'dian_resolution', length: 100 })
  dianResolution: string; // Resolución DIAN

  @Column({ name: 'invoice_number', length: 50 })
  invoiceNumber: string; // Número de factura consecutivo

  @Column({ name: 'invoice_prefix', length: 20, nullable: true })
  invoicePrefix: string; // Prefijo de facturación

  @Column({ length: 20 })
  status: DIANStatus;

  @Column({ name: 'xml_path', length: 500, nullable: true })
  xmlPath: string; // Ruta del archivo XML generado

  @Column({ name: 'pdf_path', length: 500, nullable: true })
  pdfPath: string; // Ruta del PDF con representación gráfica

  @Column({ name: 'qr_code', type: 'nvarchar', length: 'max', nullable: true })
  qrCode: string; // Código QR en base64

  @Column({ name: 'sent_at', type: 'datetime', nullable: true })
  sentAt: Date; // Fecha de envío a DIAN

  @Column({ name: 'approved_at', type: 'datetime', nullable: true })
  approvedAt: Date; // Fecha de aprobación DIAN

  @Column({ name: 'dian_response', type: 'nvarchar', length: 'max', nullable: true })
  dianResponse: string; // Respuesta de DIAN en JSON

  @Column({ name: 'error_message', type: 'nvarchar', length: 'max', nullable: true })
  errorMessage: string; // Mensaje de error si fue rechazada

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToOne(() => Sale, sale => sale.electronicInvoice)
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;
}
```

#### 7. ProductKit (Producto Compuesto/BOM)

```typescript
@Entity('product_kits')
export class ProductKit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'kit_product_id' })
  kitProductId: number; // Producto kit (producto final)

  @Column({ name: 'component_product_id' })
  componentProductId: number; // Producto componente (insumo)

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  quantity: number; // Cantidad del componente necesaria

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'kit_product_id' })
  kitProduct: Product;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'component_product_id' })
  componentProduct: Product;
}
```

#### 8. ProductTechnicalSheet (Ficha Técnica)

```typescript
@Entity('product_technical_sheets')
export class ProductTechnicalSheet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id', unique: true })
  productId: number;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  specifications: string; // Especificaciones técnicas (JSON)

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  materials: string; // Materiales

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  dimensions: string; // Dimensiones

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  weight: number; // Peso

  @Column({ length: 50, nullable: true })
  weightUnit: string; // kg, g, lb, oz

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  manufacturer: string; // Fabricante

  @Column({ length: 100, nullable: true })
  model: string; // Modelo

  @Column({ length: 100, nullable: true })
  serial: string; // Serial

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  certifications: string; // Certificaciones

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  safetyInstructions: string; // Instrucciones de seguridad

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  metadata: string; // JSON para campos adicionales

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
```

#### 9. ProductLoan (Préstamo de Productos)

```typescript
export enum LoanStatus {
  ACTIVE = 'active',       // Préstamo activo
  RETURNED = 'returned',   // Devuelto
  OVERDUE = 'overdue',     // Vencido
  CANCELLED = 'cancelled'  // Cancelado
}

@Entity('product_loans')
export class ProductLoan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'loan_number', length: 50, unique: true })
  loanNumber: string;

  @Column({ name: 'product_id' })
  productId: number;

  @Column({ name: 'warehouse_id' })
  warehouseId: number;

  @Column({ name: 'user_id' })
  userId: number; // Usuario que autoriza el préstamo

  @Column({ name: 'borrower_name', length: 200 })
  borrowerName: string; // Nombre del solicitante

  @Column({ name: 'borrower_document', length: 50 })
  borrowerDocument: string; // Documento del solicitante

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  quantity: number;

  @Column({ name: 'loan_date', type: 'datetime' })
  loanDate: Date;

  @Column({ name: 'expected_return_date', type: 'datetime' })
  expectedReturnDate: Date;

  @Column({ name: 'actual_return_date', type: 'datetime', nullable: true })
  actualReturnDate: Date;

  @Column({ name: 'returned_quantity', type: 'decimal', precision: 18, scale: 4, default: 0 })
  returnedQuantity: number;

  @Column({ length: 20 })
  status: LoanStatus;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  notes: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  metadata: string; // JSON

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
```

#### 10. DispatchValidation (Validación de Despacho)

```typescript
export enum DispatchStatus {
  PENDING = 'pending',     // Pendiente de validación
  VALIDATED = 'validated', // Validado correcto
  DISCREPANCY = 'discrepancy', // Discrepancia encontrada
  RESOLVED = 'resolved'    // Discrepancia resuelta
}

@Entity('dispatch_validations')
export class DispatchValidation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sale_id', unique: true })
  saleId: number;

  @Column({ name: 'validated_by' })
  validatedBy: number; // ID del usuario que validó

  @Column({ name: 'validation_date', type: 'datetime' })
  validationDate: Date;

  @Column({ length: 20 })
  status: DispatchStatus;

  @Column({ name: 'has_discrepancy', default: false })
  hasDiscrepancy: boolean;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  discrepancies: string; // JSON con detalles de discrepancias

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  notes: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  metadata: string; // JSON

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToOne(() => Sale, sale => sale.dispatchValidation)
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'validated_by' })
  validator: User;
}
```

#### 11. DocumentTemplate (Plantilla de Documentos)

```typescript
export enum TemplateType {
  INVOICE = 'invoice',
  QUOTE = 'quote',
  PROFORMA = 'proforma',
  REMISSION = 'remission',
  CREDIT_NOTE = 'credit_note'
}

@Entity('document_templates')
export class DocumentTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 20 })
  templateType: TemplateType;

  @Column({ type: 'nvarchar', length: 'max' })
  htmlTemplate: string; // Plantilla HTML con variables

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  cssStyles: string; // Estilos CSS personalizados

  @Column({ name: 'header_html', type: 'nvarchar', length: 'max', nullable: true })
  headerHtml: string; // Encabezado personalizado

  @Column({ name: 'footer_html', type: 'nvarchar', length: 'max', nullable: true })
  footerHtml: string; // Pie de página personalizado

  @Column({ name: 'is_default', default: false })
  isDefault: boolean; // Plantilla predeterminada

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  metadata: string; // JSON

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
```

#### 12. AuditLog (Log de Auditoría)

```typescript
export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
  PRINT = 'print',
  SEND = 'send',
  APPROVE = 'approve',
  REJECT = 'reject',
  CANCEL = 'cancel'
}

export enum AuditEntity {
  SALE = 'sale',
  CUSTOMER = 'customer',
  PRODUCT = 'product',
  PAYMENT = 'payment',
  INVOICE = 'invoice',
  USER = 'user',
  COMPANY = 'company'
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ length: 50 })
  entity: AuditEntity;

  @Column({ name: 'entity_id' })
  entityId: number;

  @Column({ length: 20 })
  action: AuditAction;

  @Column({ name: 'ip_address', length: 50, nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', length: 500, nullable: true })
  userAgent: string;

  @Column({ name: 'old_values', type: 'nvarchar', length: 'max', nullable: true })
  oldValues: string; // JSON con valores anteriores

  @Column({ name: 'new_values', type: 'nvarchar', length: 'max', nullable: true })
  newValues: string; // JSON con valores nuevos

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
```

#### 13. Purchase (Compra/Orden de Compra)

```typescript
export enum PurchaseStatus {
  DRAFT = 'draft',
  ORDERED = 'ordered',
  RECEIVED = 'received',
  PARTIAL = 'partial',
  CANCELLED = 'cancelled'
}

@Entity('purchases')
export class Purchase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'purchase_number', length: 50, unique: true })
  purchaseNumber: string;

  @Column({ name: 'supplier_name', length: 200 })
  supplierName: string;

  @Column({ name: 'supplier_tax_id', length: 50, nullable: true })
  supplierTaxId: string;

  @Column({ name: 'invoice_number', length: 50, nullable: true })
  invoiceNumber: string; // Número de factura del proveedor

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'warehouse_id' })
  warehouseId: number;

  @Column({ name: 'purchase_date', type: 'datetime' })
  purchaseDate: Date;

  @Column({ length: 20 })
  status: PurchaseStatus;

  @Column({ name: 'subtotal', type: 'decimal', precision: 18, scale: 2 })
  subtotal: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ name: 'total', type: 'decimal', precision: 18, scale: 2 })
  total: number;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  notes: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  metadata: string; // JSON

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @OneToMany(() => PurchaseDetail, detail => detail.purchase, { cascade: true })
  details: PurchaseDetail[];
}
```

#### 14. PurchaseDetail (Detalle de Compra)

```typescript
@Entity('purchase_details')
export class PurchaseDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'purchase_id' })
  purchaseId: number;

  @Column({ name: 'product_id' })
  productId: number;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  quantity: number;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 18, scale: 2 })
  unitCost: number;

  @Column({ name: 'line_total', type: 'decimal', precision: 18, scale: 2 })
  lineTotal: number;

  @Column({ name: 'received_quantity', type: 'decimal', precision: 18, scale: 4, default: 0 })
  receivedQuantity: number;

  // Relations
  @ManyToOne(() => Purchase, purchase => purchase.details)
  @JoinColumn({ name: 'purchase_id' })
  purchase: Purchase;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
```

### Modificaciones a Entidades Existentes

#### Product (Mejoras)

Agregar campos:
```typescript
@Column({ name: 'allow_negative_stock', default: false })
allowNegativeStock: boolean;

@Column({ name: 'is_kit', default: false })
isKit: boolean;

@Column({ name: 'track_inventory', default: true })
trackInventory: boolean; // Para servicios o productos sin inventario

@OneToMany(() => ProductKit, kit => kit.kitProduct)
kitComponents: ProductKit[];

@OneToOne(() => ProductTechnicalSheet, sheet => sheet.product)
technicalSheet: ProductTechnicalSheet;
```

#### Company (Mejoras)

Agregar configuración DIAN en settings:
```json
{
  "dian": {
    "enabled": true,
    "testMode": false,
    "resolutionNumber": "18760000001",
    "resolutionDate": "2024-01-01",
    "prefix": "FACT",
    "currentNumber": 1,
    "rangeFrom": 1,
    "rangeTo": 10000,
    "technicalKey": "...",
    "certificatePath": "..."
  },
  "sales": {
    "allowNegativeStock": false,
    "requireCustomerForSales": true,
    "defaultTaxPercentage": 19
  }
}
```

---

## Diseño de APIs

### Estructura de URLs

```
/api/v1
  /customers
  /sales
  /quotes
  /invoices
  /payments
  /payment-methods
  /purchases
  /product-kits
  /product-loans
  /technical-sheets
  /templates
  /audit-logs
  /dian
```

### Endpoints Principales

#### 1. Clientes

```typescript
// GET /api/v1/customers
// Listar clientes con paginación y filtros
interface GetCustomersQuery {
  page?: number;
  limit?: number;
  search?: string; // Buscar por nombre, documento
  type?: 'retail' | 'wholesale' | 'vip' | 'distributor';
  isActive?: boolean;
}

// POST /api/v1/customers
// Crear cliente
interface CreateCustomerDto {
  code?: string; // Auto-generado si no se provee
  documentType: 'CC' | 'NIT' | 'CE' | 'PASSPORT';
  documentNumber: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  creditLimit?: number;
  customerType?: 'retail' | 'wholesale' | 'vip' | 'distributor';
  taxResponsible?: boolean;
  notes?: string;
}

// GET /api/v1/customers/:id
// Obtener cliente por ID

// PUT /api/v1/customers/:id
// Actualizar cliente

// PATCH /api/v1/customers/:id/deactivate
// Inhabilitar cliente

// GET /api/v1/customers/:id/sales-history
// Historial de compras del cliente
```

#### 2. Ventas

```typescript
// GET /api/v1/sales
// Listar ventas con filtros
interface GetSalesQuery {
  page?: number;
  limit?: number;
  status?: SaleStatus;
  type?: SaleType;
  customerId?: number;
  startDate?: string;
  endDate?: string;
  search?: string; // Buscar por número, cliente
}

// POST /api/v1/sales
// Crear venta
interface CreateSaleDto {
  saleType: SaleType;
  status?: SaleStatus; // Default: 'draft'
  customerId: number;
  warehouseId?: number;
  saleDate?: Date;
  dueDate?: Date;
  taxPercentage?: number; // Default: 19
  discountAmount?: number;
  notes?: string;
  details: CreateSaleDetailDto[];
}

interface CreateSaleDetailDto {
  productId: number;
  quantity: number;
  unitPrice: number;
  taxPercentage?: number;
  discountPercentage?: number;
}

// GET /api/v1/sales/:id
// Obtener venta por ID

// PUT /api/v1/sales/:id
// Actualizar venta (solo si está en draft)

// DELETE /api/v1/sales/:id
// Eliminar venta (solo si está en draft)

// POST /api/v1/sales/:id/confirm
// Confirmar venta (cambia status y afecta inventario)

// POST /api/v1/sales/:id/cancel
// Cancelar venta (reversa inventario si fue confirmada)

// POST /api/v1/sales/:id/convert
// Convertir cotización a venta/factura
interface ConvertSaleDto {
  targetType: 'invoice' | 'sale';
}

// GET /api/v1/sales/:id/pdf
// Generar PDF de la venta

// POST /api/v1/sales/bulk
// Carga masiva de ventas
interface BulkSalesDto {
  sales: CreateSaleDto[];
}
```

#### 3. Facturación Electrónica

```typescript
// POST /api/v1/dian/invoice
// Generar factura electrónica
interface CreateElectronicInvoiceDto {
  saleId: number;
}

// POST /api/v1/dian/invoice/:id/send
// Enviar factura a DIAN

// GET /api/v1/dian/invoice/:id/status
// Consultar estado en DIAN

// GET /api/v1/dian/invoice/:id/xml
// Descargar XML

// GET /api/v1/dian/invoice/:id/pdf
// Descargar PDF con representación gráfica

// POST /api/v1/dian/invoice/:id/cancel
// Anular factura electrónica
```

#### 4. Pagos

```typescript
// POST /api/v1/payments
// Registrar pago
interface CreatePaymentDto {
  saleId: number;
  payments: PaymentDetailDto[]; // Soporte para múltiples métodos
}

interface PaymentDetailDto {
  paymentMethodId: number;
  amount: number;
  referenceNumber?: string;
  notes?: string;
}

// GET /api/v1/payments
// Listar pagos

// GET /api/v1/payments/:id
// Obtener pago

// POST /api/v1/payments/:id/refund
// Reembolsar pago
```

#### 5. Métodos de Pago

```typescript
// GET /api/v1/payment-methods
// Listar métodos de pago

// POST /api/v1/payment-methods
// Crear método de pago
interface CreatePaymentMethodDto {
  name: string;
  code: string;
  requiresReference?: boolean;
}

// PUT /api/v1/payment-methods/:id
// Actualizar método de pago

// PATCH /api/v1/payment-methods/:id/deactivate
// Desactivar método de pago
```

#### 6. Compras

```typescript
// POST /api/v1/purchases
// Registrar compra con factura
interface CreatePurchaseDto {
  supplierName: string;
  supplierTaxId?: string;
  invoiceNumber?: string;
  warehouseId: number;
  purchaseDate: Date;
  taxPercentage?: number;
  notes?: string;
  details: CreatePurchaseDetailDto[];
}

interface CreatePurchaseDetailDto {
  productId: number;
  quantity: number;
  unitCost: number;
}

// GET /api/v1/purchases
// Listar compras

// POST /api/v1/purchases/:id/receive
// Recibir mercancía (actualiza inventario)
```

#### 7. Kits de Productos

```typescript
// POST /api/v1/product-kits
// Crear kit
interface CreateProductKitDto {
  kitProductId: number;
  components: KitComponentDto[];
}

interface KitComponentDto {
  componentProductId: number;
  quantity: number;
}

// GET /api/v1/product-kits/:kitProductId
// Obtener componentes del kit

// DELETE /api/v1/product-kits/:id
// Eliminar componente del kit
```

#### 8. Préstamos de Productos

```typescript
// POST /api/v1/product-loans
// Registrar préstamo
interface CreateProductLoanDto {
  productId: number;
  warehouseId: number;
  borrowerName: string;
  borrowerDocument: string;
  quantity: number;
  expectedReturnDate: Date;
  notes?: string;
}

// POST /api/v1/product-loans/:id/return
// Registrar devolución
interface ReturnProductLoanDto {
  returnedQuantity: number;
  notes?: string;
}

// GET /api/v1/product-loans
// Listar préstamos con filtros
```

#### 9. Fichas Técnicas

```typescript
// POST /api/v1/technical-sheets
// Crear/Actualizar ficha técnica
interface UpsertTechnicalSheetDto {
  productId: number;
  specifications?: string;
  materials?: string;
  dimensions?: string;
  weight?: number;
  weightUnit?: string;
  manufacturer?: string;
  model?: string;
  certifications?: string;
}

// GET /api/v1/technical-sheets/:productId
// Obtener ficha técnica
```

#### 10. Plantillas de Documentos

```typescript
// POST /api/v1/templates
// Crear plantilla
interface CreateTemplateDto {
  name: string;
  templateType: TemplateType;
  htmlTemplate: string;
  cssStyles?: string;
  headerHtml?: string;
  footerHtml?: string;
  isDefault?: boolean;
}

// GET /api/v1/templates
// Listar plantillas

// PUT /api/v1/templates/:id
// Actualizar plantilla
```

#### 11. Validación de Despachos

```typescript
// POST /api/v1/sales/:id/dispatch-validation
// Validar despacho
interface ValidateDispatchDto {
  items: DispatchItemDto[];
  notes?: string;
}

interface DispatchItemDto {
  saleDetailId: number;
  dispatchedQuantity: number;
}

// GET /api/v1/sales/:id/dispatch-validation
// Obtener validación de despacho
```

#### 12. Auditoría

```typescript
// GET /api/v1/audit-logs
// Consultar logs de auditoría
interface GetAuditLogsQuery {
  page?: number;
  limit?: number;
  entity?: AuditEntity;
  entityId?: number;
  action?: AuditAction;
  userId?: number;
  startDate?: string;
  endDate?: string;
}
```

#### 13. Reportes

```typescript
// GET /api/v1/reports/sales-summary
// Resumen de ventas
interface SalesSummaryQuery {
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month' | 'customer' | 'product';
}

// GET /api/v1/reports/kardex/:productId
// Kardex de producto
interface KardexQuery {
  startDate?: string;
  endDate?: string;
  warehouseId?: number;
}

// GET /api/v1/reports/inventory-closing
// Reporte de cierre de inventario
interface InventoryClosingQuery {
  date: string;
  warehouseId?: number;
}
```

---

## Integración DIAN

### Flujo de Facturación Electrónica

```
1. Crear Venta → Sale (status: 'draft')
2. Confirmar Venta → Sale (status: 'confirmed') + Afecta Inventario
3. Generar Factura Electrónica:
   a. Validar datos DIAN
   b. Generar XML según formato UBL 2.1
   c. Firmar digitalmente XML
   d. Generar CUFE
   e. Crear registro ElectronicInvoice
4. Enviar a DIAN:
   a. POST a servicio DIAN
   b. Actualizar status según respuesta
5. Generar PDF con QR
6. Notificar cliente (email con PDF y XML)
```

### Estructura XML UBL 2.1 (Simplificado)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>...</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1</cbc:ProfileID>
  <cbc:ID>FACT-001</cbc:ID>
  <cbc:UUID>CUFE-GENERADO</cbc:UUID>
  <cbc:IssueDate>2024-01-15</cbc:IssueDate>
  <cbc:IssueTime>10:30:00</cbc:IssueTime>
  <cbc:InvoiceTypeCode>01</cbc:InvoiceTypeCode>

  <cac:AccountingSupplierParty>
    <!-- Datos del emisor -->
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <!-- Datos del cliente -->
  </cac:AccountingCustomerParty>

  <cac:InvoiceLine>
    <!-- Líneas de la factura -->
  </cac:InvoiceLine>

  <cac:LegalMonetaryTotal>
    <!-- Totales -->
  </cac:LegalMonetaryTotal>
</Invoice>
```

### Servicio DIAN

```typescript
// src/services/DIANService.ts

export class DIANService {
  private readonly baseUrl: string;
  private readonly testMode: boolean;

  constructor(companyId: number) {
    // Cargar configuración de la empresa
  }

  /**
   * Genera XML UBL 2.1 para factura electrónica
   */
  async generateXML(sale: Sale): Promise<string> {
    // Implementación de generación XML
  }

  /**
   * Firma digitalmente el XML
   */
  async signXML(xml: string, certificatePath: string): Promise<string> {
    // Implementación de firma digital
  }

  /**
   * Genera CUFE (Código Único de Facturación Electrónica)
   */
  generateCUFE(data: CUFEData): string {
    // Implementación de algoritmo CUFE
  }

  /**
   * Envía factura a DIAN
   */
  async sendInvoice(xml: string): Promise<DIANResponse> {
    // POST a servicio DIAN
  }

  /**
   * Consulta estado de factura en DIAN
   */
  async getInvoiceStatus(cufe: string): Promise<DIANStatusResponse> {
    // GET estado de DIAN
  }

  /**
   * Genera código QR para factura
   */
  generateQRCode(cufe: string, data: QRData): Promise<string> {
    // Genera QR en base64
  }
}
```

---

## Plan de Implementación por Fases

### Fase 1: Fundamentos (Semanas 1-3)

**Objetivo:** Establecer la base de datos y servicios fundamentales

#### Semana 1: Modelo de Datos y Migraciones
- **Día 1-2:** Crear entidades TypeORM
  - Customer
  - PaymentMethod
  - Sale
  - SaleDetail
  - Payment
- **Día 3-4:** Generar y ejecutar migraciones
  - Validar esquema en SQL Server
  - Crear índices optimizados
- **Día 5:** DTOs y validaciones
  - class-validator para todas las entidades
  - Crear DTOs de creación y actualización

#### Semana 2: Servicios Base
- **Día 1-2:** CustomerService
  - CRUD completo
  - Validaciones de negocio
  - Gestión de crédito
- **Día 3-4:** PaymentMethodService
  - CRUD básico
  - Validaciones
- **Día 5:** SaleService (base)
  - Crear venta en borrador
  - Validaciones básicas

#### Semana 3: APIs y Controladores Base
- **Día 1-2:** CustomerController
  - Endpoints CRUD
  - Filtros y paginación
  - Swagger documentation
- **Día 3:** PaymentMethodController
- **Día 4-5:** SaleController (endpoints básicos)
  - Crear/Editar/Eliminar borrador
  - Listar ventas

**Entregables:**
- Base de datos con tablas de clientes, métodos de pago, ventas
- APIs funcionales para gestión básica
- Documentación Swagger actualizada

**Criterios de Aceptación:**
- Crear cliente y registrar método de pago
- Crear venta en borrador con detalles
- Consultar historial de ventas con filtros

---

### Fase 2: Ventas y Facturación Básica (Semanas 4-6)

**Objetivo:** Implementar flujo completo de ventas sin facturación electrónica

#### Semana 4: Lógica de Ventas
- **Día 1-2:** Confirmación de ventas
  - Cambio de estado draft → confirmed
  - Afectación de inventario
  - Transacciones ACID
- **Día 3-4:** Cotizaciones
  - Crear/editar cotización
  - Convertir a venta
- **Día 5:** Factura proforma
  - Generar proforma sin afectar inventario

#### Semana 5: Pagos y Notas Crédito
- **Día 1-2:** PaymentService
  - Registrar pagos múltiples
  - Actualizar estado de venta
  - Validar límite de crédito
- **Día 3-4:** Notas crédito
  - Crear nota crédito
  - Reversar inventario
  - Actualizar balance cliente
- **Día 5:** Remisiones
  - Crear remisión sin factura

#### Semana 6: Validación y Reportes
- **Día 1-2:** Validación de despachos
  - DispatchValidationService
  - Detectar discrepancias
- **Día 3-4:** Reportes básicos
  - Historial de ventas
  - Resumen por período
  - Ventas por cliente
- **Día 5:** Pruebas integrales

**Entregables:**
- Flujo completo de ventas funcional
- Sistema de pagos con múltiples métodos
- Notas crédito con reversión de inventario
- Validación de despachos

**Criterios de Aceptación:**
- Crear cotización y convertirla a venta
- Registrar pago con múltiples métodos
- Generar nota crédito que revierta inventario
- Validar despacho con detección de discrepancias

---

### Fase 3: Inventario Avanzado (Semanas 7-9)

**Objetivo:** Mejoras al módulo de inventario

#### Semana 7: Compras y Kardex
- **Día 1-2:** PurchaseService
  - Registrar compra con factura
  - Actualizar inventario automáticamente
- **Día 3-4:** Kardex
  - Seguimiento FIFO/LIFO
  - Reporte detallado de movimientos
- **Día 5:** Inventario negativo (opcional)
  - Configuración por empresa
  - Validaciones condicionales

#### Semana 8: Productos Avanzados
- **Día 1-2:** ProductKitService
  - Crear kits (BOM)
  - Descontar componentes en venta
- **Día 3-4:** Fichas técnicas
  - ProductTechnicalSheetService
  - CRUD completo
- **Día 5:** Préstamo de productos
  - ProductLoanService
  - Control de devoluciones

#### Semana 9: Cierre e Informes
- **Día 1-2:** Cierre de inventario
  - Reporte de cierre
  - Ajustes manuales
- **Día 3-4:** Inhabilitar productos
  - Soft delete preservando histórico
- **Día 5:** Pruebas y validación

**Entregables:**
- Sistema de compras con actualización automática
- Kardex funcional con métodos de valoración
- Kits de productos con descuento automático
- Préstamos de productos con control de devoluciones
- Cierre de inventario con ajustes

**Criterios de Aceptación:**
- Registrar compra y verificar actualización de inventario
- Consultar kardex con movimientos detallados
- Vender kit y verificar descuento de componentes
- Registrar préstamo y devolución parcial
- Generar reporte de cierre de inventario

---

### Fase 4: Facturación Electrónica DIAN (Semanas 10-12)

**Objetivo:** Integración completa con DIAN

#### Semana 10: Infraestructura DIAN
- **Día 1-2:** DIANService base
  - Configuración por empresa
  - Conexión a servicio DIAN (test)
- **Día 3-4:** Generación de XML UBL 2.1
  - Implementar estándar DIAN
  - Validaciones de estructura
- **Día 5:** Firma digital
  - Integración con certificado digital
  - Validar firma

#### Semana 11: Facturación Electrónica
- **Día 1-2:** Generación de CUFE
  - Algoritmo según DIAN
  - Validaciones
- **Día 3-4:** Envío a DIAN
  - POST a servicio
  - Manejo de respuestas
  - Reintentos automáticos
- **Día 5:** Código QR
  - Generar QR con datos factura
  - Integrar en PDF

#### Semana 12: Finalización y Pruebas
- **Día 1-2:** ElectronicInvoiceService completo
  - Consulta de estado
  - Anulación de facturas
- **Día 3-4:** Pruebas en ambiente DIAN test
  - Validar facturas de prueba
  - Corregir errores
- **Día 5:** Documentación técnica DIAN

**Entregables:**
- Servicio de facturación electrónica funcional
- Integración completa con DIAN
- Generación de XML, firma digital, CUFE, QR
- Consulta y anulación de facturas

**Criterios de Aceptación:**
- Generar factura electrónica válida
- Enviar a DIAN y recibir aprobación
- Consultar estado en DIAN
- Generar PDF con representación gráfica y QR
- Anular factura electrónica

---

### Fase 5: Documentos y Auditoría (Semanas 13-14)

**Objetivo:** Sistema de documentos PDF y auditoría completa

#### Semana 13: Generación de Documentos
- **Día 1-2:** DocumentService
  - Generación de PDF con plantillas
  - Uso de librería (puppeteer o pdfmake)
- **Día 3-4:** TemplateService
  - CRUD de plantillas
  - Variables dinámicas
  - Plantillas por defecto
- **Día 5:** Adjuntos e imágenes
  - Subida de archivos
  - Asociar a documentos
  - Almacenamiento seguro

#### Semana 14: Auditoría y Logs
- **Día 1-2:** AuditService
  - Interceptor automático
  - Registro de cambios
  - Captura de IP y user-agent
- **Día 3-4:** APIs de consulta
  - Filtros avanzados
  - Exportación de logs
- **Día 5:** Configuración de exportación
  - Parámetros por entidad
  - Formatos: Excel, CSV, PDF

**Entregables:**
- Sistema de generación de PDF funcional
- Plantillas configurables
- Sistema de auditoría completo
- Logs de todas las operaciones críticas

**Criterios de Aceptación:**
- Generar PDF de factura con plantilla personalizada
- Crear y asignar plantilla a tipo de documento
- Adjuntar imagen a producto
- Consultar logs de auditoría con filtros
- Exportar logs a Excel

---

### Fase 6: Ventas Masivas y Optimización (Semanas 15-16)

**Objetivo:** Carga masiva y optimización del sistema

#### Semana 15: Ventas Masivas
- **Día 1-2:** BulkSalesService
  - Carga de Excel/CSV
  - Validación de datos
  - Procesamiento en lotes
- **Día 3-4:** Manejo de errores
  - Reportes de errores detallados
  - Rollback por lote
- **Día 5:** Optimización de consultas
  - Índices en tablas críticas
  - Query optimization

#### Semana 16: Pruebas y Documentación
- **Día 1-2:** Pruebas de carga
  - Ventas masivas (1000+ registros)
  - Validación de performance
- **Día 3-4:** Documentación completa
  - APIs Swagger
  - Diagramas actualizados
  - Guías de integración
- **Día 5:** Capacitación y entrega

**Entregables:**
- Sistema de carga masiva de ventas
- Performance optimizado
- Documentación técnica completa
- Sistema listo para producción

**Criterios de Aceptación:**
- Cargar 500 ventas en menos de 2 minutos
- Procesar archivo con errores y generar reporte
- Documentación Swagger 100% actualizada

---

## Consideraciones de Seguridad

### 1. Autenticación y Autorización

**Roles requeridos:**
- `admin`: Acceso total
- `manager`: Gestión de ventas, clientes, reportes
- `salesperson`: Crear ventas, cotizaciones
- `warehouse`: Gestión de inventario, validación de despachos
- `accountant`: Acceso a facturación, reportes financieros
- `viewer`: Solo lectura

**Permisos por módulo:**
```typescript
const PERMISSIONS = {
  'customers:read': ['admin', 'manager', 'salesperson', 'accountant', 'viewer'],
  'customers:write': ['admin', 'manager'],
  'sales:read': ['admin', 'manager', 'salesperson', 'accountant', 'viewer'],
  'sales:write': ['admin', 'manager', 'salesperson'],
  'sales:delete': ['admin', 'manager'],
  'invoices:generate': ['admin', 'manager', 'accountant'],
  'payments:write': ['admin', 'manager', 'accountant'],
  'products:write': ['admin', 'manager'],
  'audit:read': ['admin', 'manager'],
};
```

### 2. Validaciones de Seguridad

- **Inyección SQL**: Uso de TypeORM parameterizado
- **XSS**: Sanitización de inputs en DTOs
- **CSRF**: Tokens CSRF en formularios
- **Rate Limiting**: Límite de requests por IP
- **Encriptación**: Datos sensibles (costos, precios) encriptados
- **Aislamiento Multi-Empresa**: Validar `companyId` en todas las queries

### 3. Cumplimiento DIAN

- **Integridad de datos**: No permitir modificación de facturas aprobadas
- **Trazabilidad**: Auditoría completa de facturación electrónica
- **Respaldo**: Almacenar XML y PDF por 5 años
- **Numeración consecutiva**: Control estricto de consecutivos

---

## Pruebas y Validación

### Estrategia de Pruebas

#### 1. Pruebas Unitarias (Jest)
- Servicios de negocio
- Validaciones de DTOs
- Cálculos (totales, impuestos, descuentos)
- **Cobertura objetivo:** >80%

#### 2. Pruebas de Integración
- Flujos completos de venta
- Integración con DIAN (ambiente test)
- Transacciones de base de datos
- Generación de PDFs

#### 3. Pruebas de Carga
- Ventas masivas (1000+ registros)
- Consultas concurrentes
- Generación masiva de PDFs

#### 4. Pruebas de Seguridad
- Inyección SQL
- XSS
- Autorización por roles
- Aislamiento multi-empresa

### Casos de Prueba Críticos

#### Caso 1: Venta Completa con Pago Múltiple
```
1. Crear cliente
2. Crear venta con 3 productos
3. Confirmar venta (verifica descuento de inventario)
4. Registrar pago con 2 métodos (50% efectivo, 50% tarjeta)
5. Verificar estado de venta: 'paid'
6. Generar PDF
```

#### Caso 2: Nota Crédito con Reversión
```
1. Crear venta confirmada
2. Verificar inventario descontado
3. Crear nota crédito total
4. Verificar inventario restaurado
5. Verificar balance de cliente ajustado
```

#### Caso 3: Factura Electrónica DIAN
```
1. Configurar empresa con datos DIAN
2. Crear venta confirmada
3. Generar factura electrónica
4. Enviar a DIAN (ambiente test)
5. Verificar aprobación
6. Generar PDF con QR
7. Consultar estado en DIAN
```

#### Caso 4: Kit de Productos
```
1. Crear producto kit con 3 componentes
2. Vender 5 unidades del kit
3. Verificar descuento de 15 unidades de componentes (5*3)
4. Validar inventario de componentes
```

#### Caso 5: Validación de Despacho con Discrepancia
```
1. Crear venta con 2 productos
2. Producto 1: vendido 10, despachado 10 ✓
3. Producto 2: vendido 5, despachado 3 ✗
4. Registrar validación con discrepancia
5. Verificar estado: 'discrepancy'
6. Generar reporte de discrepancia
```

---

## Anexos

### A. Estructura de Directorios

```
src/
├── entities/
│   ├── Customer.entity.ts
│   ├── Sale.entity.ts
│   ├── SaleDetail.entity.ts
│   ├── Payment.entity.ts
│   ├── PaymentMethod.entity.ts
│   ├── ElectronicInvoice.entity.ts
│   ├── Purchase.entity.ts
│   ├── PurchaseDetail.entity.ts
│   ├── ProductKit.entity.ts
│   ├── ProductTechnicalSheet.entity.ts
│   ├── ProductLoan.entity.ts
│   ├── DispatchValidation.entity.ts
│   ├── DocumentTemplate.entity.ts
│   └── AuditLog.entity.ts
├── dto/
│   ├── customer/
│   ├── sale/
│   ├── payment/
│   ├── purchase/
│   └── ...
├── services/
│   ├── CustomerService.ts
│   ├── SaleService.ts
│   ├── PaymentService.ts
│   ├── PurchaseService.ts
│   ├── ProductKitService.ts
│   ├── ProductLoanService.ts
│   ├── DIANService.ts
│   ├── DocumentService.ts
│   ├── TemplateService.ts
│   ├── AuditService.ts
│   └── BulkSalesService.ts
├── controllers/
│   ├── CustomerController.ts
│   ├── SaleController.ts
│   ├── PaymentController.ts
│   ├── PurchaseController.ts
│   ├── DIANController.ts
│   └── ...
├── routes/
│   ├── customer.routes.ts
│   ├── sale.routes.ts
│   ├── payment.routes.ts
│   └── ...
├── middleware/
│   ├── auditInterceptor.middleware.ts
│   └── ...
└── utils/
    ├── pdf.util.ts
    ├── xml.util.ts
    └── cufe.util.ts
```

### B. Variables de Entorno Requeridas

```env
# Existentes
DATABASE_HOST=localhost
DATABASE_PORT=1433
DATABASE_USER=sa
DATABASE_PASSWORD=password
DATABASE_NAME=inventory_db
JWT_SECRET=secret

# Nuevas para DIAN
DIAN_BASE_URL=https://vpfe-hab.dian.gov.co
DIAN_TEST_MODE=true
DIAN_TIMEOUT=30000

# PDF Generation
PDF_STORAGE_PATH=./storage/pdfs
TEMP_PATH=./storage/temp

# Uploads
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Email (para envío de facturas)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@empresa.com
SMTP_PASSWORD=password
```

### C. Dependencias Adicionales

```json
{
  "dependencies": {
    "puppeteer": "^21.0.0",        // Generación de PDF
    "qrcode": "^1.5.3",            // Códigos QR
    "xml2js": "^0.6.2",            // Manejo de XML
    "fast-xml-parser": "^4.3.2",  // Parser XML rápido
    "node-forge": "^1.3.1",        // Firma digital
    "date-fns": "^2.30.0",         // Manejo de fechas
    "uuid": "^9.0.1"               // Generación de UUIDs
  }
}
```

---

## Resumen de Estimaciones

| Fase | Duración | Funcionalidades | Complejidad |
|------|----------|-----------------|-------------|
| 1 - Fundamentos | 3 semanas | Base de datos, servicios base | Media |
| 2 - Ventas Básicas | 3 semanas | Ventas, pagos, notas crédito | Alta |
| 3 - Inventario Avanzado | 3 semanas | Compras, kits, préstamos | Media-Alta |
| 4 - DIAN | 3 semanas | Facturación electrónica | Alta |
| 5 - Documentos | 2 semanas | PDFs, plantillas, auditoría | Media |
| 6 - Masivas | 2 semanas | Carga masiva, optimización | Media |
| **Total** | **16 semanas** | **35 funcionalidades** | - |

**Recursos requeridos:**
- 1-2 desarrolladores backend (TypeScript/Node.js)
- 1 QA tester
- 1 consultor DIAN (para configuración)

**Riesgos principales:**
- Complejidad de integración DIAN
- Validaciones específicas de normativa colombiana
- Performance con grandes volúmenes de datos

**Mitigación:**
- Comenzar pruebas DIAN temprano (Fase 4)
- Validar requerimientos legales con contador
- Pruebas de carga desde Fase 3

---

**Fecha:** 2025-11-20
**Versión:** 1.0
**Autor:** Sistema de Diseño Arquitectónico
