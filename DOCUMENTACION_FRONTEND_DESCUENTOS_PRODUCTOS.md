# Guía de Integración Frontend - Descuentos Individuales por Producto

## Descripción General

Este documento proporciona una guía completa para integrar los descuentos individuales por producto en el frontend. Los descuentos pueden aplicarse tanto a nivel de producto individual (por línea) como a nivel de venta completa (descuento global).

## 📋 Tabla de Contenidos

- [Estructura de Datos](#estructura-de-datos)
- [Endpoints API](#endpoints-api)
- [Implementación Frontend](#implementación-frontend)
- [Validaciones del Cliente](#validaciones-del-cliente)
- [Cálculos en Tiempo Real](#cálculos-en-tiempo-real)
- [Componentes UI Sugeridos](#componentes-ui-sugeridos)
- [Casos de Uso](#casos-de-uso)
- [Manejo de Errores](#manejo-de-errores)
- [Ejemplos Completos](#ejemplos-completos)

---

## Estructura de Datos

### Descuento por Producto Individual

Cada producto en el carrito/detalle de venta puede tener su propio descuento:

```typescript
interface SaleDetail {
  productId: number;
  quantity: number;
  unitPrice: number;
  taxPercentage?: number;          // Opcional, default: 19%
  discountPercentage?: number;     // 0-100, descuento individual
}
```

### Descuento Global de Venta

Descuento aplicado al subtotal completo:

```typescript
type DiscountType = 'none' | 'percentage' | 'fixed';

interface Sale {
  saleType: 'quote' | 'invoice' | 'proforma' | 'remission' | 'credit_note';
  customerId: number;
  warehouseId?: number;

  // Descuento global
  discountType?: DiscountType;     // Default: 'none'
  discountPercentage?: number;     // Si type = 'percentage', rango 0-100
  discountAmount?: number;         // Si type = 'fixed', valor >= 0
  discountReason?: string;         // Justificación del descuento

  details: SaleDetail[];
}
```

---

## Endpoints API

### Crear Venta con Descuentos

**POST** `/api/v1/sales`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "saleType": "invoice",
  "customerId": 1,
  "warehouseId": 1,
  "discountType": "percentage",
  "discountPercentage": 5,
  "discountReason": "Cliente frecuente",
  "details": [
    {
      "productId": 1,
      "quantity": 2,
      "unitPrice": 100000,
      "discountPercentage": 10
    },
    {
      "productId": 2,
      "quantity": 1,
      "unitPrice": 50000,
      "discountPercentage": 0
    }
  ]
}
```

**Response (201):**
```json
{
  "id": 123,
  "saleNumber": "FAC-2024-00123",
  "status": "draft",
  "subtotal": 250000,
  "discountAmount": 12500,
  "taxAmount": 45125,
  "total": 282625,
  "details": [
    {
      "id": 456,
      "productId": 1,
      "productName": "Producto A",
      "quantity": 2,
      "unitPrice": 100000,
      "discountPercentage": 10,
      "discountAmount": 20000,
      "lineTotal": 213600
    },
    {
      "id": 457,
      "productId": 2,
      "productName": "Producto B",
      "quantity": 1,
      "unitPrice": 50000,
      "discountPercentage": 0,
      "discountAmount": 0,
      "lineTotal": 59500
    }
  ]
}
```

---

## Implementación Frontend

### 1. Estado del Carrito/Venta

#### React (con hooks)

```typescript
import { useState, useMemo } from 'react';

interface CartItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPercentage: number;
  taxPercentage: number;
}

interface GlobalDiscount {
  type: 'none' | 'percentage' | 'fixed';
  percentage: number;
  amount: number;
  reason: string;
}

const useSaleCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState<GlobalDiscount>({
    type: 'none',
    percentage: 0,
    amount: 0,
    reason: ''
  });

  // Actualizar descuento de producto individual
  const updateProductDiscount = (productId: number, discountPercentage: number) => {
    setCartItems(items =>
      items.map(item =>
        item.productId === productId
          ? { ...item, discountPercentage }
          : item
      )
    );
  };

  // Actualizar descuento global
  const updateGlobalDiscount = (discount: Partial<GlobalDiscount>) => {
    setGlobalDiscount(prev => ({ ...prev, ...discount }));
  };

  return {
    cartItems,
    setCartItems,
    globalDiscount,
    updateProductDiscount,
    updateGlobalDiscount
  };
};
```

#### Vue 3 (Composition API)

```typescript
import { ref, computed } from 'vue';

interface CartItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPercentage: number;
  taxPercentage: number;
}

export const useSaleCart = () => {
  const cartItems = ref<CartItem[]>([]);
  const globalDiscount = ref({
    type: 'none' as 'none' | 'percentage' | 'fixed',
    percentage: 0,
    amount: 0,
    reason: ''
  });

  const updateProductDiscount = (productId: number, discountPercentage: number) => {
    const item = cartItems.value.find(i => i.productId === productId);
    if (item) {
      item.discountPercentage = discountPercentage;
    }
  };

  const updateGlobalDiscount = (type: string, value: number, reason: string) => {
    globalDiscount.value = {
      type: type as 'none' | 'percentage' | 'fixed',
      percentage: type === 'percentage' ? value : 0,
      amount: type === 'fixed' ? value : 0,
      reason
    };
  };

  return {
    cartItems,
    globalDiscount,
    updateProductDiscount,
    updateGlobalDiscount
  };
};
```

#### Angular (Service)

```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface CartItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPercentage: number;
  taxPercentage: number;
}

@Injectable({ providedIn: 'root' })
export class SaleCartService {
  private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);
  private globalDiscountSubject = new BehaviorSubject({
    type: 'none' as 'none' | 'percentage' | 'fixed',
    percentage: 0,
    amount: 0,
    reason: ''
  });

  cartItems$ = this.cartItemsSubject.asObservable();
  globalDiscount$ = this.globalDiscountSubject.asObservable();

  updateProductDiscount(productId: number, discountPercentage: number): void {
    const items = this.cartItemsSubject.value.map(item =>
      item.productId === productId
        ? { ...item, discountPercentage }
        : item
    );
    this.cartItemsSubject.next(items);
  }

  updateGlobalDiscount(type: string, value: number, reason: string): void {
    this.globalDiscountSubject.next({
      type: type as 'none' | 'percentage' | 'fixed',
      percentage: type === 'percentage' ? value : 0,
      amount: type === 'fixed' ? value : 0,
      reason
    });
  }
}
```

---

## Validaciones del Cliente

### Validaciones Requeridas

```typescript
class SaleValidator {
  // Validar descuento por producto
  static validateProductDiscount(discountPercentage: number): string | null {
    if (discountPercentage < 0) {
      return 'El descuento no puede ser negativo';
    }
    if (discountPercentage > 100) {
      return 'El descuento no puede exceder el 100%';
    }
    return null;
  }

  // Validar descuento global porcentual
  static validateGlobalPercentageDiscount(percentage: number): string | null {
    if (percentage < 0) {
      return 'El descuento porcentual no puede ser negativo';
    }
    if (percentage > 100) {
      return 'El descuento no puede exceder el 100%';
    }
    return null;
  }

  // Validar descuento global fijo
  static validateGlobalFixedDiscount(amount: number, subtotal: number): string | null {
    if (amount < 0) {
      return 'El descuento no puede ser negativo';
    }
    if (amount > subtotal) {
      return 'El descuento no puede ser mayor al subtotal';
    }
    return null;
  }

  // Validar que los campos requeridos estén presentes
  static validateDiscountType(
    type: string,
    percentage?: number,
    amount?: number
  ): string | null {
    if (type === 'percentage' && (percentage === undefined || percentage === null)) {
      return 'Debe especificar el porcentaje de descuento';
    }
    if (type === 'fixed' && (amount === undefined || amount === null)) {
      return 'Debe especificar el monto del descuento';
    }
    return null;
  }
}
```

### Implementación en Componente

```typescript
const handleProductDiscountChange = (productId: number, value: string) => {
  const discountPercentage = parseFloat(value) || 0;

  const error = SaleValidator.validateProductDiscount(discountPercentage);
  if (error) {
    showError(error);
    return;
  }

  updateProductDiscount(productId, discountPercentage);
};

const handleGlobalDiscountChange = (type: string, value: string) => {
  const numericValue = parseFloat(value) || 0;

  let error: string | null = null;
  if (type === 'percentage') {
    error = SaleValidator.validateGlobalPercentageDiscount(numericValue);
  } else if (type === 'fixed') {
    error = SaleValidator.validateGlobalFixedDiscount(numericValue, calculatedSubtotal);
  }

  if (error) {
    showError(error);
    return;
  }

  updateGlobalDiscount({ type, [type === 'percentage' ? 'percentage' : 'amount']: numericValue });
};
```

---

## Cálculos en Tiempo Real

### Función de Cálculo Completa

```typescript
interface CalculationResult {
  // Por producto
  itemSubtotals: number[];
  itemDiscounts: number[];
  itemTaxes: number[];
  itemTotals: number[];

  // Totales
  subtotal: number;
  globalDiscount: number;
  subtotalAfterGlobalDiscount: number;
  taxAmount: number;
  total: number;
}

const calculateSaleTotals = (
  cartItems: CartItem[],
  globalDiscount: GlobalDiscount
): CalculationResult => {
  const itemSubtotals: number[] = [];
  const itemDiscounts: number[] = [];
  const itemTaxes: number[] = [];
  const itemTotals: number[] = [];

  let subtotal = 0;

  // 1. Calcular totales por producto (con descuento individual)
  cartItems.forEach((item, index) => {
    const itemSubtotal = item.quantity * item.unitPrice;
    const itemDiscount = (itemSubtotal * (item.discountPercentage || 0)) / 100;
    const subtotalAfterDiscount = itemSubtotal - itemDiscount;
    const itemTax = (subtotalAfterDiscount * (item.taxPercentage || 19)) / 100;
    const itemTotal = subtotalAfterDiscount + itemTax;

    itemSubtotals[index] = itemSubtotal;
    itemDiscounts[index] = itemDiscount;
    itemTaxes[index] = itemTax;
    itemTotals[index] = itemTotal;

    subtotal += itemSubtotal;
  });

  // 2. Calcular descuento global
  let globalDiscountAmount = 0;
  if (globalDiscount.type === 'percentage') {
    globalDiscountAmount = (subtotal * globalDiscount.percentage) / 100;
  } else if (globalDiscount.type === 'fixed') {
    globalDiscountAmount = globalDiscount.amount;
  }

  // 3. Calcular subtotal después de descuento global
  const subtotalAfterGlobalDiscount = subtotal - globalDiscountAmount;

  // 4. Calcular impuesto sobre subtotal después de descuento
  const taxAmount = (subtotalAfterGlobalDiscount * 19) / 100;

  // 5. Calcular total final
  const total = subtotalAfterGlobalDiscount + taxAmount;

  return {
    itemSubtotals,
    itemDiscounts,
    itemTaxes,
    itemTotals,
    subtotal,
    globalDiscount: globalDiscountAmount,
    subtotalAfterGlobalDiscount,
    taxAmount,
    total
  };
};
```

### Hook de React para Cálculos Automáticos

```typescript
const useSaleCalculations = (cartItems: CartItem[], globalDiscount: GlobalDiscount) => {
  return useMemo(() => {
    return calculateSaleTotals(cartItems, globalDiscount);
  }, [cartItems, globalDiscount]);
};

// Uso en componente
const SaleComponent = () => {
  const { cartItems, globalDiscount } = useSaleCart();
  const calculations = useSaleCalculations(cartItems, globalDiscount);

  return (
    <div>
      <p>Subtotal: ${calculations.subtotal.toLocaleString()}</p>
      <p>Descuento Global: -${calculations.globalDiscount.toLocaleString()}</p>
      <p>IVA (19%): ${calculations.taxAmount.toLocaleString()}</p>
      <p>Total: ${calculations.total.toLocaleString()}</p>
    </div>
  );
};
```

---

## Componentes UI Sugeridos

### 1. Tabla de Productos con Descuentos

```tsx
// React + Tailwind CSS
const SaleProductsTable = ({ cartItems, onDiscountChange }) => {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-gray-100">
          <th className="p-2 text-left">Producto</th>
          <th className="p-2 text-right">Cantidad</th>
          <th className="p-2 text-right">Precio Unit.</th>
          <th className="p-2 text-right">Descuento %</th>
          <th className="p-2 text-right">Subtotal</th>
          <th className="p-2 text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {cartItems.map((item, index) => {
          const itemSubtotal = item.quantity * item.unitPrice;
          const discount = (itemSubtotal * (item.discountPercentage || 0)) / 100;
          const subtotalAfterDiscount = itemSubtotal - discount;
          const tax = (subtotalAfterDiscount * (item.taxPercentage || 19)) / 100;
          const total = subtotalAfterDiscount + tax;

          return (
            <tr key={item.productId} className="border-b">
              <td className="p-2">{item.productName}</td>
              <td className="p-2 text-right">{item.quantity}</td>
              <td className="p-2 text-right">
                ${item.unitPrice.toLocaleString()}
              </td>
              <td className="p-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={item.discountPercentage || 0}
                  onChange={(e) => onDiscountChange(item.productId, e.target.value)}
                  className="w-20 px-2 py-1 border rounded text-right"
                />
              </td>
              <td className="p-2 text-right">
                ${itemSubtotal.toLocaleString()}
                {discount > 0 && (
                  <div className="text-sm text-green-600">
                    -${discount.toLocaleString()}
                  </div>
                )}
              </td>
              <td className="p-2 text-right font-semibold">
                ${total.toLocaleString()}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
```

### 2. Panel de Descuento Global

```tsx
const GlobalDiscountPanel = ({ discount, onUpdate, subtotal }) => {
  const [type, setType] = useState(discount.type);
  const [value, setValue] = useState(0);
  const [reason, setReason] = useState('');

  const handleApply = () => {
    const error = SaleValidator.validateDiscountType(type,
      type === 'percentage' ? value : undefined,
      type === 'fixed' ? value : undefined
    );

    if (error) {
      alert(error);
      return;
    }

    onUpdate(type, value, reason);
  };

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <h3 className="font-semibold mb-3">Descuento Global</h3>

      <div className="space-y-3">
        {/* Tipo de descuento */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Tipo de Descuento
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="none">Sin descuento</option>
            <option value="percentage">Porcentaje (%)</option>
            <option value="fixed">Monto fijo ($)</option>
          </select>
        </div>

        {/* Valor del descuento */}
        {type !== 'none' && (
          <div>
            <label className="block text-sm font-medium mb-1">
              {type === 'percentage' ? 'Porcentaje (%)' : 'Monto ($)'}
            </label>
            <input
              type="number"
              min="0"
              max={type === 'percentage' ? 100 : subtotal}
              step={type === 'percentage' ? 0.01 : 1}
              value={value}
              onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded"
              placeholder={type === 'percentage' ? '0-100' : '0'}
            />
          </div>
        )}

        {/* Razón del descuento */}
        {type !== 'none' && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Razón (opcional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="Ej: Cliente frecuente"
              maxLength={500}
            />
          </div>
        )}

        {/* Botón aplicar */}
        {type !== 'none' && (
          <button
            onClick={handleApply}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Aplicar Descuento
          </button>
        )}
      </div>
    </div>
  );
};
```

### 3. Resumen de Totales

```tsx
const SaleTotalsSummary = ({ calculations, globalDiscount }) => {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="font-semibold mb-3 text-lg">Resumen</h3>

      <div className="space-y-2">
        {/* Subtotal */}
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span className="font-medium">
            ${calculations.subtotal.toLocaleString('es-CO')}
          </span>
        </div>

        {/* Descuento global */}
        {globalDiscount.type !== 'none' && (
          <div className="flex justify-between text-green-600">
            <span>
              Descuento {globalDiscount.type === 'percentage'
                ? `(${globalDiscount.percentage}%)`
                : 'Fijo'}:
            </span>
            <span className="font-medium">
              -${calculations.globalDiscount.toLocaleString('es-CO')}
            </span>
          </div>
        )}

        {/* Subtotal después descuento */}
        {globalDiscount.type !== 'none' && (
          <div className="flex justify-between border-t pt-2">
            <span>Subtotal c/ Descuento:</span>
            <span className="font-medium">
              ${calculations.subtotalAfterGlobalDiscount.toLocaleString('es-CO')}
            </span>
          </div>
        )}

        {/* IVA */}
        <div className="flex justify-between">
          <span>IVA (19%):</span>
          <span className="font-medium">
            ${calculations.taxAmount.toLocaleString('es-CO')}
          </span>
        </div>

        {/* Total */}
        <div className="flex justify-between border-t-2 pt-2 text-lg">
          <span className="font-semibold">Total:</span>
          <span className="font-bold text-blue-600">
            ${calculations.total.toLocaleString('es-CO')}
          </span>
        </div>

        {/* Razón del descuento */}
        {globalDiscount.reason && (
          <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
            <span className="font-medium">Razón:</span> {globalDiscount.reason}
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## Casos de Uso

### Caso 1: Descuento por Volumen en Producto Específico

**Escenario:** Cliente compra 50 unidades de un producto, aplicar 15% de descuento solo a ese producto.

```typescript
const handleBulkDiscount = (productId: number, quantity: number) => {
  let discountPercentage = 0;

  // Lógica de descuento por volumen
  if (quantity >= 50) {
    discountPercentage = 15;
  } else if (quantity >= 20) {
    discountPercentage = 10;
  } else if (quantity >= 10) {
    discountPercentage = 5;
  }

  updateProductDiscount(productId, discountPercentage);

  // Notificar al usuario
  if (discountPercentage > 0) {
    showNotification(`¡Descuento del ${discountPercentage}% aplicado por volumen!`);
  }
};
```

### Caso 2: Cliente Frecuente - Descuento Global

**Escenario:** Cliente frecuente recibe 10% de descuento en toda la compra.

```typescript
const applyFrequentCustomerDiscount = (customer: Customer) => {
  if (customer.isPremium) {
    updateGlobalDiscount({
      type: 'percentage',
      percentage: 10,
      reason: `Cliente premium - ${customer.name}`
    });

    showNotification('Descuento de cliente premium aplicado (10%)');
  }
};
```

### Caso 3: Promoción Flash - Descuento Combinado

**Escenario:** Promoción del día: 20% en categoría "Electrónica" + 5% adicional global.

```typescript
const applyFlashPromotion = (cartItems: CartItem[]) => {
  // Aplicar descuento por categoría
  cartItems.forEach(item => {
    if (item.category === 'Electrónica') {
      updateProductDiscount(item.productId, 20);
    }
  });

  // Aplicar descuento global adicional
  updateGlobalDiscount({
    type: 'percentage',
    percentage: 5,
    reason: 'Promoción Flash del Día'
  });

  showNotification('¡Promoción Flash aplicada! 20% en Electrónica + 5% adicional');
};
```

### Caso 4: Negociación Manual

**Escenario:** Vendedor negocia descuento fijo de $50,000 en compra grande.

```tsx
const NegotiationModal = ({ subtotal, onApply }) => {
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState('');

  const handleApply = () => {
    if (amount > subtotal) {
      alert('El descuento no puede ser mayor al subtotal');
      return;
    }

    onApply({
      type: 'fixed',
      amount,
      reason: `Negociación: ${reason}`
    });

    closeModal();
  };

  return (
    <div className="modal">
      <h2>Negociar Descuento</h2>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(parseFloat(e.target.value))}
        placeholder="Monto del descuento"
      />
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Razón de la negociación"
      />
      <button onClick={handleApply}>Aplicar Descuento</button>
    </div>
  );
};
```

---

## Manejo de Errores

### Errores Comunes de la API

```typescript
interface APIError {
  statusCode: number;
  message: string | string[];
  error: string;
}

const handleSaleCreationError = (error: APIError) => {
  if (error.statusCode === 400) {
    // Errores de validación
    if (Array.isArray(error.message)) {
      error.message.forEach(msg => {
        if (msg.includes('Discount percentage')) {
          showFieldError('discountPercentage', 'Porcentaje de descuento inválido (0-100)');
        }
        if (msg.includes('Discount amount')) {
          showFieldError('discountAmount', 'Monto de descuento inválido (debe ser >= 0)');
        }
        if (msg.includes('details')) {
          showFieldError('details', 'Error en detalles de productos');
        }
      });
    } else {
      showError(error.message);
    }
  } else if (error.statusCode === 404) {
    showError('Producto, cliente o almacén no encontrado');
  } else if (error.statusCode === 409) {
    showError('Inventario insuficiente para completar la venta');
  } else {
    showError('Error al crear la venta. Intente nuevamente.');
  }
};
```

### Validación Preventiva

```typescript
const validateBeforeSubmit = (
  cartItems: CartItem[],
  globalDiscount: GlobalDiscount
): string[] => {
  const errors: string[] = [];

  // Validar carrito no vacío
  if (cartItems.length === 0) {
    errors.push('Debe agregar al menos un producto');
  }

  // Validar descuentos por producto
  cartItems.forEach((item, index) => {
    if (item.discountPercentage < 0 || item.discountPercentage > 100) {
      errors.push(`Producto ${index + 1}: descuento inválido (${item.discountPercentage}%)`);
    }
  });

  // Validar descuento global
  if (globalDiscount.type === 'percentage') {
    if (globalDiscount.percentage < 0 || globalDiscount.percentage > 100) {
      errors.push('Descuento porcentual global inválido');
    }
  } else if (globalDiscount.type === 'fixed') {
    const subtotal = cartItems.reduce((sum, item) =>
      sum + (item.quantity * item.unitPrice), 0
    );
    if (globalDiscount.amount < 0 || globalDiscount.amount > subtotal) {
      errors.push('Descuento fijo global inválido');
    }
  }

  return errors;
};

// Uso antes de enviar
const handleSubmit = async () => {
  const errors = validateBeforeSubmit(cartItems, globalDiscount);

  if (errors.length > 0) {
    showErrors(errors);
    return;
  }

  try {
    await createSale(cartItems, globalDiscount);
    showSuccess('Venta creada exitosamente');
  } catch (error) {
    handleSaleCreationError(error);
  }
};
```

---

## Ejemplos Completos

### Ejemplo 1: Componente React Completo

```tsx
import React, { useState, useMemo } from 'react';
import axios from 'axios';

const SaleCreation = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState({
    type: 'none' as const,
    percentage: 0,
    amount: 0,
    reason: ''
  });
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Cálculos automáticos
  const calculations = useMemo(() => {
    return calculateSaleTotals(cartItems, globalDiscount);
  }, [cartItems, globalDiscount]);

  // Actualizar descuento de producto
  const handleProductDiscountChange = (productId: number, value: string) => {
    const discountPercentage = parseFloat(value) || 0;

    if (discountPercentage < 0 || discountPercentage > 100) {
      alert('El descuento debe estar entre 0% y 100%');
      return;
    }

    setCartItems(items =>
      items.map(item =>
        item.productId === productId
          ? { ...item, discountPercentage }
          : item
      )
    );
  };

  // Actualizar descuento global
  const handleGlobalDiscountChange = (
    type: string,
    value: number,
    reason: string
  ) => {
    setGlobalDiscount({
      type: type as 'none' | 'percentage' | 'fixed',
      percentage: type === 'percentage' ? value : 0,
      amount: type === 'fixed' ? value : 0,
      reason
    });
  };

  // Crear venta
  const handleCreateSale = async () => {
    const errors = validateBeforeSubmit(cartItems, globalDiscount);

    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    if (!customerId) {
      alert('Debe seleccionar un cliente');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        saleType: 'invoice',
        customerId,
        discountType: globalDiscount.type,
        discountPercentage: globalDiscount.type === 'percentage'
          ? globalDiscount.percentage
          : undefined,
        discountAmount: globalDiscount.type === 'fixed'
          ? globalDiscount.amount
          : undefined,
        discountReason: globalDiscount.reason || undefined,
        details: cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercentage: item.discountPercentage || undefined
        }))
      };

      const response = await axios.post('/api/v1/sales', payload, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      alert(`Venta creada: ${response.data.saleNumber}`);
      // Limpiar formulario
      setCartItems([]);
      setGlobalDiscount({ type: 'none', percentage: 0, amount: 0, reason: '' });

    } catch (error: any) {
      handleSaleCreationError(error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Crear Venta</h1>

      {/* Tabla de productos */}
      <SaleProductsTable
        cartItems={cartItems}
        onDiscountChange={handleProductDiscountChange}
      />

      <div className="grid grid-cols-2 gap-6 mt-6">
        {/* Panel de descuento global */}
        <GlobalDiscountPanel
          discount={globalDiscount}
          onUpdate={handleGlobalDiscountChange}
          subtotal={calculations.subtotal}
        />

        {/* Resumen de totales */}
        <SaleTotalsSummary
          calculations={calculations}
          globalDiscount={globalDiscount}
        />
      </div>

      {/* Botón crear */}
      <button
        onClick={handleCreateSale}
        disabled={loading || cartItems.length === 0}
        className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg
                   hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? 'Creando...' : 'Crear Venta'}
      </button>
    </div>
  );
};

export default SaleCreation;
```

### Ejemplo 2: Servicio API (Axios)

```typescript
import axios, { AxiosInstance } from 'axios';

class SaleAPI {
  private client: AxiosInstance;

  constructor(baseURL: string, getToken: () => string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Interceptor para agregar token
    this.client.interceptors.request.use(config => {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async createSale(data: CreateSaleRequest): Promise<Sale> {
    const response = await this.client.post<Sale>('/sales', data);
    return response.data;
  }

  async updateSale(id: number, data: UpdateSaleRequest): Promise<Sale> {
    const response = await this.client.put<Sale>(`/sales/${id}`, data);
    return response.data;
  }

  async getSale(id: number): Promise<Sale> {
    const response = await this.client.get<Sale>(`/sales/${id}`);
    return response.data;
  }
}

// Uso
const saleAPI = new SaleAPI(
  'http://localhost:3000/api/v1',
  () => localStorage.getItem('token') || ''
);

// Crear venta con descuentos
const newSale = await saleAPI.createSale({
  saleType: 'invoice',
  customerId: 1,
  discountType: 'percentage',
  discountPercentage: 10,
  discountReason: 'Cliente frecuente',
  details: [
    {
      productId: 1,
      quantity: 2,
      unitPrice: 100000,
      discountPercentage: 5
    }
  ]
});
```

### Ejemplo 3: Formulario Vue 3

```vue
<template>
  <div class="sale-creation">
    <h1>Crear Venta</h1>

    <!-- Tabla de productos -->
    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th>Cantidad</th>
          <th>Precio</th>
          <th>Descuento %</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in cartItems" :key="item.productId">
          <td>{{ item.productName }}</td>
          <td>{{ item.quantity }}</td>
          <td>${{ item.unitPrice.toLocaleString() }}</td>
          <td>
            <input
              type="number"
              v-model.number="item.discountPercentage"
              @change="validateDiscount(item)"
              min="0"
              max="100"
              step="0.01"
            />
          </td>
          <td>${{ calculateItemTotal(item).toLocaleString() }}</td>
        </tr>
      </tbody>
    </table>

    <!-- Descuento global -->
    <div class="global-discount">
      <h3>Descuento Global</h3>
      <select v-model="globalDiscount.type">
        <option value="none">Sin descuento</option>
        <option value="percentage">Porcentaje</option>
        <option value="fixed">Monto fijo</option>
      </select>

      <input
        v-if="globalDiscount.type === 'percentage'"
        type="number"
        v-model.number="globalDiscount.percentage"
        placeholder="Porcentaje (0-100)"
      />

      <input
        v-if="globalDiscount.type === 'fixed'"
        type="number"
        v-model.number="globalDiscount.amount"
        placeholder="Monto"
      />

      <input
        v-if="globalDiscount.type !== 'none'"
        type="text"
        v-model="globalDiscount.reason"
        placeholder="Razón del descuento"
      />
    </div>

    <!-- Totales -->
    <div class="totals">
      <div>Subtotal: ${{ calculations.subtotal.toLocaleString() }}</div>
      <div v-if="globalDiscount.type !== 'none'">
        Descuento: -${{ calculations.globalDiscount.toLocaleString() }}
      </div>
      <div>IVA (19%): ${{ calculations.taxAmount.toLocaleString() }}</div>
      <div class="total">Total: ${{ calculations.total.toLocaleString() }}</div>
    </div>

    <button @click="createSale" :disabled="loading">
      {{ loading ? 'Creando...' : 'Crear Venta' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSaleAPI } from '@/composables/useSaleAPI';

const cartItems = ref<CartItem[]>([]);
const globalDiscount = ref({
  type: 'none',
  percentage: 0,
  amount: 0,
  reason: ''
});
const loading = ref(false);

const saleAPI = useSaleAPI();

const calculations = computed(() => {
  return calculateSaleTotals(cartItems.value, globalDiscount.value);
});

const calculateItemTotal = (item: CartItem) => {
  const subtotal = item.quantity * item.unitPrice;
  const discount = (subtotal * (item.discountPercentage || 0)) / 100;
  const subtotalAfterDiscount = subtotal - discount;
  const tax = (subtotalAfterDiscount * 19) / 100;
  return subtotalAfterDiscount + tax;
};

const validateDiscount = (item: CartItem) => {
  if (item.discountPercentage < 0 || item.discountPercentage > 100) {
    alert('Descuento debe estar entre 0% y 100%');
    item.discountPercentage = 0;
  }
};

const createSale = async () => {
  loading.value = true;
  try {
    await saleAPI.createSale({
      saleType: 'invoice',
      customerId: 1, // Obtener del formulario
      discountType: globalDiscount.value.type,
      discountPercentage: globalDiscount.value.percentage,
      discountAmount: globalDiscount.value.amount,
      discountReason: globalDiscount.value.reason,
      details: cartItems.value.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercentage: item.discountPercentage
      }))
    });
    alert('Venta creada exitosamente');
  } catch (error) {
    console.error('Error creating sale:', error);
    alert('Error al crear la venta');
  } finally {
    loading.value = false;
  }
};
</script>
```

---

## Notas Importantes

### ⚠️ Consideraciones de Seguridad

1. **Validación del servidor**: Siempre validar en el backend, las validaciones del frontend son solo para UX.
2. **Autorización**: Verificar que el usuario tiene permisos para aplicar descuentos.
3. **Límites de descuento**: Considerar implementar límites por rol de usuario.
4. **Auditoría**: Todos los descuentos quedan registrados en activity logs.

### 💡 Mejores Prácticas

1. **Feedback visual**: Mostrar el descuento aplicado claramente al usuario.
2. **Confirmación**: Pedir confirmación para descuentos grandes (>20%).
3. **Razón requerida**: Para descuentos superiores a cierto porcentaje, hacer la razón obligatoria.
4. **Cálculo en tiempo real**: Actualizar totales inmediatamente al cambiar descuentos.
5. **Indicadores visuales**: Usar colores para resaltar productos con descuento.

### 🔄 Actualizaciones Futuras

Características planificadas (Fase 2):
- Descuentos automáticos por eventos
- Descuentos por categoría
- Límites de descuento por rol
- Historial de descuentos por vendedor
- Descuentos apilables

---

## Soporte

Para preguntas adicionales:
- Documentación completa: `DOCUMENTACION_DESCUENTOS_MANUALES.md`
- API Reference: `http://localhost:3000/api-docs`
- Código fuente backend: `src/entities/Sale.entity.ts`, `src/services/SaleService.ts`
