# 📸 Sistema de Carga de Imágenes de Productos

## 📋 Descripción

Sistema completo para gestionar imágenes de productos con almacenamiento organizado por compañía.

## 🗂️ Estructura de Almacenamiento

Las imágenes se almacenan en el servidor con la siguiente estructura:

```
uploads/
└── products/
    ├── company-1/
    │   ├── 550e8400-e29b-41d4-a716-446655440000.jpg
    │   └── 6ba7b810-9dad-11d1-80b4-00c04fd430c8.png
    ├── company-2/
    │   └── 7c9e6679-7425-40de-944b-e07fc1f90ae7.jpg
    └── company-3/
        └── ...
```

- Cada compañía tiene su propia carpeta: `company-{companyId}/`
- Los archivos se renombran con UUIDs únicos para evitar colisiones
- Se preserva la extensión original del archivo

## 🔐 Base de Datos

### Nueva Columna en Productos

```sql
ALTER TABLE products
ADD image_url NVARCHAR(500) NULL;
```

La columna `image_url` almacena la ruta relativa de la imagen, por ejemplo:
```
/uploads/products/company-1/550e8400-e29b-41d4-a716-446655440000.jpg
```

## 🚀 Endpoints

### 1. Subir/Reemplazar Imagen de Producto

**POST** `/api/v1/products/:id/image`

**Autenticación:** Requerida (Bearer Token)

**Roles permitidos:** `admin`, `manager`

**Content-Type:** `multipart/form-data`

**Parámetros:**
- `id` (path): ID del producto

**Body (form-data):**
- `image` (file): Archivo de imagen

**Formatos aceptados:**
- JPEG/JPG
- PNG
- GIF
- WebP

**Tamaño máximo:** 5MB

**Ejemplo con cURL:**
```bash
curl -X POST \
  http://localhost:3000/api/v1/products/123/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/product-image.jpg"
```

**Ejemplo con JavaScript (Fetch API):**
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

const response = await fetch(`/api/v1/products/${productId}/image`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: formData
});

const result = await response.json();
console.log(result.data.imageUrl); // "/uploads/products/company-1/..."
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "imageUrl": "/uploads/products/company-1/550e8400-e29b-41d4-a716-446655440000.jpg",
    "filename": "550e8400-e29b-41d4-a716-446655440000.jpg",
    "size": 245680,
    "mimetype": "image/jpeg"
  }
}
```

**Comportamiento:**
- Si el producto ya tiene una imagen, se elimina la anterior automáticamente
- La nueva imagen se sube y se actualiza el campo `imageUrl` del producto
- El producto debe existir y pertenecer a la compañía del usuario

### 2. Eliminar Imagen de Producto

**DELETE** `/api/v1/products/:id/image`

**Autenticación:** Requerida (Bearer Token)

**Roles permitidos:** `admin`, `manager`

**Parámetros:**
- `id` (path): ID del producto

**Ejemplo con cURL:**
```bash
curl -X DELETE \
  http://localhost:3000/api/v1/products/123/image \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "message": "Imagen eliminada correctamente"
  }
}
```

**Comportamiento:**
- Elimina el archivo físico del servidor
- Actualiza el campo `imageUrl` a `null` en la base de datos
- Retorna error 404 si el producto no tiene imagen

### 3. Acceder a Imágenes

Las imágenes se sirven como archivos estáticos:

**GET** `/uploads/products/company-{id}/{filename}`

**Ejemplo:**
```html
<img src="/uploads/products/company-1/550e8400-e29b-41d4-a716-446655440000.jpg" 
     alt="Producto" />
```

**No requiere autenticación** - Las imágenes son públicamente accesibles

## 🔒 Seguridad y Validaciones

### Validación de Tipo de Archivo
Solo se permiten archivos de imagen:
- `image/jpeg`
- `image/jpg`
- `image/png`
- `image/gif`
- `image/webp`

### Validación de Tamaño
- Máximo: **5 MB**
- Si se excede, retorna error 400:
```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "La imagen excede el tamaño máximo permitido de 5 MB"
  }
}
```

### Control de Acceso
- Solo usuarios con roles `admin` o `manager` pueden subir/eliminar imágenes
- Los productos deben pertenecer a la compañía del usuario autenticado

### Almacenamiento por Compañía
- Cada compañía tiene su propia carpeta
- Evita colisiones entre compañías
- Facilita backups y gestión de archivos

## 📝 Ejemplos de Uso

### React/TypeScript - Componente de Carga

```tsx
import React, { useState } from 'react';

interface ProductImageUploadProps {
  productId: number;
  currentImageUrl?: string | null;
  onUploadSuccess: (imageUrl: string) => void;
}

