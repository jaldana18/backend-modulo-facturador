import { IsString, IsOptional, IsDateString, IsEnum, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

// Enums
export enum Granularity {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export enum SortBy {
  QUANTITY = 'quantity',
  REVENUE = 'revenue',
}

export enum StockLevel {
  ALL = 'all',
  LOW = 'low',
  CRITICAL = 'critical',
  OVERSTOCK = 'overstock',
}

export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
}

export enum ReportType {
  SALES_TIMELINE = 'sales_timeline',
  TOP_PRODUCTS = 'top_products',
  INVENTORY_STATUS = 'inventory_status',
  CATEGORY_PERFORMANCE = 'category_performance',
}

// Request DTOs
export class DashboardQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  warehouseId?: number;
}

export class TimelineQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsEnum(Granularity)
  granularity?: Granularity = Granularity.DAY;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  productId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  warehouseId?: number;
}

export class TopProductsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy = SortBy.REVENUE;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number;
}

export class CategoryPerformanceQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeSubcategories?: boolean = true;
}

export class ComparisonQueryDto {
  @IsDateString()
  period1Start: string;

  @IsDateString()
  period1End: string;

  @IsDateString()
  period2Start: string;

  @IsDateString()
  period2End: string;

  @IsOptional()
  @IsString()
  metric?: string = 'revenue';
}

export class InventoryStatusQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  warehouseId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsEnum(StockLevel)
  stockLevel?: StockLevel = StockLevel.ALL;
}

export class ExportRequestDto {
  @IsEnum(ReportType)
  reportType: ReportType;

  @IsEnum(ReportFormat)
  format: ReportFormat;

  @IsOptional()
  filters?: Record<string, any>;

  @IsOptional()
  options?: {
    includeCharts?: boolean;
    includeDetails?: boolean;
  };
}

// Response DTOs
export interface TopProductDto {
  rank: number;
  productId: number;
  sku: string;
  name: string;
  categoryName: string | null;
  quantitySold: number;
  revenue: number;
  transactionCount: number;
  avgUnitPrice: number;
  profitMargin: number | null;
}

export interface TopProductResponseDto {
  productId: number;
  name: string;
  revenue: number;
}

export interface DashboardResponseDto {
  totalSales: {
    amount: number;
    count: number;
    percentageChange: number;
  };
  topProducts: TopProductResponseDto[];
  categoriesPerformance: CategoryPerformanceDto[];
  lowStockAlerts: LowStockAlertDto[];
  recentTransactions: number;
  inventoryValue: number;
}

export interface TimelineDataPoint {
  date: string;
  totalSales: number;
  transactionCount: number;
  totalQuantity: number;
  avgTicket: number;
}

export interface TimelineResponseDto {
  data: TimelineDataPoint[];
  summary: {
    total: number;
    average: number;
    highest: number;
    lowest: number;
  };
}

export interface CategoryPerformanceDto {
  categoryId: number;
  name: string;
  parentCategory: string | null;
  revenue: number;
  quantity: number;
  transactionCount: number;
  percentageOfTotal: number;
  topProduct: TopProductResponseDto | null;
  subcategories: CategoryPerformanceDto[];
}

export interface PeriodComparisonDto {
  period1: {
    start: string;
    end: string;
    value: number;
    label: string;
  };
  period2: {
    start: string;
    end: string;
    value: number;
    label: string;
  };
  comparison: {
    absoluteChange: number;
    percentageChange: number;
    trend: 'up' | 'down' | 'stable';
  };
}

export interface LowStockAlertDto {
  productId: number;
  name: string;
  currentStock: number;
  minimumStock: number;
  reorderPoint: number;
  status: 'low' | 'critical';
  daysUntilStockout: number | null;
  recommendedOrderQuantity: number;
}

export interface InventoryStatusResponseDto {
  summary: {
    totalProducts: number;
    totalValue: number;
    lowStockCount: number;
    criticalStockCount: number;
    overstockCount: number;
  };
  products: LowStockAlertDto[];
}

export interface ExportResponseDto {
  downloadUrl: string;
  expiresAt: string;
  fileSize: number;
}
