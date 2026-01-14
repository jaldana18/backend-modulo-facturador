import { Repository, Between, MoreThan, LessThan } from 'typeorm';
import { InventoryTransaction, TransactionType, TransactionReason } from '../entities/InventoryTransaction.entity';
import { Product } from '../entities/Product.entity';
import { Category } from '../entities/Category.entity';
import { SalesAggregate } from '../entities/SalesAggregate.entity';
import { Warehouse } from '../entities/Warehouse.entity';
import { AppDataSource } from '../config/database';
import {
  TimelineQueryDto,
  TopProductsQueryDto,
  TimelineResponseDto,
  TopProductDto,
  DashboardResponseDto,
  CategoryPerformanceDto,
  PeriodComparisonDto,
  InventoryStatusResponseDto,
  LowStockAlertDto,
  Granularity,
  WarehouseSalesQueryDto,
  WarehouseSalesResponseDto,
  WarehouseSalesDto,
  TopProductResponseDto,
  TimelineDataPoint,
} from '../dto/analytics/analytics.dto';

export class AnalyticsService {
  private transactionRepo: Repository<InventoryTransaction>;
  private productRepo: Repository<Product>;
  private categoryRepo: Repository<Category>;
  private salesAggregateRepo: Repository<SalesAggregate>;
  private warehouseRepo: Repository<Warehouse>;

  constructor() {
    this.transactionRepo = AppDataSource.getRepository(InventoryTransaction);
    this.productRepo = AppDataSource.getRepository(Product);
    this.categoryRepo = AppDataSource.getRepository(Category);
    this.salesAggregateRepo = AppDataSource.getRepository(SalesAggregate);
    this.warehouseRepo = AppDataSource.getRepository(Warehouse);
  }

  /**
   * Calcula el valor total del inventario actual
   */
  private async calculateInventoryValue(companyId: number): Promise<number> {
    // Obtener el valor de la última transacción de cada producto por almacén
    const result = await this.transactionRepo
      .createQueryBuilder('txn')
      .select('SUM(txn.newStock * COALESCE(txn.unitCost, 0))', 'totalValue')
      .where('txn.companyId = :companyId', { companyId })
      .andWhere(`txn.id IN (
        SELECT MAX(id)
        FROM inventory_transactions
        WHERE company_id = @0
        GROUP BY product_id, warehouse_id
      )`, [companyId])
      .getRawOne();

    return parseFloat(result?.totalValue || 0);
  }

  /**
   * Calcula el cambio porcentual comparando con el período anterior
   */
  private async calculatePercentageChange(
    companyId: number,
    currentStart: Date,
    currentEnd: Date
  ): Promise<number> {
    // Calcular duración del período actual
    const durationMs = currentEnd.getTime() - currentStart.getTime();

    // Período anterior con la misma duración
    const previousEnd = new Date(currentStart.getTime());
    const previousStart = new Date(currentStart.getTime() - durationMs);

    const [currentSales, previousSales] = await Promise.all([
      this.getTotalSales(companyId, currentStart, currentEnd),
      this.getTotalSales(companyId, previousStart, previousEnd),
    ]);

    if (previousSales === 0) return currentSales > 0 ? 100 : 0;

    return ((currentSales - previousSales) / previousSales) * 100;
  }

  /**
   * Cuenta productos totales activos
   */
  private async countTotalProducts(companyId: number): Promise<number> {
    return await this.productRepo.count({
      where: { companyId, isActive: true },
    });
  }

