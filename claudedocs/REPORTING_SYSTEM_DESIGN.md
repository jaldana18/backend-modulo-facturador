# Sistema de Reportería - Diseño Técnico Completo

## 📋 Tabla de Contenidos
1. [Visión General](#visión-general)
2. [Análisis de Datos Existentes](#análisis-de-datos-existentes)
3. [Modelo de Datos para Reportería](#modelo-de-datos-para-reportería)
4. [Arquitectura del Sistema](#arquitectura-del-sistema)
5. [API Endpoints](#api-endpoints)
6. [Servicios de Analytics](#servicios-de-analytics)
7. [Frontend - Visualizaciones](#frontend---visualizaciones)
8. [Plan de Implementación](#plan-de-implementación)

---

## 🎯 Visión General

### Objetivos del Sistema
- **Análisis de Ventas**: Visualización de ventas por período (día, semana, mes, año)
- **Productos Más Vendidos**: Ranking de productos por cantidad y valor
- **Tendencias Temporales**: Línea de tiempo anual con comparativas
- **Análisis por Categoría**: Performance de categorías de productos
- **Métricas de Inventario**: Rotación, stock crítico, valor del inventario
- **Dashboard Ejecutivo**: KPIs principales y alertas

### Capacidades Requeridas
1. ✅ Consultas agregadas eficientes
2. ✅ Caché de datos calculados
3. ✅ Exportación de reportes (PDF, Excel)
4. ✅ Filtros dinámicos (fecha, categoría, producto, almacén)
5. ✅ Actualización en tiempo real (opcional)
6. ✅ Multi-tenancy (por compañía)

---

## 📊 Análisis de Datos Existentes

### Entidades Disponibles

#### 1. **InventoryTransaction** (Transacciones de Inventario)
```typescript
- id: number
- companyId: number
- productId: number
- userId: number
- warehouseId: number | null
- type: TransactionType (inbound, outbound, adjustment, transfer)
- reason: TransactionReason (purchase, sale, return, damaged, etc.)
- quantity: decimal(18,4)
- previousStock: decimal(18,4)
- newStock: decimal(18,4)
- unitCost: decimal(18,4) | null
- totalCost: decimal(18,4) | null
- reference: string | null
- notes: string | null
- createdAt: Date
```

**Casos de Uso para Reportería:**
- Ventas: `type = 'outbound' AND reason = 'sale'`
- Compras: `type = 'inbound' AND reason = 'purchase'`
- Valor de transacciones: `totalCost`
- Análisis temporal: `createdAt`

#### 2. **Product** (Productos)
```typescript
- id: number
- companyId: number
- sku: string
- name: string
- categoryId: number | null
- cost: number (encriptado)
- price: number (encriptado)
- minimumStock: decimal(18,4)
- reorderPoint: decimal(18,4)
- isActive: boolean
```

**Métricas Calculables:**
- Margen de ganancia: `(price - cost) / cost * 100`
- Stock actual: Agregación de transacciones
- Valor de inventario: `stock * cost`

#### 3. **Category** (Categorías)
```typescript
- id: number
- companyId: number
- name: string
- parentId: number | null (jerárquico)
```

**Agregaciones por Categoría:**
- Ventas totales por categoría
- Productos más vendidos por categoría
- Performance de subcategorías

### Índices Existentes Relevantes
```sql
-- Optimizados para reportería
INDEX idx_company_product ON inventory_transactions(companyId, productId)
INDEX idx_company_type ON inventory_transactions(companyId, type)
INDEX idx_company_date ON inventory_transactions(companyId, createdAt)
```

---

## 🗄️ Modelo de Datos para Reportería

### Opción 1: Vistas Materializadas (Recomendado)

#### Vista: `sales_summary_daily`
```sql
CREATE VIEW sales_summary_daily AS
SELECT
  company_id,
  product_id,
  CAST(created_at AS DATE) as sale_date,
  COUNT(*) as transaction_count,
  SUM(ABS(quantity)) as total_quantity,
  SUM(total_cost) as total_revenue,
  AVG(unit_cost) as avg_unit_price
FROM inventory_transactions
WHERE type = 'outbound'
  AND reason = 'sale'
  AND total_cost IS NOT NULL
GROUP BY company_id, product_id, CAST(created_at AS DATE);
```

#### Vista: `product_performance`
```sql
CREATE VIEW product_performance AS
SELECT
  p.id as product_id,
  p.company_id,
  p.name,
  p.sku,
  p.category_id,
  c.name as category_name,
  COUNT(it.id) as total_transactions,
  SUM(CASE WHEN it.type = 'outbound' AND it.reason = 'sale'
      THEN ABS(it.quantity) ELSE 0 END) as total_sold,
  SUM(CASE WHEN it.type = 'outbound' AND it.reason = 'sale'
      THEN it.total_cost ELSE 0 END) as total_revenue,
  MAX(it.created_at) as last_sale_date
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN inventory_transactions it ON p.id = it.product_id
GROUP BY p.id, p.company_id, p.name, p.sku, p.category_id, c.name;
```

### Opción 2: Tablas de Agregación (Para gran volumen)

#### Tabla: `sales_aggregates`
```typescript
@Entity('sales_aggregates')
@Index(['companyId', 'aggregateDate'])
@Index(['companyId', 'productId', 'aggregateDate'])
export class SalesAggregate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'product_id' })
  productId: number;

  @Column({ name: 'category_id', nullable: true })
  categoryId: number | null;

  @Column({ type: 'date', name: 'aggregate_date' })
  aggregateDate: Date;

  @Column({ name: 'period_type' }) // 'day', 'week', 'month', 'year'
  periodType: string;

  @Column({ type: 'int', default: 0 })
  transactionCount: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  totalQuantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  totalRevenue: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  totalCost: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  totalProfit: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  avgUnitPrice: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

#### Tabla: `inventory_snapshots`
```typescript
@Entity('inventory_snapshots')
@Index(['companyId', 'snapshotDate'])
export class InventorySnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'product_id' })
  productId: number;

  @Column({ name: 'warehouse_id', nullable: true })
  warehouseId: number | null;

  @Column({ type: 'date', name: 'snapshot_date' })
  snapshotDate: Date;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  stockQuantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  stockValue: number; // quantity * unit_cost

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  unitCost: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

---

## 🏗️ Arquitectura del Sistema

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Dashboard   │  │   Reports    │  │   Charts     │  │
│  │  Components  │  │   Generator  │  │   Library    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────┬───────────────────────────────────┘
                      │ REST API
┌─────────────────────┴───────────────────────────────────┐
│                  API LAYER                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Analytics Controller                      │  │
│  │  - /analytics/sales                               │  │
│  │  - /analytics/products/top-selling                │  │
│  │  - /analytics/timeline                            │  │
│  │  - /analytics/categories                          │  │
│  │  - /analytics/inventory                           │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────┐
│              SERVICE LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Sales      │  │   Product    │  │  Inventory   │  │
│  │  Analytics   │  │  Analytics   │  │  Analytics   │  │
│  │   Service    │  │   Service    │  │   Service    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Aggregation  │  │    Cache     │  │   Export     │  │
│  │   Service    │  │   Service    │  │   Service    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────┐
│              DATA LAYER                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Transactions │  │   Products   │  │ Aggregates   │  │
│  │ Repository   │  │  Repository  │  │ Repository   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │   SQL Views  │  │ Redis Cache  │                    │
│  └──────────────┘  └──────────────┘                    │
└──────────────────────────────────────────────────────────┘
```

### Flujo de Datos

```
1. Usuario Request → API Controller
2. Controller → Analytics Service
3. Service → Check Cache (Redis)
   ├─ Hit: Return cached data
   └─ Miss: Query Database
4. Service → Repository (Query Builder)
5. Repository → SQL Views / Aggregate Tables
6. Service → Cache Result (if cacheable)
7. Service → Transform Data
8. Controller → Response (JSON)
```

---

## 🔌 API Endpoints

### Base Path: `/api/v1/analytics`

#### 1. **Dashboard General**
```typescript
GET /analytics/dashboard
Query Params:
  - startDate?: string (ISO date)
  - endDate?: string (ISO date)
  - warehouseId?: number

Response:
{
  "totalSales": {
    "amount": 125000.50,
    "count": 450,
    "percentageChange": 12.5 // vs período anterior
  },
  "topProducts": [
    {
      "productId": 123,
      "name": "Laptop Dell XPS",
      "quantitySold": 45,
      "revenue": 67500
    }
  ],
  "categoriesPerformance": [
    {
      "categoryId": 5,
      "name": "Electrónicos",
      "revenue": 89000,
      "percentageOfTotal": 71.2
    }
  ],
  "lowStockAlerts": [
    {
      "productId": 89,
      "name": "Mouse Logitech",
      "currentStock": 5,
      "minimumStock": 10
    }
  ],
  "recentTransactions": 50,
  "inventoryValue": 450000
}
```

#### 2. **Ventas - Análisis Temporal**
```typescript
GET /analytics/sales/timeline
Query Params:
  - startDate: string (ISO date) *required*
  - endDate: string (ISO date) *required*
  - granularity: 'day' | 'week' | 'month' | 'year'
  - categoryId?: number
  - productId?: number
  - warehouseId?: number

Response:
{
  "data": [
    {
      "date": "2024-01-01",
      "totalSales": 5670.50,
      "transactionCount": 23,
      "totalQuantity": 156,
      "avgTicket": 246.54
    },
    {
      "date": "2024-01-02",
      "totalSales": 6120.00,
      "transactionCount": 28,
      "totalQuantity": 189,
      "avgTicket": 218.57
    }
  ],
  "summary": {
    "total": 125450.00,
    "average": 5977.38,
    "highest": 8950.00,
    "lowest": 2340.00
  }
}
```

#### 3. **Productos Más Vendidos**
```typescript
GET /analytics/products/top-selling
Query Params:
  - startDate?: string
  - endDate?: string
  - limit?: number (default: 10)
  - sortBy?: 'quantity' | 'revenue' (default: 'revenue')
  - categoryId?: number

Response:
{
  "data": [
    {
      "rank": 1,
      "productId": 123,
      "sku": "LAP-DELL-XPS-001",
      "name": "Laptop Dell XPS 15",
      "categoryName": "Electrónicos",
      "quantitySold": 45,
      "revenue": 67500.00,
      "transactionCount": 45,
      "avgUnitPrice": 1500.00,
      "profitMargin": 22.5
    }
  ],
  "totalProducts": 10,
  "periodStart": "2024-01-01",
  "periodEnd": "2024-12-31"
}
```

#### 4. **Análisis por Categoría**
```typescript
GET /analytics/categories/performance
Query Params:
  - startDate?: string
  - endDate?: string
  - includeSubcategories?: boolean (default: true)

Response:
{
  "data": [
    {
      "categoryId": 5,
      "name": "Electrónicos",
      "parentCategory": null,
      "revenue": 89000.00,
      "quantity": 234,
      "transactionCount": 180,
      "percentageOfTotal": 71.2,
      "topProduct": {
        "id": 123,
        "name": "Laptop Dell XPS",
        "revenue": 45000
      },
      "subcategories": [
        {
          "categoryId": 12,
          "name": "Laptops",
          "revenue": 56000
        }
      ]
    }
  ]
}
```

#### 5. **Comparativa de Períodos**
```typescript
GET /analytics/sales/comparison
Query Params:
  - period1Start: string *required*
  - period1End: string *required*
  - period2Start: string *required*
  - period2End: string *required*
  - metric: 'revenue' | 'quantity' | 'transactions'

Response:
{
  "period1": {
    "start": "2024-01-01",
    "end": "2024-06-30",
    "value": 125000,
    "label": "H1 2024"
  },
  "period2": {
    "start": "2023-01-01",
    "end": "2023-06-30",
    "value": 98000,
    "label": "H1 2023"
  },
  "comparison": {
    "absoluteChange": 27000,
    "percentageChange": 27.55,
    "trend": "up"
  }
}
```

#### 6. **Estado de Inventario**
```typescript
GET /analytics/inventory/status
Query Params:
  - warehouseId?: number
  - categoryId?: number
  - stockLevel?: 'all' | 'low' | 'critical' | 'overstock'

Response:
{
  "summary": {
    "totalProducts": 450,
    "totalValue": 450000.00,
    "lowStockCount": 23,
    "criticalStockCount": 5,
    "overstockCount": 12
  },
  "products": [
    {
      "productId": 89,
      "name": "Mouse Logitech",
      "currentStock": 5,
      "minimumStock": 10,
      "reorderPoint": 15,
      "status": "critical",
      "daysUntilStockout": 3,
      "recommendedOrderQuantity": 25
    }
  ]
}
```

#### 7. **Exportación de Reportes**
```typescript
POST /analytics/export
Body:
{
  "reportType": "sales_timeline" | "top_products" | "inventory_status",
  "format": "pdf" | "excel" | "csv",
  "filters": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "categoryId": 5
  },
  "options": {
    "includeCharts": true,
    "includeDetails": true
  }
}

Response:
{
  "downloadUrl": "https://api.example.com/downloads/report-uuid.pdf",
  "expiresAt": "2024-12-25T23:59:59Z",
  "fileSize": 524288
}
```

---

## 🔧 Servicios de Analytics

### 1. **SalesAnalyticsService**

```typescript
export class SalesAnalyticsService {
  constructor(
    private transactionRepository: Repository<InventoryTransaction>,
    private salesAggregateRepository: Repository<SalesAggregate>,
    private cacheService: CacheService,
  ) {}

  /**
   * Obtiene timeline de ventas con granularidad configurable
   */
  async getSalesTimeline(
    companyId: number,
    options: TimelineOptions
  ): Promise<TimelineData> {
    const cacheKey = `sales:timeline:${companyId}:${JSON.stringify(options)}`;

    // Check cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const { startDate, endDate, granularity } = options;

    const query = this.transactionRepository
      .createQueryBuilder('txn')
      .select([
        this.getDateTruncExpression(granularity, 'txn.createdAt') + ' as date',
        'SUM(txn.totalCost) as totalSales',
        'COUNT(*) as transactionCount',
        'SUM(ABS(txn.quantity)) as totalQuantity',
        'AVG(txn.unitCost) as avgUnitPrice'
      ])
      .where('txn.companyId = :companyId', { companyId })
      .andWhere('txn.type = :type', { type: TransactionType.OUTBOUND })
      .andWhere('txn.reason = :reason', { reason: TransactionReason.SALE })
      .andWhere('txn.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate
      })
      .groupBy(this.getDateTruncExpression(granularity, 'txn.createdAt'))
      .orderBy('date', 'ASC');

    const result = await query.getRawMany();

    // Transform and cache
    const transformed = this.transformTimelineData(result);
    await this.cacheService.set(cacheKey, transformed, 3600); // 1 hour

    return transformed;
  }

  /**
   * SQL expression para truncar fechas según granularidad
   */
  private getDateTruncExpression(
    granularity: 'day' | 'week' | 'month' | 'year',
    columnName: string
  ): string {
    switch (granularity) {
      case 'day':
        return `CAST(${columnName} AS DATE)`;
      case 'week':
        return `DATEADD(day, -(DATEPART(weekday, ${columnName}) - 1), CAST(${columnName} AS DATE))`;
      case 'month':
        return `DATEFROMPARTS(YEAR(${columnName}), MONTH(${columnName}), 1)`;
      case 'year':
        return `DATEFROMPARTS(YEAR(${columnName}), 1, 1)`;
    }
  }

  /**
   * Compara dos períodos de ventas
   */
  async comparePeriods(
    companyId: number,
    period1: DateRange,
    period2: DateRange
  ): Promise<PeriodComparison> {
    const [sales1, sales2] = await Promise.all([
      this.getTotalSales(companyId, period1),
      this.getTotalSales(companyId, period2)
    ]);

    return {
      period1: { ...period1, value: sales1 },
      period2: { ...period2, value: sales2 },
      comparison: {
        absoluteChange: sales1 - sales2,
        percentageChange: ((sales1 - sales2) / sales2) * 100,
        trend: sales1 > sales2 ? 'up' : sales1 < sales2 ? 'down' : 'stable'
      }
    };
  }
}
```

### 2. **ProductAnalyticsService**

```typescript
export class ProductAnalyticsService {
  constructor(
    private transactionRepository: Repository<InventoryTransaction>,
    private productRepository: Repository<Product>,
    private cacheService: CacheService,
  ) {}

  /**
   * Obtiene productos más vendidos
   */
  async getTopSellingProducts(
    companyId: number,
    options: TopProductsOptions
  ): Promise<TopProduct[]> {
    const { startDate, endDate, limit, sortBy, categoryId } = options;

    const query = this.transactionRepository
      .createQueryBuilder('txn')
      .innerJoin('txn.product', 'product')
      .leftJoin('product.categoryRelation', 'category')
      .select([
        'product.id as productId',
        'product.sku as sku',
        'product.name as name',
        'category.name as categoryName',
        'SUM(ABS(txn.quantity)) as quantitySold',
        'SUM(txn.totalCost) as revenue',
        'COUNT(*) as transactionCount',
        'AVG(txn.unitCost) as avgUnitPrice'
      ])
      .where('txn.companyId = :companyId', { companyId })
      .andWhere('txn.type = :type', { type: TransactionType.OUTBOUND })
      .andWhere('txn.reason = :reason', { reason: TransactionReason.SALE });

    if (startDate && endDate) {
      query.andWhere('txn.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate
      });
    }

    if (categoryId) {
      query.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    query
      .groupBy('product.id, product.sku, product.name, category.name')
      .orderBy(sortBy === 'quantity' ? 'quantitySold' : 'revenue', 'DESC')
      .limit(limit || 10);

    const results = await query.getRawMany();

    // Add ranking and profit margin
    return results.map((item, index) => ({
      rank: index + 1,
      ...item,
      profitMargin: this.calculateProfitMargin(item)
    }));
  }

  /**
   * Analiza performance de un producto específico
   */
  async getProductPerformance(
    companyId: number,
    productId: number,
    dateRange: DateRange
  ): Promise<ProductPerformance> {
    // Sales over time
    const salesTimeline = await this.getProductSalesTimeline(
      companyId,
      productId,
      dateRange
    );

    // Current stock
    const currentStock = await this.getCurrentStock(companyId, productId);

    // Turnover rate
    const turnoverRate = await this.calculateTurnoverRate(
      companyId,
      productId,
      dateRange
    );

    return {
      productId,
      salesTimeline,
      currentStock,
      turnoverRate,
      trends: this.analyzeTrends(salesTimeline)
    };
  }

  private calculateTurnoverRate(
    companyId: number,
    productId: number,
    dateRange: DateRange
  ): Promise<number> {
    // Turnover Rate = Units Sold / Average Inventory
    // Implementation...
  }
}
```

### 3. **AggregationService** (Background Jobs)

```typescript
export class AggregationService {
  constructor(
    private transactionRepository: Repository<InventoryTransaction>,
    private salesAggregateRepository: Repository<SalesAggregate>,
    private inventorySnapshotRepository: Repository<InventorySnapshot>,
  ) {}

  /**
   * Agregación diaria ejecutada por cron job
   * Ejecutar a las 00:30 cada día
   */
  @Cron('30 0 * * *')
  async aggregateDailySales(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const companies = await this.getActiveCompanies();

    for (const company of companies) {
      await this.aggregateSalesForDay(company.id, yesterday);
    }
  }

  private async aggregateSalesForDay(
    companyId: number,
    date: Date
  ): Promise<void> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const aggregates = await this.transactionRepository
      .createQueryBuilder('txn')
      .select([
        'txn.productId as productId',
        'product.categoryId as categoryId',
        'COUNT(*) as transactionCount',
        'SUM(ABS(txn.quantity)) as totalQuantity',
        'SUM(txn.totalCost) as totalRevenue',
        'AVG(txn.unitCost) as avgUnitPrice'
      ])
      .innerJoin('txn.product', 'product')
      .where('txn.companyId = :companyId', { companyId })
      .andWhere('txn.type = :type', { type: TransactionType.OUTBOUND })
      .andWhere('txn.reason = :reason', { reason: TransactionReason.SALE })
      .andWhere('txn.createdAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay
      })
      .groupBy('txn.productId, product.categoryId')
      .getRawMany();

    // Guardar agregados
    const entities = aggregates.map(agg =>
      this.salesAggregateRepository.create({
        companyId,
        productId: agg.productId,
        categoryId: agg.categoryId,
        aggregateDate: date,
        periodType: 'day',
        transactionCount: agg.transactionCount,
        totalQuantity: agg.totalQuantity,
        totalRevenue: agg.totalRevenue,
        avgUnitPrice: agg.avgUnitPrice
      })
    );

    await this.salesAggregateRepository.save(entities);
  }

  /**
   * Snapshot de inventario semanal
   * Ejecutar los domingos a las 23:00
   */
  @Cron('0 23 * * 0')
  async createInventorySnapshot(): Promise<void> {
    const companies = await this.getActiveCompanies();

    for (const company of companies) {
      await this.snapshotInventoryForCompany(company.id);
    }
  }
}
```

---

## 🎨 Frontend - Visualizaciones

### Tecnologías Recomendadas

1. **Librería de Gráficas**:
   - **Chart.js** (simple, performante)
   - **Recharts** (React-friendly)
   - **Apache ECharts** (potente, muchas opciones)

2. **Dashboard Framework**:
   - **Tremor** (pre-built analytics components)
   - **Ant Design Charts**
   - **Material-UI + Nivo**

3. **Tablas de Datos**:
   - **TanStack Table** (anteriormente React Table)
   - **AG Grid** (enterprise features)

### Componentes UI Necesarios

#### 1. **Dashboard Principal**
```tsx
<DashboardLayout>
  <StatsGrid>
    <StatCard
      title="Ventas Totales"
      value="$125,450"
      change="+12.5%"
      trend="up"
      icon={<TrendingUpIcon />}
    />
    <StatCard
      title="Transacciones"
      value="450"
      change="+8.2%"
      trend="up"
    />
    <StatCard
      title="Ticket Promedio"
      value="$278.78"
      change="-2.1%"
      trend="down"
    />
  </StatsGrid>

  <ChartGrid>
    <Card title="Ventas - Últimos 12 Meses">
      <LineChart data={salesTimeline} />
    </Card>

    <Card title="Top 10 Productos">
      <BarChart data={topProducts} />
    </Card>

    <Card title="Ventas por Categoría">
      <PieChart data={categoryBreakdown} />
    </Card>
  </ChartGrid>

  <AlertsPanel>
    <Alert type="warning">
      5 productos con stock crítico
    </Alert>
  </AlertsPanel>
</DashboardLayout>
```

#### 2. **Timeline de Ventas**
```tsx
<SalesTimelineView>
  <FilterBar>
    <DateRangePicker
      value={dateRange}
      onChange={setDateRange}
      presets={['7d', '30d', '90d', '1y', 'custom']}
    />
    <Select
      label="Granularidad"
      options={['Día', 'Semana', 'Mes', 'Año']}
    />
    <CategoryFilter />
  </FilterBar>

  <TimelineChart>
    <LineChart
      data={timelineData}
      xAxis={{ key: 'date', format: 'MMM DD' }}
      yAxis={[
        { key: 'totalSales', label: 'Ventas ($)' },
        { key: 'transactionCount', label: 'Transacciones' }
      ]}
      tooltip={(point) => (
        <Tooltip>
          <div>Fecha: {point.date}</div>
          <div>Ventas: ${point.totalSales}</div>
          <div>Transacciones: {point.transactionCount}</div>
        </Tooltip>
      )}
    />
  </TimelineChart>

  <ComparisonView>
    <PeriodComparison
      period1={{ label: 'Este mes', value: 45000 }}
      period2={{ label: 'Mes anterior', value: 38000 }}
      change={{ value: 18.4, trend: 'up' }}
    />
  </ComparisonView>
</SalesTimelineView>
```

#### 3. **Top Productos**
```tsx
<TopProductsView>
  <FilterBar>
    <DateRangePicker />
    <Select label="Ordenar por" options={['Ventas', 'Cantidad']} />
    <Input placeholder="Buscar producto..." />
  </FilterBar>

  <ProductsTable
    columns={[
      { key: 'rank', label: '#' },
      { key: 'name', label: 'Producto' },
      { key: 'category', label: 'Categoría' },
      { key: 'quantitySold', label: 'Cant. Vendida', format: 'number' },
      { key: 'revenue', label: 'Ingresos', format: 'currency' },
      { key: 'profitMargin', label: 'Margen', format: 'percentage' }
    ]}
    data={topProducts}
    actions={(row) => (
      <Button onClick={() => viewProductDetails(row.id)}>
        Ver Detalles
      </Button>
    )}
  />

  <ChartView>
    <BarChart
      data={topProducts}
      xAxis={{ key: 'name' }}
      yAxis={{ key: 'revenue', format: 'currency' }}
      horizontal
    />
  </ChartView>
</TopProductsView>
```

#### 4. **Análisis por Categoría**
```tsx
<CategoryAnalysisView>
  <CategoryHierarchy>
    <TreeMap
      data={categoryTree}
      valueKey="revenue"
      colorScale="blues"
      tooltip={(node) => `${node.name}: $${node.revenue}`}
    />
  </CategoryHierarchy>

  <CategoryBreakdown>
    <PieChart
      data={categoryPerformance}
      valueKey="revenue"
      labelKey="name"
      showPercentages
    />
  </CategoryBreakdown>

  <CategoryTable data={categoryDetails} />
</CategoryAnalysisView>
```

### Interactividad

```tsx
// Filtros globales con estado compartido
const [globalFilters, setGlobalFilters] = useState({
  dateRange: { start: '2024-01-01', end: '2024-12-31' },
  categoryId: null,
  warehouseId: null
});

// Hook personalizado para analytics
const { data, loading, error, refetch } = useAnalytics({
  endpoint: '/analytics/sales/timeline',
  filters: globalFilters,
  cacheTime: 5 * 60 * 1000 // 5 minutos
});

// Exportación de reportes
const handleExport = async (format: 'pdf' | 'excel') => {
  const response = await api.post('/analytics/export', {
    reportType: 'sales_timeline',
    format,
    filters: globalFilters
  });

  // Descargar archivo
  window.open(response.data.downloadUrl);
};
```

---

## 📅 Plan de Implementación

### Fase 1: Fundamentos (Semana 1-2)

#### Sprint 1.1: Modelo de Datos
- [ ] Crear entidad `SalesAggregate`
- [ ] Crear entidad `InventorySnapshot`
- [ ] Generar migraciones
- [ ] Crear índices optimizados
- [ ] Vistas SQL para reportería

**Entregables:**
- Migraciones ejecutadas
- Documentación de esquema

#### Sprint 1.2: Servicios Base
- [ ] `SalesAnalyticsService` - métodos básicos
- [ ] `ProductAnalyticsService` - métodos básicos
- [ ] `CacheService` - integración Redis
- [ ] Tests unitarios de servicios

**Entregables:**
- Servicios funcionales
- Cobertura de tests >80%

### Fase 2: API Layer (Semana 3-4)

#### Sprint 2.1: Controllers y DTOs
- [ ] `AnalyticsController` - dashboard endpoint
- [ ] `AnalyticsController` - sales timeline endpoint
- [ ] `AnalyticsController` - top products endpoint
- [ ] DTOs de request/response
- [ ] Validación de parámetros
- [ ] Swagger documentation

**Entregables:**
- API documentada
- Tests de integración

#### Sprint 2.2: Endpoints Avanzados
- [ ] Comparación de períodos
- [ ] Análisis por categoría
- [ ] Estado de inventario
- [ ] Tests E2E de APIs

**Entregables:**
- APIs completas
- Postman collection

### Fase 3: Agregación y Jobs (Semana 5)

#### Sprint 3.1: Background Jobs
- [ ] `AggregationService` - daily aggregation
- [ ] `AggregationService` - inventory snapshots
- [ ] Cron jobs configuration
- [ ] Error handling y retry logic
- [ ] Monitoring y alertas

**Entregables:**
- Jobs automáticos funcionando
- Logs de ejecución

#### Sprint 3.2: Optimización
- [ ] Query optimization
- [ ] Cache strategy refinement
- [ ] Índices adicionales si necesario
- [ ] Performance testing

**Entregables:**
- Métricas de performance
- Reporte de optimización

### Fase 4: Frontend (Semana 6-8)

#### Sprint 4.1: Dashboard Principal
- [ ] Layout de dashboard
- [ ] Stats cards component
- [ ] Integración con API dashboard
- [ ] Loading y error states
- [ ] Responsive design

**Entregables:**
- Dashboard funcional
- Tests de componentes

#### Sprint 4.2: Visualizaciones de Ventas
- [ ] Timeline chart component
- [ ] Filter bar component
- [ ] Granularity selector
- [ ] Comparison view
- [ ] Export functionality

**Entregables:**
- Vista de timeline completa
- Exportación PDF/Excel

#### Sprint 4.3: Reportes de Productos
- [ ] Top products table
- [ ] Product charts
- [ ] Category analysis
- [ ] Drill-down functionality
- [ ] Search y filters

**Entregables:**
- Vistas de productos/categorías
- Navegación fluida

#### Sprint 4.4: Inventario y Alertas
- [ ] Inventory status dashboard
- [ ] Low stock alerts
- [ ] Reorder recommendations
- [ ] Real-time updates (opcional)

**Entregables:**
- Sistema de alertas
- Dashboard de inventario

### Fase 5: Testing y Deployment (Semana 9)

#### Sprint 5.1: QA
- [ ] Tests E2E completos
- [ ] Performance testing
- [ ] Security audit
- [ ] User acceptance testing

#### Sprint 5.2: Deployment
- [ ] Database migrations en producción
- [ ] Deploy de backend
- [ ] Deploy de frontend
- [ ] Configuración de cron jobs
- [ ] Monitoring setup

**Entregables:**
- Sistema en producción
- Documentación de usuario

---

## 📊 Métricas de Éxito

### Performance
- ⏱️ Tiempo de respuesta API < 500ms (P95)
- ⏱️ Carga de dashboard < 2 segundos
- 💾 Cache hit rate > 70%

### Usabilidad
- 👥 Adopción por usuarios: > 80%
- ⭐ Satisfacción de usuarios: > 4/5
- 📈 Uso semanal activo: > 90%

### Técnicas
- ✅ Cobertura de tests: > 80%
- 🐛 Bug rate: < 1% de transacciones
- 📊 Precisión de datos: 100%

---

## 🔐 Consideraciones de Seguridad

1. **Autenticación**: Todos los endpoints requieren JWT válido
2. **Multi-tenancy**: Filtrado automático por `companyId`
3. **Rate Limiting**: 100 requests/min por usuario
4. **Datos Sensibles**: Precios encriptados en DB
5. **Auditoría**: Logging de consultas de reportería

---

## 🚀 Siguientes Pasos

1. ✅ **Aprobación de diseño** → Revisión con stakeholders
2. 📋 **Refinamiento de tickets** → Crear issues en Jira/GitHub
3. 🎯 **Priorización** → Definir MVP (Fases 1-3)
4. 👥 **Asignación de equipo** → Backend + Frontend developers
5. 🏁 **Kickoff** → Inicio Sprint 1.1

---

## 📚 Referencias Técnicas

- TypeORM Aggregation Queries
- SQL Server Date Functions
- Redis Caching Best Practices
- Chart.js Documentation
- REST API Design Guidelines

---

**Versión**: 1.0
**Fecha**: 2025-11-15
**Autor**: Claude (SuperClaude Framework)
**Estado**: ✅ Listo para Revisión
