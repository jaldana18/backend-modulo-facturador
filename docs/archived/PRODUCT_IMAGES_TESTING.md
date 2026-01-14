# 🧪 Pruebas de la API de Imágenes de Productos

Este documento contiene ejemplos para probar la funcionalidad de carga de imágenes usando diferentes herramientas.

## 📋 Configuración Previa

```bash
# Variables de entorno (ajusta según tu configuración)
BASE_URL="http://localhost:3000"
API_VERSION="v1"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." # Tu token JWT
PRODUCT_ID="1" # ID del producto a probar
```

## 🔧 Postman / Thunder Client

### 1. Subir Imagen

**Request:**
- **Method:** POST
- **URL:** `{{BASE_URL}}/api/v1/products/{{PRODUCT_ID}}/image`
- **Headers:**
  ```
  Authorization: Bearer {{TOKEN}}
  ```
- **Body:** (form-data)
  - Key: `image` (tipo: File)
  - Value: Selecciona un archivo de imagen

**Response esperada:**
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

### 2. Eliminar Imagen

**Request:**
- **Method:** DELETE
- **URL:** `{{BASE_URL}}/api/v1/products/{{PRODUCT_ID}}/image`
- **Headers:**
  ```
  Authorization: Bearer {{TOKEN}
  ```

**Response esperada:**
```json
{
  "success": true,
  "data": {
    "message": "Imagen eliminada correctamente"
  }
}
```

### 3. Obtener Producto con Imagen

**Request:**
- **Method:** GET
- **URL:** `{{BASE_URL}}/api/v1/products/{{PRODUCT_ID}}`
- **Headers:**
  ```
  Authorization: Bearer {{TOKEN}}
  ```

**Response esperada:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "sku": "PROD-001",
    "name": "Laptop Dell XPS 15",
    "imageUrl": "/uploads/products/company-1/550e8400-e29b-41d4-a716-446655440000.jpg",
    ...
  }
}
```

---

## 💻 cURL

### 1. Subir Imagen

```bash
curl -X POST \
  http://localhost:3000/api/v1/products/1/image \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "image=@/path/to/your/image.jpg"
```

**Con archivo desde Windows:**
```powershell
curl.exe -X POST `
  http://localhost:3000/api/v1/products/1/image `
  -H "Authorization: Bearer YOUR_TOKEN_HERE" `
  -F "image=@C:\Users\user\Pictures\product.jpg"
```

### 2. Eliminar Imagen

