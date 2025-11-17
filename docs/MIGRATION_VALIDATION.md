# Sistema de Validación de Migraciones

Sistema automático para validar que las entidades TypeORM estén sincronizadas con el esquema real de la base de datos.

## Características

- ✅ **Validación automática** en el arranque del servidor
- ✅ **Comparación detallada** de columnas, tipos y propiedades
- ✅ **Reportes claros** con diferencias específicas
- ✅ **Modos de operación** configurables (warning vs strict)
- ✅ **Comandos CLI** para validación manual

## Uso

### Validación Automática

El sistema se ejecuta automáticamente al arrancar el servidor si está habilitado en `.env`:

```bash
VALIDATE_SCHEMA_ON_STARTUP=true
STRICT_SCHEMA_VALIDATION=false
```

**Modo Warning (default)**:
- Muestra advertencias si hay diferencias
- El servidor arranca normalmente
- Útil para desarrollo

**Modo Strict**:
- Lanza error si hay diferencias
- El servidor NO arranca
- Útil para producción y CI/CD

### Comandos Manuales

**Validación con advertencias**:
```bash
npm run schema:validate
```

**Validación estricta**:
```bash
npm run schema:validate:strict
```

## Qué Valida

### Columnas
- ✅ Columnas faltantes en la base de datos
- ✅ Columnas extra en la base de datos
- ✅ Tipos de datos incompatibles
- ✅ Propiedades nullable diferentes
- ✅ Longitudes de columnas

### Ejemplo de Reporte

```
❌ Schema Validation Failed

Summary:
  Total tables: 3
  Tables with issues: 1
  Total issues: 2

Differences:

📋 Table: products
  ⚠️  Missing columns in database:
     - new_field
  ⚠️  Column definition mismatches:
     - category: nullable mismatch (entity: false, db: true)

💡 Run migrations to sync the schema:
   npm run migration:run
```

## Configuración

### Variables de Entorno

```bash
# Habilitar validación en startup
VALIDATE_SCHEMA_ON_STARTUP=true

# Modo estricto (detiene el servidor si hay diferencias)
STRICT_SCHEMA_VALIDATION=false
```

### Desactivar la Validación

Para desarrollo local, puedes desactivarla temporalmente:

```bash
VALIDATE_SCHEMA_ON_STARTUP=false
```

## Integración en CI/CD

### GitHub Actions Example

```yaml
- name: Validate Schema
  run: npm run schema:validate:strict
  env:
    DB_HOST: localhost
    DB_PORT: 1433
    DB_NAME: test_db
```

### Pre-deployment Check

```bash
#!/bin/bash
npm run schema:validate:strict
if [ $? -ne 0 ]; then
  echo "Schema validation failed! Run migrations before deploying."
  exit 1
fi
```

## Casos de Uso

### 1. Desarrollo Local

```bash
# Validación con warnings
VALIDATE_SCHEMA_ON_STARTUP=true
STRICT_SCHEMA_VALIDATION=false
```

**Flujo**:
1. Modificas una entidad
2. El servidor arranca con warning
3. Ves el reporte de diferencias
4. Ejecutas `npm run migration:run`

### 2. Staging/Pruebas

```bash
# Validación estricta
VALIDATE_SCHEMA_ON_STARTUP=true
STRICT_SCHEMA_VALIDATION=true
```

**Flujo**:
1. Deploy a staging
2. El servidor valida el schema
3. Si hay diferencias, el deploy falla
4. Debe ejecutar migraciones primero

### 3. Producción

```bash
# Validación estricta obligatoria
VALIDATE_SCHEMA_ON_STARTUP=true
STRICT_SCHEMA_VALIDATION=true
```

**Flujo**:
1. Deploy a producción
2. Schema debe estar 100% sincronizado
3. Si no, el servidor no arranca
4. Previene inconsistencias de datos

## Solución de Problemas

### Falsos Positivos

El sistema puede reportar diferencias de tipo que son compatibles (ej. `string` vs `nvarchar`). Estos son informativos y no necesariamente errores.

### Diferencias Reales

Si ves:
- ❌ Missing columns → Falta ejecutar migraciones
- ❌ Extra columns → Limpiar columnas huérfanas de la BD
- ❌ Nullable mismatch → Actualizar entidad o base de datos

### Solución

```bash
# 1. Generar migración si modificaste entidades
npm run migration:generate -- src/migrations/SyncSchema

# 2. Ejecutar migraciones pendientes
npm run migration:run

# 3. Verificar
npm run schema:validate
```

## Arquitectura

### Componentes

1. **MigrationValidator** (`src/utils/migration-validator.util.ts`)
   - Clase principal de validación
   - Compara metadatos de entidades con schema real

2. **CLI Script** (`src/scripts/validate-schema.ts`)
   - Comando independiente para validación manual

3. **Database Integration** (`src/config/database.ts`)
   - Validación automática en `initializeDatabase()`

4. **Environment Config** (`src/config/environment.ts`)
   - Variables de configuración del sistema

### Flujo de Validación

```
┌─────────────────────────────────────────┐
│   Server Startup / Manual Command      │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│     MigrationValidator.validate()       │
│  • Get entity metadata from TypeORM     │
│  • Query INFORMATION_SCHEMA             │
│  • Compare columns & types              │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│         Generate Report                 │
│  • Missing columns                      │
│  • Extra columns                        │
│  • Type mismatches                      │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴─────────┐
        │                    │
        ▼                    ▼
  ┌─────────┐          ┌─────────┐
  │ Warning │          │  Error  │
  │  Mode   │          │  Mode   │
  └─────────┘          └─────────┘
```

## Best Practices

1. **Desarrollo**: Usar modo warning para no bloquear el flujo
2. **CI/CD**: Usar modo strict para garantizar consistencia
3. **Producción**: Modo strict obligatorio
4. **Migraciones**: Siempre ejecutar antes de deploy
5. **Validación**: Parte del proceso de deployment

## Limitaciones Conocidas

- No valida constraints (FK, UK, etc.) - solo columnas
- No valida índices
- Puede reportar diferencias tipo como falsos positivos
- Solo soporta SQL Server actualmente

## Extensibilidad

Para agregar validación de constraints o índices, extender `MigrationValidator`:

```typescript
async validateConstraints(metadata: EntityMetadata): Promise<ConstraintDifference[]> {
  // Implementar validación de constraints
}
```

---

**Implementado**: Versión 1.0.0
**Última actualización**: 2025-01-15
