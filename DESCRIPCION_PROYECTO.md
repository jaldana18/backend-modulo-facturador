# 📦 Sistema de Gestión de Inventario Multi-Empresa

## 🎯 **Descripción General**

Sistema de gestión de inventario **multi-tenant** (multi-compañía) construido con **Node.js**, **TypeScript**, **Express** y **SQL Server**. Diseñado para gestionar operaciones de inventario, ventas, clientes y auditoría completa para múltiples empresas con aislamiento total de datos.

---

## 🏗️ **Arquitectura del Sistema**

### **Stack Tecnológico**

- **Backend**: Node.js 20 LTS + TypeScript 5.x (strict mode)
- **Framework**: Express.js 4.x con manejo asíncrono de errores
- **ORM**: TypeORM 0.3.17 con soporte completo para SQL Server
- **Base de Datos**: SQL Server 2019+ con Row-Level Security (RLS)
- **Autenticación**: JWT con refresh tokens
- **Logging**: Winston con rotación diaria de archivos
- **Seguridad**: Helmet, CORS, Rate Limiting, Encriptación AES-256
- **Documentación**: Swagger/OpenAPI
- **Testing**: Jest con cobertura unit/integration/e2e

### **Patrón de Arquitectura**

```
Frontend → API Gateway → Express.js
                           ├── Middleware Layer (Auth, Tenant Context, Logging)
                           ├── Controller Layer (HTTP Handlers)
                           ├── Service Layer (Business Logic)
                           ├── Repository Layer (Data Access)
                           └── SQL Server (Row-Level Security)
```

---

## ⚙️ **Funcionalidades Principales**

### **1. Multi-Tenancy (Multi-Empresa)** 🏢
- Aislamiento completo de datos por empresa usando `company_id`
- Row-Level Security automática en SQL Server
- Middleware de contexto tenant automático
- Índices filtrados para máxima performance

### **2. Gestión de Inventario** 📦

#### Operaciones Básicas:
- **CRUD completo** de productos con SKU único por empresa
- **Multi-almacén**: Gestión de múltiples bodegas por empresa
- **Movimientos de inventario**: Entradas, salidas, transferencias, ajustes
- **Cantidad reservada**: Control de stock disponible vs reservado
- **Control de stock mínimo** y punto de reorden

#### Operaciones Avanzadas:
- **Carga masiva de inventario** vía Excel (entradas/compras)
- **Carga masiva de productos** con validaciones
- **Sistema de lotes (batches)**: Control FIFO con números de lote
- **Reservas de inventario**: Asignación temporal de stock
- **Transacciones atómicas**: Garantía de consistencia de datos
- **Imágenes de productos**: Subida y almacenamiento con Multer

### **3. Gestión de Ventas y Facturación** 💰

- **Proceso completo de ventas**: 
  - Ventas en borrador (guardar y reanudar)
  - Cotizaciones
  - Facturas proforma
  - Validación de stock disponible
  - Descuentos manuales por producto y globales

- **Métodos de pago configurables**:
  - Pagos múltiples (división en varios métodos)
  - Integración con efectivo, tarjetas, transferencias, etc.
  - Tracking de pagos por venta

- **Gestión de clientes**:
  - CRUD completo con validación de datos
  - Historial de compras por cliente
  - Control de crédito y cuentas por cobrar
  - Índices para búsqueda rápida

### **4. Sistema de Auditoría Completo** 📝

#### **Audit Logs (Base de Datos)**:
- Registro de **TODAS** las operaciones CRUD
- Almacenamiento de valores anteriores/nuevos (JSON)
- Tracking de IP, User Agent, módulo y severidad
- Filtros avanzados: usuario, acción, entidad, rango de fechas
- Estadísticas agregadas de actividad
- Política de retención configurable

#### **Activity Logs (Logs de Negocio)**:
- Logs orientados a usuarios finales
- Eventos de negocio legibles (ventas, pagos, transferencias)
- Doble registro: Winston + Base de Datos
- Consultas optimizadas para frontend

#### Acciones Rastreadas:
- **Auth**: LOGIN, LOGOUT, PASSWORD_RESET
- **CRUD**: CREATE, UPDATE, DELETE
- **Inventario**: STOCK_IN, STOCK_OUT, TRANSFER, ADJUSTMENT
- **Ventas**: SALE_CREATED, SALE_CANCELLED, PAYMENT_RECEIVED
- **Bulk**: BULK_IMPORT, BULK_UPDATE

### **5. Gestión de Usuarios y Permisos** 👥

