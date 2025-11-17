# 🎯 PROMPT: Implementación de Sistema de Cargue de Inventario Multi-Almacén

## 📋 CONTEXTO DEL SISTEMA

Necesito implementar el módulo de **Cargue de Inventario** para un sistema multi-almacén con control de acceso basado en roles. El backend ya está desarrollado y documentado en el archivo `FRONTEND_INTEGRATION_GUIDE.md`.

---

## 🎯 OBJETIVO PRINCIPAL

Desarrollar una interfaz completa para gestión de inventario que permita:

1. **Carga individual** de entradas y salidas de inventario
2. **Carga masiva** (bulk) de múltiples productos
3. **Transferencias** entre almacenes
4. **Ajustes** de stock por conteo físico
5. **Visualización** de stock por almacén
6. **Control de acceso** según rol del usuario

---

## 👥 ROLES Y PERMISOS

### 🔴 ROL: `admin`
**Características:**
- Acceso completo a todos los almacenes
- `warehouseId` en JWT: `null`
- Puede operar en cualquier almacén
- Ve dashboard con todos los almacenes

**Permisos:**
- ✅ Crear entradas/salidas en cualquier almacén
- ✅ Realizar transferencias entre cualquier almacén
- ✅ Ver stock de todos los almacenes
- ✅ Acceder al dashboard administrativo
- ✅ Carga masiva para cualquier almacén

### 🟡 ROL: `manager`
**Características:**
- Acceso completo a todos los almacenes (igual que admin)
- `warehouseId` en JWT: `null`
- Permisos operacionales completos

**Permisos:**
- ✅ Crear entradas/salidas en cualquier almacén
- ✅ Realizar transferencias entre cualquier almacén
- ✅ Ver stock de todos los almacenes
- ✅ Acceder al dashboard administrativo
- ✅ Carga masiva para cualquier almacén

### 🟢 ROL: `user`
**Características:**
- Acceso **RESTRINGIDO** a un solo almacén
- `warehouseId` en JWT: `2` (ejemplo: ID del almacén asignado)
- Solo puede operar en su almacén

**Permisos:**
- ✅ Crear entradas/salidas **solo en su almacén**
- ❌ NO puede hacer transferencias (requiere acceso a múltiples almacenes)
- ✅ Ver stock **solo de su almacén**
- ❌ NO accede al dashboard completo (solo vista de su almacén)
- ✅ Carga masiva **solo para su almacén**

**Validación Backend:**
Si un `user` intenta acceder a un almacén diferente al suyo:
```json
{
  "success": false,
  "error": {
    "code": "WAREHOUSE_ACCESS_DENIED",
    "message": "No tienes acceso a este almacén"
  }
}
```

---

## 🔐 AUTENTICACIÓN Y TOKEN

### 1. Login
```javascript
POST /api/v1/auth/login
{
  "email": "usuario@empresa.com",
  "password": "password123"
}

// Response
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
      "role": "user",        // ← ROL DEL USUARIO
      "companyId": 1
    }
  }
}
```

### 2. Decodificar JWT
```javascript
import jwtDecode from 'jwt-decode';

const decoded = jwtDecode(accessToken);
// Resultado:
{
  "userId": 123,
  "companyId": 1,
  "email": "usuario@empresa.com",
  "role": "user",              // ← ROL
  "warehouseId": 2,            // ← ALMACÉN ASIGNADO (null para admin/manager)
  "iat": 1700000000,
  "exp": 1700003600
}
```

### 3. Guardar estado del usuario
```javascript
// Ejemplo con Zustand/Redux/Context
const userState = {
  token: accessToken,
  userId: decoded.userId,
  companyId: decoded.companyId,
  role: decoded.role,           // 'admin', 'manager', o 'user'
  warehouseId: decoded.warehouseId, // null o número
  firstName: user.firstName,
  lastName: user.lastName
};
```

---

## 📦 FUNCIONALIDADES A IMPLEMENTAR

