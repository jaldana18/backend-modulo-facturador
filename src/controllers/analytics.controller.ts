import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import {
  DashboardQueryDto,
  TimelineQueryDto,
  TopProductsQueryDto,
  CategoryPerformanceQueryDto,
  ComparisonQueryDto,
  InventoryStatusQueryDto,
  WarehouseSalesQueryDto,
} from '../dto/analytics/analytics.dto';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: API de reportería y análisis de ventas
 */
export class AnalyticsController {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  /**
   * @swagger
   * /api/v1/analytics/dashboard:
   *   get:
   *     summary: Obtiene KPIs del dashboard principal
   *     tags: [Analytics]
   *     parameters:
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Fecha de inicio (ISO format)
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Fecha de fin (ISO format)
   *       - in: query
   *         name: warehouseId
   *         schema:
   *           type: integer
   *         description: ID del almacén (opcional)
   *     responses:
   *       200:
   *         description: Dashboard data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 totalSales:
   *                   type: object
   *                   properties:
   *                     amount:
   *                       type: number
   *                     count:
   *                       type: integer
   *                     percentageChange:
   *                       type: number
   *                 topProducts:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       productId:
   *                         type: integer
   *                       name:
   *                         type: string
   *                       revenue:
   *                         type: number
   */
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const { startDate, endDate, warehouseId } = req.query;

