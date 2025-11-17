import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixIdentityColumns1736720000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // We need to recreate the tables with IDENTITY columns
    // This requires dropping and recreating them

    // Drop all foreign keys first
    await queryRunner.query(`
      IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_users_company')
        ALTER TABLE users DROP CONSTRAINT fk_users_company;
    `);

    await queryRunner.query(`
      IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_products_company')
        ALTER TABLE products DROP CONSTRAINT fk_products_company;
    `);

    // Drop and recreate companies table with IDENTITY
    await queryRunner.query(`
      IF OBJECT_ID('companies', 'U') IS NOT NULL
      BEGIN
        DROP TABLE companies;
      END
    `);

    await queryRunner.query(`
      CREATE TABLE companies (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(200) NOT NULL,
        legal_name NVARCHAR(300),
        tax_id NVARCHAR(500) NOT NULL,
        email NVARCHAR(200),
        phone NVARCHAR(50),
        address NVARCHAR(500),
        is_active BIT NOT NULL DEFAULT 1,
        settings NVARCHAR(MAX),
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_companies_tax_id UNIQUE (tax_id)
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_companies_active ON companies (is_active);`);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_companies_tax_id ON companies (tax_id);`);

    // Drop and recreate users table with IDENTITY
    await queryRunner.query(`
      IF OBJECT_ID('users', 'U') IS NOT NULL
      BEGIN
        DROP TABLE users;
      END
    `);

    await queryRunner.query(`
      CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        company_id INT NOT NULL,
        email NVARCHAR(200) NOT NULL,
        password_hash NVARCHAR(500) NOT NULL,
        first_name NVARCHAR(100) NOT NULL,
        last_name NVARCHAR(100) NOT NULL,
        role NVARCHAR(50) NOT NULL,
        is_active BIT NOT NULL DEFAULT 1,
        last_login DATETIME2,
        refresh_token NVARCHAR(500),
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_users_email UNIQUE (email)
      );
    `);

    await queryRunner.query(`
      ALTER TABLE users
      ADD CONSTRAINT fk_users_company
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`CREATE INDEX idx_users_company ON users (company_id);`);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_users_email ON users (email);`);
    await queryRunner.query(`CREATE INDEX idx_users_company_active ON users (company_id, is_active);`);

    // Drop and recreate products table with IDENTITY
    await queryRunner.query(`
      IF OBJECT_ID('products', 'U') IS NOT NULL
      BEGIN
        DROP TABLE products;
      END
    `);

    await queryRunner.query(`
      CREATE TABLE products (
        id INT IDENTITY(1,1) PRIMARY KEY,
        company_id INT NOT NULL,
        sku NVARCHAR(100) NOT NULL,
        name NVARCHAR(300) NOT NULL,
        description NVARCHAR(MAX),
        category NVARCHAR(100),
        unit_of_measure NVARCHAR(50) NOT NULL,
        minimum_stock DECIMAL(18,4) NOT NULL DEFAULT 0,
        reorder_point DECIMAL(18,4) NOT NULL DEFAULT 0,
        cost NVARCHAR(500),
        price NVARCHAR(500),
        is_active BIT NOT NULL DEFAULT 1,
        metadata NVARCHAR(MAX),
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
      );
    `);

    await queryRunner.query(`
      ALTER TABLE products
      ADD CONSTRAINT fk_products_company
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX idx_products_company_sku ON products (company_id, sku);`);
    await queryRunner.query(`CREATE INDEX idx_products_company ON products (company_id);`);
    await queryRunner.query(`CREATE INDEX idx_products_company_active ON products (company_id, is_active);`);
    await queryRunner.query(`CREATE INDEX idx_products_company_category ON products (company_id, category);`);
    await queryRunner.query(`CREATE INDEX idx_products_sku ON products (sku);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This migration recreates the tables, so down would just drop them
    await queryRunner.query(`DROP TABLE IF EXISTS products;`);
    await queryRunner.query(`DROP TABLE IF EXISTS users;`);
    await queryRunner.query(`DROP TABLE IF EXISTS companies;`);
  }
}
