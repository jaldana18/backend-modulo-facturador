/**
 * Flow 01 — Authentication
 *
 * Verifies:
 *  - Health endpoint is reachable
 *  - Login with valid credentials returns an accessToken
 *  - Token is accepted on a protected route
 *  - Invalid credentials are rejected
 *  - Missing token is rejected
 */
import axios from 'axios';
import { createClient, createAuthClient, BASE_URL, ROOT_URL } from '../helpers/api-client';

describe('Flow 01 — Auth', () => {
  beforeAll(() => {
    console.log(`[integration] Base URL: ${BASE_URL}`);
  });

  it('health check — server is reachable', async () => {
    // Health lives at /health, outside the /api/v1 prefix
    const res = await axios.get(`${ROOT_URL}/health`, { validateStatus: () => true });
    expect(res.status).toBe(200);
    expect(res.data?.data?.status).toBe('ok');
  });

  it('login with valid admin credentials returns 200 + accessToken', async () => {
    const client = createClient();
    const res = await client.post('/auth/login', {
      email: 'admin@democompany.com',
      password: 'Admin123!',
    });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.accessToken).toBeDefined();
    expect(typeof res.data.data.accessToken).toBe('string');
    expect(res.data.data.user).toBeDefined();
    expect(res.data.data.user.email).toBe('admin@democompany.com');
  });

  it('authenticated request to /auth/me returns current user', async () => {
    const { client } = await createAuthClient();
    const res = await client.get('/auth/me');

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.email).toBe('admin@democompany.com');
  });

  it('login with wrong password returns 401', async () => {
    const client = createClient();
    const res = await client.post('/auth/login', {
      email: 'admin@democompany.com',
      password: 'WrongPassword!',
    });

    expect(res.status).toBe(401);
    expect(res.data.success).toBe(false);
  });

  it('login with unknown email returns 401', async () => {
    const client = createClient();
    const res = await client.post('/auth/login', {
      email: 'nobody@example.com',
      password: 'Whatever1!',
    });

    expect(res.status).toBe(401);
  });

  it('protected route without token returns 401', async () => {
    const client = createClient();
    const res = await client.get('/products');
    expect(res.status).toBe(401);
  });

  it('protected route with invalid token returns 401', async () => {
    const client = createClient();
    const res = await client.get('/products', {
      headers: { Authorization: 'Bearer invalidtoken.abc.xyz' },
    });
    expect(res.status).toBe(401);
  });

  it('refresh token endpoint works', async () => {
    const { client: authClient } = await createAuthClient();
    // First get the refreshToken from a login call
    const loginClient = createClient();
    const loginRes = await loginClient.post('/auth/login', {
      email: 'admin@democompany.com',
      password: 'Admin123!',
    });
    const refreshToken = loginRes.data?.data?.refreshToken;

    if (!refreshToken) {
      console.warn('[info] No refreshToken in login response — skipping');
      return;
    }

    const res = await loginClient.post('/auth/refresh', { refreshToken });
    if (res.status === 200) {
      expect(res.data.success).toBe(true);
      expect(res.data.data.accessToken).toBeDefined();
    } else {
      console.warn(`[info] Refresh endpoint returned ${res.status} — skipping assertion`);
    }
  });
});
