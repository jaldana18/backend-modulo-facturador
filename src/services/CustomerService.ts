import { AppDataSource } from '../config/database';
import { Customer, CustomerType } from '../entities/Customer.entity';
import { CreateCustomerDto } from '../dto/customer/create-customer.dto';
import { UpdateCustomerDto } from '../dto/customer/update-customer.dto';
import { QueryCustomersDto } from '../dto/customer/query-customers.dto';
import { ApiError } from '../middleware/errorHandler.middleware';
import { loggers } from '../config/logger';
import { PaginatedResponse } from '../common.types';
import { ActivityType } from '../entities/ActivityLog.entity';

export class CustomerService {
  private customerRepository = AppDataSource.getRepository(Customer);

  /**
   * Generate unique customer code
   */
  private async generateCustomerCode(companyId: number): Promise<string> {
    const lastCustomer = await this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.companyId = :companyId', { companyId })
      .orderBy('customer.id', 'DESC')
      .getOne();

    if (!lastCustomer || !lastCustomer.code) {
      return `CLI-0001`;
    }

    // Extract number from code (e.g., CLI-0001 -> 1)
    const match = lastCustomer.code.match(/(\d+)$/);
    if (match) {
      const nextNumber = parseInt(match[1], 10) + 1;
      return `CLI-${nextNumber.toString().padStart(4, '0')}`;
    }

    return `CLI-0001`;
  }

