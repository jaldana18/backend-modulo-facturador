# 📘 Guía de Integración Frontend - Sistema de Inventario Multi-Almacén

## 📋 Tabla de Contenidos
1. [Autenticación y JWT](#autenticación-y-jwt)
2. [Gestión de Almacenes](#gestión-de-almacenes)
3. [Operaciones de Inventario](#operaciones-de-inventario)
4. [Endpoints de Administración](#endpoints-de-administración)
5. [Restricciones por Rol](#restricciones-por-rol)
6. [Ejemplos de Implementación](#ejemplos-de-implementación)

---

## 🔐 Autenticación y JWT

### 1. Login
**Endpoint:** `POST /api/v1/auth/login`

**Request:**
```json
{
  "email": "usuario@empresa.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 123,
      "email": "usuario@empresa.com",
      "firstName": "Juan",
      "lastName": "Operador",
      "role": "user",
      "companyId": 1,
      "company": {
        "id": 1,
        "name": "Mi Empresa"
      }
    }
  }
}
```

### 2. Decodificar Token JWT

El token incluye información importante:

```javascript
// Decodificar token (usar biblioteca como jwt-decode)
const decoded = jwtDecode(accessToken);

// Estructura del token:
{
  "userId": 123,
  "companyId": 1,
  "email": "operador@empresa.com",
  "role": "user",
  "warehouseId": 2,  // ← NUEVO: Solo para role='user'
  "iat": 1700000000,
  "exp": 1700003600
}
```

### 3. Guardar información del usuario

```javascript
// Ejemplo de store (Redux/Zustand/Context)
const userStore = {
  token: accessToken,
  userId: decoded.userId,
  companyId: decoded.companyId,
  email: decoded.email,
  role: decoded.role,
  warehouseId: decoded.warehouseId, // null para admin/manager
  firstName: user.firstName,
  lastName: user.lastName
};
```

---

## 🏢 Gestión de Almacenes

### 1. Listar Almacenes Activos
**Endpoint:** `GET /api/v1/warehouses/active`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "BOD-001",
      "name": "Bodega Principal",
      "isMain": true,
      "isActive": true,
      "address": "Calle 123",
      "city": "Ciudad",
      "managerName": "Juan Pérez"
    },
    {
      "id": 2,
      "code": "PV-001",
      "name": "Punto de Venta Centro",
      "isMain": false,
      "isActive": true,
      "address": "Av. Principal 456",
      "managerName": "María González"
    }
  ]
}
```

**Implementación Frontend:**
```javascript
// React/Vue/Angular
async function loadWarehouses() {
  const response = await fetch('/api/v1/warehouses/active', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  const { data } = await response.json();
  
  // Si el usuario es 'user', filtrar solo su almacén
  if (userRole === 'user' && userWarehouseId) {
    return data.filter(w => w.id === userWarehouseId);
  }
  
  return data; // Admin/Manager ven todos
}
```

### 2. Obtener Almacén Principal
**Endpoint:** `GET /api/v1/warehouses/main`

```javascript
async function getMainWarehouse() {
  const response = await fetch('/api/v1/warehouses/main', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  const { data } = await response.json();
  return data; // { id: 1, code: "BOD-001", name: "Bodega Principal", ... }
}
```

---

## 📦 Operaciones de Inventario

### 1. Crear Transacción Individual (Entrada/Salida)

**Endpoint:** `POST /api/v1/inventory/transactions`

#### Entrada de Mercancía (INBOUND)
```json
{
  "productId": 1,
  "warehouseId": 2,           // Opcional para admin/manager, obligatorio para user
  "type": "INBOUND",
  "reason": "PURCHASE",       // purchase, return, found, initial_stock
  "quantity": 100,
  "unitCost": 15.50,
  "reference": "FAC-12345",
  "location": "Estante A-12", // Opcional: ubicación dentro del almacén
  "notes": "Compra proveedor XYZ"
}
```

#### Salida de Mercancía (OUTBOUND)
```json
{
  "productId": 1,
  "warehouseId": 2,           // ⚠️ IMPORTANTE: Especificar de qué almacén sale
  "type": "OUTBOUND",
  "reason": "SALE",           // sale, damaged, lost
  "quantity": 10,
  "reference": "VENTA-001",
  "notes": "Venta cliente ABC"
}
```

**Implementación Frontend:**
```javascript
async function createTransaction(transactionData) {
  // Si el usuario es 'user' y no especificó warehouse, usar el suyo
  if (userRole === 'user' && !transactionData.warehouseId) {
    transactionData.warehouseId = userWarehouseId;
  }
  
  const response = await fetch('/api/v1/inventory/transactions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(transactionData)
  });
  
  const result = await response.json();
  
  if (!result.success) {
    // Manejar errores específicos
    if (result.error.code === 'INSUFFICIENT_STOCK') {
      alert('Stock insuficiente');
    } else if (result.error.code === 'WAREHOUSE_ACCESS_DENIED') {
      alert('No tienes acceso a este almacén');
    }
  }
  
  return result;
}
```

### 2. Ajustar Stock
**Endpoint:** `POST /api/v1/inventory/adjust`

```json
{
  "productId": 1,
  "warehouseId": 2,
  "newStock": 150,           // Stock deseado (no la diferencia)
  "reason": "CORRECTION",    // correction, initial_stock
  "notes": "Ajuste por inventario físico"
}
```

**Uso típico:** Corregir diferencias después de un conteo físico.

### 3. Transferencia entre Almacenes
**Endpoint:** `POST /api/v1/inventory/transfer`

```json
{
  "productId": 1,
  "fromWarehouseId": 1,      // Almacén origen
  "toWarehouseId": 2,        // Almacén destino
  "quantity": 50,
  "reference": "TRF-001",
  "notes": "Transferencia a punto de venta"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "outbound": {
      "id": 1001,
      "type": "TRANSFER",
      "reason": "TRANSFER_OUT",
      "warehouseId": 1,
      "quantity": -50
    },
    "inbound": {
      "id": 1002,
      "type": "INBOUND",
      "reason": "TRANSFER_IN",
      "warehouseId": 2,
      "quantity": 50
    }
  }
}
```

**Implementación Frontend:**
```javascript
async function transferStock(productId, fromWarehouseId, toWarehouseId, quantity) {
  const response = await fetch('/api/v1/inventory/transfer', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      productId,
      fromWarehouseId,
      toWarehouseId,
      quantity,
      reference: `TRF-${Date.now()}`,
      notes: `Transferencia de almacén ${fromWarehouseId} a ${toWarehouseId}`
    })
  });
  
  return await response.json();
}
```

### 4. Carga Masiva - Entrada (Bulk Inbound)
**Endpoint:** `POST /api/v1/inventory/bulk/inbound`

⚠️ **IMPORTANTE:** `warehouseId` es **OBLIGATORIO**

```json
{
  "warehouseId": 2,          // ← OBLIGATORIO
  "items": [
    {
      "productId": 1,
      "quantity": 100,
      "unitCost": 15.50,
      "reference": "FAC-001"
    },
    {
      "productId": 2,
      "quantity": 50,
      "unitCost": 25.00,
      "reference": "FAC-001"
    }
  ],
  "reason": "PURCHASE",
  "notes": "Compra masiva proveedor XYZ"
}
```

**Implementación Frontend:**
```javascript
async function bulkInbound(warehouseId, products, reason, notes) {
  const items = products.map(p => ({
    productId: p.id,
    quantity: p.quantity,
    unitCost: p.unitCost,
    reference: p.reference || ''
  }));
  
  const response = await fetch('/api/v1/inventory/bulk/inbound', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      warehouseId,  // Siempre especificar
      items,
      reason,
      notes
    })
  });
  
  const result = await response.json();
  return result;
}
```

### 5. Carga Masiva - Salida (Bulk Outbound)
**Endpoint:** `POST /api/v1/inventory/bulk/outbound`

```json
{
  "warehouseId": 2,          // ← OBLIGATORIO
  "items": [
    {
      "productId": 1,
      "quantity": 10,
      "reference": "VENTA-001"
    },
    {
      "productId": 2,
      "quantity": 5,
      "reference": "VENTA-001"
    }
  ],
  "reason": "SALE",
  "notes": "Venta cliente ABC"
}
```

### 6. Carga Masiva desde Excel
**Endpoint:** `POST /api/v1/inventory/bulk/upload`

**Request (FormData):**
```javascript
const formData = new FormData();
formData.append('file', excelFile);
formData.append('defaultWarehouseCode', 'BOD-001'); // Código del almacén
formData.append('skipErrors', 'true');
formData.append('dryRun', 'false'); // true para validar sin guardar