export const ProductImageUpload: React.FC<ProductImageUploadProps> = ({
  productId,
  currentImageUrl,
  onUploadSuccess
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo no debe superar 5 MB');
      return;
    }

    // Validar tipo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Solo se permiten imágenes (JPG, PNG, GIF, WebP)');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`/api/v1/products/${productId}/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: formData
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error.message);
      }

      onUploadSuccess(result.data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Está seguro de eliminar la imagen?')) return;

    setUploading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/products/${productId}/image`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error.message);
      }

      onUploadSuccess('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar imagen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="product-image-upload">
      {currentImageUrl ? (
        <div className="current-image">
          <img src={currentImageUrl} alt="Producto" />
          <button onClick={handleDelete} disabled={uploading}>
            Eliminar Imagen
          </button>
        </div>
      ) : (
        <div className="no-image">
          <p>Sin imagen</p>
        </div>
      )}

      <input
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        disabled={uploading}
      />

      {uploading && <p>Subiendo...</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
};
```

### Formulario HTML Simple

```html
<!DOCTYPE html>
<html>
<head>
  <title>Subir Imagen de Producto</title>
</head>
<body>
  <h1>Subir Imagen</h1>
  
  <form id="uploadForm">
    <input type="file" id="imageFile" accept="image/*" required>
    <button type="submit">Subir</button>
  </form>

  <div id="preview"></div>

  <script>
    const form = document.getElementById('uploadForm');
    const fileInput = document.getElementById('imageFile');
    const preview = document.getElementById('preview');
    const productId = 123; // ID del producto
    const token = 'YOUR_JWT_TOKEN'; // Token de autenticación

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const file = fileInput.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('image', file);

      try {
        const response = await fetch(`/api/v1/products/${productId}/image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const result = await response.json();

        if (result.success) {
          preview.innerHTML = `
            <h2>¡Imagen subida!</h2>
            <img src="${result.data.imageUrl}" alt="Producto" width="300">
            <p>URL: ${result.data.imageUrl}</p>
            <p>Tamaño: ${(result.data.size / 1024).toFixed(2)} KB</p>
          `;
        } else {
          alert('Error: ' + result.error.message);
        }
      } catch (error) {
        alert('Error al subir la imagen: ' + error.message);
      }
    });
  </script>
</body>
</html>
```

## ⚠️ Manejo de Errores

### Errores Comunes

| Código | Mensaje | Causa |
|--------|---------|-------|
| `NO_FILE_UPLOADED` | No se subió ninguna imagen | No se envió el campo `image` en el form-data |
| `INVALID_FILE_TYPE` | Solo se permiten archivos de imagen | El archivo no es JPG, PNG, GIF o WebP |
| `FILE_TOO_LARGE` | La imagen excede el tamaño máximo de 5 MB | El archivo es mayor a 5 MB |
| `PRODUCT_NOT_FOUND` | El producto no existe | El ID del producto es inválido |
| `NO_IMAGE_FOUND` | El producto no tiene imagen | Intentando eliminar imagen cuando no existe |
| `WAREHOUSE_ACCESS_DENIED` | No tienes acceso a este almacén | Problema de permisos |

### Ejemplo de Manejo

```javascript
async function uploadProductImage(productId, file) {
  try {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`/api/v1/products/${productId}/image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const result = await response.json();

    if (!result.success) {
      // Manejo específico por código de error
      switch (result.error.code) {
        case 'FILE_TOO_LARGE':
          alert('La imagen es muy grande. Máximo 5 MB');
          break;
        case 'INVALID_FILE_TYPE':
          alert('Solo se permiten imágenes (JPG, PNG, GIF, WebP)');
          break;
        case 'PRODUCT_NOT_FOUND':
          alert('El producto no existe');
          break;
        default:
          alert('Error: ' + result.error.message);
      }
      return null;
    }

    return result.data.imageUrl;
  } catch (error) {
    console.error('Error de red:', error);
    alert('Error de conexión al servidor');
    return null;
  }
}
```

## 🗄️ Migración

Para aplicar la migración de base de datos:

```bash
# SQL Server
sqlcmd -S localhost -d inventario_db -i migrations/008_add_product_image_url.sql
```

O ejecutar manualmente:

```sql
-- Renombrar columna existente 'imagen' a 'image_url'
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[products]') AND name = 'imagen')
BEGIN
    EXEC sp_rename 'products.imagen', 'image_url', 'COLUMN';
END
ELSE IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[products]') AND name = 'image_url')
BEGIN
    ALTER TABLE products ADD image_url NVARCHAR(500) NULL;
END
```

## 📚 Notas Importantes

1. **Backup de Imágenes:** Las imágenes están en `uploads/`. Asegúrate de incluir esta carpeta en tus backups.

2. **Escalabilidad:** Para producción con alto tráfico, considera usar:
   - CDN (CloudFront, Cloudflare)
   - Almacenamiento en la nube (S3, Azure Blob Storage)
   - Optimización de imágenes (compresión, WebP)

3. **Limpieza:** Si eliminas productos, considera implementar un proceso para limpiar imágenes huérfanas.

4. **CORS:** Las imágenes se sirven desde el mismo dominio. Si el frontend está en otro dominio, ajusta la configuración CORS.

5. **HTTPS:** En producción, usa HTTPS para proteger las imágenes durante la transmisión.

## 🔧 Configuración Avanzada

### Cambiar Tamaño Máximo

En `src/middleware/imageUpload.middleware.ts`:

```typescript
export const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // Cambiar a 10 MB
  },
});
```

### Agregar Más Formatos

En `src/middleware/imageUpload.middleware.ts`:

```typescript
const allowedMimes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml', // Agregar SVG
  'image/bmp',     // Agregar BMP
];
```

---

## 📞 Soporte

Para dudas o problemas, contacta al equipo de desarrollo.
