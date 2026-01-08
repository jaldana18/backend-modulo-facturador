import { AppDataSource } from '../config/database';
import { PaymentMethod } from '../entities/PaymentMethod.entity';
import { logger } from '../config/logger';
import { IsNull } from 'typeorm';

/**
 * Seed payment methods data
 * This creates payment methods for company ID 1 (demo company)
 * Can be adapted to create global methods (company_id = NULL) if schema allows
 */
export const seedPaymentMethods = async (companyId: number = 1) => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const paymentMethodRepo = AppDataSource.getRepository(PaymentMethod);

    logger.info(`🌱 Seeding payment methods for company ${companyId}...`);

    // Check if payment methods already exist for this company
    const existingMethods = await paymentMethodRepo.count({ where: { companyId } });
    const expectedCount = 22;
    
    if (existingMethods === 0) {
      logger.info('💳 Creating payment methods...');
    } else if (existingMethods < expectedCount) {
      logger.info(`📊 Found ${existingMethods} payment methods, need ${expectedCount}. Adding missing records...`);
    } else {
      logger.info(`✅ Payment methods already exist for company ${companyId}, skipping...`);
      await AppDataSource.destroy();
      return;
    }
    
    const paymentMethods = [
        // EFECTIVO
        {
          name: 'Efectivo',
          code: 'cash',
          channel: null,
          requiresReference: false,
          isActive: true,
          metadata: JSON.stringify({
            description: 'Pago en efectivo',
            icon: 'cash',
            color: '#10B981',
          }),
        },

        // TARJETAS
        {
          name: 'Tarjeta de Crédito',
          code: 'credit_card',
          channel: null,
          requiresReference: true,
          isActive: true,
          metadata: JSON.stringify({
            description: 'Pago con tarjeta de crédito',
            icon: 'credit-card',
            color: '#3B82F6',
          }),
        },
        {
          name: 'Tarjeta de Débito',
          code: 'debit_card',
          channel: null,
          requiresReference: true,
          isActive: true,
          metadata: JSON.stringify({
            description: 'Pago con tarjeta de débito',
            icon: 'credit-card',
            color: '#6366F1',
          }),
        },

        // TRANSFERENCIAS BANCARIAS
        {
          name: 'Transferencia Bancolombia',
          code: 'transfer',
          channel: 'bancolombia',
          requiresReference: true,
          isActive: true,
          metadata: JSON.stringify({
            description: 'Transferencia bancaria Bancolombia',
            icon: 'bank',
            color: '#FBBF24',
            bankCode: '001',
          }),
        },
        {
          name: 'Transferencia Davivienda',
          code: 'transfer',
          channel: 'davivienda',
          requiresReference: true,
          isActive: true,
          metadata: JSON.stringify({
            description: 'Transferencia bancaria Davivienda',
            icon: 'bank',
            color: '#EF4444',
            bankCode: '051',
          }),
        },
        {
          name: 'Transferencia Banco de Bogotá',
          code: 'transfer',
          channel: 'banco_bogota',
          requiresReference: true,
          isActive: true,
          metadata: JSON.stringify({
            description: 'Transferencia bancaria Banco de Bogotá',
            icon: 'bank',
            color: '#3B82F6',
            bankCode: '001',
          }),
        },
        {
          name: 'Transferencia BBVA',
          code: 'transfer',
          channel: 'bbva',
          requiresReference: true,
          isActive: true,
          metadata: JSON.stringify({
            description: 'Transferencia bancaria BBVA',
            icon: 'bank',
            color: '#0066A1',
            bankCode: '013',
          }),
        },
        {
          name: 'Transferencia Scotiabank Colpatria',
          code: 'transfer',
          channel: 'colpatria',
          requiresReference: true,
          isActive: true,
          metadata: JSON.stringify({
            description: 'Transferencia bancaria Scotiabank Colpatria',
            icon: 'bank',
            color: '#DC2626',
            bankCode: '019',
          }),
        },

        // BILLETERAS DIGITALES
        {
          name: 'Nequi',
          code: 'digital_wallet',
          channel: 'nequi',
          requiresReference: true,
          isActive: true,
          metadata: JSON.stringify({
            description: 'Pago con Nequi',
            icon: 'smartphone',
            color: '#FF006E',
            walletType: 'mobile',
          }),
        },
        {
          name: 'Daviplata',
          code: 'digital_wallet',
          channel: 'daviplata',
          requiresReference: true,
          isActive: true,
          metadata: JSON.stringify({
            description: 'Pago con Daviplata',
            icon: 'smartphone',
            color: '#DC2626',
            walletType: 'mobile',
          }),
        },
        {
          name: 'Dale',
          code: 'digital_wallet',
          channel: 'dale',
          requiresReference: true,
          isActive: true,
          metadata: JSON.stringify({
            description: 'Pago con Dale (BBVA)',
            icon: 'smartphone',
            color: '#0066A1',
            walletType: 'mobile',
          }),
        },
        {
          name: 'Movii',
          code: 'digital_wallet',
          channel: 'movii',
          requiresReference: true,
          isActive: true,
          metadata: JSON.stringify({
            description: 'Pago con Movii',
            icon: 'smartphone',
            color: '#00B4D8',
            walletType: 'mobile',
          }),
        },
        {
          name: 'Ding',
          code: 'digital_wallet',
          channel: 'ding',
          requiresReference: true,
          isActive: true,
          metadata: JSON.stringify({
            description: 'Pago con Ding',
            icon: 'smartphone',
            color: '#8B5CF6',
            walletType: 'mobile',
          }),
        },
        {
          name: 'Powwi',
          code: 'digital_wallet',
          channel: 'powwi',
          requiresReference: true,
          isActive: true,
          metadata: JSON.stringify({
            description: 'Pago con Powwi',
            icon: 'smartphone',
            color: '#EC4899',
            walletType: 'mobile',
          }),
        },

        // PSE
        {
          name: 'PSE',
          code: 'pse',
          channel: null,
          requiresReference: true,
          isActive: true,
          metadata: JSON.stringify({
            description: 'Pagos Seguros en Línea (PSE)',
            icon: 'globe',
            color: '#059669',
          }),
        },

        // CHEQUES
        {
          name: 'Cheque',
          code: 'check',
          channel: null,
          requiresReference: true,
          isActive: true,
          metadata: JSON.stringify({
            description: 'Pago con cheque',
            icon: 'file-text',
            color: '#6B7280',
          }),
        },

        // CORRESPONSALES BANCARIOS
        {
          name: 'Corresponsal Bancolombia',
          code: 'correspondent',
          channel: 'bancolombia',
          requiresReference: true,
          isActive: true,
          metadata: JSON.stringify({
            description: 'Pago en corresponsal Bancolombia',
            icon: 'map-pin',
            color: '#FBBF24',
          }),
        },
        {
          name: 'Corresponsal Efecty',
          code: 'correspondent',
          channel: 'efecty',
          requiresReference: true,
          isActive: true,
          metadata: JSON.stringify({
            description: 'Pago en Efecty',
            icon: 'map-pin',
            color: '#F59E0B',
          }),
        },
        {
          name: 'Corresponsal Gana',
          code: 'correspondent',
          channel: 'gana',
          requiresReference: true,
          isActive: true,
          metadata: JSON.stringify({
            description: 'Pago en Gana',
            icon: 'map-pin',
            color: '#10B981',
          }),
        },
        {
          name: 'Corresponsal Baloto',
          code: 'correspondent',
          channel: 'baloto',
          requiresReference: true,
          isActive: true,
          metadata: JSON.stringify({
            description: 'Pago en Baloto',
            icon: 'map-pin',
            color: '#3B82F6',
          }),
        },

        // CRÉDITO
        {
          name: 'Crédito',
          code: 'credit',
          channel: null,
          requiresReference: true,
          isActive: true,
          metadata: JSON.stringify({
            description: 'Pago a crédito',
            icon: 'calendar',
            color: '#F97316',
          }),
        },

        // OTROS
        {
          name: 'Otro',
          code: 'other',
          channel: null,
          requiresReference: false,
          isActive: true,
          metadata: JSON.stringify({
            description: 'Otro método de pago',
            icon: 'help-circle',
            color: '#6B7280',
          }),
        },
      ];

      // Get existing payment methods to avoid duplicates
      const existing = await paymentMethodRepo.find({ 
        where: { companyId },
        select: ['code', 'channel']
      });
      
      const existingKeys = new Set(
        existing.map(pm => `${pm.code}|${pm.channel || 'null'}`)
      );

      // Filter out already existing methods
      const methodsToInsert = paymentMethods.filter(method => {
        const key = `${method.code}|${method.channel || 'null'}`;
        return !existingKeys.has(key);
      });

      if (methodsToInsert.length === 0) {
        logger.info('✅ All payment methods already exist');
        await AppDataSource.destroy();
        return;
      }

      logger.info(`📝 Inserting ${methodsToInsert.length} new payment methods...`);

      // Get the current max ID to start from
      const maxIdResult = await paymentMethodRepo.query(`
        SELECT ISNULL(MAX(id), 0) AS maxId FROM payment_methods
      `);
      
      let currentId = maxIdResult[0].maxId + 1;

      for (const methodData of methodsToInsert) {
        await paymentMethodRepo.query(`
          INSERT INTO payment_methods (id, company_id, name, code, channel, requires_reference, is_active, metadata, created_at, updated_at)
          VALUES (@0, @1, @2, @3, @4, @5, @6, @7, GETDATE(), GETDATE())
        `, [currentId, companyId, methodData.name, methodData.code, methodData.channel, methodData.requiresReference, methodData.isActive, methodData.metadata]);
        
        const displayName = methodData.channel 
          ? `${methodData.name} (${methodData.channel})`
          : methodData.name;
        logger.info(`   ✅ Created payment method: ${displayName}`);
        currentId++;
      }

      logger.info(`✅ Created ${methodsToInsert.length} payment methods for company ${companyId}`);
    
    logger.info('🎉 Payment methods seeded successfully!');
  } catch (error) {
    logger.error('❌ Error seeding payment methods:', error);
    throw error;
  }
};

// Run seed if executed directly
if (require.main === module) {
  const companyIdArg = process.argv[2];
  const companyId = companyIdArg ? parseInt(companyIdArg) : 1; // Default to company ID 1

  seedPaymentMethods(companyId)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seed failed:', error);
      process.exit(1);
    });
}
