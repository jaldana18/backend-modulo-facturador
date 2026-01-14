import { Request } from 'express';
import { AuditLogDatabaseService } from '../services/AuditLogDatabaseService';

/**
 * Singleton instance of audit log service
 */
const auditLogService = new AuditLogDatabaseService();

/**
 * Audit log action types
 */
export enum AuditAction {
  // CRUD operations
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  READ = 'READ',

  // Status changes
  ACTIVATE = 'ACTIVATE',
  DEACTIVATE = 'DEACTIVATE',

  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_RESET = 'PASSWORD_RESET',

  // Inventory operations
  STOCK_IN = 'STOCK_IN',
  STOCK_OUT = 'STOCK_OUT',
  STOCK_ADJUSTMENT = 'STOCK_ADJUSTMENT',
  STOCK_TRANSFER = 'STOCK_TRANSFER',

  // Sales operations
  SALE_CREATED = 'SALE_CREATED',
  SALE_CANCELLED = 'SALE_CANCELLED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',

  // Bulk operations
  BULK_IMPORT = 'BULK_IMPORT',
  BULK_UPDATE = 'BULK_UPDATE',
  BULK_DELETE = 'BULK_DELETE',

  // Configuration
  CONFIG_CHANGE = 'CONFIG_CHANGE',
}

/**
 * Entity types for audit logging
 */
export enum AuditEntity {
  USER = 'User',
  PRODUCT = 'Product',
  CUSTOMER = 'Customer',
  WAREHOUSE = 'Warehouse',
  INVENTORY_TRANSACTION = 'InventoryTransaction',
  SALE = 'Sale',
  SALE_DETAIL = 'SaleDetail',
  PAYMENT = 'Payment',
  PAYMENT_METHOD = 'PaymentMethod',
  CATEGORY = 'Category',
  UNIT_OF_MEASURE = 'UnitOfMeasure',
  COMPANY = 'Company',
  BATCH = 'InventoryBatch',
}

/**
 * Module types
 */
export enum AuditModule {
  AUTH = 'auth',
  INVENTORY = 'inventory',
  PRODUCTS = 'products',
  SALES = 'sales',
  USERS = 'users',
  CUSTOMERS = 'customers',
  WAREHOUSES = 'warehouses',
  PAYMENTS = 'payments',
  REPORTS = 'reports',
  SETTINGS = 'settings',
}

/**
 * Helper function to log audit actions
 */