      const dashboard = await this.analyticsService.getDashboard(
        companyId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json(dashboard);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching dashboard data' });
    }
  }

  /**
   * @swagger
   * /api/v1/analytics/sales/timeline:
   *   get:
   *     summary: Obtiene timeline de ventas con granularidad configurable
   *     tags: [Analytics]
   *     parameters:
   *       - in: query
   *         name: startDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: Fecha de inicio
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *         description: Fecha de fin
   *       - in: query
   *         name: granularity
   *         schema:
   *           type: string
   *           enum: [day, week, month, year]
   *         description: Granularidad de la agrupación
   *       - in: query
   *         name: categoryId
   *         schema:
   *           type: integer
   *         description: Filtrar por categoría
   *       - in: query
   *         name: productId
   *         schema:
   *           type: integer
   *         description: Filtrar por producto
   *     responses:
   *       200:
   *         description: Timeline data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       date:
   *                         type: string
   *                       totalSales:
   *                         type: number
   *                       transactionCount:
   *                         type: integer
   *                       totalQuantity:
   *                         type: number
   *                       avgTicket:
   *                         type: number
   *                 summary:
   *                   type: object
   *                   properties:
   *                     total:
   *                       type: number
   *                     average:
   *                       type: number
   *                     highest:
   *                       type: number
   *                     lowest:
   *                       type: number
   */
  async getSalesTimeline(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const query = plainToClass(TimelineQueryDto, req.query);

      const errors = await validate(query);
      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const timeline = await this.analyticsService.getSalesTimeline(companyId, query);

      res.json(timeline);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching sales timeline' });
    }
  }

  /**
   * @swagger
   * /api/v1/analytics/products/top-selling:
   *   get:
   *     summary: Obtiene los productos más vendidos
   *     tags: [Analytics]
   *     parameters:
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [quantity, revenue]
   *           default: revenue
   *       - in: query
   *         name: categoryId
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Top selling products
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   rank:
   *                     type: integer
   *                   productId:
   *                     type: integer
   *                   sku:
   *                     type: string
   *                   name:
   *                     type: string
   *                   categoryName:
   *                     type: string
   *                   quantitySold:
   *                     type: number
   *                   revenue:
   *                     type: number
   *                   transactionCount:
   *                     type: integer
   *                   avgUnitPrice:
   *                     type: number
   *                   profitMargin:
   *                     type: number
   */
  async getTopSellingProducts(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const query = plainToClass(TopProductsQueryDto, req.query);

      const errors = await validate(query);
      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const products = await this.analyticsService.getTopSellingProducts(companyId, query);

      res.json(products);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching top products' });
    }
  }

  /**
   * @swagger
   * /api/v1/analytics/categories/performance:
   *   get:
   *     summary: Análisis de performance por categoría
   *     tags: [Analytics]
   *     parameters:
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: includeSubcategories
   *         schema:
   *           type: boolean
   *           default: true
   *     responses:
   *       200:
   *         description: Category performance data
   */
  async getCategoryPerformance(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const query = plainToClass(CategoryPerformanceQueryDto, req.query);

      const categories = await this.analyticsService.getCategoryPerformance(companyId, query);

      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching category performance' });
    }
  }

  /**
   * @swagger
   * /api/v1/analytics/sales/comparison:
   *   get:
   *     summary: Compara ventas entre dos períodos
   *     tags: [Analytics]
   *     parameters:
   *       - in: query
   *         name: period1Start
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: period1End
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: period2Start
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: period2End
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *     responses:
   *       200:
   *         description: Period comparison data
   */
  async comparePeriods(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const query = plainToClass(ComparisonQueryDto, req.query);

      const errors = await validate(query);
      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const comparison = await this.analyticsService.comparePeriods(
        companyId,
        new Date(query.period1Start),
        new Date(query.period1End),
        new Date(query.period2Start),
        new Date(query.period2End)
      );

      res.json(comparison);
    } catch (error) {
      res.status(500).json({ error: 'Error comparing periods' });
    }
  }

  /**
   * @swagger
   * /api/v1/analytics/inventory/status:
   *   get:
   *     summary: Estado de inventario con alertas de stock bajo
   *     tags: [Analytics]
   *     parameters:
   *       - in: query
   *         name: warehouseId
   *         schema:
   *           type: integer
   *       - in: query
   *         name: categoryId
   *         schema:
   *           type: integer
   *       - in: query
   *         name: stockLevel
   *         schema:
   *           type: string
   *           enum: [all, low, critical, overstock]
   *     responses:
   *       200:
   *         description: Inventory status data
   */
  async getInventoryStatus(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;

      const status = await this.analyticsService.getInventoryStatus(companyId);

      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching inventory status' });
    }
  }

  /**
   * @swagger
   * /api/v1/analytics/sales/by-warehouse:
   *   get:
   *     summary: Reporte de ventas por almacén/sucursal
   *     tags: [Analytics]
   *     parameters:
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Fecha de inicio (opcional, default últimos 30 días)
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Fecha de fin (opcional, default hoy)
   *       - in: query
   *         name: warehouseId
   *         schema:
   *           type: integer
   *         description: Filtrar por almacén específico (opcional)
   *       - in: query
   *         name: granularity
   *         schema:
   *           type: string
   *           enum: [day, week, month, year]
   *         description: Granularidad para agrupación temporal
   *       - in: query
   *         name: includeProducts
   *         schema:
   *           type: boolean
   *           default: false
   *         description: Incluir top 5 productos por almacén
   *     responses:
   *       200:
   *         description: Warehouse sales report
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 warehouses:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       warehouseId:
   *                         type: integer
   *                       warehouseName:
   *                         type: string
   *                       warehouseCode:
   *                         type: string
   *                       totalSales:
   *                         type: number
   *                       totalTransactions:
   *                         type: integer
   *                       totalQuantitySold:
   *                         type: number
   *                       avgTicket:
   *                         type: number
   *                       percentageOfTotal:
   *                         type: number
   *                       topProducts:
   *                         type: array
   *                         items:
   *                           type: object
   *                           properties:
   *                             productId:
   *                               type: integer
   *                             name:
   *                               type: string
   *                             revenue:
   *                               type: number
   *                 summary:
   *                   type: object
   *                   properties:
   *                     totalSales:
   *                       type: number
   *                     totalTransactions:
   *                       type: integer
   *                     totalWarehouses:
   *                       type: integer
   *                     avgSalesPerWarehouse:
   *                       type: number
   *                 period:
   *                   type: object
   *                   properties:
   *                     startDate:
   *                       type: string
   *                       format: date-time
   *                     endDate:
   *                       type: string
   *                       format: date-time
   */
  async getWarehouseSalesReport(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).user.companyId;
      const query = plainToClass(WarehouseSalesQueryDto, req.query);

      const errors = await validate(query);
      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const report = await this.analyticsService.getWarehouseSalesReport(companyId, query);

      res.json(report);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching warehouse sales report' });
    }
  }
}

export default new AnalyticsController();
