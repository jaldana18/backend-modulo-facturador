# Integración Frontend - Sistema de Descuentos

## 📋 Índice

1. [Visión General](#visión-general)
2. [Tipos TypeScript](#tipos-typescript)
3. [Servicios API](#servicios-api)
4. [Hooks y Composables](#hooks-y-composables)
5. [Componentes React](#componentes-react)
6. [Componentes Vue](#componentes-vue)
7. [Validaciones del Cliente](#validaciones-del-cliente)
8. [Cálculos en Tiempo Real](#cálculos-en-tiempo-real)
9. [Ejemplos Completos](#ejemplos-completos)
10. [Casos de Uso](#casos-de-uso)

---

## Visión General

El sistema de descuentos permite aplicar:
- ✅ **Descuentos globales** a nivel de venta completa (porcentaje o fijo)
- ✅ **Descuentos por producto** a nivel de línea individual (porcentaje)
- ✅ **Descuentos combinados** (ambos tipos simultáneamente)

### Flujo de Cálculo
```
1. Calcular subtotal por producto (precio × cantidad)
2. Aplicar descuento por producto individual
3. Sumar todos los productos = subtotal venta
4. Aplicar descuento global (sobre el subtotal)
5. Calcular IVA sobre base con descuento
6. Total = base con descuento + IVA
```

---

## Tipos TypeScript

### Definiciones Base

```typescript
// types/discount.types.ts

export enum DiscountType {
  NONE = 'none',
  PERCENTAGE = 'percentage',
  FIXED = 'fixed'
}

export enum SaleType {
  QUOTE = 'quote',
  PROFORMA = 'proforma',
  INVOICE = 'invoice',
  REMISSION = 'remission',
  CREDIT_NOTE = 'credit_note'
}

export interface ProductDiscount {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxPercentage: number;
  discountPercentage: number; // 0-100
}

export interface GlobalDiscount {
  type: DiscountType;
  percentage?: number; // Si type === 'percentage', 0-100
  amount?: number;     // Si type === 'fixed', >= 0
  reason?: string;
}

export interface SaleDetail {
  productId: number;
  quantity: number;
  unitPrice: number;
  taxPercentage?: number;       // Default: 19
  discountPercentage?: number;  // 0-100
}

export interface CreateSaleRequest {
  saleType: SaleType;
  customerId: number;
  warehouseId?: number;
  taxPercentage?: number;       // Default: 19
  discountType?: DiscountType;
  discountPercentage?: number;
  discountAmount?: number;
  discountReason?: string;
  notes?: string;
  details: SaleDetail[];
}

export interface CalculatedTotals {
  subtotal: number;              // Suma de líneas sin descuento global
  productDiscounts: number;      // Total de descuentos por producto
  globalDiscount: number;        // Descuento global aplicado
  totalDiscounts: number;        // Suma de todos los descuentos
  taxableBase: number;           // Base para calcular impuestos
  taxAmount: number;             // IVA calculado
  total: number;                 // Total final a pagar
}

export interface LineItemCalculation {
  productId: number;
  subtotal: number;              // precio × cantidad
  discountAmount: number;        // Descuento aplicado
  subtotalAfterDiscount: number; // subtotal - descuento
  taxAmount: number;             // IVA de esta línea
  lineTotal: number;             // Total de esta línea
}
```

---

## Servicios API

### API Client

```typescript
// services/api/sales.service.ts

import axios from 'axios';
import { CreateSaleRequest } from '@/types/discount.types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

class SalesService {
  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Crear una nueva venta con descuentos
   */
  async createSale(saleData: CreateSaleRequest) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/sales`,
        saleData,
        { headers: this.getAuthHeaders() }
      );
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Error al crear la venta'
      };
    }
  }

  /**
   * Actualizar venta en borrador
   */
  async updateSale(saleId: number, saleData: Partial<CreateSaleRequest>) {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/sales/${saleId}`,
        saleData,
        { headers: this.getAuthHeaders() }
      );
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Error al actualizar la venta'
      };
    }
  }

  /**
   * Obtener venta por ID
   */
  async getSale(saleId: number) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/sales/${saleId}`,
        { headers: this.getAuthHeaders() }
      );
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Error al obtener la venta'
      };
    }
  }
}

export default new SalesService();
```

---

## Hooks y Composables

### React Hook - useDiscountCalculator

```typescript
// hooks/useDiscountCalculator.ts

import { useMemo } from 'react';
import { DiscountType, ProductDiscount, GlobalDiscount, CalculatedTotals, LineItemCalculation } from '@/types/discount.types';

interface UseDiscountCalculatorProps {
  products: ProductDiscount[];
  globalDiscount: GlobalDiscount;
  defaultTaxPercentage?: number;
}

export const useDiscountCalculator = ({
  products,
  globalDiscount,
  defaultTaxPercentage = 19
}: UseDiscountCalculatorProps) => {

  /**
   * Calcular totales de una línea individual
   */
  const calculateLineItem = (item: ProductDiscount): LineItemCalculation => {
    const subtotal = item.quantity * item.unitPrice;
    const discountPercentage = item.discountPercentage || 0;
    const discountAmount = (subtotal * discountPercentage) / 100;
    const subtotalAfterDiscount = subtotal - discountAmount;
    const taxPercentage = item.taxPercentage || defaultTaxPercentage;
    const taxAmount = (subtotalAfterDiscount * taxPercentage) / 100;
    const lineTotal = subtotalAfterDiscount + taxAmount;

    return {
      productId: item.productId,
      subtotal,
      discountAmount,
      subtotalAfterDiscount,
      taxAmount,
      lineTotal
    };
  };

  /**
   * Calcular totales generales
   */
  const totals = useMemo<CalculatedTotals>(() => {
    // 1. Calcular líneas individuales
    const lineCalculations = products.map(calculateLineItem);

    // 2. Sumar subtotales y descuentos por producto
    const subtotal = lineCalculations.reduce((sum, line) => sum + line.subtotal, 0);
    const productDiscounts = lineCalculations.reduce((sum, line) => sum + line.discountAmount, 0);
    const subtotalAfterProductDiscounts = subtotal - productDiscounts;

    // 3. Aplicar descuento global
    let globalDiscountAmount = 0;
    if (globalDiscount.type === DiscountType.PERCENTAGE && globalDiscount.percentage) {
      globalDiscountAmount = (subtotalAfterProductDiscounts * globalDiscount.percentage) / 100;
    } else if (globalDiscount.type === DiscountType.FIXED && globalDiscount.amount) {
      globalDiscountAmount = globalDiscount.amount;
    }

    // 4. Base imponible
    const taxableBase = subtotalAfterProductDiscounts - globalDiscountAmount;

    // 5. Calcular IVA
    const taxAmount = (taxableBase * defaultTaxPercentage) / 100;

    // 6. Total final
    const total = taxableBase + taxAmount;
    const totalDiscounts = productDiscounts + globalDiscountAmount;

    return {
      subtotal,
      productDiscounts,
      globalDiscount: globalDiscountAmount,
      totalDiscounts,
      taxableBase,
      taxAmount,
      total
    };
  }, [products, globalDiscount, defaultTaxPercentage]);

  /**
   * Calcular detalles de una línea específica
   */
  const getLineCalculation = (productId: number): LineItemCalculation | null => {
    const product = products.find(p => p.productId === productId);
    if (!product) return null;
    return calculateLineItem(product);
  };

  /**
   * Validar descuento global
   */
  const validateGlobalDiscount = (): { isValid: boolean; error?: string } => {
    if (globalDiscount.type === DiscountType.PERCENTAGE) {
      if (!globalDiscount.percentage || globalDiscount.percentage < 0 || globalDiscount.percentage > 100) {
        return { isValid: false, error: 'El porcentaje debe estar entre 0 y 100' };
      }
    } else if (globalDiscount.type === DiscountType.FIXED) {
      if (!globalDiscount.amount || globalDiscount.amount < 0) {
        return { isValid: false, error: 'El monto debe ser mayor o igual a 0' };
      }
      if (globalDiscount.amount > totals.subtotal) {
        return { isValid: false, error: 'El descuento no puede ser mayor al subtotal' };
      }
    }
    return { isValid: true };
  };

  /**
   * Validar descuento de producto
   */
  const validateProductDiscount = (discountPercentage: number): { isValid: boolean; error?: string } => {
    if (discountPercentage < 0 || discountPercentage > 100) {
      return { isValid: false, error: 'El porcentaje debe estar entre 0 y 100' };
    }
    return { isValid: true };
  };

  return {
    totals,
    getLineCalculation,
    validateGlobalDiscount,
    validateProductDiscount
  };
};
```

### Vue Composable - useDiscountCalculator

```typescript
// composables/useDiscountCalculator.ts

import { computed, ComputedRef } from 'vue';
import { DiscountType, ProductDiscount, GlobalDiscount, CalculatedTotals } from '@/types/discount.types';

export function useDiscountCalculator(
  products: ComputedRef<ProductDiscount[]>,
  globalDiscount: ComputedRef<GlobalDiscount>,
  defaultTaxPercentage = 19
) {
  const totals = computed<CalculatedTotals>(() => {
    const items = products.value;
    
    // Calcular subtotal y descuentos por producto
    let subtotal = 0;
    let productDiscounts = 0;

    items.forEach(item => {
      const lineSubtotal = item.quantity * item.unitPrice;
      const lineDiscount = (lineSubtotal * (item.discountPercentage || 0)) / 100;
      
      subtotal += lineSubtotal;
      productDiscounts += lineDiscount;
    });

    const subtotalAfterProductDiscounts = subtotal - productDiscounts;

    // Calcular descuento global
    let globalDiscountAmount = 0;
    const discount = globalDiscount.value;

    if (discount.type === DiscountType.PERCENTAGE && discount.percentage) {
      globalDiscountAmount = (subtotalAfterProductDiscounts * discount.percentage) / 100;
    } else if (discount.type === DiscountType.FIXED && discount.amount) {
      globalDiscountAmount = discount.amount;
    }

    // Base imponible
    const taxableBase = subtotalAfterProductDiscounts - globalDiscountAmount;

    // IVA
    const taxAmount = (taxableBase * defaultTaxPercentage) / 100;

    // Total
    const total = taxableBase + taxAmount;
    const totalDiscounts = productDiscounts + globalDiscountAmount;

    return {
      subtotal,
      productDiscounts,
      globalDiscount: globalDiscountAmount,
      totalDiscounts,
      taxableBase,
      taxAmount,
      total
    };
  });

  return {
    totals
  };
}
```

---

## Componentes React

### Componente de Descuento Global

```tsx
// components/GlobalDiscountSelector.tsx

import React from 'react';
import { DiscountType, GlobalDiscount } from '@/types/discount.types';

interface Props {
  discount: GlobalDiscount;
  onChange: (discount: GlobalDiscount) => void;
  disabled?: boolean;
}

export const GlobalDiscountSelector: React.FC<Props> = ({ discount, onChange, disabled = false }) => {
  const handleTypeChange = (type: DiscountType) => {
    onChange({
      type,
      percentage: type === DiscountType.PERCENTAGE ? 0 : undefined,
      amount: type === DiscountType.FIXED ? 0 : undefined,
      reason: discount.reason
    });
  };

  const handlePercentageChange = (percentage: number) => {
    onChange({ ...discount, percentage });
  };

  const handleAmountChange = (amount: number) => {
    onChange({ ...discount, amount });
  };

  const handleReasonChange = (reason: string) => {
    onChange({ ...discount, reason });
  };

  return (
    <div className="global-discount-selector">
      <div className="form-group">
        <label htmlFor="discountType">Tipo de Descuento</label>
        <select
          id="discountType"
          value={discount.type}
          onChange={(e) => handleTypeChange(e.target.value as DiscountType)}
          disabled={disabled}
          className="form-control"
        >
          <option value={DiscountType.NONE}>Sin descuento</option>
          <option value={DiscountType.PERCENTAGE}>Descuento porcentual (%)</option>
          <option value={DiscountType.FIXED}>Descuento fijo ($)</option>
        </select>
      </div>

      {discount.type === DiscountType.PERCENTAGE && (
        <div className="form-group">
          <label htmlFor="discountPercentage">Porcentaje de Descuento</label>
          <div className="input-group">
            <input
              type="number"
              id="discountPercentage"
              value={discount.percentage || 0}
              onChange={(e) => handlePercentageChange(Number(e.target.value))}
              min="0"
              max="100"
              step="0.01"
              disabled={disabled}
              className="form-control"
              placeholder="Ej: 10"
            />
            <span className="input-group-text">%</span>
          </div>
          <small className="form-text text-muted">Entre 0 y 100%</small>
        </div>
      )}

      {discount.type === DiscountType.FIXED && (
        <div className="form-group">
          <label htmlFor="discountAmount">Monto de Descuento</label>
          <div className="input-group">
            <span className="input-group-text">$</span>
            <input
              type="number"
              id="discountAmount"
              value={discount.amount || 0}
              onChange={(e) => handleAmountChange(Number(e.target.value))}
              min="0"
              step="100"
              disabled={disabled}
              className="form-control"
              placeholder="Ej: 20000"
            />
          </div>
          <small className="form-text text-muted">Monto fijo a descontar</small>
        </div>
      )}

      {discount.type !== DiscountType.NONE && (
        <div className="form-group">
          <label htmlFor="discountReason">Razón del Descuento (opcional)</label>
          <textarea
            id="discountReason"
            value={discount.reason || ''}
            onChange={(e) => handleReasonChange(e.target.value)}
            disabled={disabled}
            className="form-control"
            rows={2}
            placeholder="Ej: Cliente frecuente, Promoción especial"
          />
        </div>
      )}
    </div>
  );
};
```

### Fila de Producto con Descuento

```tsx
// components/ProductLineItem.tsx

import React from 'react';
import { ProductDiscount } from '@/types/discount.types';

interface Props {
  product: ProductDiscount;
  onQuantityChange: (quantity: number) => void;
  onDiscountChange: (discount: number) => void;
  onRemove: () => void;
  lineTotal: number;
  disabled?: boolean;
}

export const ProductLineItem: React.FC<Props> = ({
  product,
  onQuantityChange,
  onDiscountChange,
  onRemove,
  lineTotal,
  disabled = false
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const subtotal = product.quantity * product.unitPrice;
  const discountAmount = (subtotal * product.discountPercentage) / 100;

  return (
    <tr className="product-line-item">
      <td>{product.productName}</td>
      
      <td>
        <input
          type="number"
          value={product.quantity}
          onChange={(e) => onQuantityChange(Number(e.target.value))}
          min="0.01"
          step="1"
          disabled={disabled}
          className="form-control form-control-sm"
          style={{ width: '80px' }}
        />
      </td>
      
      <td className="text-end">{formatCurrency(product.unitPrice)}</td>
      
      <td className="text-end">{formatCurrency(subtotal)}</td>
      
      <td>
        <div className="input-group input-group-sm">
          <input
            type="number"
            value={product.discountPercentage}
            onChange={(e) => onDiscountChange(Number(e.target.value))}
            min="0"
            max="100"
            step="1"
            disabled={disabled}
            className="form-control"
            style={{ width: '60px' }}
          />
          <span className="input-group-text">%</span>
        </div>
        {discountAmount > 0 && (
          <small className="text-danger">-{formatCurrency(discountAmount)}</small>
        )}
      </td>
      
      <td className="text-end fw-bold">{formatCurrency(lineTotal)}</td>
      
      <td>
        <button
          onClick={onRemove}
          disabled={disabled}
          className="btn btn-sm btn-danger"
          title="Eliminar producto"
        >
          ×
        </button>
      </td>
    </tr>
  );
};
```

### Resumen de Totales

```tsx
// components/SaleTotals.tsx

import React from 'react';
import { CalculatedTotals } from '@/types/discount.types';

interface Props {
  totals: CalculatedTotals;
}

export const SaleTotals: React.FC<Props> = ({ totals }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="sale-totals">
      <table className="table table-sm">
        <tbody>
          <tr>
            <td className="text-end">Subtotal:</td>
            <td className="text-end fw-semibold">{formatCurrency(totals.subtotal)}</td>
          </tr>
          
          {totals.productDiscounts > 0 && (
            <tr className="text-success">
              <td className="text-end">Descuentos por producto:</td>
              <td className="text-end">-{formatCurrency(totals.productDiscounts)}</td>
            </tr>
          )}
          
          {totals.globalDiscount > 0 && (
            <tr className="text-success">
              <td className="text-end">Descuento global:</td>
              <td className="text-end">-{formatCurrency(totals.globalDiscount)}</td>
            </tr>
          )}
          
          {totals.totalDiscounts > 0 && (
            <tr className="table-active">
              <td className="text-end">Total descuentos:</td>
              <td className="text-end fw-bold text-success">
                -{formatCurrency(totals.totalDiscounts)}
              </td>
            </tr>
          )}
          
          <tr className="table-active">
            <td className="text-end">Base imponible:</td>
            <td className="text-end">{formatCurrency(totals.taxableBase)}</td>
          </tr>
          
          <tr>
            <td className="text-end">IVA (19%):</td>
            <td className="text-end">{formatCurrency(totals.taxAmount)}</td>
          </tr>
          
          <tr className="table-primary">
            <td className="text-end fs-5 fw-bold">TOTAL A PAGAR:</td>
            <td className="text-end fs-4 fw-bold text-primary">
              {formatCurrency(totals.total)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
```

---

## Componentes Vue

### Selector de Descuento Global (Vue)

```vue
<!-- components/GlobalDiscountSelector.vue -->

<template>
  <div class="global-discount-selector">
    <div class="form-group">
      <label for="discountType">Tipo de Descuento</label>
      <select
        id="discountType"
        v-model="localDiscount.type"
        @change="handleTypeChange"
        :disabled="disabled"
        class="form-control"
      >
        <option :value="DiscountType.NONE">Sin descuento</option>
        <option :value="DiscountType.PERCENTAGE">Descuento porcentual (%)</option>
        <option :value="DiscountType.FIXED">Descuento fijo ($)</option>
      </select>
    </div>

    <div v-if="localDiscount.type === DiscountType.PERCENTAGE" class="form-group">
      <label for="discountPercentage">Porcentaje de Descuento</label>
      <div class="input-group">
        <input
          type="number"
          id="discountPercentage"
          v-model.number="localDiscount.percentage"
          @input="emitChange"
          min="0"
          max="100"
          step="0.01"
          :disabled="disabled"
          class="form-control"
          placeholder="Ej: 10"
        />
        <span class="input-group-text">%</span>
      </div>
      <small class="form-text text-muted">Entre 0 y 100%</small>
    </div>

    <div v-if="localDiscount.type === DiscountType.FIXED" class="form-group">
      <label for="discountAmount">Monto de Descuento</label>
      <div class="input-group">
        <span class="input-group-text">$</span>
        <input
          type="number"
          id="discountAmount"
          v-model.number="localDiscount.amount"
          @input="emitChange"
          min="0"
          step="100"
          :disabled="disabled"
          class="form-control"
          placeholder="Ej: 20000"
        />
      </div>
      <small class="form-text text-muted">Monto fijo a descontar</small>
    </div>

    <div v-if="localDiscount.type !== DiscountType.NONE" class="form-group">
      <label for="discountReason">Razón del Descuento (opcional)</label>
      <textarea
        id="discountReason"
        v-model="localDiscount.reason"
        @input="emitChange"
        :disabled="disabled"
        class="form-control"
        rows="2"
        placeholder="Ej: Cliente frecuente, Promoción especial"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { DiscountType, GlobalDiscount } from '@/types/discount.types';

interface Props {
  discount: GlobalDiscount;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
});

const emit = defineEmits<{
  (e: 'update:discount', value: GlobalDiscount): void;
}>();

const localDiscount = ref<GlobalDiscount>({ ...props.discount });

watch(() => props.discount, (newDiscount) => {
  localDiscount.value = { ...newDiscount };
}, { deep: true });

const handleTypeChange = () => {
  if (localDiscount.value.type === DiscountType.PERCENTAGE) {
    localDiscount.value.percentage = 0;
    localDiscount.value.amount = undefined;
  } else if (localDiscount.value.type === DiscountType.FIXED) {
    localDiscount.value.amount = 0;
    localDiscount.value.percentage = undefined;
  } else {
    localDiscount.value.percentage = undefined;
    localDiscount.value.amount = undefined;
  }
  emitChange();
};

const emitChange = () => {
  emit('update:discount', { ...localDiscount.value });
};
</script>
```

---

## Validaciones del Cliente

```typescript
// utils/discount-validators.ts

import { DiscountType, GlobalDiscount, ProductDiscount } from '@/types/discount.types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validar descuento global
 */
export function validateGlobalDiscount(discount: GlobalDiscount, subtotal: number): ValidationResult {
  const errors: string[] = [];

  if (discount.type === DiscountType.PERCENTAGE) {
    if (discount.percentage === undefined || discount.percentage === null) {
      errors.push('El porcentaje de descuento es requerido');
    } else if (discount.percentage < 0) {
      errors.push('El porcentaje no puede ser negativo');
    } else if (discount.percentage > 100) {
      errors.push('El porcentaje no puede ser mayor a 100%');
    }
  } else if (discount.type === DiscountType.FIXED) {
    if (discount.amount === undefined || discount.amount === null) {
      errors.push('El monto de descuento es requerido');
    } else if (discount.amount < 0) {
      errors.push('El monto no puede ser negativo');
    } else if (discount.amount > subtotal) {
      errors.push('El descuento no puede ser mayor al subtotal');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validar descuento por producto
 */
export function validateProductDiscount(discountPercentage: number): ValidationResult {
  const errors: string[] = [];

  if (discountPercentage < 0) {
    errors.push('El descuento no puede ser negativo');
  } else if (discountPercentage > 100) {
    errors.push('El descuento no puede ser mayor a 100%');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validar datos completos de venta
 */
export function validateSaleData(
  products: ProductDiscount[],
  globalDiscount: GlobalDiscount
): ValidationResult {
  const errors: string[] = [];

  // Validar que hay productos
  if (products.length === 0) {
    errors.push('Debe agregar al menos un producto');
  }

  // Validar productos
  products.forEach((product, index) => {
    if (product.quantity <= 0) {
      errors.push(`Producto ${index + 1}: La cantidad debe ser mayor a 0`);
    }
    if (product.unitPrice < 0) {
      errors.push(`Producto ${index + 1}: El precio no puede ser negativo`);
    }
    
    const productValidation = validateProductDiscount(product.discountPercentage);
    if (!productValidation.isValid) {
      errors.push(`Producto ${index + 1}: ${productValidation.errors.join(', ')}`);
    }
  });

  // Validar descuento global
  const subtotal = products.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
  const globalValidation = validateGlobalDiscount(globalDiscount, subtotal);
  if (!globalValidation.isValid) {
    errors.push(...globalValidation.errors);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
```

---

## Cálculos en Tiempo Real

```typescript
// utils/discount-calculator.ts

import { DiscountType, ProductDiscount, GlobalDiscount, CalculatedTotals, LineItemCalculation } from '@/types/discount.types';

/**
 * Calcular totales de una línea de producto
 */
export function calculateLineItem(
  item: ProductDiscount,
  defaultTaxPercentage = 19
): LineItemCalculation {
  const subtotal = item.quantity * item.unitPrice;
  const discountPercentage = item.discountPercentage || 0;
  const discountAmount = (subtotal * discountPercentage) / 100;
  const subtotalAfterDiscount = subtotal - discountAmount;
  const taxPercentage = item.taxPercentage || defaultTaxPercentage;
  const taxAmount = (subtotalAfterDiscount * taxPercentage) / 100;
  const lineTotal = subtotalAfterDiscount + taxAmount;

  return {
    productId: item.productId,
    subtotal,
    discountAmount,
    subtotalAfterDiscount,
    taxAmount,
    lineTotal
  };
}

/**
 * Calcular totales generales de la venta
 */
export function calculateSaleTotals(
  products: ProductDiscount[],
  globalDiscount: GlobalDiscount,
  defaultTaxPercentage = 19
): CalculatedTotals {
  // 1. Calcular líneas individuales
  const lineCalculations = products.map(p => calculateLineItem(p, defaultTaxPercentage));

  // 2. Sumar subtotales
  const subtotal = lineCalculations.reduce((sum, line) => sum + line.subtotal, 0);
  const productDiscounts = lineCalculations.reduce((sum, line) => sum + line.discountAmount, 0);
  const subtotalAfterProductDiscounts = subtotal - productDiscounts;

  // 3. Aplicar descuento global
  let globalDiscountAmount = 0;
  if (globalDiscount.type === DiscountType.PERCENTAGE && globalDiscount.percentage) {
    globalDiscountAmount = (subtotalAfterProductDiscounts * globalDiscount.percentage) / 100;
  } else if (globalDiscount.type === DiscountType.FIXED && globalDiscount.amount) {
    globalDiscountAmount = globalDiscount.amount;
  }

  // 4. Base imponible
  const taxableBase = subtotalAfterProductDiscounts - globalDiscountAmount;

  // 5. IVA
  const taxAmount = (taxableBase * defaultTaxPercentage) / 100;

  // 6. Total
  const total = taxableBase + taxAmount;
  const totalDiscounts = productDiscounts + globalDiscountAmount;

  return {
    subtotal,
    productDiscounts,
    globalDiscount: globalDiscountAmount,
    totalDiscounts,
    taxableBase,
    taxAmount,
    total
  };
}

/**
 * Formatear moneda colombiana
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Formatear porcentaje
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}
```

---

## Ejemplos Completos

### Ejemplo React: Formulario Completo de Venta

```tsx
// pages/CreateSale.tsx

import React, { useState } from 'react';
import { useDiscountCalculator } from '@/hooks/useDiscountCalculator';
import { GlobalDiscountSelector } from '@/components/GlobalDiscountSelector';
import { ProductLineItem } from '@/components/ProductLineItem';
import { SaleTotals } from '@/components/SaleTotals';
import { validateSaleData } from '@/utils/discount-validators';
import salesService from '@/services/api/sales.service';
import { DiscountType, SaleType, ProductDiscount, GlobalDiscount } from '@/types/discount.types';

export const CreateSale: React.FC = () => {
  const [saleType, setSaleType] = useState<SaleType>(SaleType.INVOICE);
  const [customerId, setCustomerId] = useState<number>(0);
  const [products, setProducts] = useState<ProductDiscount[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState<GlobalDiscount>({
    type: DiscountType.NONE
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const { totals, getLineCalculation } = useDiscountCalculator({
    products,
    globalDiscount
  });

  const handleAddProduct = (product: ProductDiscount) => {
    setProducts([...products, product]);
  };

  const handleUpdateProduct = (index: number, updates: Partial<ProductDiscount>) => {
    const updated = [...products];
    updated[index] = { ...updated[index], ...updates };
    setProducts(updated);
  };

  const handleRemoveProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar
    const validation = validateSaleData(products, globalDiscount);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      const saleData = {
        saleType,
        customerId,
        discountType: globalDiscount.type,
        discountPercentage: globalDiscount.percentage,
        discountAmount: globalDiscount.amount,
        discountReason: globalDiscount.reason,
        details: products.map(p => ({
          productId: p.productId,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          discountPercentage: p.discountPercentage
        }))
      };

      const result = await salesService.createSale(saleData);
      
      if (result.success) {
        alert('Venta creada exitosamente');
        // Redirigir o limpiar formulario
      } else {
        setErrors([result.error || 'Error desconocido']);
      }
    } catch (error) {
      setErrors(['Error al crear la venta']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Crear Venta</h1>

      {errors.length > 0 && (
        <div className="alert alert-danger">
          <ul className="mb-0">
            {errors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Selector de tipo de venta y cliente */}
        <div className="row mb-3">
          <div className="col-md-6">
            <label>Tipo de Venta</label>
            <select 
              className="form-control" 
              value={saleType}
              onChange={(e) => setSaleType(e.target.value as SaleType)}
            >
              <option value={SaleType.QUOTE}>Cotización</option>
              <option value={SaleType.INVOICE}>Factura</option>
              <option value={SaleType.PROFORMA}>Proforma</option>
            </select>
          </div>
        </div>

        {/* Lista de productos */}
        <h3>Productos</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio Unit.</th>
              <th>Subtotal</th>
              <th>Descuento</th>
              <th>Total Línea</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => {
              const lineCalc = getLineCalculation(product.productId);
              return (
                <ProductLineItem
                  key={index}
                  product={product}
                  onQuantityChange={(q) => handleUpdateProduct(index, { quantity: q })}
                  onDiscountChange={(d) => handleUpdateProduct(index, { discountPercentage: d })}
                  onRemove={() => handleRemoveProduct(index)}
                  lineTotal={lineCalc?.lineTotal || 0}
                />
              );
            })}
          </tbody>
        </table>

        {/* Descuento global */}
        <div className="row mt-4">
          <div className="col-md-6">
            <h3>Descuento Global</h3>
            <GlobalDiscountSelector
              discount={globalDiscount}
              onChange={setGlobalDiscount}
            />
          </div>

          <div className="col-md-6">
            <h3>Totales</h3>
            <SaleTotals totals={totals} />
          </div>
        </div>

        {/* Botones */}
        <div className="mt-4">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading || products.length === 0}
          >
            {loading ? 'Guardando...' : 'Crear Venta'}
          </button>
        </div>
      </form>
    </div>
  );
};
```

---

## Casos de Uso

### Caso 1: Cliente Frecuente (10% descuento global)

```typescript
const saleData = {
  saleType: 'invoice',
  customerId: 5,
  discountType: 'percentage',
  discountPercentage: 10,
  discountReason: 'Cliente frecuente - más de 10 compras',
  details: [
    { productId: 1, quantity: 2, unitPrice: 50000 },
    { productId: 2, quantity: 1, unitPrice: 75000 }
  ]
};
// Subtotal: $175,000 - 10% = $157,500 + IVA = $187,425
```

### Caso 2: Descuento por Volumen en Productos Específicos

```typescript
const saleData = {
  saleType: 'invoice',
  customerId: 8,
  details: [
    {
      productId: 10,
      quantity: 20,  // Compra por volumen
      unitPrice: 10000,
      discountPercentage: 15  // 15% por volumen
    },
    {
      productId: 11,
      quantity: 5,
      unitPrice: 25000,
      discountPercentage: 5   // 5% descuento menor
    }
  ]
};
// Producto 10: $200k - 15% = $170k
// Producto 11: $125k - 5% = $118.75k
// Total con IVA: $343,612.50
```

### Caso 3: Negociación Especial (Descuento fijo + descuentos por producto)

```typescript
const saleData = {
  saleType: 'quote',
  customerId: 12,
  discountType: 'fixed',
  discountAmount: 50000,
  discountReason: 'Negociación gerencia - Contrato anual',
  details: [
    {
      productId: 1,
      quantity: 10,
      unitPrice: 100000,
      discountPercentage: 5
    },
    {
      productId: 2,
      quantity: 5,
      unitPrice: 80000,
      discountPercentage: 3
    }
  ]
};
// Descuentos por producto: $77,000
// Subtotal: $1,423,000
// Descuento fijo: -$50,000
// Base: $1,373,000 + IVA = $1,633,870
```

---

## Notas Importantes

### ⚠️ Orden de Aplicación
1. Primero se aplican descuentos por producto
2. Luego el descuento global
3. Finalmente se calcula el IVA

### 🔒 Restricciones
- Solo ventas en estado `draft` pueden editarse
- Descuentos porcentuales: 0-100%
- Descuentos fijos: >= 0 y <= subtotal
- IVA por defecto: 19%

### 💾 Persistencia
- Todos los descuentos se guardan en BD
- Se registra quién aplicó el descuento
- Se guarda la razón del descuento
- Logs de auditoría automáticos

---

## Enlaces Relacionados

- [Backend: Documentación de Descuentos](../features/DESCUENTOS_MANUALES.md)
- [Backend: API Endpoints](../features/FRONTEND_DESCUENTOS_PRODUCTOS.md)
- [Swagger API Docs](http://localhost:3000/api-docs)

---

**Última actualización**: Enero 11, 2026
