-- Migration: Add imageUrl column to products table
-- Date: 2025-11-18
-- Description: Rename 'imagen' to 'image_url' for consistency and add proper constraints

-- Check if the old column exists and rename it
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[products]') AND name = 'imagen')
BEGIN
    EXEC sp_rename 'products.imagen', 'image_url', 'COLUMN';
    PRINT 'Column "imagen" renamed to "image_url"';
END
ELSE IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[products]') AND name = 'image_url')
BEGIN
    -- Add the column if it doesn't exist
    ALTER TABLE products
    ADD image_url NVARCHAR(500) NULL;
    PRINT 'Column "image_url" added';
END

GO
