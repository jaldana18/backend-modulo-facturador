# 📦 Carga Masiva de Inventario - Guía de Uso

## 🎯 Descripción

Sistema para cargar masivamente nuevos lotes de productos (entradas/compras) mediante archivos Excel. Permite registrar múltiples entradas de inventario de forma eficiente, creando automáticamente transacciones INBOUND y batches asociados.

## 🔗 Endpoints Disponibles

Todos los endpoints están bajo la ruta base: `/api/v1/inventory/bulk`

### 1. 📥 Subir Inventario

**POST** `/upload`

Carga el archivo Excel y crea las transacciones de entrada y batches en la base de datos.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Body (Form Data):**
- `file` (required): Archivo Excel (.xls o .xlsx)
- `skipErrors` (optional): `true|false` - Continuar aunque haya errores (default: true)
- `dryRun` (optional): `true|false` - Solo validar sin guardar (default: false)
- `defaultWarehouseCode` (optional): Código del almacén por defecto
- `autoCreateProducts` (optional): `true|false` - Crear automáticamente productos que no existen (default: true)

**Response 200:**
```json
{
  "success": true,
  "message": "Carga completada exitosamente: 15 entradas registradas, 15 lotes creados",
  "data": {
    "totalRows": 15,
    "successCount": 15,
    "errorCount": 0,
    "errors": [],
    "createdTransactions": [
      {
        "sku": "PROD-001",
        "productName": "Producto Ejemplo",
        "quantity": 100,
        "batchNumber": "BATCH-20250116-001",
        "transactionId": 123
      }
    ],
    "summary": {
      "totalQuantity": 1500,
      "totalCost": 75000,
      "productsAffected": 15,
      "batchesCreated": 15
    }
  }
}
```

### 2. ✅ Validar Archivo

**POST** `/validate`

Valida solo la estructura del archivo (columnas requeridas).

**Body (Form Data):**
- `file` (required): Archivo Excel

**Response 200:**
```json
{
  "success": true,
  "message": "Archivo válido y listo para procesar",
  "data": {
    "valid": true,
    "rowCount": 15,
    "errors": [],
    "warnings": []
  }
}
```

### 3. 👁️ Vista Previa

**POST** `/preview`

Procesa el archivo y muestra qué se creará sin guardar en la base de datos.

**Body (Form Data):**
- `file` (required): Archivo Excel
- `defaultWarehouseCode` (optional): Código del almacén por defecto

**Response:** Igual que `/upload` pero sin guardar en BD (automáticamente usa `dryRun: true`)

### 4. 📄 Descargar Plantilla

**GET** `/template`

Descarga una plantilla Excel con las columnas correctas y datos de ejemplo.

**Response:** Archivo Excel descargable

---

## 📊 Formato del Archivo Excel

### Columnas Disponibles

| Columna | Descripción | Tipo | Obligatorio | Ejemplo |
|---------|-------------|------|-------------|---------|
| **SKU** | Código único del producto | Texto | ✅ | `PROD-001` |
| **Nombre Producto** | Nombre del producto (si no existe) | Texto | ⚠️ * | `Laptop Dell XPS 15` |
| **Categoría** | Categoría del producto (si no existe) | Texto | ❌ | `Electrónica` |
| **Unidad de Medida** | Unidad (si no existe) | Texto | ❌ | `unidad`, `caja`, `kg` |
| **Precio de Venta** | Precio de venta (si no existe) | Número | ❌ | `75.00` |
| **Descripción** | Descripción del producto (si no existe) | Texto | ❌ | `Laptop para desarrollo` |
| **Cantidad** | Cantidad a ingresar | Número | ✅ | `100` |
| **Costo Unitario** | Precio de compra por unidad | Número | ✅ | `50.00` |
| **Código Almacén** | Código del almacén destino | Texto | ❌ | `WH-01` |
| **Fecha Vencimiento** | Fecha de expiración del lote | Fecha | ❌ | `2025-12-31` |
| **Lote** | Número de lote del proveedor | Texto | ❌ | `LOT-2025-001` |
| **Ubicación** | Ubicación física en almacén | Texto | ❌ | `A-15-B` |
| **Referencia** | # Factura u orden de compra | Texto | ❌ | `FC-001234` |
| **Notas** | Observaciones adicionales | Texto | ❌ | `Producto nuevo` |

**⚠️ \*** Obligatorio solo si `autoCreateProducts=true` y el producto no existe

### Ejemplo de Datos

