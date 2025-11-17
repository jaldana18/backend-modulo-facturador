-- Script de ayuda para asignar almacenes a usuarios
-- Ejecutar después de correr la migración

-- =====================================================
-- 1. VERIFICAR ESTRUCTURA DE LA TABLA
-- =====================================================
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'users'
ORDER BY ORDINAL_POSITION;

-- =====================================================
-- 2. VER ALMACENES DISPONIBLES
-- =====================================================
SELECT 
    id,
    code,
    name,
    is_main as 'Principal',
    is_active as 'Activo',
    manager_name as 'Gerente'
FROM warehouses
WHERE is_active = 1
ORDER BY is_main DESC, name;

-- =====================================================
-- 3. VER USUARIOS SIN ALMACÉN ASIGNADO
-- =====================================================
SELECT 
    id,
    email,
    first_name + ' ' + last_name as 'Nombre Completo',
    role as 'Rol',
    warehouse_id as 'Almacén',
    is_active as 'Activo'
FROM users
WHERE role = 'user' 
  AND warehouse_id IS NULL
  AND is_active = 1;

-- =====================================================
-- 4. VER TODOS LOS USUARIOS CON SU ALMACÉN
-- =====================================================
SELECT 
    u.id,
    u.email,
    u.first_name + ' ' + u.last_name as 'Nombre Completo',
    u.role as 'Rol',
    u.warehouse_id as 'ID Almacén',
    w.name as 'Nombre Almacén',
    w.code as 'Código Almacén',
    u.is_active as 'Activo'
FROM users u
LEFT JOIN warehouses w ON u.warehouse_id = w.id
ORDER BY u.role, u.email;

-- =====================================================
-- 5. ASIGNAR ALMACÉN A UN USUARIO ESPECÍFICO
-- =====================================================
-- Ejemplo: Asignar almacén con ID 2 al usuario con email 'operador@empresa.com'
/*
UPDATE users 
SET warehouse_id = 2 
WHERE email = 'operador@empresa.com' 
  AND role = 'user';
*/

-- =====================================================
-- 6. ASIGNAR ALMACÉN PRINCIPAL A TODOS LOS USUARIOS SIN ALMACÉN
-- =====================================================
-- ⚠️ CUIDADO: Esto asignará el almacén principal a TODOS los usuarios 'user' sin almacén
/*
UPDATE users 
SET warehouse_id = (
    SELECT TOP 1 id 
    FROM warehouses 
    WHERE is_main = 1 
      AND is_active = 1
      AND company_id = users.company_id
)
WHERE role = 'user' 
  AND warehouse_id IS NULL 
  AND is_active = 1;
*/

-- =====================================================
-- 7. ASIGNAR ALMACÉN ESPECÍFICO A MÚLTIPLES USUARIOS
-- =====================================================
-- Ejemplo: Asignar almacén 2 a varios usuarios por email
/*
UPDATE users 
SET warehouse_id = 2 
WHERE email IN (
    'operador1@empresa.com',
    'operador2@empresa.com',
    'operador3@empresa.com'
)
AND role = 'user';
*/

-- =====================================================
-- 8. ASIGNAR ALMACÉN POR NOMBRE DEL ALMACÉN
-- =====================================================
-- Ejemplo: Asignar almacén "Punto de Venta Centro" a un usuario
/*
UPDATE users 
SET warehouse_id = (
    SELECT id 
    FROM warehouses 
    WHERE name = 'Punto de Venta Centro' 
      AND company_id = users.company_id
)
WHERE email = 'operador@empresa.com' 
  AND role = 'user';
*/

-- =====================================================
-- 9. CREAR USUARIO CON ALMACÉN ASIGNADO
-- =====================================================
-- Nota: El password debe hashearse en la aplicación
-- Este es solo un ejemplo de la estructura
/*
INSERT INTO users (
    company_id,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    warehouse_id,
    is_active,
    created_at,
    updated_at
)
VALUES (
    1,                                  -- company_id
    'nuevo.operador@empresa.com',       -- email
    '$2b$10$...',                       -- password_hash (debe hashearse)
    'Nuevo',                            -- first_name
    'Operador',                         -- last_name
    'user',                             -- role
    2,                                  -- warehouse_id
    1,                                  -- is_active
    GETDATE(),                          -- created_at
    GETDATE()                           -- updated_at
);
*/

-- =====================================================
-- 10. QUITAR ASIGNACIÓN DE ALMACÉN A UN USUARIO
-- =====================================================
-- Útil si necesitas reasignar o convertir a admin/manager
/*
UPDATE users 
SET warehouse_id = NULL 
WHERE email = 'usuario@empresa.com';
*/

-- =====================================================
-- 11. VALIDAR CONFIGURACIÓN
-- =====================================================
-- Verificar que no hay usuarios 'user' activos sin almacén
SELECT 
    COUNT(*) as 'Usuarios sin almacén',
    (SELECT COUNT(*) FROM users WHERE role = 'user' AND is_active = 1) as 'Total usuarios activos'
FROM users
WHERE role = 'user' 
  AND is_active = 1 
  AND warehouse_id IS NULL;

-- Si el resultado es 0 usuarios sin almacén, ¡todo está configurado correctamente!

-- =====================================================
-- 12. ESTADÍSTICAS DE ASIGNACIÓN
-- =====================================================
SELECT 
    w.id as 'ID Almacén',
    w.code as 'Código',
    w.name as 'Nombre Almacén',
    w.is_main as 'Principal',
    COUNT(u.id) as 'Usuarios Asignados'
FROM warehouses w
LEFT JOIN users u ON w.id = u.warehouse_id AND u.role = 'user' AND u.is_active = 1
WHERE w.is_active = 1
GROUP BY w.id, w.code, w.name, w.is_main
ORDER BY w.is_main DESC, w.name;

-- =====================================================
-- 13. USUARIOS POR ROL Y ALMACÉN
-- =====================================================
SELECT 
    u.role as 'Rol',
    CASE 
        WHEN u.warehouse_id IS NULL THEN 'Sin almacén'
        ELSE w.name 
    END as 'Almacén',
    COUNT(*) as 'Cantidad'
FROM users u
LEFT JOIN warehouses w ON u.warehouse_id = w.id
WHERE u.is_active = 1
GROUP BY u.role, u.warehouse_id, w.name
ORDER BY u.role, w.name;