### 1️⃣ ENTRADA DE INVENTARIO (Inbound)

**Endpoint:** `POST /api/v1/inventory/transactions`

**Casos de uso:**
- Compras a proveedores (`reason: 'PURCHASE'`)
- Devoluciones de clientes (`reason: 'RETURN'`)
- Mercancía encontrada (`reason: 'FOUND'`)
- Stock inicial (`reason: 'INITIAL_STOCK'`)

**Request:**
```json
{
  "productId": 1,
  "warehouseId": 2,           // Ver lógica según rol ↓
  "type": "INBOUND",
  "reason": "PURCHASE",
  "quantity": 100,
  "unitCost": 15.50,          // Opcional
  "reference": "FAC-12345",   // Factura/referencia
  "location": "Estante A-12", // Ubicación física
  "notes": "Compra proveedor XYZ"
}
```

**Lógica según rol:**
```javascript
async function createInboundTransaction(data) {
  // Si es 'user' y no especificó warehouse, auto-asignar
  if (userRole === 'user' && !data.warehouseId) {
    data.warehouseId = userWarehouseId; // Del token JWT
  }
  
  // Validar acceso
  if (userRole === 'user' && data.warehouseId !== userWarehouseId) {
    throw new Error('No tienes acceso a este almacén');
  }
  
  const response = await fetch('/api/v1/inventory/transactions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  return await response.json();
}
```

**Componente UI Requerido:**
```jsx
<FormularioEntrada>
  <SelectProducto />           {/* Listar productos activos */}
  <SelectAlmacen               {/* Solo mostrar almacenes accesibles */}
    disabled={userRole === 'user'}  {/* Deshabilitado para users */}
    value={userRole === 'user' ? userWarehouseId : selectedWarehouse}
  />
  <InputCantidad />
  <SelectRazon>                {/* PURCHASE, RETURN, FOUND, INITIAL_STOCK */}
    <option value="PURCHASE">Compra</option>
    <option value="RETURN">Devolución</option>
    <option value="FOUND">Encontrado</option>
    <option value="INITIAL_STOCK">Stock Inicial</option>
  </SelectRazon>
  <InputCostoUnitario />       {/* Opcional */}
  <InputReferencia />          {/* Factura */}
  <InputUbicacion />           {/* Estante/pasillo */}
  <TextAreaNotas />
  <BotonGuardar />
</FormularioEntrada>
```

---

### 2️⃣ SALIDA DE INVENTARIO (Outbound)

**Endpoint:** `POST /api/v1/inventory/transactions`

**Casos de uso:**
- Ventas (`reason: 'SALE'`)
- Mercancía dañada (`reason: 'DAMAGED'`)
- Mercancía perdida (`reason: 'LOST'`)

**Request:**
```json
{
  "productId": 1,
  "warehouseId": 2,           // ⚠️ IMPORTANTE: Especificar de qué almacén sale
  "type": "OUTBOUND",
  "reason": "SALE",
  "quantity": 10,
  "reference": "VENTA-001",
  "notes": "Venta cliente ABC"
}
```

**⚠️ VALIDACIÓN IMPORTANTE:**
- El backend verifica que hay **stock suficiente**
- Si no hay stock, retorna error `INSUFFICIENT_STOCK`

**Manejo de errores:**
```javascript
const result = await createOutboundTransaction(data);

if (!result.success) {
  if (result.error.code === 'INSUFFICIENT_STOCK') {
    alert(`Stock insuficiente. Disponible: ${result.error.details.available}`);
  } else if (result.error.code === 'WAREHOUSE_ACCESS_DENIED') {
    alert('No tienes acceso a este almacén');
  }
}
```

