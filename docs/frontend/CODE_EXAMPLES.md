# 🚀 Ejemplos de Código por Framework

## React (Hooks + TypeScript)

### 1. Hook Personalizado para Autenticación

```typescript
// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import jwtDecode from 'jwt-decode';

interface JWTPayload {
  userId: number;
  companyId: number;
  email: string;
  role: 'admin' | 'manager' | 'user';
  warehouseId?: number | null;
  exp: number;
}

interface User {
  userId: number;
  companyId: number;
  email: string;
  role: 'admin' | 'manager' | 'user';
  warehouseId?: number | null;
  firstName: string;
  lastName: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar token del localStorage
    const savedToken = localStorage.getItem('accessToken');
    if (savedToken) {
      try {
        const decoded = jwtDecode<JWTPayload>(savedToken);
        
        // Verificar si el token expiró
        if (decoded.exp * 1000 < Date.now()) {
          logout();
        } else {
          setToken(savedToken);
          // Cargar datos completos del usuario
          loadUserData(savedToken);
        }
      } catch (error) {
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const { success, data } = await response.json();
    
    if (success) {
      const decoded = jwtDecode<JWTPayload>(data.accessToken);
      
      setToken(data.accessToken);
      setUser({
        userId: decoded.userId,
        companyId: decoded.companyId,
        email: decoded.email,
        role: decoded.role,
        warehouseId: decoded.warehouseId,
        firstName: data.user.firstName,
        lastName: data.user.lastName
      });

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  const loadUserData = async (accessToken: string) => {
    const response = await fetch('/api/v1/auth/me', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    const { data } = await response.json();
    const decoded = jwtDecode<JWTPayload>(accessToken);
    
    setUser({
      userId: decoded.userId,
      companyId: decoded.companyId,
      email: decoded.email,
      role: decoded.role,
      warehouseId: decoded.warehouseId,
      firstName: data.firstName,
      lastName: data.lastName
    });
  };

  const canAccessWarehouse = (warehouseId: number): boolean => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'manager') return true;
    return user.warehouseId === warehouseId;
  };

  return {
    user,
    token,
    loading,
    login,
    logout,
    canAccessWarehouse,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isUser: user?.role === 'user'
  };
}
```

### 2. Hook para Operaciones de Inventario

```typescript
// hooks/useInventory.ts
import { useState } from 'react';
import { useAuth } from './useAuth';

interface CreateTransactionDto {
  productId: number;
  warehouseId?: number;
  type: 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT' | 'TRANSFER';
  reason: string;
  quantity: number;
  unitCost?: number;
  reference?: string;
  location?: string;
  notes?: string;
}

export function useInventory() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTransaction = async (data: CreateTransactionDto) => {
    setLoading(true);
    setError(null);

    // Auto-asignar warehouseId para usuarios 'user'
    if (user?.role === 'user' && !data.warehouseId) {
      data.warehouseId = user.warehouseId!;
    }

    try {
      const response = await fetch('/api/v1/inventory/transactions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const bulkInbound = async (
    warehouseId: number,
    items: Array<{ productId: number; quantity: number; unitCost?: number }>,
    reason: string,
    notes?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/inventory/bulk/inbound', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ warehouseId, items, reason, notes })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const transferStock = async (
    productId: number,
    fromWarehouseId: number,
    toWarehouseId: number,
    quantity: number,
    reference?: string,
    notes?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/inventory/transfer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId,
          fromWarehouseId,
          toWarehouseId,
          quantity,
          reference,
          notes
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getWarehousesSummary = async () => {
    const response = await fetch('/api/v1/inventory/warehouses/summary', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const { data } = await response.json();
    return data;
  };

  const getWarehouseDetail = async (warehouseId: number) => {
    const response = await fetch(
      `/api/v1/inventory/warehouses/${warehouseId}/summary`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    const { data } = await response.json();
    return data;
  };

  return {
    loading,
    error,
    createTransaction,
    bulkInbound,
    transferStock,
    getWarehousesSummary,
    getWarehouseDetail
  };
}
```

### 3. Componente de Dashboard