  /**
   * Calcula margen de ganancia para un producto
   */
  private async calculateProfitMargin(productId: number, revenue: number, quantitySold: number): Promise<number | null> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      select: ['cost', 'price'],
    });

    if (!product || !product.cost || !product.price) return null;

    const totalCost = product.cost * quantitySold;
    const profit = revenue - totalCost;

    return totalCost > 0 ? (profit / totalCost) * 100 : null;
  }

  /**
   * Dashboard general con KPIs principales
   */
  async getDashboard(
    companyId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<DashboardResponseDto> {
    const dateFilter = startDate && endDate
      ? { createdAt: Between(startDate, endDate) }
      : {};

    // Total de ventas
    const salesData = await this.transactionRepo
      .createQueryBuilder('txn')
      .select('SUM(txn.totalCost)', 'totalAmount')
      .addSelect('COUNT(*)', 'totalCount')
      .where('txn.companyId = :companyId', { companyId })
      .andWhere('txn.type = :type', { type: TransactionType.OUTBOUND })
      .andWhere('txn.reason = :reason', { reason: TransactionReason.SALE })
      .andWhere(dateFilter)
      .getRawOne();

    // Top 5 productos
    const topProducts = await this.getTopSellingProducts(companyId, {
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      limit: 5,
    });

    // Performance de categorías
    const categories = await this.getCategoryPerformance(companyId, {
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    });

    // Alertas de stock bajo
    const lowStockAlerts = await this.getLowStockAlerts(companyId);

    // Calcular porcentaje de cambio comparando con período anterior
    const percentageChange = startDate && endDate
      ? await this.calculatePercentageChange(companyId, startDate, endDate)
      : 0;

    // Calcular valor total de inventario
    const inventoryValue = await this.calculateInventoryValue(companyId);

    return {
      totalSales: {
        amount: parseFloat(salesData?.totalAmount || 0),
        count: parseInt(salesData?.totalCount || 0),
        percentageChange,
      },
      topProducts: topProducts.slice(0, 5).map(p => ({
        productId: p.productId,
        name: p.name,
        revenue: p.revenue,
      })),
      categoriesPerformance: categories.slice(0, 5),
      lowStockAlerts: lowStockAlerts.slice(0, 10),
      recentTransactions: parseInt(salesData?.totalCount || 0),
      inventoryValue,
    };
  }

  /**
   * Timeline de ventas con granularidad configurable
   */
  async getSalesTimeline(
    companyId: number,
    query: TimelineQueryDto
  ): Promise<TimelineResponseDto> {
    const { startDate, endDate, granularity = Granularity.DAY, categoryId, productId } = query;

    const dateGroupExpression = this.getDateGroupExpression(granularity);

    let queryBuilder = this.transactionRepo
      .createQueryBuilder('txn')
      .select(`${dateGroupExpression} as date`)
      .addSelect('SUM(txn.totalCost)', 'totalSales')
      .addSelect('COUNT(*)', 'transactionCount')
      .addSelect('SUM(ABS(txn.quantity))', 'totalQuantity')
      .addSelect('AVG(txn.unitCost)', 'avgTicket')
      .where('txn.companyId = :companyId', { companyId })
      .andWhere('txn.type = :type', { type: TransactionType.OUTBOUND })
      .andWhere('txn.reason = :reason', { reason: TransactionReason.SALE })
      .andWhere('txn.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    if (categoryId) {
      queryBuilder = queryBuilder
        .innerJoin('txn.product', 'product')
        .andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (productId) {
      queryBuilder = queryBuilder.andWhere('txn.productId = :productId', { productId });
    }

    queryBuilder = queryBuilder
      .groupBy(dateGroupExpression)
      .orderBy('date', 'ASC');

    const results = await queryBuilder.getRawMany();

    const data = results.map(r => ({
      date: r.date,
      totalSales: parseFloat(r.totalSales || 0),
      transactionCount: parseInt(r.transactionCount || 0),
      totalQuantity: parseFloat(r.totalQuantity || 0),
      avgTicket: parseFloat(r.avgTicket || 0),
    }));

    const totals = data.map(d => d.totalSales);

    return {
      data,
      summary: {
        total: totals.reduce((sum, val) => sum + val, 0),
        average: totals.length > 0 ? totals.reduce((sum, val) => sum + val, 0) / totals.length : 0,
        highest: Math.max(...totals, 0),
        lowest: Math.min(...totals.filter(v => v > 0), 0) || 0,
      },
    };
  }

  /**
   * Top productos más vendidos
   */
  async getTopSellingProducts(
    companyId: number,
    query: TopProductsQueryDto
  ): Promise<TopProductDto[]> {
    const { startDate, endDate, limit = 10, sortBy = 'revenue', categoryId } = query;

    let queryBuilder = this.transactionRepo
      .createQueryBuilder('txn')
      .innerJoin('txn.product', 'product')
      .leftJoin('product.categoryRelation', 'category')
      .select('product.id', 'productId')
      .addSelect('product.sku', 'sku')
      .addSelect('product.name', 'name')
      .addSelect('category.name', 'categoryName')
      .addSelect('SUM(ABS(txn.quantity))', 'quantitySold')
      .addSelect('SUM(txn.totalCost)', 'revenue')
      .addSelect('COUNT(*)', 'transactionCount')
      .addSelect('AVG(txn.unitCost)', 'avgUnitPrice')
      .where('txn.companyId = :companyId', { companyId })
      .andWhere('txn.type = :type', { type: TransactionType.OUTBOUND })
      .andWhere('txn.reason = :reason', { reason: TransactionReason.SALE });

    if (startDate && endDate) {
      queryBuilder = queryBuilder.andWhere('txn.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (categoryId) {
      queryBuilder = queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    queryBuilder = queryBuilder
      .groupBy('product.id, product.sku, product.name, category.name')
      .orderBy(sortBy === 'quantity' ? 'quantitySold' : 'revenue', 'DESC')
      .limit(limit);

    const results = await queryBuilder.getRawMany();

    // Calcular margen de ganancia para cada producto
    const productsWithMargin = await Promise.all(
      results.map(async (item, index) => {
        const profitMargin = await this.calculateProfitMargin(
          item.productId,
          parseFloat(item.revenue || 0),
          parseFloat(item.quantitySold || 0)
        );

        return {
          rank: index + 1,
          productId: item.productId,
          sku: item.sku,
          name: item.name,
          categoryName: item.categoryName || null,
          quantitySold: parseFloat(item.quantitySold || 0),
          revenue: parseFloat(item.revenue || 0),
          transactionCount: parseInt(item.transactionCount || 0),
          avgUnitPrice: parseFloat(item.avgUnitPrice || 0),
          profitMargin,
        };
      })
    );

    return productsWithMargin;
  }

  /**
   * Performance de categorías
   */
  async getCategoryPerformance(
    companyId: number,
    query: { startDate?: string; endDate?: string; includeSubcategories?: boolean }
  ): Promise<CategoryPerformanceDto[]> {
    const { startDate, endDate } = query;

    let queryBuilder = this.transactionRepo
      .createQueryBuilder('txn')
      .innerJoin('txn.product', 'product')
      .innerJoin('product.categoryRelation', 'category')
      .select('category.id', 'categoryId')
      .addSelect('category.name', 'name')
      .addSelect('SUM(txn.totalCost)', 'revenue')
      .addSelect('SUM(ABS(txn.quantity))', 'quantity')
      .addSelect('COUNT(*)', 'transactionCount')
      .where('txn.companyId = :companyId', { companyId })
      .andWhere('txn.type = :type', { type: TransactionType.OUTBOUND })
      .andWhere('txn.reason = :reason', { reason: TransactionReason.SALE })
      .andWhere('product.categoryId IS NOT NULL');

    if (startDate && endDate) {
      queryBuilder = queryBuilder.andWhere('txn.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    queryBuilder = queryBuilder
      .groupBy('category.id, category.name')
      .orderBy('revenue', 'DESC');

    const results = await queryBuilder.getRawMany();

    const totalRevenue = results.reduce((sum, r) => sum + parseFloat(r.revenue || 0), 0);

    return results.map(item => ({
      categoryId: item.categoryId,
      name: item.name,
      parentCategory: null,
      revenue: parseFloat(item.revenue || 0),
      quantity: parseFloat(item.quantity || 0),
      transactionCount: parseInt(item.transactionCount || 0),
      percentageOfTotal: totalRevenue > 0 ? (parseFloat(item.revenue || 0) / totalRevenue) * 100 : 0,
      topProduct: null,
      subcategories: [],
    }));
  }

  /**
   * Comparación de períodos
   */
  async comparePeriods(
    companyId: number,
    period1Start: Date,
    period1End: Date,
    period2Start: Date,
    period2End: Date
  ): Promise<PeriodComparisonDto> {
    const [sales1, sales2] = await Promise.all([
      this.getTotalSales(companyId, period1Start, period1End),
      this.getTotalSales(companyId, period2Start, period2End),
    ]);

    const absoluteChange = sales1 - sales2;
    const percentageChange = sales2 > 0 ? (absoluteChange / sales2) * 100 : 0;

    return {
      period1: {
        start: period1Start.toISOString(),
        end: period1End.toISOString(),
        value: sales1,
        label: 'Período 1',
      },
      period2: {
        start: period2Start.toISOString(),
        end: period2End.toISOString(),
        value: sales2,
        label: 'Período 2',
      },
      comparison: {
        absoluteChange,
        percentageChange,
        trend: absoluteChange > 0 ? 'up' : absoluteChange < 0 ? 'down' : 'stable',
      },
    };
  }

  /**
   * Estado de inventario con alertas
   */
  async getInventoryStatus(companyId: number): Promise<InventoryStatusResponseDto> {
    const lowStockAlerts = await this.getLowStockAlerts(companyId);
    const totalProducts = await this.countTotalProducts(companyId);
    const totalValue = await this.calculateInventoryValue(companyId);

    // Detectar productos con overstock (stock > reorderPoint * 2)
    const overstockCount = await this.countOverstockProducts(companyId);

    return {
      summary: {
        totalProducts,
        totalValue,
        lowStockCount: lowStockAlerts.filter(a => a.status === 'low').length,
        criticalStockCount: lowStockAlerts.filter(a => a.status === 'critical').length,
        overstockCount,
      },
      products: lowStockAlerts,
    };
  }

  /**
   * Reporte de ventas por almacén/sucursal
   */
  async getWarehouseSalesReport(
    companyId: number,
    query: WarehouseSalesQueryDto
  ): Promise<WarehouseSalesResponseDto> {
    const { startDate, endDate, warehouseId, granularity = Granularity.DAY, includeProducts = false } = query;

    // Definir rango de fechas (últimos 30 días si no se especifica)
    const endDateObj = endDate ? new Date(endDate) : new Date();
    const startDateObj = startDate ? new Date(startDate) : new Date(endDateObj.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Obtener ventas por almacén
    let queryBuilder = this.transactionRepo
      .createQueryBuilder('txn')
      .innerJoin('txn.warehouse', 'warehouse')
      .select('warehouse.id', 'warehouseId')
      .addSelect('warehouse.name', 'warehouseName')
      .addSelect('warehouse.code', 'warehouseCode')
      .addSelect('SUM(txn.totalCost)', 'totalSales')
      .addSelect('COUNT(*)', 'totalTransactions')
      .addSelect('SUM(ABS(txn.quantity))', 'totalQuantitySold')
      .addSelect('AVG(txn.totalCost)', 'avgTicket')
      .where('txn.companyId = :companyId', { companyId })
      .andWhere('txn.type = :type', { type: TransactionType.OUTBOUND })
      .andWhere('txn.reason = :reason', { reason: TransactionReason.SALE })
      .andWhere('txn.createdAt BETWEEN :startDate AND :endDate', {
        startDate: startDateObj,
        endDate: endDateObj,
      });

    if (warehouseId) {
      queryBuilder = queryBuilder.andWhere('warehouse.id = :warehouseId', { warehouseId });
    }

    queryBuilder = queryBuilder
      .groupBy('warehouse.id, warehouse.name, warehouse.code')
      .orderBy('totalSales', 'DESC');

    const warehouseResults = await queryBuilder.getRawMany();

    // Calcular total de ventas para porcentajes
    const totalSales = warehouseResults.reduce((sum, w) => sum + parseFloat(w.totalSales || 0), 0);
    const totalTransactions = warehouseResults.reduce((sum, w) => sum + parseInt(w.totalTransactions || 0), 0);

    // Construir respuesta con datos de cada almacén
    const warehouses: WarehouseSalesDto[] = await Promise.all(
      warehouseResults.map(async (item) => {
        const warehouseSales = parseFloat(item.totalSales || 0);
        const warehouseData: WarehouseSalesDto = {
          warehouseId: item.warehouseId,
          warehouseName: item.warehouseName,
          warehouseCode: item.warehouseCode,
          totalSales: warehouseSales,
          totalTransactions: parseInt(item.totalTransactions || 0),
          totalQuantitySold: parseFloat(item.totalQuantitySold || 0),
          avgTicket: parseFloat(item.avgTicket || 0),
          percentageOfTotal: totalSales > 0 ? (warehouseSales / totalSales) * 100 : 0,
        };

        // Incluir top productos si se solicita
        if (includeProducts) {
          const topProducts = await this.getTopProductsByWarehouse(
            companyId,
            item.warehouseId,
            startDateObj,
            endDateObj,
            5
          );
          warehouseData.topProducts = topProducts;
        }

        return warehouseData;
      })
    );

    return {
      warehouses,
      summary: {
        totalSales,
        totalTransactions,
        totalWarehouses: warehouses.length,
        avgSalesPerWarehouse: warehouses.length > 0 ? totalSales / warehouses.length : 0,
      },
      period: {
        startDate: startDateObj.toISOString(),
        endDate: endDateObj.toISOString(),
      },
    };
  }

  /**
   * Obtiene los productos más vendidos de un almacén específico
   */
  private async getTopProductsByWarehouse(
    companyId: number,
    warehouseId: number,
    startDate: Date,
    endDate: Date,
    limit: number = 5
  ): Promise<TopProductResponseDto[]> {
    const results = await this.transactionRepo
      .createQueryBuilder('txn')
      .innerJoin('txn.product', 'product')
      .select('product.id', 'productId')
      .addSelect('product.name', 'name')
      .addSelect('SUM(txn.totalCost)', 'revenue')
      .where('txn.companyId = :companyId', { companyId })
      .andWhere('txn.warehouseId = :warehouseId', { warehouseId })
      .andWhere('txn.type = :type', { type: TransactionType.OUTBOUND })
      .andWhere('txn.reason = :reason', { reason: TransactionReason.SALE })
      .andWhere('txn.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('product.id, product.name')
      .orderBy('revenue', 'DESC')
      .limit(limit)
      .getRawMany();

    return results.map(item => ({
      productId: item.productId,
      name: item.name,
      revenue: parseFloat(item.revenue || 0),
    }));
  }

  // Helper methods

  private async getTotalSales(companyId: number, startDate: Date, endDate: Date): Promise<number> {
    const result = await this.transactionRepo
      .createQueryBuilder('txn')
      .select('SUM(txn.totalCost)', 'total')
      .where('txn.companyId = :companyId', { companyId })
      .andWhere('txn.type = :type', { type: TransactionType.OUTBOUND })
      .andWhere('txn.reason = :reason', { reason: TransactionReason.SALE })
      .andWhere('txn.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    return parseFloat(result?.total || 0);
  }

  private async getLowStockAlerts(companyId: number): Promise<LowStockAlertDto[]> {
    // Obtener productos activos con su stock actual
    const productsWithStock = await this.productRepo
      .createQueryBuilder('product')
      .leftJoin(
        (qb) => qb
          .select('txn.product_id', 'productId')
          .addSelect('MAX(txn.id)', 'lastTransactionId')
          .from('inventory_transactions', 'txn')
          .where('txn.company_id = :companyId', { companyId })
          .groupBy('txn.product_id'),
        'last_txn',
        'last_txn.productId = product.id'
      )
      .leftJoin(
        'inventory_transactions',
        'txn',
        'txn.id = last_txn.lastTransactionId'
      )
      .select('product.id', 'productId')
      .addSelect('product.name', 'name')
      .addSelect('product.minimum_stock', 'minimumStock')
      .addSelect('product.reorder_point', 'reorderPoint')
      .addSelect('COALESCE(txn.new_stock, 0)', 'currentStock')
      .where('product.company_id = :companyId', { companyId })
      .andWhere('product.is_active = 1')
      .getRawMany();

    const alerts: LowStockAlertDto[] = [];

    for (const item of productsWithStock) {
      const currentStock = parseFloat(item.currentStock || 0);
      const minimumStock = parseFloat(item.minimumStock || 0);
      const reorderPoint = parseFloat(item.reorderPoint || 0);

      // Solo incluir si está por debajo del reorder point
      if (currentStock <= reorderPoint) {
        const status: 'low' | 'critical' = currentStock <= minimumStock ? 'critical' : 'low';

        // Calcular días hasta agotamiento basado en promedio de ventas
        const avgDailySales = await this.getAverageDailySales(companyId, item.productId);
        const daysUntilStockout = avgDailySales > 0
          ? Math.floor(currentStock / avgDailySales)
          : null;

        // Cantidad recomendada de reorden
        const recommendedOrderQuantity = Math.max(
          reorderPoint * 2 - currentStock,
          minimumStock - currentStock
        );

        alerts.push({
          productId: item.productId,
          name: item.name,
          currentStock,
          minimumStock,
          reorderPoint,
          status,
          daysUntilStockout,
          recommendedOrderQuantity: Math.ceil(recommendedOrderQuantity),
        });
      }
    }

    // Ordenar por criticidad (críticos primero) y luego por stock
    return alerts.sort((a, b) => {
      if (a.status === 'critical' && b.status !== 'critical') return -1;
      if (a.status !== 'critical' && b.status === 'critical') return 1;
      return a.currentStock - b.currentStock;
    });
  }

  /**
   * Calcula promedio de ventas diarias de un producto
   */
  private async getAverageDailySales(companyId: number, productId: number): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.transactionRepo
      .createQueryBuilder('txn')
      .select('SUM(ABS(txn.quantity))', 'totalSold')
      .where('txn.companyId = :companyId', { companyId })
      .andWhere('txn.productId = :productId', { productId })
      .andWhere('txn.type = :type', { type: TransactionType.OUTBOUND })
      .andWhere('txn.reason = :reason', { reason: TransactionReason.SALE })
      .andWhere('txn.createdAt >= :startDate', { startDate: thirtyDaysAgo })
      .getRawOne();

    const totalSold = parseFloat(result?.totalSold || 0);
    return totalSold / 30; // Promedio diario
  }

  /**
   * Cuenta productos con overstock
   */
  private async countOverstockProducts(companyId: number): Promise<number> {
    const productsWithStock = await this.productRepo
      .createQueryBuilder('product')
      .leftJoin(
        (qb) => qb
          .select('txn.product_id', 'productId')
          .addSelect('MAX(txn.id)', 'lastTransactionId')
          .from('inventory_transactions', 'txn')
          .where('txn.company_id = :companyId', { companyId })
          .groupBy('txn.product_id'),
        'last_txn',
        'last_txn.productId = product.id'
      )
      .leftJoin(
        'inventory_transactions',
        'txn',
        'txn.id = last_txn.lastTransactionId'
      )
      .select('COUNT(*)', 'count')
      .where('product.company_id = :companyId', { companyId })
      .andWhere('product.is_active = 1')
      .andWhere('product.reorder_point > 0')
      .andWhere('COALESCE(txn.new_stock, 0) > product.reorder_point * 2')
      .getRawOne();

    return parseInt(productsWithStock?.count || 0);
  }

  private getDateGroupExpression(granularity: Granularity): string {
    switch (granularity) {
      case Granularity.DAY:
        return 'CAST(txn.createdAt AS DATE)';
      case Granularity.WEEK:
        return 'DATEADD(day, -(DATEPART(weekday, txn.createdAt) - 1), CAST(txn.createdAt AS DATE))';
      case Granularity.MONTH:
        return 'DATEFROMPARTS(YEAR(txn.createdAt), MONTH(txn.createdAt), 1)';
      case Granularity.YEAR:
        return 'DATEFROMPARTS(YEAR(txn.createdAt), 1, 1)';
      default:
        return 'CAST(txn.createdAt AS DATE)';
    }
  }
}
