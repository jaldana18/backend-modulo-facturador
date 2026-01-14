# Documentación de Métodos de Pago

## 📋 Descripción General

El sistema de métodos de pago permite gestionar todos los tipos de pago aceptados en el sistema de inventario y ventas. Cada método de pago puede tener un canal específico (billetera digital, banco, etc.) para mayor detalle en las transacciones.

---

## 🏗️ Estructura de la Tabla

### Entidad: `PaymentMethod`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | number | ID único del método de pago |
| `companyId` | number | ID de la empresa (null para métodos globales) |
| `name` | string | Nombre del método de pago |
| `code` | string | Código único del tipo de pago |
| `channel` | string | Canal o billetera específica (opcional) |
| `requiresReference` | boolean | Si requiere número de referencia |
| `isActive` | boolean | Si el método está activo |
| `metadata` | JSON | Información adicional (colores, iconos, etc.) |
| `createdAt` | Date | Fecha de creación |
| `updatedAt` | Date | Fecha de última actualización |

---

## 📊 Tipos de Métodos de Pago

### 1. Efectivo (`cash`)

**Nombre:** Efectivo  
**Code:** `cash`  
**Channel:** `null`  
**Requiere Referencia:** No

```json
{
  "name": "Efectivo",
  "code": "cash",
  "channel": null,
  "requiresReference": false
}
```

---

### 2. Tarjetas (`credit_card`, `debit_card`)

#### Tarjeta de Crédito
**Code:** `credit_card`  
**Requiere Referencia:** Sí (número de aprobación)

#### Tarjeta de Débito
**Code:** `debit_card`  
**Requiere Referencia:** Sí (número de aprobación)

```json
{
  "name": "Tarjeta de Crédito",
  "code": "credit_card",
  "channel": null,
  "requiresReference": true
}
```

---

### 3. Transferencias Bancarias (`transfer`)

**Code:** `transfer`  
**Requiere Referencia:** Sí (número de transacción)

#### Bancos Disponibles:

| Banco | Channel | Código Banco |
|-------|---------|--------------|
| Bancolombia | `bancolombia` | 001 |
| Davivienda | `davivienda` | 051 |
| Banco de Bogotá | `banco_bogota` | 001 |
| BBVA | `bbva` | 013 |
| Scotiabank Colpatria | `colpatria` | 019 |

**Ejemplo:**
```json
{
  "name": "Transferencia Bancolombia",
  "code": "transfer",
  "channel": "bancolombia",
  "requiresReference": true,
  "metadata": {
    "description": "Transferencia bancaria Bancolombia",
    "icon": "bank",
    "color": "#FBBF24",
    "bankCode": "001"
  }
}
```

---

### 4. Billeteras Digitales (`digital_wallet`)

**Code:** `digital_wallet`  
**Requiere Referencia:** Sí (ID de transacción)

#### Billeteras Disponibles:

| Billetera | Channel | Color | Descripción |
|-----------|---------|-------|-------------|
| Nequi | `nequi` | #FF006E | Billetera móvil Bancolombia |
| Daviplata | `daviplata` | #DC2626 | Billetera móvil Davivienda |
| Dale | `dale` | #0066A1 | Billetera móvil BBVA |
| Movii | `movii` | #00B4D8 | Billetera móvil independiente |
| Ding | `ding` | #8B5CF6 | Billetera digital |
| Powwi | `powwi` | #EC4899 | Billetera digital |

**Ejemplo:**
```json
{
  "name": "Nequi",
  "code": "digital_wallet",
  "channel": "nequi",
  "requiresReference": true,
  "metadata": {
    "description": "Pago con Nequi",
    "icon": "smartphone",
    "color": "#FF006E",
    "walletType": "mobile"
  }
}
```

---

### 5. PSE (`pse`)

**Code:** `pse`  
**Channel:** `null`  
**Requiere Referencia:** Sí (número de transacción PSE)

```json
{
  "name": "PSE",
  "code": "pse",
  "channel": null,
  "requiresReference": true,
  "metadata": {
    "description": "Pagos Seguros en Línea (PSE)",
    "icon": "globe",
    "color": "#059669"
  }
}
```

