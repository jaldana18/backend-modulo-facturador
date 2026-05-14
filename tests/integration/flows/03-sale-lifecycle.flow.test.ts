/**
 * Flow 03 — Complete Sale Lifecycle
 *
 * Simulates a full business transaction:
 *  1. Set up: create product + stock + customer
 *  2. Create a sale (draft)
 *  3. Confirm → stock decreases
 *  4. Dispatch
 *  5. Deliver
 *  6. Register a payment
 *  7. Verify balance = 0
 *
 * Also tests cancellation flow:
 *  - Create → confirm → cancel → stock restored
 *
 * Prerequisite: backend running + seed data applied.
 */
import { AxiosInstance } from 'axios';
import { createAuthClient, unwrap } from '../helpers/api-client';

describe('Flow 03 — Sale Lifecycle', () => {
  let client: AxiosInstance;

  let mainWarehouseId: number;
  let testProductId: number;
  let testCustomerId: number;
  let paymentMethodId: number;

  const suffix = Date.now();
  const testProductSku = `SALE-FLOW-${suffix}`;

  let fullCycleSaleId: number;
  let cancelFlowSaleId: number;

  beforeAll(async () => {
    const auth = await createAuthClient();
    client = auth.client;

    // ── Resolve main warehouse ─────────────────────────────────────────────
    const whRes = await client.get('/warehouses/main');
    expect(whRes.status).toBe(200);
    mainWarehouseId = unwrap<any>(whRes).id;

    // ── Create a product for this flow ─────────────────────────────────────
    const prodRes = await client.post('/products', {
      name: `Sale Flow Product ${suffix}`,
      sku: testProductSku,
      description: 'Used by integration flow 03',
      price: 100,
      cost: 60,
      minStock: 2,
      unitOfMeasure: 'unidades',
      isActive: true,
    });
    expect(prodRes.status).toBe(201);
    testProductId = unwrap<any>(prodRes).id;

    // ── Load 50 units into inventory ───────────────────────────────────────
    const adjRes = await client.post('/inventory/adjust', {
      productId: testProductId,
      warehouseId: mainWarehouseId,
      newStock: 50,
      reason: 'initial_stock',
      notes: 'Sale flow 03 initial stock',
    });
    expect(adjRes.status).toBe(201);

    // ── Create a customer ──────────────────────────────────────────────────
    const custRes = await client.post('/customers', {
      name: `Flow Customer ${suffix}`,
      email: `flow${suffix}@testcorp.com`,
      phone: '555-0000',
      documentType: 'NIT',
      documentNumber: `FLOW-${suffix}`,
      isActive: true,
    });
    expect(custRes.status).toBe(201);
    testCustomerId = unwrap<any>(custRes).id;

    // ── Find a payment method ──────────────────────────────────────────────
    const pmRes = await client.get('/payment-methods');
    expect(pmRes.status).toBe(200);
    const pmData = unwrap<any>(pmRes);
    const methods: any[] = Array.isArray(pmData) ? pmData : pmData?.items ?? [];
    if (methods.length > 0) {
      // Prefer a method that does not require a reference number
      const noRef = methods.find((m) => m.isActive !== false && !m.requiresReference);
      const active = noRef ?? methods.find((m) => m.isActive !== false) ?? methods[0];
      paymentMethodId = active.id;
    } else {
      const newPm = await client.post('/payment-methods', {
        name: `Cash Flow ${suffix}`,
        type: 'cash',
        isActive: true,
      });
      paymentMethodId = unwrap<any>(newPm).id;
    }

    console.log(
      `[info] Setup — warehouse: ${mainWarehouseId}, product: ${testProductId}, customer: ${testCustomerId}, paymentMethod: ${paymentMethodId}`
    );
  });

  // ── Helper: get current stock ─────────────────────────────────────────────
  async function getStock(productId: number, warehouseId: number): Promise<number> {
    const res = await client.get(`/inventory/stock/${productId}`, {
      params: { warehouseId },
    });
    const data = unwrap<any>(res);
    if (Array.isArray(data)) {
      const entry = data.find((s: any) => s.warehouseId === warehouseId || s.warehouse_id === warehouseId);
      return entry ? Number(entry.quantity ?? entry.stock ?? 0) : 0;
    }
    return Number(data?.quantity ?? data?.currentStock ?? data?.totalStock ?? data?.stock ?? 0);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FULL LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Full lifecycle: draft → confirmed → dispatched → delivered + payment', () => {
    it('1. Create sale in DRAFT status', async () => {
      const res = await client.post('/sales', {
        saleType: 'invoice',
        customerId: testCustomerId,
        warehouseId: mainWarehouseId,
        taxPercentage: 0,
        notes: 'Integration test — full lifecycle',
        details: [
          {
            productId: testProductId,
            quantity: 3,
            unitPrice: 100,
            taxPercentage: 0,
            discountPercentage: 0,
          },
        ],
      });

      expect(res.status).toBe(201);
      expect(res.data.success).toBe(true);
      const sale = unwrap<any>(res);
      expect(sale.id).toBeDefined();
      expect(sale.status).toBe('draft');
      fullCycleSaleId = sale.id;
      console.log(`[info] Draft sale ID: ${fullCycleSaleId}`);
    });

    it('2. GET /sales/:id shows draft with correct total', async () => {
      const res = await client.get(`/sales/${fullCycleSaleId}`);
      expect(res.status).toBe(200);
      const sale = unwrap<any>(res);
      expect(sale.status).toBe('draft');
      // 3 units × $100 = $300
      expect(Number(sale.total ?? sale.totalAmount ?? sale.grandTotal)).toBeGreaterThanOrEqual(300);
    });

    let stockBeforeConfirm: number;

    it('3. Record stock before confirming', async () => {
      stockBeforeConfirm = await getStock(testProductId, mainWarehouseId);
      console.log(`[info] Stock before confirm: ${stockBeforeConfirm}`);
      expect(stockBeforeConfirm).toBeGreaterThanOrEqual(3);
    });

    it('4. POST /sales/:id/confirm — status becomes CONFIRMED and stock decrements', async () => {
      const res = await client.post(`/sales/${fullCycleSaleId}/confirm`);
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      const sale = unwrap<any>(res);
      expect(sale.status).toBe('confirmed');
    });

    it('5. Stock decreased by 3 after confirmation', async () => {
      const stockAfterConfirm = await getStock(testProductId, mainWarehouseId);
      console.log(`[info] Stock after confirm: ${stockAfterConfirm}`);
      expect(stockAfterConfirm).toBe(stockBeforeConfirm - 3);
    });

    it('6. POST /sales/:id/dispatch — status becomes DISPATCHED', async () => {
      const res = await client.post(`/sales/${fullCycleSaleId}/dispatch`);
      expect(res.status).toBe(200);
      const sale = unwrap<any>(res);
      expect(sale.status).toBe('dispatched');
    });

    it('7. POST /sales/:id/deliver — status becomes DELIVERED', async () => {
      const res = await client.post(`/sales/${fullCycleSaleId}/deliver`);
      expect(res.status).toBe(200);
      const sale = unwrap<any>(res);
      expect(sale.status).toBe('delivered');
    });

    let balanceBefore: number;

    it('8. GET /sales/:id shows a pending balance', async () => {
      const res = await client.get(`/sales/${fullCycleSaleId}`);
      const sale = unwrap<any>(res);
      balanceBefore = Number(sale.balance ?? sale.pendingBalance ?? sale.total ?? sale.totalAmount);
      console.log(`[info] Pending balance: ${balanceBefore}`);
      expect(balanceBefore).toBeGreaterThan(0);
    });

    it('9. POST /payments — registers a full payment', async () => {
      const res = await client.post('/payments', {
        saleId: fullCycleSaleId,
        paymentMethodId,
        amount: balanceBefore,
        paymentDate: new Date().toISOString().split('T')[0],
        notes: 'Full payment — integration test',
      });

      expect(res.status).toBe(201);
      expect(res.data.success).toBe(true);
      const payment = unwrap<any>(res);
      expect(Number(payment.amount)).toBe(balanceBefore);
    });

    it('10. GET /payments/sale/:id shows at least one payment', async () => {
      const res = await client.get(`/payments/sale/${fullCycleSaleId}`);
      expect(res.status).toBe(200);
      const data = unwrap<any>(res);
      const list = Array.isArray(data) ? data : data?.items ?? [];
      expect(list.length).toBeGreaterThan(0);
    });

    it('11. GET /sales/:id — balance is 0 after full payment', async () => {
      const res = await client.get(`/sales/${fullCycleSaleId}`);
      const sale = unwrap<any>(res);
      const balance = Number(sale.balance ?? sale.pendingBalance ?? -1);
      console.log(`[info] Balance after full payment: ${balance}`);
      expect(balance).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CANCELLATION FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Cancellation flow: confirmed → cancelled restores stock', () => {
    let stockBeforeCancel: number;

    it('1. Create sale (draft) for cancellation test', async () => {
      const res = await client.post('/sales', {
        saleType: 'invoice',
        customerId: testCustomerId,
        warehouseId: mainWarehouseId,
        taxPercentage: 0,
        notes: 'Integration test — cancel flow',
        details: [
          {
            productId: testProductId,
            quantity: 2,
            unitPrice: 100,
            taxPercentage: 0,
            discountPercentage: 0,
          },
        ],
      });

      expect(res.status).toBe(201);
      cancelFlowSaleId = unwrap<any>(res).id;
    });

    it('2. Record stock before confirming', async () => {
      stockBeforeCancel = await getStock(testProductId, mainWarehouseId);
      console.log(`[info] Stock before confirm (cancel flow): ${stockBeforeCancel}`);
    });

    it('3. Confirm the sale — stock decreases by 2', async () => {
      const res = await client.post(`/sales/${cancelFlowSaleId}/confirm`);
      expect(res.status).toBe(200);
      expect(unwrap<any>(res).status).toBe('confirmed');

      const stockAfter = await getStock(testProductId, mainWarehouseId);
      expect(stockAfter).toBe(stockBeforeCancel - 2);
    });

    it('4. Cancel the confirmed sale', async () => {
      const res = await client.post(`/sales/${cancelFlowSaleId}/cancel`, {
        reason: 'Test cancellation',
      });
      expect(res.status).toBe(200);
      const sale = unwrap<any>(res);
      expect(sale.status).toBe('cancelled');
    });

    it('5. Stock is restored after cancellation', async () => {
      const stockAfterCancel = await getStock(testProductId, mainWarehouseId);
      console.log(`[info] Stock after cancel: ${stockAfterCancel}`);
      expect(stockAfterCancel).toBe(stockBeforeCancel);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Input validation', () => {
    it('POST /sales without customerId returns 400', async () => {
      const res = await client.post('/sales', {
        saleType: 'invoice',
        warehouseId: mainWarehouseId,
        details: [{ productId: testProductId, quantity: 1, unitPrice: 100 }],
      });
      expect(res.status).toBe(400);
    });

    it('POST /sales with empty details returns 400', async () => {
      const res = await client.post('/sales', {
        saleType: 'invoice',
        customerId: testCustomerId,
        warehouseId: mainWarehouseId,
        details: [],
      });
      expect([400, 422]).toContain(res.status);
    });

    it('POST /payments with amount exceeding balance returns 4xx', async () => {
      // fullCycleSaleId is already fully paid (balance = 0)
      const res = await client.post('/payments', {
        saleId: fullCycleSaleId,
        paymentMethodId,
        amount: 999999,
        paymentDate: new Date().toISOString().split('T')[0],
      });
      expect([400, 422]).toContain(res.status);
    });
  });
});