**Componente UI Requerido:**
```jsx
<FormularioSalida>
  <SelectProducto onChange={handleProductChange} />
  <MostrarStockDisponible>
    Stock disponible: {stockDisponible} unidades
  </MostrarStockDisponible>
  <SelectAlmacen 
    disabled={userRole === 'user'}
    value={userRole === 'user' ? userWarehouseId : selectedWarehouse}
  />
  <InputCantidad 
    max={stockDisponible}  {/* Validar en frontend */}
  />
  <SelectRazon>
    <option value="SALE">Venta</option>
    <option value="DAMAGED">Dañado</option>
    <option value="LOST">Perdido</option>
  </SelectRazon>
  <InputReferencia />
  <TextAreaNotas />
  <BotonGuardar />
</FormularioSalida>
```

---

### 3️⃣ CARGA MASIVA - ENTRADA (Bulk Inbound)

**Endpoint:** `POST /api/v1/inventory/bulk/inbound`

**⚠️ OBLIGATORIO:** `warehouseId` debe ser especificado

**Request:**
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
    },
    {
      "productId": 3,
      "quantity": 75,
      "unitCost": 10.00,
      "reference": "FAC-001"
    }
  ],
  "reason": "PURCHASE",
  "notes": "Compra masiva proveedor XYZ"
}
```

**Implementación:**
```javascript
async function bulkInbound(warehouseId, products, reason, notes) {
  // Validar acceso para 'user'
  if (userRole === 'user' && warehouseId !== userWarehouseId) {
    throw new Error('No tienes acceso a este almacén');
  }
  
  const items = products.map(p => ({
    productId: p.id,
    quantity: p.quantity,
    unitCost: p.unitCost || null,
    reference: p.reference || ''
  }));
  
  const response = await fetch('/api/v1/inventory/bulk/inbound', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      warehouseId,
      items,
      reason,
      notes
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    alert(`✅ ${result.data.created.length} productos ingresados correctamente`);
  } else {
    alert(`❌ Error: ${result.error.message}`);
  }
  
  return result;
}
```

**Componente UI Requerido:**
```jsx
<FormularioCargaMasiva>
  <SelectAlmacen 
    disabled={userRole === 'user'}
    value={userRole === 'user' ? userWarehouseId : selectedWarehouse}
    required
  />
  
  <SelectRazon>
    <option value="PURCHASE">Compra</option>
    <option value="RETURN">Devolución</option>
    <option value="INITIAL_STOCK">Stock Inicial</option>
  </SelectRazon>
  
  <TablaProductos>
    <thead>
      <tr>
        <th>Producto</th>
        <th>Cantidad</th>
        <th>Costo Unitario</th>
        <th>Referencia</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody>
      {productos.map((p, index) => (
        <tr key={index}>
          <td>
            <SelectProducto 
              value={p.productId}
              onChange={(id) => updateProduct(index, 'productId', id)}
            />
          </td>
          <td>
            <Input 
              type="number" 
              value={p.quantity}
              onChange={(e) => updateProduct(index, 'quantity', e.target.value)}
              min="1"
            />
          </td>
          <td>
            <Input 
              type="number" 
              step="0.01"
              value={p.unitCost}
              onChange={(e) => updateProduct(index, 'unitCost', e.target.value)}
            />
          </td>
          <td>
            <Input 
              value={p.reference}
              onChange={(e) => updateProduct(index, 'reference', e.target.value)}
            />
          </td>
          <td>
            <BotonEliminar onClick={() => removeProduct(index)} />
          </td>
        </tr>
      ))}
    </tbody>
  </TablaProductos>
  
  <BotonAgregarProducto onClick={addProduct} />
  <TextAreaNotas />
  <BotonGuardar onClick={handleBulkSubmit} />