---

### 6. Cheque (`check`)

**Code:** `check`  
**Channel:** `null`  
**Requiere Referencia:** Sí (número de cheque)

```json
{
  "name": "Cheque",
  "code": "check",
  "channel": null,
  "requiresReference": true
}
```

---

### 7. Corresponsales Bancarios (`correspondent`)

**Code:** `correspondent`  
**Requiere Referencia:** Sí (número de recibo)

#### Corresponsales Disponibles:

| Corresponsal | Channel |
|--------------|---------|
| Bancolombia | `bancolombia` |
| Efecty | `efecty` |
| Gana | `gana` |
| Baloto | `baloto` |

**Ejemplo:**
```json
{
  "name": "Corresponsal Efecty",
  "code": "correspondent",
  "channel": "efecty",
  "requiresReference": true,
  "metadata": {
    "description": "Pago en Efecty",
    "icon": "map-pin",
    "color": "#F59E0B"
  }
}
```

---

### 8. Crédito (`credit`)

**Code:** `credit`  
**Channel:** `null`  
**Requiere Referencia:** Sí (número de factura o contrato)

```json
{
  "name": "Crédito",
  "code": "credit",
  "channel": null,
  "requiresReference": true,
  "metadata": {
    "description": "Pago a crédito",
    "icon": "calendar",
    "color": "#F97316"
  }
}
```

---

### 9. Otro (`other`)

**Code:** `other`  
**Channel:** `null`  
**Requiere Referencia:** No

```json
{
  "name": "Otro",
  "code": "other",
  "channel": null,
  "requiresReference": false
}
```

---

## 🚀 Instalación y Configuración

### 1. Ejecutar Migración

```bash
npm run migration:run
```

Esto creará la columna `channel` en la tabla `payment_methods`.

### 2. Ejecutar Semillas

#### Opción A: Ejecutar todas las semillas
```bash
npm run seed:all
```

#### Opción B: Solo métodos de pago
```bash
npm run seed:payment-methods
```

---

## 📡 Uso en la API

### Listar Métodos de Pago

```http
GET /api/v1/payment-methods
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Efectivo",
      "code": "cash",
      "channel": null,
      "requiresReference": false,
      "isActive": true,
      "metadata": {
        "description": "Pago en efectivo",
        "icon": "cash",
        "color": "#10B981"
      }
    },
    {
      "id": 9,
      "name": "Nequi",
      "code": "digital_wallet",
      "channel": "nequi",
      "requiresReference": true,
      "isActive": true,
      "metadata": {
        "description": "Pago con Nequi",
        "icon": "smartphone",
        "color": "#FF006E",
        "walletType": "mobile"
      }
    }
  ]
}
```

### Filtrar por Código

```http
GET /api/v1/payment-methods?code=digital_wallet
```

### Filtrar por Canal

```http
GET /api/v1/payment-methods?channel=nequi
```

---

## 💡 Ejemplos de Uso en Frontend

### Mostrar Métodos de Pago Agrupados

```typescript
// Agrupar por código
const paymentMethodsByType = paymentMethods.reduce((acc, method) => {
  if (!acc[method.code]) {
    acc[method.code] = [];
  }
  acc[method.code].push(method);
  return acc;
}, {});

// Renderizar
{Object.entries(paymentMethodsByType).map(([type, methods]) => (
  <div key={type}>
    <h3>{type}</h3>
    <ul>
      {methods.map(method => (
        <li key={method.id}>
          {method.name}
          {method.channel && ` (${method.channel})`}
        </li>
      ))}
    </ul>
  </div>
))}
```

### Formulario de Pago con Validación de Referencia

```typescript
const [selectedMethod, setSelectedMethod] = useState(null);
const [reference, setReference] = useState('');

const handlePaymentMethodChange = (methodId) => {
  const method = paymentMethods.find(m => m.id === methodId);
  setSelectedMethod(method);
  if (!method.requiresReference) {
    setReference('');
  }
};

return (
  <form>
    <select onChange={(e) => handlePaymentMethodChange(e.target.value)}>
      {paymentMethods.map(method => (
        <option key={method.id} value={method.id}>
          {method.name}
          {method.channel && ` - ${method.channel}`}
        </option>
      ))}
    </select>
    
    {selectedMethod?.requiresReference && (
      <input
        type="text"
        placeholder="Número de referencia/transacción"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        required
      />
    )}
  </form>
);
```

