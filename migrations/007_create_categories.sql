-- Migration: Create categories table
-- Description: Add categories table for company-specific product categorization
-- Date: 2024-01-20

-- Create categories table
CREATE TABLE categories (
    id INT IDENTITY(1,1) PRIMARY KEY,
    company_id INT NOT NULL,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(500) NULL,
    color NVARCHAR(50) NULL,
    icon NVARCHAR(50) NULL,
    sort_order INT DEFAULT 0,
    is_active BIT DEFAULT 1,
    parent_id INT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),

    -- Foreign keys
    CONSTRAINT FK_categories_company FOREIGN KEY (company_id)
        REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT FK_categories_parent FOREIGN KEY (parent_id)
        REFERENCES categories(id) ON DELETE NO ACTION,

    -- Unique constraint: category name must be unique per company
    CONSTRAINT UQ_categories_company_name UNIQUE (company_id, name)
);

-- Create indexes for performance
CREATE INDEX IDX_categories_company_id ON categories(company_id);
CREATE INDEX IDX_categories_company_active ON categories(company_id, is_active);
CREATE INDEX IDX_categories_company_sort ON categories(company_id, sort_order);
CREATE INDEX IDX_categories_parent_id ON categories(parent_id);

-- Add category_id column to products table
ALTER TABLE products ADD category_id INT NULL;

-- Add foreign key constraint
ALTER TABLE products
    ADD CONSTRAINT FK_products_category
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- Create index on products.category_id
CREATE INDEX IDX_products_category_id ON products(category_id);

-- Migrate existing category data (if any text-based categories exist)
-- This creates categories from existing product.category text field
INSERT INTO categories (company_id, name, description, sort_order, is_active)
SELECT DISTINCT
    p.company_id,
    p.category as name,
    'Migrated from legacy category field' as description,
    0 as sort_order,
    1 as is_active
FROM products p
WHERE p.category IS NOT NULL
    AND p.category != ''
    AND NOT EXISTS (
        SELECT 1 FROM categories c
        WHERE c.company_id = p.company_id
        AND c.name = p.category
    );

-- Update products to link to new category records
UPDATE p
SET p.category_id = c.id
FROM products p
INNER JOIN categories c
    ON c.company_id = p.company_id
    AND c.name = p.category
WHERE p.category IS NOT NULL;

-- Optional: Drop old category column after verification
-- ALTER TABLE products DROP COLUMN category;

-- Create trigger to update updated_at timestamp
GO
CREATE TRIGGER TR_categories_updated_at
ON categories
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE categories
    SET updated_at = GETDATE()
    FROM categories c
    INNER JOIN inserted i ON c.id = i.id;
END;
GO

PRINT 'Migration 007: Categories table created successfully';