| SKU | Nombre Producto | Categoría | Unidad de Medida | Precio de Venta | Descripción | Cantidad | Costo Unitario | Código Almacén | Fecha Vencimiento | Lote | Ubicación | Referencia | Notas |
|-----|-----------------|-----------|------------------|-----------------|-------------|----------|----------------|----------------|-------------------|------|-----------|------------|-------|
| PROD-001 | Laptop Dell XPS | Electrónica | unidad | 2500000 | Laptop profesional | 10 | 2000000 | WH-01 | | LOT-001 | A-15-B | FC-001234 | Producto nuevo |
| PROD-002 | Mouse Logitech | Electrónica | unidad | 45000 | Mouse inalámbrico | 50 | 30000 | WH-01 | | LOT-002 | A-16-A | FC-001234 | |
| PROD-003 | Cable HDMI | Accesorios | unidad | 25000 | | 200 | 15000 | | | | B-10-C | FC-001235 | |

---

## 🔄 Flujo de Trabajo Recomendado

```
1️⃣ Descargar Plantilla
   GET /api/v1/inventory/bulk/template
   ↓
2️⃣ Llenar datos en Excel
   (Usar plantilla descargada)
   ↓
3️⃣ Validar Estructura (Opcional)
   POST /api/v1/inventory/bulk/validate
   ↓
4️⃣ Vista Previa (Recomendado)
   POST /api/v1/inventory/bulk/preview
   ↓
5️⃣ Subir Definitivo
   POST /api/v1/inventory/bulk/upload
```

---

## ⚙️ Opciones de Configuración

### autoCreateProducts

- **`true`** (default): Crea automáticamente productos que no existen
- **`false`**: Requiere que todos los productos existan previamente

**Cuándo usar cada opción:**
- `autoCreateProducts: true` → **Recomendado**. Carga inventario y crea productos en un solo paso
- `autoCreateProducts: false` → Cuando quieres asegurar que solo se cargue inventario de productos previamente registrados

**⚠️ Importante:** Si `autoCreateProducts=true` y el producto no existe, el campo **Nombre Producto** es obligatorio.

### skipErrors

- **`true`** (default): Continúa procesando aunque haya errores. Las filas válidas se guardan.
- **`false`**: Se detiene al primer error. Nada se guarda si hay errores.

**Cuándo usar cada opción:**
- `skipErrors: true` → Cuando tienes un archivo grande y prefieres guardar lo que sea válido
- `skipErrors: false` → Cuando quieres asegurar que TODO el archivo es correcto antes de guardar

### dryRun

- **`true`**: Solo valida, no guarda nada en la base de datos
- **`false`** (default): Guarda las transacciones y batches en la BD

**Cuándo usar:**
- `dryRun: true` → Para probar y ver qué pasaría sin comprometer la BD
- `dryRun: false` → Para hacer la carga definitiva

### defaultWarehouseCode

Código del almacén a usar cuando una fila no especifica "Código Almacén".

**Prioridad:**
1. Código especificado en la fila del Excel
2. `defaultWarehouseCode` del parámetro
3. Almacén principal de la compañía
4. Primer almacén disponible

---

## ✅ Validaciones Automáticas

El sistema valida automáticamente:

- ✅ **SKU existe**: El producto debe estar creado previamente
- ✅ **Cantidad válida**: Debe ser un número mayor a 0
- ✅ **Costo válido**: Debe ser un número mayor a 0
- ✅ **Almacén existe**: Si se especifica, debe existir en la compañía
- ✅ **Formato de fecha**: Si hay fecha de vencimiento, debe ser válida
- ✅ **Columnas requeridas**: SKU, Cantidad y Costo Unitario son obligatorios

---

## 🎯 Qué Crea el Sistema

Por cada fila válida del Excel, el sistema crea:

### 1. Producto (si no existe y autoCreateProducts=true)
```typescript
{
  sku: <SKU del Excel>,
  name: <Nombre Producto>,
  category: <Categoría o null>,
  unitOfMeasure: <Unidad de Medida o "unidad">,
  cost: <Costo Unitario>,
  price: <Precio de Venta o costo * 1.3>, // 30% markup por defecto
  description: <Descripción o null>,
  minimumStock: 0,
  reorderPoint: 0,
  isActive: true
}
```

### 2. Transacción de Inventario
```typescript
{
  type: "INBOUND",
  reason: "PURCHASE",
  productId: <id del producto>,
  warehouseId: <id del almacén>,
  quantity: <cantidad>,
  unitCost: <costo unitario>,
  totalCost: <cantidad * costo>,
  reference: <referencia>,
  location: <ubicación>,
  notes: <notas>
}
```

