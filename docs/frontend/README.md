# Frontend - Guías de Integración

Esta carpeta contiene toda la documentación necesaria para integrar el backend con aplicaciones frontend.

## 📚 Guías Disponibles

### 📖 [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
Guía principal de integración frontend:
- Configuración inicial
- Autenticación y autorización
- Estructura de requests/responses
- Manejo de errores
- Mejores prácticas

### 💻 [CODE_EXAMPLES.md](CODE_EXAMPLES.md)
Ejemplos de código completos:
- React/Vue/Angular ejemplos
- Servicios API
- Hooks personalizados
- Componentes reutilizables

### ⚡ [OPTIMIZATION_GUIDE.md](OPTIMIZATION_GUIDE.md)
Optimización y performance:
- Caching de datos
- Lazy loading
- Paginación eficiente
- Manejo de estado
- Reducción de requests

### 📝 [IMPLEMENTATION_PROMPT.md](IMPLEMENTATION_PROMPT.md)
Prompt y guía de implementación:
- Checklist de tareas
- Estructura de proyecto frontend
- Convenciones de código
- Testing

---

## 🔌 Integraciones Específicas

### 📊 [AUDIT_LOGS_INTEGRATION.md](AUDIT_LOGS_INTEGRATION.md)
Integración del sistema de auditoría:
- 45+ tipos de operaciones
- Filtros avanzados
- Pantalla de logs
- Componentes React
- Exportación CSV

### 💼 [SALES_MODULE_INTEGRATION.md](SALES_MODULE_INTEGRATION.md)
Integración del módulo de ventas:
- Flujo de ventas completo
- Gestión de clientes
- Métodos de pago
- Descuentos
- Facturación

---

## 🚀 Inicio Rápido

1. **Lee primero**: [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
2. **Configura autenticación**: Ver sección JWT
3. **Revisa ejemplos**: [CODE_EXAMPLES.md](CODE_EXAMPLES.md)
4. **Optimiza**: [OPTIMIZATION_GUIDE.md](OPTIMIZATION_GUIDE.md)

---

## 📦 Endpoints API

Base URL: `http://localhost:3000/api/v1`

### Autenticación
- POST `/auth/login`
- POST `/auth/refresh`
- POST `/auth/logout`

### Recursos Principales
- `/products` - Productos
- `/inventory` - Inventario
- `/sales` - Ventas
- `/customers` - Clientes
- `/warehouses` - Almacenes
- `/audit-logs-db` - Logs de auditoría

Ver [Swagger](http://localhost:3000/api-docs) para documentación interactiva completa.

---

## 🔗 Enlaces Relacionados

- [Volver a Documentación Principal](../README.md)
- [Features Específicas](../features/README.md)
- [Diseño del Sistema](../../DESIGN.md)
- [README Principal](../../README.md)

---

## 💡 Tips

- Usa TypeScript para type safety
- Implementa interceptores para auth
- Maneja errores globalmente
- Implementa retry logic para requests fallidos
- Usa React Query o SWR para cache y sincronización
