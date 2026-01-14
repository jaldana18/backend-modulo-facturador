import { AppDataSource } from '../config/database';
import { Category } from '../entities/Category.entity';
import { UnitOfMeasure } from '../entities/UnitOfMeasure.entity';
import { Company } from '../entities/Company.entity';
import { logger } from '../config/logger';
import { IsNull } from 'typeorm';

/**
 * Seed catalog data (categories and units of measure)
 * This creates global categories and units shared by all companies
 */
export const seedCatalogData = async (companyId?: number) => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const categoryRepo = AppDataSource.getRepository(Category);
    const unitRepo = AppDataSource.getRepository(UnitOfMeasure);

    logger.info('🌱 Seeding global catalog data (categories and units of measure)...');

    // Check if global categories already exist
    const existingCategories = await categoryRepo.count({ where: { companyId: IsNull() } });
    if (existingCategories === 0) {
      logger.info('📁 Creating global categories...');

      const categories = [
          {
            name: 'Electronics',
            description: 'Electronic devices and components',
            color: '#3B82F6',
            icon: 'laptop',
            sortOrder: 1,
          },
          {
            name: 'Furniture',
            description: 'Office and home furniture',
            color: '#8B5CF6',
            icon: 'armchair',
            sortOrder: 2,
          },
          {
            name: 'Office Supplies',
            description: 'Stationery and office materials',
            color: '#10B981',
            icon: 'paperclip',
            sortOrder: 3,
          },
          {
            name: 'Food & Beverages',
            description: 'Food products and drinks',
            color: '#F59E0B',
            icon: 'coffee',
            sortOrder: 4,
          },
          {
            name: 'Clothing & Apparel',
            description: 'Garments and accessories',
            color: '#EC4899',
            icon: 'shirt',
            sortOrder: 5,
          },
          {
            name: 'Tools & Hardware',
            description: 'Tools and hardware supplies',
            color: '#6B7280',
            icon: 'wrench',
            sortOrder: 6,
          },
          {
            name: 'Health & Beauty',
            description: 'Health care and beauty products',
            color: '#EF4444',
            icon: 'heart',
            sortOrder: 7,
          },
          {
            name: 'Automotive',
            description: 'Vehicle parts and accessories',
            color: '#14B8A6',
            icon: 'car',
            sortOrder: 8,
          },
          {
            name: 'Sports & Outdoors',
            description: 'Sports equipment and outdoor gear',
            color: '#F97316',
            icon: 'football',
            sortOrder: 9,
          },
          {
            name: 'Books & Media',
            description: 'Books, magazines, and media products',
            color: '#A855F7',
            icon: 'book',
            sortOrder: 10,
          },
        ];

      for (const categoryData of categories) {
        const category = categoryRepo.create({
          companyId: null, // Global category
          ...categoryData,
          isActive: true,
        });
        await categoryRepo.save(category);
        logger.info(`   ✅ Created category: ${category.name}`);
      }

      logger.info(`✅ Created ${categories.length} global categories`);
    } else {
      logger.info(`✅ Global categories already exist, skipping...`);
    }

    // Check if global units of measure already exist
    const existingUnits = await unitRepo.count({ where: { companyId: IsNull() } });
    if (existingUnits === 0) {
      logger.info('📏 Creating global units of measure...');

        const units = [
          // Base units
          {
            code: 'UNIT',
            name: 'Unit',
            description: 'Individual unit or piece',
            symbol: 'un',
            isBaseUnit: true,
            baseUnitId: null,
            conversionFactor: null,
          },
          {
            code: 'KG',
            name: 'Kilogram',
            description: 'Weight in kilograms',
            symbol: 'kg',
            isBaseUnit: true,
            baseUnitId: null,
            conversionFactor: null,
          },
          {
            code: 'L',
            name: 'Liter',
            description: 'Volume in liters',
            symbol: 'l',
            isBaseUnit: true,
            baseUnitId: null,
            conversionFactor: null,
          },
          {
            code: 'M',
            name: 'Meter',
            description: 'Length in meters',
            symbol: 'm',
            isBaseUnit: true,
            baseUnitId: null,
            conversionFactor: null,
          },
          {
            code: 'M2',
            name: 'Square Meter',
            description: 'Area in square meters',
            symbol: 'm²',
            isBaseUnit: true,
            baseUnitId: null,
            conversionFactor: null,
          },
          {
            code: 'M3',
            name: 'Cubic Meter',
            description: 'Volume in cubic meters',
            symbol: 'm³',
            isBaseUnit: true,
            baseUnitId: null,
            conversionFactor: null,
          },
        ];

        const savedUnits: { [key: string]: number } = {};

        // Save base units first using direct SQL query (column doesn't have IDENTITY)
        let currentId = 1;
        for (const unitData of units) {
          await unitRepo.query(`
            INSERT INTO unit_of_measures (id, company_id, code, name, description, symbol, is_base_unit, base_unit_id, conversion_factor, is_active, created_at, updated_at)
            VALUES (@0, @1, @2, @3, @4, @5, @6, @7, @8, @9, GETDATE(), GETDATE())
          `, [currentId, null, unitData.code, unitData.name, unitData.description, unitData.symbol, unitData.isBaseUnit, unitData.baseUnitId, unitData.conversionFactor, true]);
          
          savedUnits[unitData.code] = currentId;
          logger.info(`   ✅ Created unit: ${unitData.code} - ${unitData.name}`);
          currentId++;
        }

        // Derived units with conversions
        const derivedUnits = [
          {
            code: 'G',
            name: 'Gram',
            description: 'Weight in grams',
            symbol: 'g',
            isBaseUnit: false,
            baseUnitCode: 'KG',
            conversionFactor: 0.001, // 1 gram = 0.001 kg
          },
          {
            code: 'MG',
            name: 'Milligram',
            description: 'Weight in milligrams',
            symbol: 'mg',
            isBaseUnit: false,
            baseUnitCode: 'KG',
            conversionFactor: 0.000001, // 1 mg = 0.000001 kg
          },
          {
            code: 'LB',
            name: 'Pound',
            description: 'Weight in pounds',
            symbol: 'lb',
            isBaseUnit: false,
            baseUnitCode: 'KG',
            conversionFactor: 0.453592, // 1 lb = 0.453592 kg
          },
          {
            code: 'ML',
            name: 'Milliliter',
            description: 'Volume in milliliters',
            symbol: 'ml',
            isBaseUnit: false,
            baseUnitCode: 'L',
            conversionFactor: 0.001, // 1 ml = 0.001 l
          },
          {
            code: 'GAL',
            name: 'Gallon',
            description: 'Volume in gallons (US)',
            symbol: 'gal',
            isBaseUnit: false,
            baseUnitCode: 'L',
            conversionFactor: 3.78541, // 1 gallon = 3.78541 liters
          },
          {
            code: 'CM',
            name: 'Centimeter',
            description: 'Length in centimeters',
            symbol: 'cm',
            isBaseUnit: false,
            baseUnitCode: 'M',
            conversionFactor: 0.01, // 1 cm = 0.01 m
          },
          {
            code: 'MM',
            name: 'Millimeter',
            description: 'Length in millimeters',
            symbol: 'mm',
            isBaseUnit: false,
            baseUnitCode: 'M',
            conversionFactor: 0.001, // 1 mm = 0.001 m
          },
          {
            code: 'KM',
            name: 'Kilometer',
            description: 'Length in kilometers',
            symbol: 'km',
            isBaseUnit: false,
            baseUnitCode: 'M',
            conversionFactor: 1000, // 1 km = 1000 m
          },
          {
            code: 'IN',
            name: 'Inch',
            description: 'Length in inches',
            symbol: 'in',
            isBaseUnit: false,
            baseUnitCode: 'M',
            conversionFactor: 0.0254, // 1 inch = 0.0254 m
          },
          {
            code: 'FT',
            name: 'Foot',
            description: 'Length in feet',
            symbol: 'ft',
            isBaseUnit: false,
            baseUnitCode: 'M',
            conversionFactor: 0.3048, // 1 foot = 0.3048 m
          },
        ];

        for (const unitData of derivedUnits) {
          const { baseUnitCode, ...rest } = unitData;
          await unitRepo.query(`
            INSERT INTO unit_of_measures (id, company_id, code, name, description, symbol, is_base_unit, base_unit_id, conversion_factor, is_active, created_at, updated_at)
            VALUES (@0, @1, @2, @3, @4, @5, @6, @7, @8, @9, GETDATE(), GETDATE())
          `, [currentId, null, rest.code, rest.name, rest.description, rest.symbol, rest.isBaseUnit, savedUnits[baseUnitCode], rest.conversionFactor, true]);
          
          logger.info(`   ✅ Created unit: ${rest.code} - ${rest.name}`);
          currentId++;
        }

        // Package units (for business)
        const packageUnits = [
          {
            code: 'BOX',
            name: 'Box',
            description: 'Package box',
            symbol: 'box',
            isBaseUnit: true,
            baseUnitId: null,
            conversionFactor: null,
          },
          {
            code: 'PACK',
            name: 'Pack',
            description: 'Package pack',
            symbol: 'pack',
            isBaseUnit: true,
            baseUnitId: null,
            conversionFactor: null,
          },
          {
            code: 'DOZEN',
            name: 'Dozen',
            description: '12 units',
            symbol: 'dz',
            isBaseUnit: false,
            baseUnitCode: 'UNIT',
            conversionFactor: 12,
          },
          {
            code: 'PAIR',
            name: 'Pair',
            description: '2 units',
            symbol: 'pr',
            isBaseUnit: false,
            baseUnitCode: 'UNIT',
            conversionFactor: 2,
          },
          {
            code: 'SET',
            name: 'Set',
            description: 'Set of items',
            symbol: 'set',
            isBaseUnit: true,
            baseUnitId: null,
            conversionFactor: null,
          },
          {
            code: 'PALLET',
            name: 'Pallet',
            description: 'Pallet load',
            symbol: 'plt',
            isBaseUnit: true,
            baseUnitId: null,
            conversionFactor: null,
          },
          {
            code: 'REAM',
            name: 'Ream',
            description: '500 sheets of paper',
            symbol: 'rm',
            isBaseUnit: true,
            baseUnitId: null,
            conversionFactor: null,
          },
        ];

        for (const unitData of packageUnits) {
          const { baseUnitCode, ...rest } = unitData as any;
          const baseId = baseUnitCode ? savedUnits[baseUnitCode] : null;
          await unitRepo.query(`
            INSERT INTO unit_of_measures (id, company_id, code, name, description, symbol, is_base_unit, base_unit_id, conversion_factor, is_active, created_at, updated_at)
            VALUES (@0, @1, @2, @3, @4, @5, @6, @7, @8, @9, GETDATE(), GETDATE())
          `, [currentId, null, rest.code, rest.name, rest.description, rest.symbol, rest.isBaseUnit, baseId, rest.conversionFactor, true]);
          
          logger.info(`   ✅ Created unit: ${rest.code} - ${rest.name}`);
          currentId++;
        }

        const totalUnits = units.length + derivedUnits.length + packageUnits.length;
        logger.info(`✅ Created ${totalUnits} global units of measure`);
    } else {
      logger.info(`✅ Global units of measure already exist, skipping...`);
    }

    logger.info('🎉 Global catalog data seeded successfully!');
  } catch (error) {
    logger.error('❌ Error seeding catalog data:', error);
    throw error;
  }
};

// Run seed if executed directly
if (require.main === module) {
  const companyIdArg = process.argv[2];
  const companyId = companyIdArg ? parseInt(companyIdArg) : undefined;

  seedCatalogData(companyId)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seed failed:', error);
      process.exit(1);
    });
}