### Mostrar con Iconos y Colores

```typescript
const PaymentMethodBadge = ({ method }) => (
  <div 
    className="payment-badge"
    style={{ 
      backgroundColor: method.metadata?.color || '#6B7280',
      padding: '8px 16px',
      borderRadius: '8px',
      color: 'white'
    }}
  >
    <Icon name={method.metadata?.icon || 'dollar-sign'} />
    <span>{method.name}</span>
    {method.channel && <small>({method.channel})</small>}
  </div>
);
```

---

## 🎨 Códigos de Color por Defecto

| Tipo | Color Hex | Uso |
|------|-----------|-----|
| Efectivo | #10B981 | Verde |
| Tarjetas | #3B82F6, #6366F1 | Azul |
| Transferencias | #FBBF24, #EF4444, etc. | Amarillo/Rojo según banco |
| Billeteras | #FF006E, #DC2626, etc. | Rosa/Rojo según app |
| PSE | #059669 | Verde oscuro |
| Cheque | #6B7280 | Gris |
| Corresponsal | #F59E0B, #10B981, etc. | Naranja/Verde |
| Crédito | #F97316 | Naranja |
| Otro | #6B7280 | Gris |

---

## 📝 Campos Metadata

El campo `metadata` almacena información adicional en formato JSON:

```typescript
interface PaymentMethodMetadata {
  description?: string;    // Descripción detallada
  icon?: string;          // Nombre del icono (para UI)
  color?: string;         // Color en formato hex
  bankCode?: string;      // Código del banco (para transferencias)
  walletType?: string;    // Tipo de billetera: 'mobile', 'web', etc.
}
```

---

## 🔐 Métodos Globales vs. Por Empresa

- **Métodos Globales:** `companyId = null` - Disponibles para todas las empresas
- **Métodos Personalizados:** `companyId = 123` - Específicos de una empresa

Las semillas crean métodos globales que pueden ser usados por todas las empresas.

---

## 🛠️ Personalización

### Agregar un Nuevo Método de Pago

```typescript
const newMethod = paymentMethodRepo.create({
  companyId: null, // null = global, o ID de empresa específica
  name: 'Método Personalizado',
  code: 'custom_method',
  channel: 'my_channel',
  requiresReference: true,
  isActive: true,
  metadata: JSON.stringify({
    description: 'Mi método de pago personalizado',
    icon: 'custom-icon',
    color: '#123456'
  })
});

await paymentMethodRepo.save(newMethod);
```

---

## ❓ Preguntas Frecuentes

**¿Puedo tener múltiples canales para el mismo código?**
Sí, por ejemplo varios bancos usan `code: 'transfer'` pero cada uno tiene un `channel` diferente.

**¿Qué pasa si no especifico el canal?**
El canal es opcional. Para métodos genéricos como "Efectivo" o "Cheque", `channel` será `null`.

**¿Puedo desactivar un método de pago?**
Sí, cambia `isActive` a `false`. El método seguirá en la base de datos pero no aparecerá en las listas activas.

**¿Cómo agregar un nuevo banco o billetera?**
Simplemente crea un nuevo registro con el mismo `code` pero diferente `channel`.

---

## 📞 Scripts Disponibles

| Script | Comando | Descripción |
|--------|---------|-------------|
| Todas las semillas | `npm run seed:all` | Ejecuta todas las semillas (catálogo + métodos de pago + datos iniciales) |
| Solo métodos de pago | `npm run seed:payment-methods` | Ejecuta solo la semilla de métodos de pago |
| Catálogo | `npm run seed:catalog` | Ejecuta solo categorías y unidades de medida |
| Datos iniciales | `npm run seed` | Ejecuta solo empresa y usuarios demo |

---

**Última actualización:** 30 de Noviembre, 2025  
**Versión:** 1.0.0