- **Autenticación JWT** con tokens de acceso y refresh
- **Roles**: Admin, Manager, User (RBAC)
- **Multi-empresa**: Usuarios aislados por compañía
- **Asignación de bodegas** a usuarios específicos
- **Encriptación de contraseñas** con bcrypt
- **Sesiones seguras** con validación de tokens

### **6. Catálogos y Configuración** 🗂️

- **Categorías de productos**: Organización jerárquica
- **Unidades de medida**: Sistema configurable (kg, unidad, litros, etc.)
- **Métodos de pago**: Catálogo personalizable por empresa
- **Configuración de empresas**: Settings en JSON flexible

---

## 📂 **Estructura del Proyecto**

```
backend/
├── src/
│   ├── config/          # Configuración (DB, Logger, Swagger, Environment)
│   ├── entities/        # 19 Entidades TypeORM (Company, User, Product, etc.)
│   ├── controllers/     # 18 Controladores HTTP
│   ├── services/        # 20 Servicios de lógica de negocio
│   ├── repositories/    # Capa de acceso a datos
│   ├── routes/          # 20 Archivos de rutas modulares
│   ├── middleware/      # Auth, Tenant Context, Error Handler, Rate Limiter
│   ├── dto/             # Data Transfer Objects con validaciones
│   ├── utils/           # Utilidades (encryption, jwt, audit helpers)
│   ├── migrations/      # Migraciones TypeORM
│   └── seeds/           # Seeders de datos iniciales
├── docs/                # 10+ Documentos técnicos
├── tests/               # Suite completa de tests
├── uploads/             # Almacenamiento de imágenes
└── logs/                # Logs de Winston con rotación
```

---

## 🗃️ **Modelo de Datos (19 Entidades)**

### Entidades Core:
1. **Company**: Empresas con datos fiscales encriptados
2. **User**: Usuarios con roles y pertenencia a empresa
3. **Warehouse**: Almacenes/bodegas multi-ubicación
4. **Product**: Productos con SKU único, categoría, UOM, precios
5. **Category**: Categorías de productos
6. **UnitOfMeasure**: Unidades de medida configurables

### Inventario:
7. **InventoryTransaction**: Transacciones con tipos (INBOUND, OUTBOUND, TRANSFER, ADJUSTMENT)
8. **InventoryBatch**: Lotes con números únicos y fechas de expiración
9. **BatchAllocation**: Asignación de lotes a transacciones
10. **BatchReservation**: Reservas temporales de stock
11. **InventorySnapshot**: Snapshots para reportes históricos

### Ventas:
12. **Customer**: Clientes con límite de crédito
13. **Sale**: Ventas con estados y totales
14. **SaleDetail**: Líneas de venta con descuentos por producto
15. **Payment**: Pagos asociados a ventas
16. **PaymentMethod**: Catálogo de métodos de pago
17. **SalesAggregate**: Agregados para reportes

### Auditoría:
18. **AuditLog**: Logs completos de auditoría
19. **ActivityLog**: Logs de actividad de usuarios

---

## 🔒 **Características de Seguridad**

- ✅ **Row-Level Security (RLS)** en SQL Server
- ✅ **Encriptación AES-256** para datos sensibles (tax_id, precios)
- ✅ **JWT con refresh tokens** y expiración configurable
- ✅ **Rate Limiting** para prevenir ataques
- ✅ **Helmet.js** para headers de seguridad HTTP
- ✅ **CORS configurado** con origins específicos
- ✅ **Bcrypt** para hashing de contraseñas
- ✅ **Validación de entrada** con class-validator
- ✅ **SQL Injection protection** vía TypeORM
- ✅ **Logs de intentos fallidos** de autenticación

---

## 📊 **Endpoints API (20+ Módulos)**