```typescript
// components/WarehouseDashboard.tsx
import React, { useEffect, useState } from 'react';
import { useInventory } from '../hooks/useInventory';
import { useAuth } from '../hooks/useAuth';

interface WarehouseSummary {
  warehouse: {
    id: number;
    code: string;
    name: string;
    isMain: boolean;
    address: string;
    managerName: string;
  };
  stats: {
    currentStock: number;
    totalInbound: number;
    totalOutbound: number;
    totalAdjustments: number;
    uniqueProducts: number;
    transactionCount: number;
  };
  lastActivity: {
    date: string;
    type: string;
    reason: string;
  } | null;
}

export function WarehouseDashboard() {
  const { getWarehousesSummary } = useInventory();
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<WarehouseSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getWarehousesSummary();
      setWarehouses(data);
    } catch (error) {
      console.error('Error loading warehouses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="spinner">Cargando...</div>;
  }

  const totals = warehouses.reduce(
    (acc, w) => ({
      stock: acc.stock + w.stats.currentStock,
      products: acc.products + w.stats.uniqueProducts,
      transactions: acc.transactions + w.stats.transactionCount
    }),
    { stock: 0, products: 0, transactions: 0 }
  );

  return (
    <div className="warehouse-dashboard">
      <header className="dashboard-header">
        <h1>Dashboard de Inventario</h1>
        {user && (
          <div className="user-info">
            {user.firstName} {user.lastName} ({user.role})
            {user.warehouseId && ` - Almacén asignado`}
          </div>
        )}
      </header>

      <div className="totals-summary">
        <div className="total-card">
          <h3>Stock Total</h3>
          <p className="total-value">{totals.stock.toLocaleString()}</p>
        </div>
        <div className="total-card">
          <h3>Productos Únicos</h3>
          <p className="total-value">{totals.products}</p>
        </div>
        <div className="total-card">
          <h3>Transacciones</h3>
          <p className="total-value">{totals.transactions}</p>
        </div>
      </div>

      <div className="warehouses-grid">
        {warehouses.map(w => (
          <div key={w.warehouse.id} className="warehouse-card">
            <div className="card-header">
              <h3>{w.warehouse.name}</h3>
              <span className="warehouse-code">{w.warehouse.code}</span>
              {w.warehouse.isMain && <span className="badge-main">Principal</span>}
            </div>

            <div className="warehouse-info">
              <p><strong>Gerente:</strong> {w.warehouse.managerName}</p>
              <p><strong>Dirección:</strong> {w.warehouse.address}</p>
            </div>

            <div className="stats-grid">
              <div className="stat">
                <span className="stat-label">Stock</span>
                <span className="stat-value">{w.stats.currentStock}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Productos</span>
                <span className="stat-value">{w.stats.uniqueProducts}</span>
              </div>
              <div className="stat stat-green">
                <span className="stat-label">Entradas</span>
                <span className="stat-value">+{w.stats.totalInbound}</span>
              </div>
              <div className="stat stat-red">
                <span className="stat-label">Salidas</span>
                <span className="stat-value">-{w.stats.totalOutbound}</span>
              </div>
            </div>

            {w.lastActivity && (
              <div className="last-activity">
                <strong>Última actividad:</strong>
                <p>{new Date(w.lastActivity.date).toLocaleString()}</p>
                <p>{w.lastActivity.type} - {w.lastActivity.reason}</p>
              </div>
            )}

            <button
              className="btn-details"
              onClick={() => window.location.href = `/warehouse/${w.warehouse.id}`}
            >
              Ver Detalles
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Vue 3 (Composition API + TypeScript)

### 1. Composable para Autenticación

```typescript
// composables/useAuth.ts
import { ref, computed } from 'vue';
import jwtDecode from 'jwt-decode';

interface User {
  userId: number;
  companyId: number;
  email: string;
  role: 'admin' | 'manager' | 'user';
  warehouseId?: number | null;
  firstName: string;
  lastName: string;
}