### 2. Transacción de Inventario
```typescript
{
  type: "INBOUND",
  reason: "PURCHASE",
  productId: <id del producto>,
  warehouseId: <id del almacén>,
  quantity: <cantidad>,
  unitCost: <costo unitario>,
  totalCost: <cantidad * costo>,
  reference: <referencia>,
  location: <ubicación>,
  notes: <notas>
}
```

### 3. Batch (Lote)
```typescript
{
  batchNumber: "BATCH-20250116-001", // Generado automáticamente
  productId: <id del producto>,
  warehouseId: <id del almacén>,
  quantity: <cantidad>,
  unitCost: <costo unitario>,
  expiryDate: <fecha vencimiento o null>,
  lotNumber: <lote o null>,
  notes: <notas>
}
```

---

## 📝 Ejemplo Completo con cURL

### Subir archivo con configuración personalizada

```bash
curl -X POST "http://localhost:3000/api/v1/inventory/bulk/upload" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@/path/to/inventory.xlsx" \
  -F "skipErrors=true" \
  -F "dryRun=false" \
  -F "autoCreateProducts=true" \
  -F "defaultWarehouseCode=WH-01"
```

### Vista previa antes de subir

```bash
curl -X POST "http://localhost:3000/api/v1/inventory/bulk/preview" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@/path/to/inventory.xlsx" \
  -F "defaultWarehouseCode=WH-01"
```

### Descargar plantilla

```bash
curl -X GET "http://localhost:3000/api/v1/inventory/bulk/template" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -o "plantilla_inventario.xlsx"
```

---

## 🚨 Manejo de Errores

### Errores Comunes

**1. SKU no existe**
```json
{
  "row": 5,
  "sku": "PROD-999",
  "message": "Producto con SKU 'PROD-999' no existe. Debe crear el producto primero."
}
```
**Solución:** Crear el producto primero o corregir el SKU

**2. Almacén no existe**
```json
{
  "row": 8,
  "sku": "PROD-001",
  "field": "warehouseCode",
  "message": "Almacén 'WH-99' no existe",
  "value": "WH-99"
}
```
**Solución:** Usar un código de almacén válido o remover para usar el default

**3. Cantidad inválida**
```json
{
  "row": 10,
  "sku": "PROD-002",
  "field": "quantity",
  "message": "Cantidad debe ser un número mayor a 0",
  "value": "-5"
}
```
**Solución:** Corregir el valor de cantidad

---

## 📊 Swagger Documentation

La documentación completa está disponible en Swagger UI:

```
http://localhost:3000/api/docs
```

Busca la sección **"Bulk Inventory"** para probar los endpoints interactivamente.

---

## 💡 Tips y Mejores Prácticas

1. **Siempre descarga la plantilla** para asegurar que tienes las columnas correctas
2. **Usa vista previa primero** (`/preview`) para verificar qué se creará
3. **Valida los SKUs** antes de subir - todos los productos deben existir previamente
4. **Usa referencias** (# factura) para rastrear las compras
5. **Especifica ubicaciones** para facilitar el picking posterior
6. **Usa fechas de vencimiento** para productos perecederos
7. **Modo dry-run** es ideal para capacitación sin afectar datos reales

---

## 🔐 Permisos Requeridos

Los endpoints requieren autenticación mediante JWT token. El usuario debe:

- ✅ Estar autenticado (token válido)
- ✅ Pertenecer a una compañía activa
- ✅ Tener rol de `admin`, `manager` o `user` (según configuración de rutas)

---

## 📈 Límites y Consideraciones

- **Tamaño máximo de archivo**: 10MB (configurable en middleware)
- **Formatos soportados**: `.xls`, `.xlsx`
- **Rows recomendadas por archivo**: Hasta 1000 filas para mejor rendimiento
- **Tiempo de procesamiento**: ~1-2 segundos por cada 100 filas

---

## 🛠️ Desarrollo y Testing

### Modo Desarrollo

```bash
npm run dev
```

### Testing del endpoint

```javascript
// Ejemplo con Postman o similar
POST http://localhost:3000/api/v1/inventory/bulk/upload
Headers:
  Authorization: Bearer <token>
  Content-Type: multipart/form-data
Body (form-data):
  file: <seleccionar archivo .xlsx>
  skipErrors: true
  dryRun: false
  defaultWarehouseCode: WH-01
```

---

## 📞 Soporte

Para reportar problemas o sugerencias, contacta al equipo de desarrollo o crea un issue en el repositorio.