</FormularioCargaMasiva>
```

---

### 4️⃣ CARGA MASIVA - SALIDA (Bulk Outbound)

**Endpoint:** `POST /api/v1/inventory/bulk/outbound`

**Request:**
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

**⚠️ VALIDACIONES:**
- Verificar stock antes de enviar (consultar stock disponible)
- Si algún producto no tiene stock, mostrar advertencia
- El backend retorna error si no hay stock suficiente

**Implementación con validación de stock:**
```javascript
async function bulkOutboundWithValidation(warehouseId, products, reason, notes) {
  // 1. Validar stock de todos los productos
  const stockChecks = await Promise.all(
    products.map(async (p) => {
      const stock = await getProductStock(p.productId, warehouseId);
      return {
        productId: p.productId,
        requested: p.quantity,
        available: stock.currentStock,
        isValid: p.quantity <= stock.currentStock
      };
    })
  );
  
  // 2. Verificar si hay productos con stock insuficiente
  const invalidProducts = stockChecks.filter(c => !c.isValid);
  
  if (invalidProducts.length > 0) {
    const message = invalidProducts.map(p => 
      `Producto ${p.productId}: solicitado ${p.requested}, disponible ${p.available}`
    ).join('\n');
    
    throw new Error(`Stock insuficiente:\n${message}`);
  }
  
  // 3. Si todo OK, proceder con la carga masiva
  const items = products.map(p => ({
    productId: p.productId,
    quantity: p.quantity,
    reference: p.reference || ''
  }));
  
  const response = await fetch('/api/v1/inventory/bulk/outbound', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      warehouseId,
      items,
      reason,
      notes
    })
  });
  
  return await response.json();
}
```

---

### 5️⃣ TRANSFERENCIA ENTRE ALMACENES

**Endpoint:** `POST /api/v1/inventory/transfer`

**⚠️ RESTRICCIÓN:** Solo para `admin` y `manager`

**Request:**
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

**Componente UI:**
```jsx
{/* Solo mostrar para admin y manager */}
{(userRole === 'admin' || userRole === 'manager') && (
  <FormularioTransferencia>
    <SelectProducto />
    
    <SelectAlmacenOrigen>
      {almacenes.map(w => (
        <option key={w.id} value={w.id}>
          {w.name} - Stock: {getStockInWarehouse(selectedProduct, w.id)}
        </option>
      ))}
    </SelectAlmacenOrigen>
    
    <SelectAlmacenDestino>
      {almacenes
        .filter(w => w.id !== almacenOrigen) // No permitir mismo almacén
        .map(w => (
          <option key={w.id} value={w.id}>{w.name}</option>
        ))
      }
    </SelectAlmacenDestino>
    
    <InputCantidad 
      max={stockEnOrigen}
      placeholder="Cantidad a transferir"
    />
    
    <InputReferencia />
    <TextAreaNotas />
    <BotonTransferir onClick={handleTransfer} />
  </FormularioTransferencia>
)}
```

---

### 6️⃣ AJUSTE DE STOCK

**Endpoint:** `POST /api/v1/inventory/adjust`

**Uso:** Corregir diferencias después de conteo físico

**Request:**
```json
{
  "productId": 1,
  "warehouseId": 2,
  "newStock": 150,           // Stock real después del conteo (no la diferencia)
  "reason": "CORRECTION",
  "notes": "Ajuste por inventario físico del 2025-11-17"
}
```

**Lógica:**
- Si `newStock > currentStock`: Se crea una entrada (INBOUND)
- Si `newStock < currentStock`: Se crea una salida (OUTBOUND)
- Si `newStock === currentStock`: No se hace nada

**Componente UI:**
```jsx
<FormularioAjuste>
  <SelectProducto onChange={handleProductSelect} />
  <SelectAlmacen 
    disabled={userRole === 'user'}
    value={userRole === 'user' ? userWarehouseId : selectedWarehouse}
  />
  
  <InfoActual>
    <strong>Stock actual en sistema:</strong> {stockActual} unidades
  </InfoActual>
  
  <InputStockFisico 
    label="Stock físico contado"
    type="number"
    value={stockFisico}
    onChange={(e) => setStockFisico(e.target.value)}
  />
  
  <DiferenciaCalculada>
    {stockFisico > stockActual && (
      <p style={{color: 'green'}}>
        ↑ Entrada: +{stockFisico - stockActual} unidades
      </p>
    )}
    {stockFisico < stockActual && (
      <p style={{color: 'red'}}>
        ↓ Salida: -{stockActual - stockFisico} unidades
      </p>
    )}
    {stockFisico === stockActual && (
      <p>✓ No hay diferencia</p>
    )}
  </DiferenciaCalculada>
  
  <TextAreaNotas placeholder="Motivo del ajuste" />
  <BotonAjustar disabled={stockFisico === stockActual} />