```bash
curl -X DELETE \
  http://localhost:3000/api/v1/products/1/image \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Ver Imagen en el Navegador

```bash
# Una vez subida, abre la URL en el navegador
http://localhost:3000/uploads/products/company-1/550e8400-e29b-41d4-a716-446655440000.jpg
```

---

## 🌐 JavaScript/Node.js

### Usando axios

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function uploadProductImage(productId, imagePath, token) {
  const formData = new FormData();
  formData.append('image', fs.createReadStream(imagePath));

  try {
    const response = await axios.post(
      `http://localhost:3000/api/v1/products/${productId}/image`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('✅ Imagen subida:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function deleteProductImage(productId, token) {
  try {
    const response = await axios.delete(
      `http://localhost:3000/api/v1/products/${productId}/image`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('✅ Imagen eliminada:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Uso
const TOKEN = 'your-jwt-token-here';
const PRODUCT_ID = 1;

// Subir imagen
uploadProductImage(PRODUCT_ID, './product-image.jpg', TOKEN);

// Eliminar imagen
// deleteProductImage(PRODUCT_ID, TOKEN);
```

### Usando fetch (Frontend)

```javascript
async function uploadImage(productId, file) {
  const formData = new FormData();
  formData.append('image', file);

  try {
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

    console.log('✅ Imagen subida:', result.data);
    return result.data.imageUrl;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Uso en un input file
document.getElementById('imageInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    const productId = 1; // ID del producto
    const imageUrl = await uploadImage(productId, file);
    
    // Mostrar la imagen
    document.getElementById('preview').src = imageUrl;
  }
});
```

---

## 🐍 Python

### Usando requests

```python
import requests

def upload_product_image(product_id, image_path, token):
    url = f"http://localhost:3000/api/v1/products/{product_id}/image"
    
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    files = {
        'image': open(image_path, 'rb')
    }
    
    response = requests.post(url, headers=headers, files=files)
    
    if response.status_code == 200:
        result = response.json()
        print("✅ Imagen subida:", result['data'])
        return result['data']
    else:
        print("❌ Error:", response.json())
        return None

def delete_product_image(product_id, token):
    url = f"http://localhost:3000/api/v1/products/{product_id}/image"
    
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    response = requests.delete(url, headers=headers)
    
    if response.status_code == 200:
        result = response.json()
        print("✅ Imagen eliminada:", result['data'])
        return result['data']
    else:
        print("❌ Error:", response.json())
        return None

# Uso
TOKEN = "your-jwt-token-here"
PRODUCT_ID = 1

# Subir imagen
upload_product_image(PRODUCT_ID, "./product-image.jpg", TOKEN)

# Eliminar imagen
# delete_product_image(PRODUCT_ID, TOKEN)
```

---

## 📝 Casos de Prueba

### ✅ Casos Exitosos

1. **Subir JPG de 2MB**
   - Imagen: `test-image.jpg` (2 MB)
   - Resultado esperado: ✅ Success

2. **Subir PNG de 1MB**
   - Imagen: `test-image.png` (1 MB)
   - Resultado esperado: ✅ Success

3. **Reemplazar imagen existente**
   - Imagen existente: `old.jpg`
   - Nueva imagen: `new.png`
   - Resultado esperado: ✅ Success, old.jpg eliminado

4. **Eliminar imagen existente**
   - Producto con imagen
   - Resultado esperado: ✅ Success, archivo eliminado

### ❌ Casos de Error

1. **Archivo muy grande (>5MB)**
   ```bash
   curl -X POST http://localhost:3000/api/v1/products/1/image \
     -H "Authorization: Bearer TOKEN" \
     -F "image=@large-image.jpg"
   ```
   **Resultado esperado:**
   ```json
   {
     "success": false,
     "error": {
       "code": "FILE_TOO_LARGE",
       "message": "La imagen excede el tamaño máximo permitido de 5 MB"
     }
   }
   ```

2. **Tipo de archivo inválido (PDF)**
   ```bash
   curl -X POST http://localhost:3000/api/v1/products/1/image \
     -H "Authorization: Bearer TOKEN" \
     -F "image=@document.pdf"
   ```
   **Resultado esperado:**
   ```json
   {
     "success": false,
     "error": {
       "code": "INVALID_FILE_TYPE",
       "message": "Solo se permiten archivos de imagen (jpg, png, gif, webp)"
     }
   }
   ```

3. **Sin archivo**
   ```bash
   curl -X POST http://localhost:3000/api/v1/products/1/image \
     -H "Authorization: Bearer TOKEN"
   ```
   **Resultado esperado:**
   ```json
   {
     "success": false,
     "error": {
       "code": "NO_FILE_UPLOADED",
       "message": "No se subió ninguna imagen"
     }
   }
   ```

4. **Producto no existe**
   ```bash
   curl -X POST http://localhost:3000/api/v1/products/99999/image \
     -H "Authorization: Bearer TOKEN" \
     -F "image=@test.jpg"
   ```
   **Resultado esperado:**
   ```json
   {
     "success": false,
     "error": {
       "code": "PRODUCT_NOT_FOUND",
       "message": "Product not found"
     }
   }
   ```

5. **Sin autenticación**
   ```bash
   curl -X POST http://localhost:3000/api/v1/products/1/image \
     -F "image=@test.jpg"
   ```
   **Resultado esperado:**
   ```json
   {
     "success": false,
     "error": {
       "code": "UNAUTHORIZED",
       "message": "No token provided"
     }
   }
   ```

6. **Usuario sin permisos (role: user)**
   ```bash
   curl -X POST http://localhost:3000/api/v1/products/1/image \
     -H "Authorization: Bearer USER_TOKEN" \
     -F "image=@test.jpg"
   ```
   **Resultado esperado:**
   ```json
   {
     "success": false,
     "error": {
       "code": "FORBIDDEN",
       "message": "Insufficient permissions"
     }
   }
   ```

---

## 🔍 Verificación

### 1. Verificar archivo en el servidor

```bash
# Listar archivos subidos de una compañía
ls -la uploads/products/company-1/

# Ver detalles de un archivo
file uploads/products/company-1/550e8400-e29b-41d4-a716-446655440000.jpg
```

**Windows PowerShell:**
```powershell
# Listar archivos
Get-ChildItem uploads\products\company-1\

# Ver tamaño
Get-Item uploads\products\company-1\550e8400-e29b-41d4-a716-446655440000.jpg | Select-Object Length,Name
```

### 2. Verificar en base de datos

```sql
-- Ver productos con imágenes
SELECT id, sku, name, image_url 
FROM products 
WHERE image_url IS NOT NULL;

-- Ver todas las imágenes de una compañía
SELECT id, sku, name, image_url 
FROM products 
WHERE company_id = 1 AND image_url IS NOT NULL;
```

### 3. Acceso directo en navegador

Abre en el navegador:
```
http://localhost:3000/uploads/products/company-1/550e8400-e29b-41d4-a716-446655440000.jpg
```

---

## 🐛 Troubleshooting

### Problema: Error al subir archivo

**Síntoma:** Error 500 o "Cannot POST /api/v1/products/1/image"

**Solución:**
1. Verificar que el servidor esté corriendo
2. Verificar que las rutas estén registradas
3. Verificar permisos de escritura en la carpeta `uploads/`

```bash
# Dar permisos a la carpeta uploads (Linux/Mac)
chmod -R 755 uploads/

# Windows: Verificar que el usuario tenga permisos de escritura
```

### Problema: Imagen no se muestra

**Síntoma:** 404 al acceder a `/uploads/...`

**Solución:**
1. Verificar que Express esté sirviendo la carpeta static:
   ```typescript
   app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
   ```
2. Verificar que el archivo exista en el servidor
3. Verificar la ruta completa

### Problema: Error de CORS

**Síntoma:** CORS error al subir desde frontend en otro dominio

**Solución:**
Agregar configuración CORS en `app.ts`:
```typescript
app.use(cors({
  origin: 'http://localhost:3001', // URL de tu frontend
  credentials: true
}));
```

---

## 📊 Métricas de Rendimiento

Para probar el rendimiento:

```bash
# Subir 10 imágenes consecutivas
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/v1/products/1/image \
    -H "Authorization: Bearer TOKEN" \
    -F "image=@test-$i.jpg" \
    -w "Time: %{time_total}s\n"
done
```

**PowerShell:**
```powershell
1..10 | ForEach-Object {
  $time = Measure-Command {
    curl.exe -X POST http://localhost:3000/api/v1/products/1/image `
      -H "Authorization: Bearer TOKEN" `
      -F "image=@test-$_.jpg"
  }
  Write-Host "Upload $_: $($time.TotalSeconds)s"
}
```

---

¡Listo para probar! 🚀