| Módulo | Rutas | Descripción |
|--------|-------|-------------|
| **Auth** | `/api/v1/auth/*` | Login, logout, refresh, password reset |
| **Companies** | `/api/v1/companies/*` | CRUD de empresas |
| **Users** | `/api/v1/users/*` | Gestión de usuarios |
| **Warehouses** | `/api/v1/warehouses/*` | CRUD de almacenes |
| **Products** | `/api/v1/products/*` | CRUD con imágenes |
| **Categories** | `/api/v1/categories/*` | Categorías de productos |
| **UnitOfMeasure** | `/api/v1/unit-of-measures/*` | Unidades de medida |
| **Inventory** | `/api/v1/inventory/*` | Transacciones y consultas |
| **Bulk Inventory** | `/api/v1/inventory/bulk/*` | Carga masiva Excel |
| **Bulk Products** | `/api/v1/products/bulk/*` | Carga masiva productos |
| **Batches** | `/api/v1/batches/*` | Gestión de lotes |
| **Customers** | `/api/v1/customers/*` | CRUD de clientes |
| **Sales** | `/api/v1/sales/*` | Proceso completo de ventas |
| **Payments** | `/api/v1/payments/*` | Gestión de pagos |
| **PaymentMethods** | `/api/v1/payment-methods/*` | Catálogo de métodos |
| **AuditLogs** | `/api/v1/audit-logs-db/*` | Consulta de auditoría |
| **ActivityLogs** | `/api/v1/activity-logs/*` | Logs de actividad |
| **Analytics** | `/api/v1/analytics/*` | Reportes y estadísticas |

---

## 📚 **Documentación Técnica Incluida**

El proyecto incluye **15+ documentos** técnicos:
- `DESIGN.md` - Diseño arquitectónico completo (1317 líneas)
- `SALES_MODULE_DESIGN.md` - Módulo de ventas (2222 líneas)
- `AUDIT_LOG_IMPLEMENTATION.md` - Sistema de auditoría
- `ACTIVITY_LOGS_SYSTEM.md` - Logs de actividad
- `BULK_INVENTORY_UPLOAD.md` - Guía de carga masiva
- `PRODUCT_IMAGES.md` - Sistema de imágenes
- `WAREHOUSE_IMPROVEMENTS.md` - Mejoras de bodegas
- `FRONTEND_INTEGRATION_GUIDE.md` - Guía de integración frontend
- `MIGRATION_VALIDATION.md` - Validación de migraciones
- Documentación Swagger interactiva en `/api-docs`

---

## 🚀 **Scripts Disponibles**

### Desarrollo
```bash
npm run dev                    # Servidor en modo desarrollo con hot-reload
npm run build                  # Compilar TypeScript a JavaScript
npm start                      # Ejecutar servidor en producción
npm run docs:analytics         # Servidor de documentación analytics
```

### Base de Datos
```bash
npm run migration:generate     # Generar nueva migración
npm run migration:run          # Ejecutar migraciones pendientes
npm run migration:revert       # Revertir última migración
npm run schema:validate        # Validar esquema de base de datos
npm run schema:validate:strict # Validación estricta de esquema
```

### Seeders
```bash
npm run seed                   # Ejecutar seed inicial
npm run seed:all               # Ejecutar todos los seeds
npm run seed:catalog           # Seed de datos de catálogo
npm run seed:payment-methods   # Seed de métodos de pago
```

### Testing y Calidad
```bash
npm test                       # Ejecutar tests
npm run test:watch             # Tests en modo watch
npm run test:coverage          # Tests con reporte de cobertura
npm run lint                   # Ejecutar linter
npm run lint:fix               # Corregir errores de linting
```

---

## 🎯 **Estado Actual del Proyecto**

### ✅ **Implementado y Funcional:**
- ✅ Sistema multi-tenant completo
- ✅ Módulo de inventario avanzado con lotes
- ✅ Módulo de ventas y facturación
- ✅ Sistema de auditoría dual (AuditLogs + ActivityLogs)
- ✅ Carga masiva de datos (productos e inventario)
- ✅ Gestión de lotes y reservas
- ✅ API REST completa con 150+ endpoints
- ✅ Documentación Swagger completa
- ✅ Sistema de seguridad robusto
- ✅ Gestión de clientes con crédito
- ✅ Métodos de pago configurables
- ✅ Sistema de imágenes de productos
- ✅ Descuentos por producto y globales

### 🔄 **En Desarrollo/Planificado:**
- 🔄 Integración DIAN (facturación electrónica Colombia)
- 🔄 Reportes avanzados de analytics
- 🔄 Dashboard de métricas en tiempo real
- 🔄 Notificaciones push
- 🔄 Exportación de reportes en PDF
- 🔄 Kits/BOM (Bill of Materials)

---

## 📈 **Capacidad y Escalabilidad**

El sistema está diseñado para soportar:
- **5-50 empresas** activas simultáneamente
- **10-100 usuarios** concurrentes por empresa
- **Miles de productos** por empresa
- **Millones de transacciones** históricas
- **Consultas optimizadas** con índices estratégicos
- **Política de retención** de logs configurable
- **Performance sub-segundo** en operaciones CRUD
- **Transacciones ACID** garantizadas

---