</FormularioAjuste>
```

---

### 7️⃣ CONSULTA DE STOCK

#### A. Stock de un producto en todos los almacenes
**Endpoint:** `GET /api/v1/inventory/stock/:productId/warehouses`

```javascript
async function getProductStockAllWarehouses(productId) {
  const response = await fetch(
    `/api/v1/inventory/stock/${productId}/warehouses`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );
  
  const { data } = await response.json();
  
  // Response:
  // [
  //   { warehouseId: 1, warehouseName: "Bodega Principal", currentStock: 150 },
  //   { warehouseId: 2, warehouseName: "PV Centro", currentStock: 50 }
  // ]
  
  // Si es 'user', filtrar solo su almacén
  if (userRole === 'user' && userWarehouseId) {
    return data.filter(w => w.warehouseId === userWarehouseId);
  }
  
  return data;
}
```

#### B. Stock de un producto en un almacén específico
**Endpoint:** `GET /api/v1/inventory/stock/:productId/warehouse/:warehouseId`

```javascript
async function getProductStockInWarehouse(productId, warehouseId) {
  const response = await fetch(
    `/api/v1/inventory/stock/${productId}/warehouse/${warehouseId}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );
  
  const { data } = await response.json();
  // { productId: 1, warehouseId: 2, currentStock: 50 }
  
  return data.currentStock;
}
```

**Componente de visualización:**
```jsx
<VistaStockProducto productId={productId}>
  <h2>Stock del Producto: {productName}</h2>
  
  <TablaStock>
    <thead>
      <tr>
        <th>Almacén</th>
        <th>Stock Actual</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody>
      {stockPorAlmacen.map(w => (
        <tr key={w.warehouseId}>
          <td>{w.warehouseName}</td>
          <td className={w.currentStock === 0 ? 'sin-stock' : ''}>
            {w.currentStock}
          </td>
          <td>
            <BotonVerHistorial onClick={() => showHistory(productId, w.warehouseId)} />
          </td>
        </tr>
      ))}
    </tbody>
  </TablaStock>
  
  <TotalGeneral>
    Total en todos los almacenes: {totalStock}
  </TotalGeneral>
</VistaStockProducto>
```

---

### 8️⃣ DASHBOARD ADMINISTRATIVO

**Endpoint:** `GET /api/v1/inventory/warehouses/summary`

**⚠️ Solo para `admin` y `manager`**

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
    }
  ]
}
```

**Componente UI:**
```jsx
// Solo mostrar si es admin o manager
{(userRole === 'admin' || userRole === 'manager') && (
  <DashboardAlmacenes>
    <h1>Dashboard de Almacenes</h1>
    
    <ResumenGeneral>
      <Card>
        <h3>Stock Total</h3>
        <BigNumber>{sumarTotalStock(warehouses)}</BigNumber>
      </Card>
      <Card>
        <h3>Productos Únicos</h3>
        <BigNumber>{sumarProductosUnicos(warehouses)}</BigNumber>
      </Card>
      <Card>
        <h3>Almacenes Activos</h3>
        <BigNumber>{warehouses.length}</BigNumber>
      </Card>
    </ResumenGeneral>
    
    <GridAlmacenes>
      {warehouses.map(w => (
        <CardAlmacen key={w.warehouse.id}>
          <Header>
            <h3>{w.warehouse.name}</h3>
            <Badge>{w.warehouse.code}</Badge>
            {w.warehouse.isMain && <Badge color="gold">Principal</Badge>}
          </Header>
          
          <Info>
            <p>👤 {w.warehouse.managerName}</p>
            <p>📍 {w.warehouse.address}</p>
          </Info>
          
          <Stats>
            <Stat label="Stock" value={w.stats.currentStock} />
            <Stat label="Productos" value={w.stats.uniqueProducts} />
            <Stat label="Entradas" value={w.stats.totalInbound} color="green" />
            <Stat label="Salidas" value={w.stats.totalOutbound} color="red" />
          </Stats>
          
          {w.lastActivity && (
            <UltimaActividad>
              <small>Última actividad:</small>
              <p>{formatDate(w.lastActivity.date)}</p>
              <p>{w.lastActivity.type} - {w.lastActivity.reason}</p>
            </UltimaActividad>
          )}
          
          <BotonVerDetalle onClick={() => navigate(`/warehouse/${w.warehouse.id}`)}>
            Ver Detalles
          </BotonVerDetalle>
        </CardAlmacen>
      ))}
    </GridAlmacenes>
  </DashboardAlmacenes>
)}
```

---

### 9️⃣ VISTA DETALLADA DE ALMACÉN

**Endpoint:** `GET /api/v1/inventory/warehouses/:warehouseId/summary`

**Validación de acceso:**
- `admin` / `manager`: Pueden ver cualquier almacén
- `user`: Solo puede ver su almacén asignado

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
      "address": "Av. Principal 456",
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

**Componente UI:**
```jsx
function DetalleAlmacen({ warehouseId }) {
  const [detail, setDetail] = useState(null);
  
  useEffect(() => {
    // Validar acceso
    if (userRole === 'user' && warehouseId !== userWarehouseId) {
      navigate('/unauthorized');
      return;
    }
    
    loadWarehouseDetail(warehouseId).then(setDetail);
  }, [warehouseId]);
  
  if (!detail) return <Loading />;
  
  return (
    <DetalleAlmacenView>
      <Header>
        <h1>{detail.warehouse.name}</h1>
        <p>{detail.warehouse.code}</p>
        {detail.warehouse.isMain && <Badge>Principal</Badge>}
      </Header>
      
      <InfoContacto>
        <p>👤 Gerente: {detail.warehouse.managerName}</p>
        <p>📍 {detail.warehouse.address}</p>
        <p>📞 {detail.warehouse.phone}</p>
        <p>📧 {detail.warehouse.email}</p>
      </InfoContacto>
      
      <StatsResumen>
        <StatCard label="Stock Total" value={detail.stats.currentStock} />
        <StatCard label="Productos" value={detail.stats.uniqueProducts} />
        <StatCard label="Transacciones" value={detail.stats.transactionCount} />
      </StatsResumen>
      
      <SeccionProductos>
        <h2>Productos en Stock</h2>
        <TablaProductos>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Nombre</th>
              <th>Stock</th>
              <th>Última Actualización</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {detail.products.map(p => (
              <tr key={p.productId} className={p.currentStock === 0 ? 'sin-stock' : ''}>
                <td>{p.productSku}</td>
                <td>{p.productName}</td>
                <td>{p.currentStock}</td>
                <td>{formatDate(p.lastUpdated)}</td>
                <td>
                  <BotonVerDetalle onClick={() => viewProduct(p.productId)} />
                </td>
              </tr>
            ))}
          </tbody>
        </TablaProductos>
      </SeccionProductos>
      
      <SeccionActividad>
        <h2>Actividad Reciente</h2>
        <ListaTransacciones>
          {detail.recentTransactions.map(t => (
            <ItemTransaccion key={t.id}>
              <Fecha>{formatDate(t.createdAt)}</Fecha>
              <Tipo className={t.type.toLowerCase()}>{t.type}</Tipo>
              <Producto>{t.productName}</Producto>
              <Cantidad className={t.quantity > 0 ? 'positive' : 'negative'}>
                {t.quantity > 0 ? '+' : ''}{t.quantity}
              </Cantidad>
              {t.reference && <Referencia>({t.reference})</Referencia>}
            </ItemTransaccion>
          ))}
        </ListaTransacciones>
      </SeccionActividad>
    </DetalleAlmacenView>
  );
}
```

---

## 🎨 ESTRUCTURA DE NAVEGACIÓN SUGERIDA

### Para `admin` y `manager`:
```
├── 📊 Dashboard Principal
│   ├── Resumen de todos los almacenes
│   └── Gráficos y métricas generales
├── 📦 Inventario
│   ├── 📥 Nueva Entrada
│   ├── 📤 Nueva Salida
│   ├── 📋 Carga Masiva (Entrada/Salida)
│   ├── 🔄 Transferencia entre Almacenes
│   ├── ⚙️ Ajuste de Stock
│   └── 📊 Consultar Stock
├── 🏢 Almacenes
│   ├── Lista de Almacenes
│   └── Detalle de Almacén
└── 📜 Historial
    └── Transacciones
