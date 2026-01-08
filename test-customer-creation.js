require('dotenv').config();
const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
};

async function testCustomerCreation() {
  try {
    console.log('Conectando a la base de datos...');
    await sql.connect(config);

    // 1. Buscar clientes con documento duplicado en diferentes empresas
    console.log('\n=== CLIENTES CON DOCUMENTO DUPLICADO ===\n');

    const duplicates = await sql.query`
      SELECT
        c1.id,
        c1.company_id,
        c1.code,
        c1.document_number,
        c1.name,
        c1.is_active,
        comp.name as company_name
      FROM customers c1
      INNER JOIN companies comp ON c1.company_id = comp.id
      WHERE c1.document_number IN (
        SELECT document_number
        FROM customers
        GROUP BY document_number
        HAVING COUNT(DISTINCT company_id) > 1
      )
      ORDER BY c1.document_number, c1.company_id
    `;

    if (duplicates.recordset.length > 0) {
      console.log('Documentos que existen en múltiples empresas:');
      console.log('---------------------------------------------');
      duplicates.recordset.forEach(c => {
        console.log(`\nID: ${c.id}`);
        console.log(`Empresa: ${c.company_name} (ID: ${c.company_id})`);
        console.log(`Documento: ${c.document_number}`);
        console.log(`Nombre: ${c.name}`);
        console.log(`Activo: ${c.is_active ? 'SÍ' : 'NO'}`);
      });
    } else {
      console.log('No hay documentos duplicados en diferentes empresas.');
    }

    // 2. Intentar crear un cliente de prueba en dos empresas diferentes
    console.log('\n\n=== PRUEBA DE CREACIÓN EN DIFERENTES EMPRESAS ===\n');

    // Obtener las primeras 2 empresas
    const companies = await sql.query`
      SELECT TOP 2 id, name FROM companies ORDER BY id
    `;

    if (companies.recordset.length < 2) {
      console.log('❌ Se necesitan al menos 2 empresas para la prueba');
      await sql.close();
      return;
    }

    const company1 = companies.recordset[0];
    const company2 = companies.recordset[1];
    const testDocument = 'TEST-' + Date.now();

    console.log(`Empresa 1: ${company1.name} (ID: ${company1.id})`);
    console.log(`Empresa 2: ${company2.name} (ID: ${company2.id})`);
    console.log(`Documento de prueba: ${testDocument}`);

    try {
      // Crear en empresa 1
      console.log(`\n1. Creando cliente en Empresa 1...`);
      await sql.query`
        INSERT INTO customers (company_id, code, document_type, document_number, name, is_active, created_at, updated_at)
        VALUES (${company1.id}, 'TEST-001', 'CC', ${testDocument}, 'Cliente Prueba 1', 1, GETDATE(), GETDATE())
      `;
      console.log('✅ Cliente creado exitosamente en Empresa 1');

      // Crear en empresa 2 con el mismo documento
      console.log(`\n2. Creando cliente en Empresa 2 con el mismo documento...`);
      await sql.query`
        INSERT INTO customers (company_id, code, document_type, document_number, name, is_active, created_at, updated_at)
        VALUES (${company2.id}, 'TEST-001', 'CC', ${testDocument}, 'Cliente Prueba 2', 1, GETDATE(), GETDATE())
      `;
      console.log('✅ Cliente creado exitosamente en Empresa 2');

      console.log('\n✅✅✅ PRUEBA EXITOSA: Se pueden crear clientes con el mismo documento en diferentes empresas');

      // Limpiar datos de prueba
      console.log('\n3. Limpiando datos de prueba...');
      await sql.query`
        DELETE FROM customers WHERE document_number = ${testDocument}
      `;
      console.log('✅ Datos de prueba eliminados');

    } catch (insertError) {
      console.log('\n❌ ERROR AL CREAR CLIENTE:');
      console.log(insertError.message);

      // Limpiar en caso de error parcial
      await sql.query`
        DELETE FROM customers WHERE document_number = ${testDocument}
      `;
    }

    await sql.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

testCustomerCreation();
