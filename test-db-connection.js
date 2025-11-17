const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

console.log('📡 Attempting to connect to SQL Server...');
console.log('Configuration:');
console.log(`   Host: ${config.server}`);
console.log(`   Port: ${config.port}`);
console.log(`   User: ${config.user}`);
console.log(`   Database: ${config.database}`);
console.log(`   Encrypt: ${config.options.encrypt}`);
console.log(`   Trust Certificate: ${config.options.trustServerCertificate}`);
console.log('');

async function testConnection() {
  let pool;
  try {
    // Try to connect
    console.log('🔌 Connecting...');
    pool = await sql.connect(config);
    console.log('✅ Connection successful!');
    console.log('');

    // Test query
    console.log('🔍 Testing query...');
    const result = await pool.request().query('SELECT @@VERSION AS version, DB_NAME() AS currentDB');
    console.log('✅ Query successful!');
    console.log('');
    console.log('SQL Server Version:');
    console.log(result.recordset[0].version);
    console.log('');
    console.log(`Current Database: ${result.recordset[0].currentDB || 'master'}`);
    console.log('');

    // Check if inventory_db exists
    const dbCheck = await pool.request().query(`
      SELECT name
      FROM sys.databases
      WHERE name = 'inventory_db'
    `);

    if (dbCheck.recordset.length > 0) {
      console.log('✅ Database "inventory_db" exists');
    } else {
      console.log('⚠️  Database "inventory_db" does not exist');
      console.log('   You need to create it with: CREATE DATABASE inventory_db');
    }

    // List existing databases
    const databases = await pool.request().query(`
      SELECT name
      FROM sys.databases
      WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb')
      ORDER BY name
    `);

    console.log('');
    console.log('📋 Available databases:');
    if (databases.recordset.length > 0) {
      databases.recordset.forEach(db => {
        console.log(`   - ${db.name}`);
      });
    } else {
      console.log('   (No user databases found)');
    }

    console.log('');
    console.log('🎉 Connection test completed successfully!');

  } catch (error) {
    console.error('❌ Connection failed!');
    console.error('');
    console.error('Error details:');
    console.error(`   Code: ${error.code}`);
    console.error(`   Message: ${error.message}`);
    console.error('');

    if (error.code === 'ELOGIN') {
      console.error('💡 Suggestions:');
      console.error('   - Check username and password');
      console.error('   - Verify SQL Server authentication is enabled');
      console.error('   - Check if user has appropriate permissions');
    } else if (error.code === 'ESOCKET' || error.code === 'ETIMEOUT') {
      console.error('💡 Suggestions:');
      console.error('   - Check if SQL Server is running');
      console.error('   - Verify firewall allows port 1433');
      console.error('   - Check if TCP/IP is enabled in SQL Server Configuration');
      console.error('   - Verify the IP address and port are correct');
    }

    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Connection closed');
    }
  }
}

testConnection();