const response = await fetch('/api/v1/inventory/bulk/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: formData
});
```

**Descargar Plantilla:**
```javascript
async function downloadTemplate() {
  const response = await fetch('/api/v1/inventory/bulk/template', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla-inventario.xlsx';
  a.click();
}
```

---

## 📊 Endpoints de Administración

### 1. Resumen de Todos los Almacenes
**Endpoint:** `GET /api/v1/inventory/warehouses/summary`

**Uso:** Dashboard principal de administración

**Response:**
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

**Implementación Frontend:**
```javascript
// Componente Dashboard de Administración
async function loadWarehousesSummary() {
  const response = await fetch('/api/v1/inventory/warehouses/summary', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  const { data } = await response.json();
  return data;
}

// Ejemplo de visualización
function WarehousesDashboard() {
  const [warehouses, setWarehouses] = useState([]);
  
  useEffect(() => {
    loadWarehousesSummary().then(setWarehouses);
  }, []);
  
  return (
    <div className="warehouses-grid">
      {warehouses.map(w => (
        <WarehouseCard key={w.warehouse.id}>
          <h3>{w.warehouse.name}</h3>
          <p>{w.warehouse.code} {w.warehouse.isMain && '⭐ Principal'}</p>
          
          <div className="stats">
            <Stat label="Stock Total" value={w.stats.currentStock} />
            <Stat label="Productos" value={w.stats.uniqueProducts} />
            <Stat label="Entradas" value={w.stats.totalInbound} color="green" />
            <Stat label="Salidas" value={w.stats.totalOutbound} color="red" />
          </div>
          
          {w.lastActivity && (
            <p className="last-activity">
              Última actividad: {formatDate(w.lastActivity.date)}
              <br />
              {w.lastActivity.type} - {w.lastActivity.reason}
            </p>
          )}
        </WarehouseCard>
      ))}
    </div>
  );
}
```

### 2. Resumen Detallado de un Almacén
**Endpoint:** `GET /api/v1/inventory/warehouses/:warehouseId/summary`

**Uso:** Vista detallada de un almacén específico

**Response:**
```json
{
  "success": true,
  "data": {
    "warehouse": {
      "id": 2,
      "code": "PV-001",
      "name": "Punto de Venta Centro",
      "isMain": false,
      "address": "Av. Principal 456, Ciudad, Estado, 12345",
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

**Implementación Frontend:**
```javascript
async function loadWarehouseDetail(warehouseId) {
  const response = await fetch(
    `/api/v1/inventory/warehouses/${warehouseId}/summary`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  
  const { data } = await response.json();
  return data;
}

// Componente de vista detallada
function WarehouseDetailView({ warehouseId }) {
  const [detail, setDetail] = useState(null);
  
  useEffect(() => {
    loadWarehouseDetail(warehouseId).then(setDetail);
  }, [warehouseId]);
  
  if (!detail) return <Loading />;
  
  return (
    <div className="warehouse-detail">
      <header>
        <h1>{detail.warehouse.name}</h1>
        <p>{detail.warehouse.code}</p>
        <p>{detail.warehouse.address}</p>
        <p>Gerente: {detail.warehouse.managerName}</p>
      </header>
      
      <section className="stats-overview">
        <StatCard label="Stock Total" value={detail.stats.currentStock} />
        <StatCard label="Productos" value={detail.stats.uniqueProducts} />
        <StatCard label="Transacciones" value={detail.stats.transactionCount} />
      </section>
      
      <section className="products-table">
        <h2>Productos en Stock</h2>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Nombre</th>
              <th>Stock</th>
              <th>Última Actualización</th>
            </tr>
          </thead>
          <tbody>
            {detail.products.map(p => (
              <tr key={p.productId}>
                <td>{p.productSku}</td>
                <td>{p.productName}</td>
                <td>{p.currentStock}</td>
                <td>{formatDate(p.lastUpdated)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      
      <section className="recent-activity">
        <h2>Actividad Reciente</h2>
        <ul>
          {detail.recentTransactions.map(t => (
            <li key={t.id}>
              {formatDate(t.createdAt)} - {t.type} - {t.productName}
              {t.quantity > 0 ? '+' : ''}{t.quantity}
              {t.reference && ` (${t.reference})`}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

### 3. Consultar Stock de Producto por Almacenes
**Endpoint:** `GET /api/v1/inventory/stock/:productId/warehouses`

```json
{
  "success": true,
  "data": [
    {
      "warehouseId": 1,
      "warehouseName": "Bodega Principal",
      "currentStock": 150
    },
    {
      "warehouseId": 2,
      "warehouseName": "Punto de Venta Centro",
      "currentStock": 50
    }
  ]
}
```

### 4. Consultar Stock de Producto en un Almacén
**Endpoint:** `GET /api/v1/inventory/stock/:productId/warehouse/:warehouseId`

```json
{
  "success": true,
  "data": {
    "productId": 1,
    "warehouseId": 2,
    "currentStock": 50
  }
}
```

### 5. Historial de Transacciones
**Endpoint:** `GET /api/v1/inventory/transactions`

**Query Params:**
- `page`: Número de página (default: 1)
- `limit`: Items por página (default: 10)
- `productId`: Filtrar por producto
- `warehouseId`: Filtrar por almacén
- `type`: Filtrar por tipo (inbound, outbound, adjustment, transfer)
- `startDate`: Fecha inicio (YYYY-MM-DD)
- `endDate`: Fecha fin (YYYY-MM-DD)

```javascript
async function loadTransactions(filters = {}) {
  const params = new URLSearchParams({
    page: filters.page || 1,
    limit: filters.limit || 20,
    ...(filters.productId && { productId: filters.productId }),
    ...(filters.warehouseId && { warehouseId: filters.warehouseId }),
    ...(filters.type && { type: filters.type }),
    ...(filters.startDate && { startDate: filters.startDate }),
    ...(filters.endDate && { endDate: filters.endDate })
  });
  
  const response = await fetch(
    `/api/v1/inventory/transactions?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  
  return await response.json();
}
```

---

## 🔒 Restricciones por Rol

### Admin / Manager
✅ **Acceso completo a todos los almacenes**
- Pueden crear transacciones en cualquier almacén
- Ven resumen de todos los almacenes
- Pueden transferir entre cualquier almacén
- `warehouseId` en token: `null`

### User
⚠️ **Acceso restringido a su almacén asignado**
- Solo pueden operar en su almacén (`warehouseId` del token)
- Intentar acceder a otro almacén retorna `403 WAREHOUSE_ACCESS_DENIED`
- Si no especifican `warehouseId`, el sistema auto-asigna el suyo
- `warehouseId` en token: `2` (ID del almacén asignado)

**Validación en Frontend:**
```javascript
function canAccessWarehouse(targetWarehouseId) {
  // Admin/Manager pueden acceder a todos
  if (userRole === 'admin' || userRole === 'manager') {
    return true;
  }
  
  // User solo puede acceder a su almacén
  if (userRole === 'user') {
    return targetWarehouseId === userWarehouseId;
  }
  
  return false;
}

// Ejemplo de uso en formulario
function WarehouseSelector({ value, onChange }) {
  const [warehouses, setWarehouses] = useState([]);
  
  useEffect(() => {
    loadWarehouses().then(wh => {
      // Filtrar según rol
      if (userRole === 'user' && userWarehouseId) {
        setWarehouses(wh.filter(w => w.id === userWarehouseId));
      } else {
        setWarehouses(wh);
      }
    });
  }, []);
  
  // Si es usuario y solo tiene 1 almacén, auto-seleccionar
  useEffect(() => {
    if (userRole === 'user' && warehouses.length === 1) {
      onChange(warehouses[0].id);
    }
  }, [warehouses]);
  
  return (
    <select value={value} onChange={e => onChange(Number(e.target.value))}>
      <option value="">Seleccionar almacén</option>
      {warehouses.map(w => (
        <option key={w.id} value={w.id}>
          {w.name} ({w.code})
        </option>
      ))}
    </select>
  );
}
```

---

## 💡 Ejemplos de Implementación

### Ejemplo 1: Formulario de Entrada de Mercancía

```javascript
function InboundForm() {
  const [formData, setFormData] = useState({
    productId: '',
    warehouseId: userRole === 'user' ? userWarehouseId : '',
    quantity: '',
    unitCost: '',
    reference: '',
    notes: ''
  });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const transaction = {
      productId: Number(formData.productId),
      warehouseId: Number(formData.warehouseId),
      type: 'INBOUND',
      reason: 'PURCHASE',
      quantity: Number(formData.quantity),
      unitCost: Number(formData.unitCost),
      reference: formData.reference,
      notes: formData.notes
    };
    
    try {
      const result = await createTransaction(transaction);
      
      if (result.success) {
        alert('Entrada registrada exitosamente');
        // Actualizar inventario, limpiar formulario, etc.
      }
    } catch (error) {
      if (error.code === 'WAREHOUSE_ACCESS_DENIED') {
        alert('No tienes permiso para operar en este almacén');
      } else {
        alert('Error al registrar entrada');
      }
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <ProductSelector 
        value={formData.productId}
        onChange={v => setFormData({...formData, productId: v})}
      />
      
      <WarehouseSelector
        value={formData.warehouseId}
        onChange={v => setFormData({...formData, warehouseId: v})}
        disabled={userRole === 'user'} // User no puede cambiar almacén
      />
      
      <input
        type="number"
        placeholder="Cantidad"
        value={formData.quantity}
        onChange={e => setFormData({...formData, quantity: e.target.value})}
        required
      />
      
      <input
        type="number"
        step="0.01"
        placeholder="Costo Unitario"
        value={formData.unitCost}
        onChange={e => setFormData({...formData, unitCost: e.target.value})}
      />
      
      <input
        type="text"
        placeholder="Referencia (Factura, Orden, etc.)"
        value={formData.reference}
        onChange={e => setFormData({...formData, reference: e.target.value})}
      />
      
      <textarea
        placeholder="Notas adicionales"
        value={formData.notes}
        onChange={e => setFormData({...formData, notes: e.target.value})}
      />
      
      <button type="submit">Registrar Entrada</button>
    </form>
  );
}
```

### Ejemplo 2: Dashboard Multi-Almacén

```javascript
function MultiWarehouseDashboard() {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadWarehousesSummary()
      .then(data => {
        setSummary(data);
        setLoading(false);
      });
  }, []);
  
  if (loading) return <Spinner />;
  
  // Calcular totales generales
  const totals = summary.reduce((acc, w) => ({
    stock: acc.stock + w.stats.currentStock,
    products: acc.products + w.stats.uniqueProducts,
    transactions: acc.transactions + w.stats.transactionCount
  }), { stock: 0, products: 0, transactions: 0 });
  
  return (
    <div className="dashboard">
      <header>
        <h1>Dashboard de Inventario</h1>
        <div className="totals">
          <div>Stock Total: {totals.stock}</div>
          <div>Productos: {totals.products}</div>
          <div>Transacciones: {totals.transactions}</div>
        </div>
      </header>
      
      <div className="warehouses-grid">
        {summary.map(w => (
          <WarehouseCard
            key={w.warehouse.id}
            warehouse={w.warehouse}
            stats={w.stats}
            lastActivity={w.lastActivity}
            onClick={() => navigateTo(`/warehouse/${w.warehouse.id}`)}
          />
        ))}
      </div>
      
      <section className="charts">
        <StockDistributionChart data={summary} />
        <ActivityTimelineChart data={summary} />
      </section>
    </div>
  );
}
```

### Ejemplo 3: Transferencia entre Almacenes

```javascript
function TransferForm() {
  const [formData, setFormData] = useState({
    productId: '',
    fromWarehouseId: '',
    toWarehouseId: '',
    quantity: '',
    reference: '',
    notes: ''
  });
  
  const [availableStock, setAvailableStock] = useState(0);
  
  // Cargar stock disponible en almacén origen
  useEffect(() => {
    if (formData.productId && formData.fromWarehouseId) {
      loadStockByWarehouse(formData.productId, formData.fromWarehouseId)
        .then(data => setAvailableStock(data.currentStock));
    }
  }, [formData.productId, formData.fromWarehouseId]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.fromWarehouseId === formData.toWarehouseId) {
      alert('Los almacenes origen y destino no pueden ser iguales');
      return;
    }
    
    if (formData.quantity > availableStock) {
      alert(`Stock insuficiente. Disponible: ${availableStock}`);
      return;
    }
    
    try {
      const result = await transferStock(
        formData.productId,
        formData.fromWarehouseId,
        formData.toWarehouseId,
        formData.quantity
      );
      
      if (result.success) {
        alert('Transferencia realizada exitosamente');
        // Actualizar inventario
      }
    } catch (error) {
      alert('Error en la transferencia');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <ProductSelector 
        value={formData.productId}
        onChange={v => setFormData({...formData, productId: v})}
      />
      
      <div className="transfer-section">
        <div>
          <label>Almacén Origen</label>
          <WarehouseSelector
            value={formData.fromWarehouseId}
            onChange={v => setFormData({...formData, fromWarehouseId: v})}
          />
          {availableStock > 0 && (
            <p>Stock disponible: {availableStock}</p>
          )}
        </div>
        
        <div className="arrow">→</div>
        
        <div>
          <label>Almacén Destino</label>
          <WarehouseSelector
            value={formData.toWarehouseId}
            onChange={v => setFormData({...formData, toWarehouseId: v})}
          />
        </div>
      </div>
      
      <input
        type="number"
        placeholder="Cantidad a transferir"
        value={formData.quantity}
        onChange={e => setFormData({...formData, quantity: e.target.value})}
        max={availableStock}
        required
      />
      
      <button type="submit">Realizar Transferencia</button>
    </form>
  );
}
```

### Ejemplo 4: Vista de Stock por Producto

```javascript
function ProductStockView({ productId }) {
  const [stockByWarehouse, setStockByWarehouse] = useState([]);
  
  useEffect(() => {
    loadStockByWarehouses(productId)
      .then(setStockByWarehouse);
  }, [productId]);
  
  const totalStock = stockByWarehouse.reduce(
    (sum, w) => sum + w.currentStock, 
    0
  );
  
  return (
    <div className="product-stock">
      <h2>Stock por Almacén</h2>
      <div className="total">Total: {totalStock} unidades</div>
      
      <table>
        <thead>
          <tr>
            <th>Almacén</th>
            <th>Stock</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          {stockByWarehouse.map(w => (
            <tr key={w.warehouseId}>
              <td>{w.warehouseName}</td>
              <td>{w.currentStock}</td>
              <td>
                {totalStock > 0 
                  ? ((w.currentStock / totalStock) * 100).toFixed(1)
                  : 0
                }%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 📝 Resumen de Cambios Importantes

### ⚠️ Breaking Changes

1. **`warehouseId` obligatorio en bulk operations:**
   - `POST /api/v1/inventory/bulk/inbound`
   - `POST /api/v1/inventory/bulk/outbound`

2. **Token JWT incluye `warehouseId`:**
   - Decodificar y guardar en store
   - Usar para validar acceso

3. **Restricciones por rol:**
   - Usuarios 'user' solo pueden operar en su almacén
   - Filtrar opciones en UI según rol

### ✅ Nuevos Endpoints

1. **GET** `/api/v1/inventory/warehouses/summary` - Dashboard general
2. **GET** `/api/v1/inventory/warehouses/:id/summary` - Detalle de almacén

### 📋 Checklist de Implementación

- [ ] Actualizar login para guardar `warehouseId` del token
- [ ] Filtrar almacenes según rol del usuario
- [ ] Agregar `warehouseId` en formularios de transacciones
- [ ] Implementar validación de acceso a almacenes
- [ ] Actualizar bulk operations para incluir `warehouseId`
- [ ] Crear dashboard con resumen de almacenes
- [ ] Implementar vista detallada por almacén
- [ ] Agregar manejo de errores específicos (403, etc.)
- [ ] Actualizar componentes de transferencia
- [ ] Mostrar stock por almacén en vista de productos

---

## 🆘 Errores Comunes

### Error 403: WAREHOUSE_ACCESS_DENIED
**Causa:** Usuario 'user' intentando acceder a almacén no asignado
**Solución:** Validar `warehouseId` antes de enviar request

### Error 400: NO_MAIN_WAREHOUSE
**Causa:** No especificaste `warehouseId` y la compañía no tiene almacén principal
**Solución:** Siempre especificar `warehouseId` en transacciones

### Error 400: INSUFFICIENT_STOCK
**Causa:** Intentando sacar más stock del disponible
**Solución:** Consultar stock antes de operación, mostrar disponible en UI

### Error 404: WAREHOUSE_NOT_FOUND
**Causa:** `warehouseId` inválido o almacén inactivo
**Solución:** Validar que el almacén existe y está activo

---

## 📞 Soporte

Para más información o dudas sobre la implementación:
- Documentación completa: `/docs/WAREHOUSE_IMPROVEMENTS.md`
- Swagger UI: `http://localhost:3000/api-docs`
- Script SQL: `/scripts/assign-warehouses-to-users.sql`
