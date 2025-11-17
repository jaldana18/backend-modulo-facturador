import { Repository, Between, MoreThan, LessThan } from 'typeorm';
import { InventoryTransaction, TransactionType, TransactionReason } from '../entities/InventoryTransaction.entity';
import { Product } from '../entities/Product.entity';
import { Category } from '../entities/Category.entity';
import { SalesAggregate } from '../entities/SalesAggregate.entity';
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
} from '../dto/analytics/analytics.dto';

export class AnalyticsService {
  private transactionRepo: Repository<InventoryTransaction>;
  private productRepo: Repository<Product>;
  private categoryRepo: Repository<Category>;
  private salesAggregateRepo: Repository<SalesAggregate>;

  constructor() {
    this.transactionRepo = AppDataSource.getRepository(InventoryTransaction);
    this.productRepo = AppDataSource.getRepository(Product);
    this.categoryRepo = AppDataSource.getRepository(Category);
    this.salesAggregateRepo = AppDataSource.getRepository(SalesAggregate);
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

    // Calcular porcentaje de cambio (simplificado)
    const percentageChange = 0; // TODO: implementar comparación con período anterior

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
      inventoryValue: 0, // TODO: calcular valor de inventario
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

    return results.map((item, index) => ({
      rank: index + 1,
      productId: item.productId,
      sku: item.sku,
      name: item.name,
      categoryName: item.categoryName || null,
      quantitySold: parseFloat(item.quantitySold || 0),
      revenue: parseFloat(item.revenue || 0),
      transactionCount: parseInt(item.transactionCount || 0),
      avgUnitPrice: parseFloat(item.avgUnitPrice || 0),
      profitMargin: null, // TODO: calcular margen de ganancia
    }));
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

    return {
      summary: {
        totalProducts: 0, // TODO: contar productos totales
        totalValue: 0, // TODO: calcular valor total
        lowStockCount: lowStockAlerts.filter(a => a.status === 'low').length,
        criticalStockCount: lowStockAlerts.filter(a => a.status === 'critical').length,
        overstockCount: 0, // TODO: detectar overstock
      },
      products: lowStockAlerts,
    };
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
    // TODO: implementar cálculo de stock actual y comparar con minimumStock
    return [];
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
