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

async function checkCustomerIndexes() {
  try {
    console.log('Conectando a la base de datos...');
    await sql.connect(config);

    console.log('\n=== ÍNDICES EN LA TABLA CUSTOMERS ===\n');

    const result = await sql.query`
      SELECT
        i.name AS index_name,
        i.is_unique,
        i.is_primary_key,
        STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal) AS columns
      FROM sys.indexes i
      INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
      WHERE i.object_id = OBJECT_ID('customers')
      GROUP BY i.name, i.is_unique, i.is_primary_key
      ORDER BY i.name
    `;

    console.log('Índices encontrados:');
    console.log('-------------------');
    result.recordset.forEach(idx => {
      console.log(`\nNombre: ${idx.index_name}`);
      console.log(`Único: ${idx.is_unique ? 'SÍ' : 'NO'}`);
      console.log(`Clave primaria: ${idx.is_primary_key ? 'SÍ' : 'NO'}`);
      console.log(`Columnas: ${idx.columns}`);
    });

    console.log('\n=== RESTRICCIONES ÚNICAS ===\n');

    const constraints = await sql.query`
      SELECT
        tc.CONSTRAINT_NAME,
        tc.CONSTRAINT_TYPE,
        STRING_AGG(ccu.COLUMN_NAME, ', ') AS columns
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
      INNER JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu
        ON tc.CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
      WHERE tc.TABLE_NAME = 'customers'
        AND tc.CONSTRAINT_TYPE IN ('UNIQUE', 'PRIMARY KEY')
      GROUP BY tc.CONSTRAINT_NAME, tc.CONSTRAINT_TYPE
    `;

    console.log('Restricciones únicas:');
    console.log('---------------------');
    constraints.recordset.forEach(con => {
      console.log(`\nNombre: ${con.CONSTRAINT_NAME}`);
      console.log(`Tipo: ${con.CONSTRAINT_TYPE}`);
      console.log(`Columnas: ${con.columns}`);
    });

    await sql.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkCustomerIndexes();