  /**
   * Get all customers with pagination and filters
   */
  async getCustomers(
    companyId: number,
    query: QueryCustomersDto
  ): Promise<PaginatedResponse<Customer>> {
    const { page = 1, limit = 10, search, type, isActive } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.companyId = :companyId', { companyId });

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(customer.name LIKE :search OR customer.documentNumber LIKE :search OR customer.code LIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (type) {
      queryBuilder.andWhere('customer.customerType = :type', { type });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('customer.isActive = :isActive', { isActive });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get paginated results
    const customers = await queryBuilder
      .orderBy('customer.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      items: customers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(companyId: number, customerId: number): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId, companyId },
    });

    if (!customer) {
      throw new ApiError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
    }

    return customer;
  }

  /**
   * Create new customer
   */
  async createCustomer(companyId: number, userId: number, dto: CreateCustomerDto): Promise<Customer> {
    // Check if document number already exists
    const existingCustomer = await this.customerRepository.findOne({
      where: { companyId, documentNumber: dto.documentNumber },
    });

    if (existingCustomer) {
      throw new ApiError(
        409,
        'DOCUMENT_ALREADY_EXISTS',
        `Customer with document number "${dto.documentNumber}" already exists`
      );
    }

    // Generate code if not provided
    const code = dto.code || (await this.generateCustomerCode(companyId));

    // Check if code already exists
    const codeExists = await this.customerRepository.findOne({
      where: { companyId, code },
    });

    if (codeExists) {
      throw new ApiError(409, 'CODE_ALREADY_EXISTS', `Customer code "${code}" already exists`);
    }

    // Create customer (explicitly excluding id to prevent TypeORM insert issues)
    const customerData = {
      companyId,
      code,
      documentType: dto.documentType,
      documentNumber: dto.documentNumber,
      name: dto.name,
      email: dto.email || null,
      phone: dto.phone || null,
      address: dto.address || null,
      city: dto.city || null,
      state: dto.state || null,
      zipCode: dto.zipCode || null,
      creditLimit: dto.creditLimit || 0,
      currentBalance: 0,
      customerType: dto.customerType || CustomerType.RETAIL,
      taxResponsible: dto.taxResponsible || false,
      isActive: true,
      notes: dto.notes || null,
      metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
    };

    const customer = this.customerRepository.create(customerData);

    await this.customerRepository.save(customer);

    loggers.logOperation('customer_created', userId, companyId, {
      customerId: customer.id,
      code: customer.code,
      name: customer.name,
    });

    // Log user activity
    await loggers.logActivity({
      companyId,
      userId,
      activityType: ActivityType.CUSTOMER_CREATE,
      description: `Creó cliente ${customer.name} (${customer.code})`,
      entityType: 'customer',
      entityId: customer.id,
      entityName: customer.name,
      metadata: {
        code: customer.code,
        documentType: customer.documentType,
        documentNumber: customer.documentNumber,
        customerType: customer.customerType,
      },
    });

    return customer;
  }

  /**
   * Update customer
   */
  async updateCustomer(
    companyId: number,
    userId: number,
    customerId: number,
    dto: UpdateCustomerDto
  ): Promise<Customer> {
    // Get existing customer
    const customer = await this.getCustomerById(companyId, customerId);

    // If document number is being changed, check if new document exists
    if (dto.documentNumber && dto.documentNumber !== customer.documentNumber) {
      const existingCustomer = await this.customerRepository.findOne({
        where: { companyId, documentNumber: dto.documentNumber },
      });
      if (existingCustomer) {
        throw new ApiError(
          409,
          'DOCUMENT_ALREADY_EXISTS',
          `Customer with document number "${dto.documentNumber}" already exists`
        );
      }
    }

    // Update fields
    if (dto.documentType !== undefined) customer.documentType = dto.documentType;
    if (dto.documentNumber !== undefined) customer.documentNumber = dto.documentNumber;
    if (dto.name !== undefined) customer.name = dto.name;
    if (dto.email !== undefined) customer.email = dto.email || null;
    if (dto.phone !== undefined) customer.phone = dto.phone || null;
    if (dto.address !== undefined) customer.address = dto.address || null;
    if (dto.city !== undefined) customer.city = dto.city || null;
    if (dto.state !== undefined) customer.state = dto.state || null;
    if (dto.zipCode !== undefined) customer.zipCode = dto.zipCode || null;
    if (dto.creditLimit !== undefined) customer.creditLimit = dto.creditLimit;
    if (dto.customerType !== undefined) customer.customerType = dto.customerType;
    if (dto.taxResponsible !== undefined) customer.taxResponsible = dto.taxResponsible;
    if (dto.notes !== undefined) customer.notes = dto.notes || null;
    if (dto.metadata !== undefined) {
      customer.metadata = dto.metadata ? JSON.stringify(dto.metadata) : null;
    }

    await this.customerRepository.save(customer);

    loggers.logOperation('customer_updated', userId, companyId, {
      customerId: customer.id,
      code: customer.code,
    });

    // Log user activity
    await loggers.logActivity({
      companyId,
      userId,
      activityType: ActivityType.CUSTOMER_UPDATE,
      description: `Actualizó cliente ${customer.name} (${customer.code})`,
      entityType: 'customer',
      entityId: customer.id,
      entityName: customer.name,
      metadata: {
        code: customer.code,
        updatedFields: Object.keys(dto),
      },
    });

    return customer;
  }

  /**
   * Deactivate customer
   */
  async deactivateCustomer(companyId: number, userId: number, customerId: number): Promise<Customer> {
    const customer = await this.getCustomerById(companyId, customerId);

    customer.isActive = false;
    await this.customerRepository.save(customer);

    loggers.logOperation('customer_deactivated', userId, companyId, {
      customerId: customer.id,
      code: customer.code,
    });

    return customer;
  }

  /**
   * Activate customer
   */
  async activateCustomer(companyId: number, userId: number, customerId: number): Promise<Customer> {
    const customer = await this.getCustomerById(companyId, customerId);

    customer.isActive = true;
    await this.customerRepository.save(customer);

    loggers.logOperation('customer_activated', userId, companyId, {
      customerId: customer.id,
      code: customer.code,
    });

    return customer;
  }

  /**
   * Get customer sales history
   */
  async getCustomerSalesHistory(companyId: number, customerId: number): Promise<any> {
    // Verify customer exists
    await this.getCustomerById(companyId, customerId);

    // This will be implemented in Phase 2 when Sale entity is fully integrated
    return {
      customerId,
      totalSales: 0,
      totalAmount: 0,
      sales: [],
    };
  }

  /**
   * Update customer balance
   * Internal method used by SaleService and PaymentService
   */
  async updateCustomerBalance(
    companyId: number,
    customerId: number,
    amount: number
  ): Promise<void> {
    const customer = await this.getCustomerById(companyId, customerId);

    customer.currentBalance += amount;

    if (customer.currentBalance < 0) {
      customer.currentBalance = 0;
    }

    await this.customerRepository.save(customer);
  }
}