```

### Para `user`:
```
├── 🏢 Mi Almacén
│   ├── Resumen de mi almacén
│   └── Productos en stock
├── 📦 Inventario
│   ├── 📥 Nueva Entrada (solo mi almacén)
│   ├── 📤 Nueva Salida (solo mi almacén)
│   ├── 📋 Carga Masiva (solo mi almacén)
│   ├── ⚙️ Ajuste de Stock
│   └── 📊 Consultar Stock (solo mi almacén)
└── 📜 Historial
    └── Mis Transacciones
```

---

## ⚠️ VALIDACIONES CRÍTICAS A IMPLEMENTAR

### 1. Validación de acceso por rol
```javascript
function canAccessWarehouse(targetWarehouseId) {
  if (userRole === 'admin' || userRole === 'manager') {
    return true;
  }
  
  if (userRole === 'user') {
    return targetWarehouseId === userWarehouseId;
  }
  
  return false;
}

// Uso en componentes
if (!canAccessWarehouse(selectedWarehouse)) {
  alert('No tienes acceso a este almacén');
  return;
}
```

### 2. Validación de stock antes de salidas
```javascript
async function validateStockBeforeOutbound(productId, warehouseId, quantity) {
  const stock = await getProductStockInWarehouse(productId, warehouseId);
  
  if (stock < quantity) {
    throw new Error(
      `Stock insuficiente. Solicitado: ${quantity}, Disponible: ${stock}`
    );
  }
  
  return true;
}
```

### 3. Auto-asignación de warehouse para users
```javascript
function prepareTransactionData(data) {
  // Si es 'user' y no especificó warehouse, usar el suyo
  if (userRole === 'user' && !data.warehouseId) {
    data.warehouseId = userWarehouseId;
  }
  
  return data;
}
```

### 4. Filtrado de almacenes en selectores
```javascript
function getAccessibleWarehouses(allWarehouses) {
  // Admin/Manager ven todos
  if (userRole === 'admin' || userRole === 'manager') {
    return allWarehouses;
  }
  
  // User solo ve el suyo
  if (userRole === 'user' && userWarehouseId) {
    return allWarehouses.filter(w => w.id === userWarehouseId);
  }
  
  return [];
}
```

---

## 🔴 MANEJO DE ERRORES

### Códigos de error comunes:
```javascript
const ERROR_HANDLERS = {
  'WAREHOUSE_ACCESS_DENIED': () => {
    alert('No tienes acceso a este almacén');
    navigate('/unauthorized');
  },
  
  'INSUFFICIENT_STOCK': (error) => {
    const { available, requested } = error.details;
    alert(`Stock insuficiente.\nDisponible: ${available}\nSolicitado: ${requested}`);
  },
  
  'PRODUCT_NOT_FOUND': () => {
    alert('El producto no existe o no está activo');
  },
  
  'WAREHOUSE_NOT_FOUND': () => {
    alert('El almacén no existe o no está activo');
  },
  
  'INVALID_QUANTITY': () => {
    alert('La cantidad debe ser mayor a 0');
  },
  
  'TOKEN_EXPIRED': async () => {
    await refreshToken();
    // Reintentar operación
  }
};

