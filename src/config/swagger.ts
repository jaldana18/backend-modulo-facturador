import swaggerJsDoc from 'swagger-jsdoc';
import { config } from './environment';

const swaggerOptions: swaggerJsDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Inventory Management API',
      version: '1.0.0',
      description: 'Multi-company inventory management system with Node.js, TypeScript, SQL Server',
      contact: {
        name: 'API Support',
        email: 'support@inventory.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api/v1`,
        description: 'Development server',
      },
      {
        url: 'https://api.inventory.com/api/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: `Enter your JWT token in the format: Bearer <token>
          
Token includes:
- userId: User ID
- companyId: Company ID  
- email: User email
- role: User role (admin, manager, user)
- warehouseId: Warehouse ID (only for 'user' role, null for admin/manager)

Role-based warehouse access:
- admin/manager: Full access to all warehouses
- user: Restricted to assigned warehouse only`,
        },
      },
      schemas: {
        // Common schemas
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indicates if the request was successful',
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
            message: {
              type: 'string',
              description: 'Optional message',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Error code',
                },
                message: {
                  type: 'string',
                  description: 'Error message',
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                  },
                  description: 'Additional error details',
                },
              },
            },
          },
        },
        PaginationInfo: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Current page number',
            },
            limit: {
              type: 'integer',
              description: 'Items per page',
            },
            total: {
              type: 'integer',
              description: 'Total number of items',
            },
            totalPages: {
              type: 'integer',
              description: 'Total number of pages',
            },
          },
        },
        // Auth schemas
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'user@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'User password',
              example: 'SecurePass123!',
            },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              description: 'JWT access token',
            },
            refreshToken: {
              type: 'string',
              description: 'JWT refresh token',
            },
            user: {
              $ref: '#/components/schemas/User',
            },
          },
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
              description: 'JWT refresh token',
            },
          },
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['email', 'newPassword'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'user@example.com',
            },
            newPassword: {
              type: 'string',
              minLength: 6,
              description: 'New password (minimum 6 characters)',
              example: 'NewPassword123',
            },
          },
        },
        ResetPasswordResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Success message',
              example: 'Password reset successfully',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'User ID',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email',
            },
            firstName: {
              type: 'string',
              description: 'User first name',
            },
            lastName: {
              type: 'string',
              description: 'User last name',
            },
            role: {
              type: 'string',
              enum: ['admin', 'manager', 'user'],
              description: 'User role',
            },
            companyId: {
              type: 'integer',
              description: 'Company ID',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether user is active',
            },
          },
        },
        // Product schemas
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Product ID',
            },
            companyId: {
              type: 'integer',
              description: 'Company ID',
            },
            sku: {
              type: 'string',
              description: 'Product SKU',
            },
            name: {
              type: 'string',
              description: 'Product name',
            },
            description: {
              type: 'string',
              nullable: true,
              description: 'Product description',
            },
            category: {
              type: 'string',
              nullable: true,
              description: 'Product category',
            },
            price: {
              type: 'number',
              format: 'decimal',
              description: 'Product price',
            },
            cost: {
              type: 'number',
              format: 'decimal',
              nullable: true,
              description: 'Product cost',
            },
            minimumStock: {
              type: 'number',
              format: 'decimal',
              description: 'Minimum stock level',
            },
            unit: {
              type: 'string',
              description: 'Unit of measure',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether product is active',
            },
            imageUrl: {
              type: 'string',
              nullable: true,
              description: 'URL or relative path to product image',
              example: '/uploads/products/company-1/550e8400-e29b-41d4-a716-446655440000.jpg'
            },
            metadata: {
              type: 'object',
              nullable: true,
              description: 'Additional metadata',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        CreateProductRequest: {
          type: 'object',
          required: ['sku', 'name', 'price', 'unit'],
          properties: {
            sku: {
              type: 'string',
              maxLength: 50,
              description: 'Product SKU (unique within company)',
              example: 'PROD-001',
            },
            name: {
              type: 'string',
              maxLength: 200,
              description: 'Product name',
              example: 'Laptop Dell XPS 15',
            },
            description: {
              type: 'string',
              maxLength: 1000,
              description: 'Product description',
            },
            category: {
              type: 'string',
              maxLength: 100,
              description: 'Product category',
              example: 'Electronics',
            },
            price: {
              type: 'number',
              minimum: 0,
              description: 'Product price',
              example: 1299.99,
            },
            cost: {
              type: 'number',
              minimum: 0,
              description: 'Product cost',
              example: 999.99,
            },
            minimumStock: {
              type: 'number',
              minimum: 0,
              default: 0,
              description: 'Minimum stock level',
              example: 5,
            },
            unit: {
              type: 'string',
              maxLength: 20,
              description: 'Unit of measure',
              example: 'piece',
            },
            imageUrl: {
              type: 'string',
              nullable: true,
              maxLength: 500,
              description: 'URL or relative path to product image',
              example: '/uploads/products/company-1/550e8400-e29b-41d4-a716-446655440000.jpg'
            },
            initialStock: {
              type: 'number',
              minimum: 0,
              description: 'Initial stock quantity (optional). If provided, an ADJUSTMENT transaction will be created.',
              example: 100,
            },
            warehouseId: {
              type: 'number',
              description: 'Warehouse ID for initial stock (optional). If not provided, the default warehouse will be used.',
              example: 1,
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata',
            },
          },
        },
        UpdateProductRequest: {
          type: 'object',
          properties: {
            sku: {
              type: 'string',
              maxLength: 50,
              description: 'Product SKU',
            },
            name: {
              type: 'string',
              maxLength: 200,
              description: 'Product name',
            },
            description: {
              type: 'string',
              maxLength: 1000,
              description: 'Product description',
            },
            category: {
              type: 'string',
              maxLength: 100,
              description: 'Product category',
            },
            price: {
              type: 'number',
              minimum: 0,
              description: 'Product price',
            },
            cost: {
              type: 'number',
              minimum: 0,
              description: 'Product cost',
            },
            minimumStock: {
              type: 'number',
              minimum: 0,
              description: 'Minimum stock level',
            },
            unit: {
              type: 'string',
              maxLength: 20,
              description: 'Unit of measure',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether product is active',
            },
            imageUrl: {
              type: 'string',
              nullable: true,
              maxLength: 500,
              description: 'URL or relative path to product image',
              example: '/uploads/products/company-1/550e8400-e29b-41d4-a716-446655440000.jpg'
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata',
            },
          },
        },
        ProductImageUploadResponse: {
          type: 'object',
          properties: {
            imageUrl: {
              type: 'string',
              description: 'Relative URL to the uploaded image',
              example: '/uploads/products/company-1/550e8400-e29b-41d4-a716-446655440000.jpg'
            },
            filename: {
              type: 'string',
              description: 'Generated filename with UUID',
              example: '550e8400-e29b-41d4-a716-446655440000.jpg'
            },
            size: {
              type: 'integer',
              description: 'File size in bytes',
              example: 245680
            },
            mimetype: {
              type: 'string',
              description: 'File MIME type',
              example: 'image/jpeg'
            }
          }
        },
        // Warehouse schemas
        Warehouse: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Warehouse ID',
            },
            companyId: {
              type: 'integer',
              description: 'Company ID',
            },
            code: {
              type: 'string',
              description: 'Warehouse code',
            },
            name: {
              type: 'string',
              description: 'Warehouse name',
            },
            description: {
              type: 'string',
              nullable: true,
              description: 'Warehouse description',
            },
            address: {
              type: 'string',
              nullable: true,
              description: 'Warehouse address',
            },
            city: {
              type: 'string',
              nullable: true,
              description: 'City',
            },
            state: {
              type: 'string',
              nullable: true,
              description: 'State',
            },
            zip: {
              type: 'string',
              nullable: true,
              description: 'ZIP code',
            },
            country: {
              type: 'string',
              nullable: true,
              description: 'Country',
            },
            phone: {
              type: 'string',
              nullable: true,
              description: 'Phone number',
            },
            email: {
              type: 'string',
              nullable: true,
              description: 'Email',
            },
            managerName: {
              type: 'string',
              nullable: true,
              description: 'Manager name',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether warehouse is active',
            },
            isMain: {
              type: 'boolean',
              description: 'Whether this is the main warehouse',
            },
            metadata: {
              type: 'object',
              nullable: true,
              description: 'Additional metadata',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        CreateWarehouseRequest: {
          type: 'object',
          required: ['code', 'name'],
          properties: {
            code: {
              type: 'string',
              maxLength: 50,
              description: 'Warehouse code (unique within company)',
              example: 'WH-001',
            },
            name: {
              type: 'string',
              maxLength: 200,
              description: 'Warehouse name',
              example: 'Main Warehouse',
            },
            description: {
              type: 'string',
              maxLength: 500,
              description: 'Warehouse description',
            },
            address: {
              type: 'string',
              maxLength: 100,
              description: 'Address',
            },
            city: {
              type: 'string',
              maxLength: 100,
              description: 'City',
            },
            state: {
              type: 'string',
              maxLength: 100,
              description: 'State',
            },
            zip: {
              type: 'string',
              maxLength: 20,
              description: 'ZIP code',
            },
            country: {
              type: 'string',
              maxLength: 100,
              description: 'Country',
            },
            phone: {
              type: 'string',
              maxLength: 50,
              description: 'Phone number',
            },
            email: {
              type: 'string',
              maxLength: 200,
              format: 'email',
              description: 'Email',
            },
            managerName: {
              type: 'string',
              maxLength: 200,
              description: 'Manager name',
            },
            isMain: {
              type: 'boolean',
              description: 'Set as main warehouse',
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata',
            },
          },
        },
        UpdateWarehouseRequest: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              maxLength: 50,
              description: 'Warehouse code',
            },
            name: {
              type: 'string',
              maxLength: 200,
              description: 'Warehouse name',
            },
            description: {
              type: 'string',
              maxLength: 500,
              description: 'Warehouse description',
            },
            address: {
              type: 'string',
              maxLength: 100,
              description: 'Address',
            },
            city: {
              type: 'string',
              maxLength: 100,
              description: 'City',
            },
            state: {
              type: 'string',
              maxLength: 100,
              description: 'State',
            },
            zip: {
              type: 'string',
              maxLength: 20,
              description: 'ZIP code',
            },
            country: {
              type: 'string',
              maxLength: 100,
              description: 'Country',
            },
            phone: {
              type: 'string',
              maxLength: 50,
              description: 'Phone number',
            },
            email: {
              type: 'string',
              maxLength: 200,
              format: 'email',
              description: 'Email',
            },
            managerName: {
              type: 'string',
              maxLength: 200,
              description: 'Manager name',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether warehouse is active',
            },
            isMain: {
              type: 'boolean',
              description: 'Set as main warehouse',
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata',
            },
          },
        },
        // Inventory Transaction schemas
        InventoryTransaction: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Transaction ID',
            },
            companyId: {
              type: 'integer',
              description: 'Company ID',
            },
            productId: {
              type: 'integer',
              description: 'Product ID',
            },
            userId: {
              type: 'integer',
              description: 'User ID who created the transaction',
            },
            warehouseId: {
              type: 'integer',
              nullable: true,
              description: 'Warehouse ID',
            },
            type: {
              type: 'string',
              enum: ['inbound', 'outbound', 'adjustment', 'transfer'],
              description: 'Transaction type',
            },
            reason: {
              type: 'string',
              enum: [
                'purchase',
                'sale',
                'return',
                'damaged',
                'lost',
                'found',
                'correction',
                'initial_stock',
                'transfer_in',
                'transfer_out',
                'other',
              ],
              description: 'Transaction reason',
            },
            quantity: {
              type: 'number',
              format: 'decimal',
              description: 'Transaction quantity (positive for inbound, negative for outbound)',
            },
            previousStock: {
              type: 'number',
              format: 'decimal',
              description: 'Stock level before transaction',
            },
            newStock: {
              type: 'number',
              format: 'decimal',
              description: 'Stock level after transaction',
            },
            unitCost: {
              type: 'number',
              format: 'decimal',
              nullable: true,
              description: 'Cost per unit',
            },
            totalCost: {
              type: 'number',
              format: 'decimal',
              nullable: true,
              description: 'Total transaction cost',
            },
            reference: {
              type: 'string',
              nullable: true,
              description: 'Reference number (order, invoice, etc.)',
            },
            location: {
              type: 'string',
              nullable: true,
              description: 'Warehouse location',
            },
            notes: {
              type: 'string',
              nullable: true,
              description: 'Additional notes',
            },
            metadata: {
              type: 'object',
              nullable: true,
              description: 'Additional metadata',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Transaction timestamp',
            },
          },
        },
        CreateTransactionRequest: {
          type: 'object',
          required: ['productId', 'type', 'reason', 'quantity'],
          properties: {
            productId: {
              type: 'integer',
              description: 'Product ID',
              example: 1,
            },
            warehouseId: {
              type: 'integer',
              description: 'Warehouse ID (optional, uses main warehouse if not specified). ALWAYS saved in database.',
              example: 1,
            },
            type: {
              type: 'string',
              enum: ['inbound', 'outbound', 'adjustment', 'transfer'],
              description: 'Transaction type',
              example: 'inbound',
            },
            reason: {
              type: 'string',
              enum: [
                'purchase',
                'sale',
                'return',
                'damaged',
                'lost',
                'found',
                'correction',
                'initial_stock',
                'transfer_in',
                'transfer_out',
                'other',
              ],
              description: 'Transaction reason',
              example: 'purchase',
            },
            quantity: {
              type: 'number',
              description: 'Quantity',
              example: 100,
            },
            unitCost: {
              type: 'number',
              minimum: 0,
              description: 'Cost per unit',
              example: 10.5,
            },
            reference: {
              type: 'string',
              maxLength: 100,
              description: 'Reference number',
              example: 'PO-12345',
            },
            location: {
              type: 'string',
              maxLength: 100,
              description: 'Warehouse location',
              example: 'Shelf A-12',
            },
            notes: {
              type: 'string',
              maxLength: 500,
              description: 'Additional notes',
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata',
            },
          },
        },
        AdjustStockRequest: {
          type: 'object',
          required: ['productId', 'newStock', 'reason'],
          properties: {
            productId: {
              type: 'integer',
              description: 'Product ID',
              example: 1,
            },
            warehouseId: {
              type: 'integer',
              description: 'Warehouse ID (optional)',
              example: 1,
            },
            newStock: {
              type: 'number',
              minimum: 0,
              description: 'New stock level',
              example: 150,
            },
            reason: {
              type: 'string',
              enum: [
                'purchase',
                'sale',
                'return',
                'damaged',
                'lost',
                'found',
                'correction',
                'initial_stock',
                'transfer_in',
                'transfer_out',
                'other',
              ],
              description: 'Adjustment reason',
              example: 'correction',
            },
            notes: {
              type: 'string',
              maxLength: 500,
              description: 'Additional notes',
            },
          },
        },
        TransferWarehouseRequest: {
          type: 'object',
          required: ['productId', 'fromWarehouseId', 'toWarehouseId', 'quantity'],
          properties: {
            productId: {
              type: 'integer',
              description: 'Product ID',
              example: 1,
            },
            fromWarehouseId: {
              type: 'integer',
              description: 'Source warehouse ID',
              example: 1,
            },
            toWarehouseId: {
              type: 'integer',
              description: 'Destination warehouse ID',
              example: 2,
            },
            quantity: {
              type: 'number',
              minimum: 0.01,
              description: 'Quantity to transfer',
              example: 50,
            },
            reference: {
              type: 'string',
              maxLength: 100,
              description: 'Reference number',
              example: 'TRF-001',
            },
            notes: {
              type: 'string',
              maxLength: 500,
              description: 'Transfer notes',
            },
          },
        },
        BulkTransactionRequest: {
          type: 'object',
          required: ['warehouseId', 'items', 'reason'],
          properties: {
            warehouseId: {
              type: 'integer',
              description: 'Warehouse ID (REQUIRED for bulk operations)',
              example: 2,
            },
            items: {
              type: 'array',
              description: 'Array of transaction items',
              items: {
                type: 'object',
                required: ['productId', 'quantity'],
                properties: {
                  productId: {
                    type: 'integer',
                    description: 'Product ID',
                    example: 1,
                  },
                  quantity: {
                    type: 'number',
                    minimum: 0.0001,
                    description: 'Quantity',
                    example: 100,
                  },
                  unitCost: {
                    type: 'number',
                    minimum: 0,
                    description: 'Unit cost (for inbound)',
                    example: 15.50,
                  },
                  reference: {
                    type: 'string',
                    maxLength: 100,
                    description: 'Reference number',
                    example: 'FAC-001',
                  },
                },
              },
            },
            reason: {
              type: 'string',
              enum: [
                'purchase',
                'sale',
                'return',
                'damaged',
                'lost',
                'found',
                'correction',
                'initial_stock',
                'transfer_in',
                'transfer_out',
                'other',
              ],
              description: 'Transaction reason',
              example: 'purchase',
            },
            notes: {
              type: 'string',
              maxLength: 500,
              description: 'Additional notes',
            },
          },
        },
        StockSummary: {
          type: 'object',
          properties: {
            productId: {
              type: 'integer',
              description: 'Product ID',
            },
            currentStock: {
              type: 'number',
              description: 'Current stock level',
            },
            totalInbound: {
              type: 'number',
              description: 'Total inbound quantity',
            },
            totalOutbound: {
              type: 'number',
              description: 'Total outbound quantity',
            },
            totalAdjustments: {
              type: 'number',
              description: 'Total adjustments',
            },
            lastTransaction: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Last transaction date',
            },
          },
        },
        WarehouseSummary: {
          type: 'object',
          properties: {
            warehouse: {
              type: 'object',
              properties: {
                id: {
                  type: 'integer',
                  description: 'Warehouse ID',
                },
                code: {
                  type: 'string',
                  description: 'Warehouse code',
                },
                name: {
                  type: 'string',
                  description: 'Warehouse name',
                },
                isMain: {
                  type: 'boolean',
                  description: 'Is main warehouse',
                },
                address: {
                  type: 'string',
                  description: 'Full address',
                },
                managerName: {
                  type: 'string',
                  nullable: true,
                  description: 'Manager name',
                },
              },
            },
            stats: {
              type: 'object',
              properties: {
                currentStock: {
                  type: 'number',
                  description: 'Total current stock',
                },
                totalInbound: {
                  type: 'number',
                  description: 'Total inbound quantity',
                },
                totalOutbound: {
                  type: 'number',
                  description: 'Total outbound quantity',
                },
                totalAdjustments: {
                  type: 'number',
                  description: 'Total adjustments',
                },
                uniqueProducts: {
                  type: 'integer',
                  description: 'Number of unique products',
                },
                transactionCount: {
                  type: 'integer',
                  description: 'Total number of transactions',
                },
              },
            },
            lastActivity: {
              type: 'object',
              nullable: true,
              properties: {
                date: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Last activity date',
                },
                type: {
                  type: 'string',
                  description: 'Transaction type',
                },
                reason: {
                  type: 'string',
                  description: 'Transaction reason',
                },
              },
            },
          },
        },
        WarehouseDetailedSummary: {
          type: 'object',
          properties: {
            warehouse: {
              type: 'object',
              properties: {
                id: {
                  type: 'integer',
                },
                code: {
                  type: 'string',
                },
                name: {
                  type: 'string',
                },
                isMain: {
                  type: 'boolean',
                },
                address: {
                  type: 'string',
                },
                managerName: {
                  type: 'string',
                  nullable: true,
                },
                phone: {
                  type: 'string',
                  nullable: true,
                },
                email: {
                  type: 'string',
                  nullable: true,
                },
              },
            },
            stats: {
              type: 'object',
              properties: {
                currentStock: {
                  type: 'number',
                },
                totalInbound: {
                  type: 'number',
                },
                totalOutbound: {
                  type: 'number',
                },
                totalAdjustments: {
                  type: 'number',
                },
                uniqueProducts: {
                  type: 'integer',
                },
                transactionCount: {
                  type: 'integer',
                },
              },
            },
            products: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: {
                    type: 'integer',
                  },
                  productName: {
                    type: 'string',
                  },
                  productSku: {
                    type: 'string',
                    nullable: true,
                  },
                  currentStock: {
                    type: 'number',
                  },
                  lastUpdated: {
                    type: 'string',
                    format: 'date-time',
                  },
                },
              },
            },
            recentTransactions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'integer',
                  },
                  type: {
                    type: 'string',
                  },
                  reason: {
                    type: 'string',
                  },
                  quantity: {
                    type: 'number',
                  },
                  productName: {
                    type: 'string',
                  },
                  reference: {
                    type: 'string',
                    nullable: true,
                  },
                  createdAt: {
                    type: 'string',
                    format: 'date-time',
                  },
                },
              },
            },
          },
        },
        Company: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Company ID',
            },
            name: {
              type: 'string',
              description: 'Company name',
            },
            legalName: {
              type: 'string',
              nullable: true,
              description: 'Legal company name',
            },
            taxId: {
              type: 'string',
              description: 'Tax ID (encrypted)',
            },
            email: {
              type: 'string',
              format: 'email',
              nullable: true,
              description: 'Company email',
            },
            phone: {
              type: 'string',
              nullable: true,
              description: 'Company phone',
            },
            address: {
              type: 'string',
              nullable: true,
              description: 'Company address',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether company is active',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Category ID',
            },
            companyId: {
              type: 'integer',
              description: 'Company ID',
            },
            name: {
              type: 'string',
              maxLength: 100,
              description: 'Category name',
            },
            description: {
              type: 'string',
              maxLength: 500,
              nullable: true,
              description: 'Category description',
            },
            color: {
              type: 'string',
              maxLength: 50,
              nullable: true,
              description: 'Hex color for UI (e.g., #3B82F6)',
              example: '#3B82F6',
            },
            icon: {
              type: 'string',
              maxLength: 50,
              nullable: true,
              description: 'Icon name for UI (e.g., laptop, box)',
              example: 'laptop',
            },
            sortOrder: {
              type: 'integer',
              description: 'Sort order for display',
              default: 0,
            },
            isActive: {
              type: 'boolean',
              description: 'Whether category is active',
              default: true,
            },
            parentId: {
              type: 'integer',
              nullable: true,
              description: 'Parent category ID for hierarchical categories',
            },
            parent: {
              $ref: '#/components/schemas/Category',
              nullable: true,
              description: 'Parent category object',
            },
            productCount: {
              type: 'integer',
              description: 'Number of active products in this category',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        UserModel: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'User ID',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email',
            },
            firstName: {
              type: 'string',
              description: 'First name',
            },
            lastName: {
              type: 'string',
              description: 'Last name',
            },
            role: {
              type: 'string',
              enum: ['admin', 'user'],
              description: 'User role',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether user is active',
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Last login timestamp',
            },
            companyId: {
              type: 'integer',
              description: 'Company ID',
            },
            company: {
              $ref: '#/components/schemas/Company',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        CreateUserRequest: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              maxLength: 200,
              description: 'User email',
            },
            password: {
              type: 'string',
              minLength: 8,
              maxLength: 100,
              description: 'User password (min 8 chars, must contain uppercase, lowercase, number)',
            },
            firstName: {
              type: 'string',
              maxLength: 100,
              description: 'First name',
            },
            lastName: {
              type: 'string',
              maxLength: 100,
              description: 'Last name',
            },
            role: {
              type: 'string',
              enum: ['admin', 'user'],
              description: 'User role',
            },
          },
        },
        UpdateUserRequest: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              maxLength: 200,
              description: 'User email',
            },
            firstName: {
              type: 'string',
              maxLength: 100,
              description: 'First name',
            },
            lastName: {
              type: 'string',
              maxLength: 100,
              description: 'Last name',
            },
            role: {
              type: 'string',
              enum: ['admin', 'user'],
              description: 'User role',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether user is active',
            },
          },
        },
        // Audit Log schemas
        AuditLog: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Audit log ID',
            },
            companyId: {
              type: 'integer',
              description: 'Company ID',
            },
            userId: {
              type: 'integer',
              nullable: true,
              description: 'User ID who performed the action',
            },
            user: {
              type: 'object',
              description: 'User who performed the action',
              properties: {
                id: { type: 'integer' },
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
              },
            },
            action: {
              type: 'string',
              description: 'Action type (CREATE, UPDATE, DELETE, ACTIVATE, etc.)',
              example: 'CREATE',
            },
            entityType: {
              type: 'string',
              description: 'Entity type (Product, User, Customer, etc.)',
              example: 'Product',
            },
            entityId: {
              type: 'integer',
              nullable: true,
              description: 'ID of the affected entity',
            },
            description: {
              type: 'string',
              description: 'Human-readable description of the action',
              example: 'Usuario creó producto \'Laptop Dell XPS 15\' (SKU: PROD-001)',
            },
            ipAddress: {
              type: 'string',
              nullable: true,
              description: 'IP address of the user',
            },
            userAgent: {
              type: 'string',
              nullable: true,
              description: 'User agent string',
            },
            oldValues: {
              type: 'string',
              nullable: true,
              description: 'Previous values before change (JSON string)',
            },
            newValues: {
              type: 'string',
              nullable: true,
              description: 'New values after change (JSON string)',
            },
            metadata: {
              type: 'string',
              nullable: true,
              description: 'Additional metadata (JSON string)',
            },
            severity: {
              type: 'string',
              enum: ['info', 'warning', 'critical'],
              description: 'Severity level of the action',
            },
            module: {
              type: 'string',
              nullable: true,
              description: 'Module where action occurred',
              example: 'inventory',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when action was performed',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'Authentication and authorization endpoints',
      },
      {
        name: 'Products',
        description: 'Product management endpoints',
      },
      {
        name: 'Bulk Products',
        description: 'Bulk product upload and management endpoints',
      },
      {
        name: 'Warehouses',
        description: 'Warehouse configuration and CRUD endpoints',
      },
      {
        name: 'Inventory',
        description: 'Inventory transaction and stock management endpoints. Note: Users with role "user" are restricted to their assigned warehouse.',
      },
      {
        name: 'Warehouse Management',
        description: 'Warehouse inventory administration - summary reports and multi-warehouse operations for dashboard and reporting',
      },
      {
        name: 'Bulk Inventory',
        description: 'Bulk inventory upload operations (Excel-based)',
      },
      {
        name: 'Companies',
        description: 'Company management endpoints',
      },
      {
        name: 'Users',
        description: 'User management endpoints',
      },
      {
        name: 'Categories',
        description: 'Product category management endpoints',
      },
      {
        name: 'Audit Logs Database',
        description: 'Database-backed audit log endpoints for tracking all user actions with optimized queries and filtering',
      },
    ],
  },
  apis: [
    './src/routes/*.ts', // Path to route files for JSDoc comments
    './src/docs/*.ts', // Path to documentation files
  ],
};

export const swaggerSpec = swaggerJsDoc(swaggerOptions);