## 🛠️ **Tecnologías y Librerías Principales**

### Dependencias de Producción (34+)
- **express**: ^4.18.2 - Framework web
- **typeorm**: ^0.3.17 - ORM para SQL Server
- **mssql**: ^10.0.2 - Driver de SQL Server
- **jsonwebtoken**: ^9.0.2 - Autenticación JWT
- **bcrypt**: ^5.1.1 - Hashing de contraseñas
- **winston**: ^3.11.0 - Sistema de logging
- **helmet**: ^7.1.0 - Seguridad HTTP
- **cors**: ^2.8.5 - Cross-Origin Resource Sharing
- **express-rate-limit**: ^7.1.5 - Rate limiting
- **class-validator**: ^0.14.0 - Validación de DTOs
- **class-transformer**: ^0.5.1 - Transformación de objetos
- **multer**: ^2.0.2 - Upload de archivos
- **exceljs**: ^4.4.0 - Procesamiento de Excel
- **swagger-ui-express**: ^5.0.1 - Documentación API

### Dependencias de Desarrollo (15+)
- **typescript**: ^5.3.3 - Lenguaje principal
- **ts-node**: ^10.9.2 - Ejecución TypeScript
- **nodemon**: ^3.0.2 - Hot reload en desarrollo
- **jest**: ^29.7.0 - Framework de testing
- **ts-jest**: ^29.1.1 - Jest para TypeScript
- **eslint**: ^8.56.0 - Linter
- **prettier**: ^3.1.1 - Formateador de código
- **@typescript-eslint**: ^6.15.0 - ESLint para TS

---

## 🔐 **Variables de Entorno Requeridas**

```env
# Base de Datos
DB_HOST=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=YourStrongPassword123!
DB_NAME=inventory_db

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-characters-long
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Encriptación
ENCRYPTION_KEY=64-character-hex-key-for-aes-256

# Servidor
NODE_ENV=development
PORT=3000
API_VERSION=v1

# CORS
CORS_ORIGIN=http://localhost:5173
CORS_CREDENTIALS=true

# Logs
LOG_LEVEL=info
LOG_RETENTION_DAYS=30
```

---

## 📋 **Requisitos del Sistema**

### Servidor
- **Node.js**: >= 20.0.0
- **npm**: >= 10.0.0
- **SQL Server**: 2019+ o Azure SQL Database
- **Memoria RAM**: Mínimo 2GB recomendado
- **Disco**: 10GB para logs y uploads

### Desarrollo
- **TypeScript**: 5.3+
- **Git**: Para control de versiones
- **Postman/Insomnia**: Para pruebas de API (opcional)
- **SQL Server Management Studio**: Para administración de BD (opcional)

---

## 🎨 **Características Destacadas**

### 1. **Multi-Tenancy Robusto**
- Aislamiento total de datos por empresa
- Validación automática de contexto tenant
- Imposible acceder a datos de otras empresas

### 2. **Auditoría Completa**
- Registro de TODAS las operaciones
- Valores anteriores y nuevos en JSON
- Búsqueda avanzada con múltiples filtros
- Estadísticas de actividad

### 3. **Gestión de Inventario Avanzada**
- Sistema de lotes con FIFO
- Reservas temporales de stock
- Carga masiva desde Excel
- Validación automática de stock

### 4. **Sistema de Ventas Completo**
- Múltiples estados de venta
- Descuentos flexibles
- Pagos múltiples
- Integración con inventario

### 5. **Seguridad de Nivel Empresarial**
- Encriptación de datos sensibles
- JWT con refresh tokens
- Rate limiting por IP
- Headers de seguridad HTTP

---

## 📞 **Soporte y Mantenimiento**

Este proyecto incluye:
- ✅ Documentación técnica exhaustiva
- ✅ Código comentado y autoexplicativo
- ✅ Estructura modular y escalable
- ✅ Manejo robusto de errores
- ✅ Logs detallados para debugging
- ✅ Validaciones en múltiples capas
- ✅ Tests para componentes críticos

---

## 📄 **Licencia**

MIT License

---

## 🏆 **Conclusión**

Este es un **sistema empresarial robusto y completo** con:
- ✅ Arquitectura profesional en capas
- ✅ Separación clara de responsabilidades
- ✅ Manejo completo de errores
- ✅ Logging exhaustivo
- ✅ Seguridad de nivel empresarial
- ✅ Documentación técnica completa
- ✅ Código mantenible y escalable

**Listo para producción** con capacidad de escalar a múltiples empresas y miles de usuarios concurrentes.