export async function logAudit(
  req: Request,
  action: AuditAction,
  entity: AuditEntity,
  description: string,
  options?: {
    entityId?: number;
    oldValues?: any;
    newValues?: any;
    metadata?: any;
    severity?: 'info' | 'warning' | 'critical';
    module?: AuditModule;
  }
): Promise<void> {
  try {
    await auditLogService.logAction(req, action, entity, description, {
      entityId: options?.entityId,
      oldValues: options?.oldValues,
      newValues: options?.newValues,
      metadata: options?.metadata,
      severity: options?.severity,
      module: options?.module,
    });
  } catch (error) {
    // Log error but don't fail the main operation
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Log user creation
 */
export async function logUserCreation(
  req: Request,
  userId: number,
  userData: { email: string; firstName: string; lastName: string; role: string }
): Promise<void> {
  await logAudit(
    req,
    AuditAction.CREATE,
    AuditEntity.USER,
    `Usuario creado: ${userData.firstName} ${userData.lastName} (${userData.email})`,
    {
      entityId: userId,
      newValues: userData,
      severity: 'info',
      module: AuditModule.USERS,
    }
  );
}

/**
 * Log user update
 */
export async function logUserUpdate(
  req: Request,
  userId: number,
  oldData: any,
  newData: any,
  userName: string
): Promise<void> {
  await logAudit(
    req,
    AuditAction.UPDATE,
    AuditEntity.USER,
    `Usuario actualizado: ${userName}`,
    {
      entityId: userId,
      oldValues: oldData,
      newValues: newData,
      severity: 'info',
      module: AuditModule.USERS,
    }
  );
}

/**
 * Log user activation/deactivation
 */
export async function logUserStatusChange(
  req: Request,
  userId: number,
  userName: string,
  isActive: boolean
): Promise<void> {
  await logAudit(
    req,
    isActive ? AuditAction.ACTIVATE : AuditAction.DEACTIVATE,
    AuditEntity.USER,
    `Usuario ${isActive ? 'activado' : 'desactivado'}: ${userName}`,
    {
      entityId: userId,
      newValues: { isActive },
      severity: 'warning',
      module: AuditModule.USERS,
    }
  );
}

/**
 * Log product creation
 */
export async function logProductCreation(
  req: Request,
  productId: number,
  productData: { sku: string; name: string; price: number }
): Promise<void> {
  await logAudit(
    req,
    AuditAction.CREATE,
    AuditEntity.PRODUCT,
    `Producto creado: ${productData.name} (SKU: ${productData.sku})`,
    {
      entityId: productId,
      newValues: productData,
      severity: 'info',
      module: AuditModule.PRODUCTS,
    }
  );
}

/**
 * Log product update
 */
export async function logProductUpdate(
  req: Request,
  productId: number,
  oldData: any,
  newData: any,
  productName: string
): Promise<void> {
  await logAudit(
    req,
    AuditAction.UPDATE,
    AuditEntity.PRODUCT,
    `Producto actualizado: ${productName}`,
    {
      entityId: productId,
      oldValues: oldData,
      newValues: newData,
      severity: 'info',
      module: AuditModule.PRODUCTS,
    }
  );
}

/**
 * Log product status change
 */
export async function logProductStatusChange(
  req: Request,
  productId: number,
  productName: string,
  isActive: boolean
): Promise<void> {
  await logAudit(
    req,
    isActive ? AuditAction.ACTIVATE : AuditAction.DEACTIVATE,
    AuditEntity.PRODUCT,
    `Producto ${isActive ? 'activado' : 'desactivado'}: ${productName}`,
    {
      entityId: productId,
      newValues: { isActive },
      severity: 'warning',
      module: AuditModule.PRODUCTS,
    }
  );
}

/**
 * Log inventory transaction
 */
export async function logInventoryTransaction(
  req: Request,
  transactionId: number,
  type: string,
  productName: string,
  quantity: number,
  warehouseId?: number
): Promise<void> {
  const actionMap: Record<string, AuditAction> = {
    inbound: AuditAction.STOCK_IN,
    outbound: AuditAction.STOCK_OUT,
    adjustment: AuditAction.STOCK_ADJUSTMENT,
    transfer: AuditAction.STOCK_TRANSFER,
  };

  await logAudit(
    req,
    actionMap[type] || AuditAction.UPDATE,
    AuditEntity.INVENTORY_TRANSACTION,
    `${type === 'inbound' ? 'Entrada' : type === 'outbound' ? 'Salida' : type === 'adjustment' ? 'Ajuste' : 'Transferencia'} de inventario: ${productName} (${quantity} unidades)`,
    {
      entityId: transactionId,
      newValues: { type, quantity, productName },
      metadata: { warehouseId },
      severity: 'info',
      module: AuditModule.INVENTORY,
    }
  );
}

/**
 * Log customer creation
 */
export async function logCustomerCreation(
  req: Request,
  customerId: number,
  customerData: { name: string; email?: string }
): Promise<void> {
  await logAudit(
    req,
    AuditAction.CREATE,
    AuditEntity.CUSTOMER,
    `Cliente creado: ${customerData.name}${customerData.email ? ` (${customerData.email})` : ''}`,
    {
      entityId: customerId,
      newValues: customerData,
      severity: 'info',
      module: AuditModule.CUSTOMERS,
    }
  );
}

/**
 * Log customer update
 */
export async function logCustomerUpdate(
  req: Request,
  customerId: number,
  oldData: any,
  newData: any,
  customerName: string
): Promise<void> {
  await logAudit(
    req,
    AuditAction.UPDATE,
    AuditEntity.CUSTOMER,
    `Cliente actualizado: ${customerName}`,
    {
      entityId: customerId,
      oldValues: oldData,
      newValues: newData,
      severity: 'info',
      module: AuditModule.CUSTOMERS,
    }
  );
}

/**
 * Log warehouse creation
 */
export async function logWarehouseCreation(
  req: Request,
  warehouseId: number,
  warehouseData: { code: string; name: string }
): Promise<void> {
  await logAudit(
    req,
    AuditAction.CREATE,
    AuditEntity.WAREHOUSE,
    `Almacén creado: ${warehouseData.name} (${warehouseData.code})`,
    {
      entityId: warehouseId,
      newValues: warehouseData,
      severity: 'info',
      module: AuditModule.WAREHOUSES,
    }
  );
}

/**
 * Log warehouse update
 */
export async function logWarehouseUpdate(
  req: Request,
  warehouseId: number,
  oldData: any,
  newData: any,
  warehouseName: string
): Promise<void> {
  await logAudit(
    req,
    AuditAction.UPDATE,
    AuditEntity.WAREHOUSE,
    `Almacén actualizado: ${warehouseName}`,
    {
      entityId: warehouseId,
      oldValues: oldData,
      newValues: newData,
      severity: 'info',
      module: AuditModule.WAREHOUSES,
    }
  );
}

/**
 * Log sale creation
 */
export async function logSaleCreation(
  req: Request,
  saleId: number,
  customerName: string,
  total: number
): Promise<void> {
  await logAudit(
    req,
    AuditAction.SALE_CREATED,
    AuditEntity.SALE,
    `Venta creada para ${customerName} por $${total.toFixed(2)}`,
    {
      entityId: saleId,
      newValues: { customerName, total },
      severity: 'info',
      module: AuditModule.SALES,
    }
  );
}

/**
 * Log authentication attempt
 */
export async function logAuthAttempt(
  req: Request,
  success: boolean,
  email: string,
  userId?: number
): Promise<void> {
  await logAudit(
    req,
    success ? AuditAction.LOGIN : AuditAction.LOGIN_FAILED,
    AuditEntity.USER,
    success ? `Inicio de sesión exitoso: ${email}` : `Intento de inicio de sesión fallido: ${email}`,
    {
      entityId: userId,
      severity: success ? 'info' : 'warning',
      module: AuditModule.AUTH,
    }
  );
}

/**
 * Log bulk operations
 */
export async function logBulkOperation(
  req: Request,
  action: AuditAction,
  entity: AuditEntity,
  count: number,
  description: string,
  module: AuditModule
): Promise<void> {
  await logAudit(
    req,
    action,
    entity,
    `${description} (${count} registros)`,
    {
      metadata: { count },
      severity: 'warning',
      module,
    }
  );
}
