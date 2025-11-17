const sql = require('mssql');
require('dotenv').config();

async function testConnectionToMaster() {
  const configs = [
    // Config 1: Try with inventory_db
    {
      name: 'Config 1: inventory_db database',
      config: {
        server: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'inventory_db',
        options: {
          encrypt: true,
          trustServerCertificate: true,
          enableArithAbort: true,
        },
        connectionTimeout: 30000,
        requestTimeout: 30000,
      }
    },
    // Config 2: Try with master database
    {
      name: 'Config 2: master database',
      config: {
        server: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'master',
        options: {
          encrypt: true,
          trustServerCertificate: true,
          enableArithAbort: true,
        },
        connectionTimeout: 30000,
        requestTimeout: 30000,
      }
    },
    // Config 3: Try without specifying database
    {
      name: 'Config 3: No database specified',
      config: {
        server: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        options: {
          encrypt: true,
          trustServerCertificate: true,
          enableArithAbort: true,
        },
        connectionTimeout: 30000,
        requestTimeout: 30000,
      }
    },
    // Config 4: Try with encrypt=false
    {
      name: 'Config 4: Without encryption',
      config: {
        server: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'master',
        options: {
          encrypt: false,
          trustServerCertificate: true,
          enableArithAbort: true,
        },
        connectionTimeout: 30000,
        requestTimeout: 30000,
      }
    }
  ];

  console.log('🔍 Testing multiple connection configurations...\n');
  console.log('Credentials:');
  console.log(`   Host: ${process.env.DB_HOST}`);
  console.log(`   Port: ${process.env.DB_PORT}`);
  console.log(`   User: ${process.env.DB_USER}`);
  console.log(`   Password: ${process.env.DB_PASSWORD.substring(0, 5)}...${process.env.DB_PASSWORD.substring(process.env.DB_PASSWORD.length - 5)}`);
  console.log('');

  for (const configTest of configs) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${configTest.name}`);
    console.log('='.repeat(60));

    let pool;
    try {
      pool = await sql.connect(configTest.config);
      console.log('✅ Connection successful!');

      const result = await pool.request().query(`
        SELECT
          @@VERSION AS version,
          DB_NAME() AS currentDB,
          SUSER_NAME() AS loginUser,
          USER_NAME() AS databaseUser
      `);

      console.log('\nConnection info:');
      console.log(`   Current Database: ${result.recordset[0].currentDB}`);
      console.log(`   Login User: ${result.recordset[0].loginUser}`);
      console.log(`   Database User: ${result.recordset[0].databaseUser}`);

      // Check databases
      const databases = await pool.request().query(`
        SELECT name FROM sys.databases ORDER BY name
      `);

      console.log('\n📋 Available databases:');
      databases.recordset.forEach(db => {
        console.log(`   - ${db.name}`);
      });

      // Check if inventory_db exists
      const hasInventoryDb = databases.recordset.some(db => db.name === 'inventory_db');
      if (!hasInventoryDb) {
        console.log('\n⚠️  Database "inventory_db" does not exist. Creating it...');
        try {
          await pool.request().query('CREATE DATABASE inventory_db');
          console.log('✅ Database "inventory_db" created successfully!');
        } catch (createError) {
          console.log(`❌ Failed to create database: ${createError.message}`);
        }
      } else {
        console.log('\n✅ Database "inventory_db" exists');
      }

      console.log('\n🎉 THIS CONFIGURATION WORKS!');
      await pool.close();
      return configTest.config;

    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      if (pool) {
        await pool.close();
      }
    }
  }

  console.log('\n❌ All connection attempts failed.');
  console.log('\n💡 Possible issues:');
  console.log('   1. Username or password incorrect');
  console.log('   2. SQL Server authentication not enabled (needs Mixed Mode)');
  console.log('   3. User does not have permissions');
  console.log('   4. Firewall blocking connection');
  console.log('   5. SQL Server not accepting remote connections');
  process.exit(1);
}

testConnectionToMaster();