async function handleApiCall(apiFunction) {
  try {
    const result = await apiFunction();
    
    if (!result.success) {
      const handler = ERROR_HANDLERS[result.error.code];
      if (handler) {
        handler(result.error);
      } else {
        alert(`Error: ${result.error.message}`);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error en llamada API:', error);
    alert('Error de conexión. Por favor intenta de nuevo.');
  }
}
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### ✅ Autenticación
- [ ] Sistema de login con JWT
- [ ] Decodificación de token (extraer role y warehouseId)
- [ ] Almacenamiento seguro del token (localStorage/sessionStorage)
- [ ] Interceptor HTTP para agregar Authorization header
- [ ] Manejo de refresh token
- [ ] Logout y limpieza de sesión

### ✅ Gestión de Almacenes
- [ ] Selector de almacenes con filtrado por rol
- [ ] Vista de lista de almacenes (admin/manager)
- [ ] Vista de detalle de almacén
- [ ] Dashboard administrativo de almacenes
- [ ] Auto-selección de almacén para users

### ✅ Operaciones de Inventario
- [ ] Formulario de entrada individual (INBOUND)
- [ ] Formulario de salida individual (OUTBOUND)
- [ ] Formulario de carga masiva entrada
- [ ] Formulario de carga masiva salida
- [ ] Formulario de transferencia (solo admin/manager)
- [ ] Formulario de ajuste de stock
- [ ] Validación de stock antes de salidas

### ✅ Consultas
- [ ] Consultar stock de producto por almacenes
- [ ] Consultar stock de producto en almacén específico
- [ ] Historial de transacciones con filtros
- [ ] Búsqueda de productos

### ✅ Control de Acceso
- [ ] Validación de acceso a almacenes por rol
- [ ] Ocultar opciones no disponibles según rol
- [ ] Bloqueo de transferencias para users
- [ ] Redirección a página de acceso denegado

### ✅ UI/UX
- [ ] Indicadores visuales de stock (bajo/alto)
- [ ] Alertas de stock insuficiente
- [ ] Confirmaciones antes de acciones críticas
- [ ] Feedback visual de operaciones exitosas/fallidas
- [ ] Loading states
- [ ] Diseño responsive

### ✅ Validaciones
- [ ] Validación de cantidades (> 0)
- [ ] Validación de stock disponible
- [ ] Validación de acceso a almacenes
- [ ] Validación de campos requeridos
- [ ] Validación de permisos por rol

---

## 🚀 TECNOLOGÍAS SUGERIDAS

- **Frontend Framework:** React, Vue 3, o Angular
- **State Management:** Zustand, Redux Toolkit, o Pinia
- **HTTP Client:** Axios o Fetch API
- **JWT Decode:** `jwt-decode` library
- **Forms:** React Hook Form, Formik, o VeeValidate
- **Tables:** TanStack Table, AG Grid
- **UI Components:** Material-UI, Ant Design, PrimeVue, o Tailwind CSS
- **Icons:** React Icons, Font Awesome
- **Charts:** Chart.js, Recharts (para dashboards)

---

## 📝 NOTAS FINALES

1. **Seguridad:** Nunca confíes solo en validaciones frontend. El backend ya tiene todas las validaciones necesarias.

2. **Token JWT:** El `warehouseId` está en el token. No necesitas consultar al backend cada vez para saber qué almacén tiene asignado el usuario.

3. **Auto-asignación:** Para usuarios con rol `user`, el sistema automáticamente asigna su almacén si no lo especifican, pero es mejor práctica enviarlo explícitamente desde el frontend.

4. **Transferencias:** Son atómicas. Si falla, no se crea ninguna de las dos transacciones (outbound e inbound).

5. **Carga masiva:** Usa transacciones de base de datos. Si un item falla, todos fallan (a menos que uses `skipErrors: true`).

6. **Performance:** Para listas grandes, implementa paginación y búsqueda en el backend.

7. **Offline:** Considera implementar caché local para consultas frecuentes de stock.

¡Listo para implementar! 🎉