const user = ref<User | null>(null);
const token = ref<string | null>(null);

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const isManager = computed(() => user.value?.role === 'manager');
  const isUser = computed(() => user.value?.role === 'user');

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const { success, data } = await response.json();

    if (success) {
      const decoded = jwtDecode<any>(data.accessToken);

      token.value = data.accessToken;
      user.value = {
        userId: decoded.userId,
        companyId: decoded.companyId,
        email: decoded.email,
        role: decoded.role,
        warehouseId: decoded.warehouseId,
        firstName: data.user.firstName,
        lastName: data.user.lastName
      };

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      return true;
    }

    return false;
  };

  const logout = () => {
    user.value = null;
    token.value = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  const canAccessWarehouse = (warehouseId: number): boolean => {
    if (!user.value) return false;
    if (user.value.role === 'admin' || user.value.role === 'manager') return true;
    return user.value.warehouseId === warehouseId;
  };

  return {
    user: computed(() => user.value),
    token: computed(() => token.value),
    isAuthenticated,
    isAdmin,
    isManager,
    isUser,
    login,
    logout,
    canAccessWarehouse
  };
}
```

### 2. Componente de Dashboard

```vue
<!-- components/WarehouseDashboard.vue -->
<template>
  <div class="warehouse-dashboard">
    <header class="dashboard-header">
      <h1>Dashboard de Inventario</h1>
      <div v-if="user" class="user-info">
        {{ user.firstName }} {{ user.lastName }} ({{ user.role }})
      </div>
    </header>

    <div v-if="loading" class="loading">
      Cargando...
    </div>

    <template v-else>
      <div class="totals-summary">
        <div class="total-card">
          <h3>Stock Total</h3>
          <p class="total-value">{{ totals.stock.toLocaleString() }}</p>
        </div>
        <div class="total-card">
          <h3>Productos Únicos</h3>
          <p class="total-value">{{ totals.products }}</p>
        </div>
        <div class="total-card">
          <h3>Transacciones</h3>
          <p class="total-value">{{ totals.transactions }}</p>
        </div>
      </div>

      <div class="warehouses-grid">
        <div
          v-for="w in warehouses"
          :key="w.warehouse.id"
          class="warehouse-card"
        >
          <div class="card-header">
            <h3>{{ w.warehouse.name }}</h3>
            <span class="warehouse-code">{{ w.warehouse.code }}</span>
            <span v-if="w.warehouse.isMain" class="badge-main">Principal</span>
          </div>

          <div class="warehouse-info">
            <p><strong>Gerente:</strong> {{ w.warehouse.managerName }}</p>
            <p><strong>Dirección:</strong> {{ w.warehouse.address }}</p>
          </div>

          <div class="stats-grid">
            <div class="stat">
              <span class="stat-label">Stock</span>
              <span class="stat-value">{{ w.stats.currentStock }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Productos</span>
              <span class="stat-value">{{ w.stats.uniqueProducts }}</span>
            </div>
            <div class="stat stat-green">
              <span class="stat-label">Entradas</span>
              <span class="stat-value">+{{ w.stats.totalInbound }}</span>
            </div>
            <div class="stat stat-red">
              <span class="stat-label">Salidas</span>
              <span class="stat-value">-{{ w.stats.totalOutbound }}</span>
            </div>
          </div>

          <div v-if="w.lastActivity" class="last-activity">
            <strong>Última actividad:</strong>
            <p>{{ formatDate(w.lastActivity.date) }}</p>
            <p>{{ w.lastActivity.type }} - {{ w.lastActivity.reason }}</p>
          </div>

          <button
            class="btn-details"
            @click="goToWarehouse(w.warehouse.id)"
          >
            Ver Detalles
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const { user, token } = useAuth();

const warehouses = ref<any[]>([]);
const loading = ref(true);

const totals = computed(() => {
  return warehouses.value.reduce(
    (acc, w) => ({
      stock: acc.stock + w.stats.currentStock,
      products: acc.products + w.stats.uniqueProducts,
      transactions: acc.transactions + w.stats.transactionCount
    }),
    { stock: 0, products: 0, transactions: 0 }
  );
});

const loadData = async () => {
  try {
    const response = await fetch('/api/v1/inventory/warehouses/summary', {
      headers: { 'Authorization': `Bearer ${token.value}` }
    });

    const { data } = await response.json();
    warehouses.value = data;
  } catch (error) {
    console.error('Error loading warehouses:', error);
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('es-ES');
};

const goToWarehouse = (warehouseId: number) => {
  router.push(`/warehouse/${warehouseId}`);
};

onMounted(() => {
  loadData();
});
</script>
```

---

## Angular (Standalone Components)

### 1. Servicio de Autenticación

```typescript
// services/auth.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import jwtDecode from 'jwt-decode';
import { firstValueFrom } from 'rxjs';

interface User {
  userId: number;
  companyId: number;
  email: string;
  role: 'admin' | 'manager' | 'user';
  warehouseId?: number | null;
  firstName: string;
  lastName: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSignal = signal<User | null>(null);
  private tokenSignal = signal<string | null>(null);

  user = this.userSignal.asReadonly();
  token = this.tokenSignal.asReadonly();
  isAuthenticated = computed(() => !!this.userSignal());
  isAdmin = computed(() => this.userSignal()?.role === 'admin');
  isManager = computed(() => this.userSignal()?.role === 'manager');
  isUser = computed(() => this.userSignal()?.role === 'user');

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadTokenFromStorage();
  }

  private loadTokenFromStorage() {
    const savedToken = localStorage.getItem('accessToken');
    if (savedToken) {
      try {
        const decoded = jwtDecode<any>(savedToken);
        
        if (decoded.exp * 1000 < Date.now()) {
          this.logout();
        } else {
          this.tokenSignal.set(savedToken);
          this.loadUserData();
        }
      } catch (error) {
        this.logout();
      }
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      const response: any = await firstValueFrom(
        this.http.post('/api/v1/auth/login', { email, password })
      );

      if (response.success) {
        const decoded = jwtDecode<any>(response.data.accessToken);

        this.tokenSignal.set(response.data.accessToken);
        this.userSignal.set({
          userId: decoded.userId,
          companyId: decoded.companyId,
          email: decoded.email,
          role: decoded.role,
          warehouseId: decoded.warehouseId,
          firstName: response.data.user.firstName,
          lastName: response.data.user.lastName
        });

        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);

        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  logout() {
    this.userSignal.set(null);
    this.tokenSignal.set(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.router.navigate(['/login']);
  }

  async loadUserData() {
    const response: any = await firstValueFrom(
      this.http.get('/api/v1/auth/me')
    );

    const decoded = jwtDecode<any>(this.tokenSignal()!);

    this.userSignal.set({
      userId: decoded.userId,
      companyId: decoded.companyId,
      email: decoded.email,
      role: decoded.role,
      warehouseId: decoded.warehouseId,
      firstName: response.data.firstName,
      lastName: response.data.lastName
    });
  }

  canAccessWarehouse(warehouseId: number): boolean {
    const user = this.userSignal();
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'manager') return true;
    return user.warehouseId === warehouseId;
  }
}
```

### 2. Servicio de Inventario

```typescript
// services/inventory.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  constructor(private http: HttpClient) {}

  async createTransaction(data: any) {
    return firstValueFrom(
      this.http.post('/api/v1/inventory/transactions', data)
    );
  }

  async bulkInbound(
    warehouseId: number,
    items: any[],
    reason: string,
    notes?: string
  ) {
    return firstValueFrom(
      this.http.post('/api/v1/inventory/bulk/inbound', {
        warehouseId,
        items,
        reason,
        notes
      })
    );
  }

  async transferStock(
    productId: number,
    fromWarehouseId: number,
    toWarehouseId: number,
    quantity: number,
    reference?: string,
    notes?: string
  ) {
    return firstValueFrom(
      this.http.post('/api/v1/inventory/transfer', {
        productId,
        fromWarehouseId,
        toWarehouseId,
        quantity,
        reference,
        notes
      })
    );
  }

  async getWarehousesSummary() {
    const response: any = await firstValueFrom(
      this.http.get('/api/v1/inventory/warehouses/summary')
    );
    return response.data;
  }

  async getWarehouseDetail(warehouseId: number) {
    const response: any = await firstValueFrom(
      this.http.get(`/api/v1/inventory/warehouses/${warehouseId}/summary`)
    );
    return response.data;
  }
}
```

### 3. Componente de Dashboard

```typescript
// components/warehouse-dashboard.component.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { InventoryService } from '../services/inventory.service';

@Component({
  selector: 'app-warehouse-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="warehouse-dashboard">
      <header class="dashboard-header">
        <h1>Dashboard de Inventario</h1>
        <div class="user-info" *ngIf="authService.user()">
          {{ authService.user()!.firstName }} {{ authService.user()!.lastName }}
          ({{ authService.user()!.role }})
        </div>
      </header>

      <div *ngIf="loading()" class="loading">Cargando...</div>

      <ng-container *ngIf="!loading()">
        <div class="totals-summary">
          <div class="total-card">
            <h3>Stock Total</h3>
            <p class="total-value">{{ totals().stock | number }}</p>
          </div>
          <div class="total-card">
            <h3>Productos Únicos</h3>
            <p class="total-value">{{ totals().products }}</p>
          </div>
          <div class="total-card">
            <h3>Transacciones</h3>
            <p class="total-value">{{ totals().transactions }}</p>
          </div>
        </div>

        <div class="warehouses-grid">
          <div
            *ngFor="let w of warehouses()"
            class="warehouse-card"
          >
            <div class="card-header">
              <h3>{{ w.warehouse.name }}</h3>
              <span class="warehouse-code">{{ w.warehouse.code }}</span>
              <span *ngIf="w.warehouse.isMain" class="badge-main">Principal</span>
            </div>

            <div class="warehouse-info">
              <p><strong>Gerente:</strong> {{ w.warehouse.managerName }}</p>
              <p><strong>Dirección:</strong> {{ w.warehouse.address }}</p>
            </div>

            <div class="stats-grid">
              <div class="stat">
                <span class="stat-label">Stock</span>
                <span class="stat-value">{{ w.stats.currentStock }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Productos</span>
                <span class="stat-value">{{ w.stats.uniqueProducts }}</span>
              </div>
              <div class="stat stat-green">
                <span class="stat-label">Entradas</span>
                <span class="stat-value">+{{ w.stats.totalInbound }}</span>
              </div>
              <div class="stat stat-red">
                <span class="stat-label">Salidas</span>
                <span class="stat-value">-{{ w.stats.totalOutbound }}</span>
              </div>
            </div>

            <div *ngIf="w.lastActivity" class="last-activity">
              <strong>Última actividad:</strong>
              <p>{{ w.lastActivity.date | date:'short' }}</p>
              <p>{{ w.lastActivity.type }} - {{ w.lastActivity.reason }}</p>
            </div>

            <button
              class="btn-details"
              (click)="goToWarehouse(w.warehouse.id)"
            >
              Ver Detalles
            </button>
          </div>
        </div>
      </ng-container>
    </div>
  `
})
export class WarehouseDashboardComponent implements OnInit {
  warehouses = signal<any[]>([]);
  loading = signal(true);

  totals = computed(() => {
    return this.warehouses().reduce(
      (acc, w) => ({
        stock: acc.stock + w.stats.currentStock,
        products: acc.products + w.stats.uniqueProducts,
        transactions: acc.transactions + w.stats.transactionCount
      }),
      { stock: 0, products: 0, transactions: 0 }
    );
  });

  constructor(
    public authService: AuthService,
    private inventoryService: InventoryService
  ) {}

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    try {
      const data = await this.inventoryService.getWarehousesSummary();
      this.warehouses.set(data);
    } catch (error) {
      console.error('Error loading warehouses:', error);
    } finally {
      this.loading.set(false);
    }
  }

  goToWarehouse(warehouseId: number) {
    // Navegar a detalle del almacén
  }
}
```

---

## Resumen de Patrones Comunes

### 1. Interceptor HTTP (para agregar token automáticamente)

```typescript
// React/Axios
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Angular
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
  return next(req);
};
```

### 2. Manejo de Errores

```typescript
async function apiCall() {
  try {
    const response = await fetch(url, options);
    const result = await response.json();

    if (!result.success) {
      switch (result.error.code) {
        case 'WAREHOUSE_ACCESS_DENIED':
          alert('No tienes acceso a este almacén');
          break;
        case 'INSUFFICIENT_STOCK':
          alert('Stock insuficiente');
          break;
        case 'TOKEN_EXPIRED':
          // Refresh token
          await refreshToken();
          break;
        default:
          alert(result.error.message);
      }
    }

    return result;
  } catch (error) {
    console.error('Error en llamada API:', error);
    throw error;
  }
}
```

### 3. Guard de Rutas

```typescript
// React Router
function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" />;
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
}

// Vue Router
router.beforeEach((to, from, next) => {
  const { user } = useAuth();

  if (to.meta.requiresAuth && !user.value) {
    next('/login');
  } else if (to.meta.role && user.value?.role !== to.meta.role) {
    next('/unauthorized');
  } else {
    next();
  }
});

// Angular
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  const requiredRole = route.data['role'];
  if (requiredRole && authService.user()?.role !== requiredRole) {
    router.navigate(['/unauthorized']);
    return false;
  }

  return true;
};
```
