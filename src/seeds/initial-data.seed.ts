import { AppDataSource } from '../config/database';
import { Company } from '../entities/Company.entity';
import { User } from '../entities/User.entity';
import { Product } from '../entities/Product.entity';
import { logger } from '../config/logger';

/**
 * Seed initial data for development/testing
 * This creates a demo company and admin user
 */
export const seedInitialData = async () => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const companyRepo = AppDataSource.getRepository(Company);
    const userRepo = AppDataSource.getRepository(User);
    const productRepo = AppDataSource.getRepository(Product);

    // Check if data already exists
    const existingCompany = await companyRepo.findOne({ where: {} });
    if (existingCompany) {
      logger.info('✅ Initial data already exists, skipping seed');
      return;
    }

    logger.info('🌱 Seeding initial data...');

    // Create demo company
    const company = companyRepo.create({
      name: 'Demo Company',
      legalName: 'Demo Company Inc.',
      taxId: '12345678-9', // Will be encrypted
      email: 'contact@democompany.com',
      phone: '+1-555-0100',
      address: '123 Demo Street, Demo City, DC 12345',
      isActive: true,
      settings: JSON.stringify({
        currency: 'USD',
        timezone: 'America/New_York',
        locale: 'en-US',
      }),
    });

    await companyRepo.save(company);
    logger.info(`✅ Created company: ${company.name} (ID: ${company.id})`);

    // Create admin user
    const adminUser = userRepo.create({
      companyId: company.id,
      email: 'admin@democompany.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
    });

    // Set password (will be hashed by entity hook)
    adminUser.setPassword('Admin123!');
    await userRepo.save(adminUser);

    logger.info(`✅ Created admin user: ${adminUser.email}`);
    logger.info('📝 Login credentials:');
    logger.info('   Email: admin@democompany.com');
    logger.info('   Password: Admin123!');

    // Create manager user
    const managerUser = userRepo.create({
      companyId: company.id,
      email: 'manager@democompany.com',
      firstName: 'Manager',
      lastName: 'User',
      role: 'manager',
      isActive: true,
    });

    managerUser.setPassword('Manager123!');
    await userRepo.save(managerUser);

    logger.info(`✅ Created manager user: ${managerUser.email}`);
    logger.info('   Email: manager@democompany.com');
    logger.info('   Password: Manager123!');

    // Create regular user
    const regularUser = userRepo.create({
      companyId: company.id,
      email: 'user@democompany.com',
      firstName: 'Regular',
      lastName: 'User',
      role: 'user',
      isActive: true,
    });

    regularUser.setPassword('User123!');
    await userRepo.save(regularUser);

    logger.info(`✅ Created regular user: ${regularUser.email}`);
    logger.info('   Email: user@democompany.com');
    logger.info('   Password: User123!');

    // Create sample products
    logger.info('📦 Creating sample products...');

    const sampleProducts = [
      {
        sku: 'LAPTOP-001',
        name: 'Dell Latitude 5420',
        description: 'Business laptop with Intel i5 processor, 16GB RAM, 512GB SSD',
        category: 'Electronics',
        unitOfMeasure: 'unit',
        minimumStock: 5,
        reorderPoint: 10,
        cost: 800,
        price: 1200,
      },
      {
        sku: 'MOUSE-001',
        name: 'Logitech MX Master 3',
        description: 'Wireless ergonomic mouse',
        category: 'Electronics',
        unitOfMeasure: 'unit',
        minimumStock: 20,
        reorderPoint: 30,
        cost: 50,
        price: 99,
      },
      {
        sku: 'DESK-001',
        name: 'Standing Desk Adjustable',
        description: 'Electric height-adjustable standing desk',
        category: 'Furniture',
        unitOfMeasure: 'unit',
        minimumStock: 3,
        reorderPoint: 5,
        cost: 300,
        price: 599,
      },
      {
        sku: 'CHAIR-001',
        name: 'Ergonomic Office Chair',
        description: 'Mesh back ergonomic chair with lumbar support',
        category: 'Furniture',
        unitOfMeasure: 'unit',
        minimumStock: 10,
        reorderPoint: 15,
        cost: 150,
        price: 299,
      },
      {
        sku: 'PAPER-001',
        name: 'Copy Paper A4',
        description: 'White copy paper 80gsm, 500 sheets per ream',
        category: 'Office Supplies',
        unitOfMeasure: 'ream',
        minimumStock: 50,
        reorderPoint: 100,
        cost: 3,
        price: 7,
      },
      {
        sku: 'PEN-001',
        name: 'Ballpoint Pen Blue',
        description: 'Blue ballpoint pen, box of 50',
        category: 'Office Supplies',
        unitOfMeasure: 'box',
        minimumStock: 20,
        reorderPoint: 40,
        cost: 5,
        price: 12,
      },
      {
        sku: 'MONITOR-001',
        name: 'Dell 27" 4K Monitor',
        description: '27-inch 4K UHD monitor with USB-C',
        category: 'Electronics',
        unitOfMeasure: 'unit',
        minimumStock: 5,
        reorderPoint: 8,
        cost: 400,
        price: 699,
      },
      {
        sku: 'KEYBOARD-001',
        name: 'Mechanical Keyboard RGB',
        description: 'RGB mechanical keyboard with Cherry MX switches',
        category: 'Electronics',
        unitOfMeasure: 'unit',
        minimumStock: 10,
        reorderPoint: 15,
        cost: 80,
        price: 149,
      },
    ];

    for (const productData of sampleProducts) {
      const product = productRepo.create({
        companyId: company.id,
        ...productData,
        isActive: true,
      });
      await productRepo.save(product);
      logger.info(`   ✅ Created product: ${product.sku} - ${product.name}`);
    }

    logger.info(`✅ Created ${sampleProducts.length} sample products`);
    logger.info('🎉 Initial data seeded successfully!');
  } catch (error) {
    logger.error('❌ Error seeding initial data:', error);
    throw error;
  }
};

// Run seed if executed directly
if (require.main === module) {
  seedInitialData()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seed failed:', error);
      process.exit(1);
    });
}
