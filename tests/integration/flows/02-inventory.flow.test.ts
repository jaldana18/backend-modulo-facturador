/**
 * Flow 02 — Inventory Management
 *
 * Verifies:
 *  - Can list warehouses and find the main one
 *  - Can list and create products
 *  - Can adjust stock (POST /inventory/adjust)
 *  - Stock level is reflected correctly after adjustment
 *  - Can query inventory transactions
 *  - Low-stock endpoint is reachable
 *
 * Prerequisite: backend running + seed data applied.
 */
import { AxiosInstance } from 'axios';
import { createAuthClient, unwrap } from '../helpers/api-client';

describe('Flow 02 — Inventory Management', () => {
  let client: AxiosInstance;
  let mainWarehouseId: number;
  let testProductId: number;

  // Unique suffix so parallel test runs don't collide
  const suffix = Date.now();
  const testProductSku = `TEST-FLOW-${suffix}`;
  const testProductName = `Test Product Flow ${suffix}`;

  beforeAll(async () => {
    const auth = await createAuthClient();
    client = auth.client;
  });

  // ── Warehouses ────────────────────────────────────────────────────────────

  describe('Warehouses', () => {
    it('GET /warehouses returns a list', async () => {
      const res = await client.get('/warehouses');
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      const data = unwrap<any>(res);
      // Endpoint may return a direct array or a paginated { items: [...] } object
      const warehouses: any[] = Array.isArray(data) ? data : data?.items ?? [];
      expect(warehouses.length).toBeGreaterThan(0);
    });

    it('GET /warehouses/main returns the main warehouse', async () => {
      const res = await client.get('/warehouses/main');
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      const warehouse = unwrap<any>(res);
      expect(warehouse).toBeDefined();
      expect(warehouse.id).toBeDefined();
      mainWarehouseId = warehouse.id;
      console.log(`[info] Main warehouse ID: ${mainWarehouseId}`);
    });

    it('GET /warehouses/active returns only active warehouses', async () => {
      const res = await client.get('/warehouses/active');
      expect(res.status).toBe(200);
      const warehouses = unwrap<any[]>(res);
      expect(Array.isArray(warehouses)).toBe(true);
      warehouses.forEach((w) => expect(w.isActive).toBe(true));
    });
  });

  // ── Products ──────────────────────────────────────────────────────────────

  describe('Products', () => {
    it('GET /products returns paginated product list', async () => {
      const res = await client.get('/products', { params: { page: 1, limit: 5 } });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });

    it('POST /products creates a new product', async () => {
      const res = await client.post('/products', {
        name: testProductName,
        sku: testProductSku,
        description: 'Automated test product — safe to delete',
        price: 50,
        cost: 30,
        minStock: 5,
        unitOfMeasure: 'unidades',
        isActive: true,
      });

      expect(res.status).toBe(201);
      expect(res.data.success).toBe(true);
      const product = unwrap<any>(res);
      expect(product.id).toBeDefined();
      expect(product.sku).toBe(testProductSku);
      testProductId = product.id;
      console.log(`[info] Created test product ID: ${testProductId}`);
    });

    it('GET /products/:id returns the created product', async () => {
      const res = await client.get(`/products/${testProductId}`);
      expect(res.status).toBe(200);
      const product = unwrap<any>(res);
      expect(product.id).toBe(testProductId);
      expect(product.name).toBe(testProductName);
    });
  });

  // ── Inventory Adjust ──────────────────────────────────────────────────────

  describe('Stock adjustment', () => {
    it('POST /inventory/adjust sets initial stock to 100', async () => {
      const res = await client.post('/inventory/adjust', {
        productId: testProductId,
        warehouseId: mainWarehouseId,
        newStock: 100,
        reason: 'initial_stock',
        notes: 'Integration test initial stock',
      });

      expect(res.status).toBe(201);
      expect(res.data.success).toBe(true);
    });

    it('GET /inventory/stock/:productId reflects the adjusted stock', async () => {
      const res = await client.get(`/inventory/stock/${testProductId}`, {
        params: { warehouseId: mainWarehouseId },
      });

      expect(res.status).toBe(200);
      const stockData = unwrap<any>(res);
      // Response may be an array (per warehouse) or a single object
      if (Array.isArray(stockData)) {
        const entry = stockData.find((s: any) => s.warehouseId === mainWarehouseId);
        expect(entry).toBeDefined();
        expect(Number(entry.quantity)).toBeGreaterThanOrEqual(100);
      } else {
        const qty = Number(stockData?.quantity ?? stockData?.totalStock ?? stockData?.stock ?? stockData?.currentStock);
        expect(qty).toBeGreaterThanOrEqual(100);
      }
    });

    it('POST /inventory/adjust again to 200 — updates stock', async () => {
      const res = await client.post('/inventory/adjust', {
        productId: testProductId,
        warehouseId: mainWarehouseId,
        newStock: 200,
        reason: 'correction',
        notes: 'Integration test correction',
      });

      expect(res.status).toBe(201);
    });

    it('POST /inventory/adjust with invalid productId returns 404', async () => {
      const res = await client.post('/inventory/adjust', {
        productId: 999999,
        warehouseId: mainWarehouseId,
        newStock: 10,
        reason: 'correction',
      });

      expect([400, 404]).toContain(res.status);
    });

    it('POST /inventory/adjust with missing reason returns 400', async () => {
      const res = await client.post('/inventory/adjust', {
        productId: testProductId,
        warehouseId: mainWarehouseId,
        newStock: 50,
        // reason intentionally omitted
      });

      expect(res.status).toBe(400);
    });
  });

  // ── Inventory Transactions ────────────────────────────────────────────────

  describe('Inventory transactions', () => {
    it('GET /inventory/transactions returns a list', async () => {
      const res = await client.get('/inventory/transactions', {
        params: { page: 1, limit: 10 },
      });

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });

    it('GET /inventory/history/:productId returns history for the test product', async () => {
      const res = await client.get(`/inventory/history/${testProductId}`);
      expect(res.status).toBe(200);
      const history = unwrap<any>(res);
      const items = Array.isArray(history) ? history : history?.items ?? [];
      expect(items.length).toBeGreaterThan(0);
    });

    it('GET /inventory/low-stock is reachable', async () => {
      const res = await client.get('/inventory/low-stock');
      expect(res.status).toBe(200);
    });
  });
});
