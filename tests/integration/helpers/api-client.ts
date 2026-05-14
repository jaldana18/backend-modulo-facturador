/**
 * API client for integration flow tests.
 *
 * These tests run against a REAL server — make sure the backend is running:
 *   npm run dev  (or docker compose up backend)
 *
 * Set BASE_URL env var to override, e.g.:
 *   BASE_URL=http://myserver:3000/api/v1 npm run test:integration
 */
import axios, { AxiosInstance, AxiosResponse } from 'axios';

export const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000/api/v1';
// Health endpoint lives at the root, outside /api/v1
export const ROOT_URL = BASE_URL.replace(/\/api\/v\d+$/, '');

/**
 * Create an unauthenticated Axios instance pointing at the API.
 */
export function createClient(): AxiosInstance {
  return axios.create({
    baseURL: BASE_URL,
    validateStatus: () => true, // never throw on HTTP errors — let tests assert status codes
    timeout: 15_000,
  });
}

/**
 * Log in and return a client with the Authorization header pre-set.
 * The API returns `accessToken` (not `token`).
 */
export async function createAuthClient(
  email = 'admin@democompany.com',
  password = 'Admin123!'
): Promise<{ client: AxiosInstance; token: string; user: any }> {
  const client = createClient();
  const res: AxiosResponse = await client.post('/auth/login', { email, password });

  if (res.status !== 200 || !res.data?.data?.accessToken) {
    throw new Error(
      `Login failed (${res.status}): ${JSON.stringify(res.data)}\n` +
        `Make sure the backend is running at ${BASE_URL} and the seed data exists.`
    );
  }

  const token: string = res.data.data.accessToken;
  const user = res.data.data.user;

  const authClient = axios.create({
    baseURL: BASE_URL,
    validateStatus: () => true,
    timeout: 15_000,
    headers: { Authorization: `Bearer ${token}` },
  });

  return { client: authClient, token, user };
}

/**
 * Unwrap the data field from a standard ApiResponse body.
 */
export function unwrap<T = any>(res: AxiosResponse): T {
  return res.data?.data as T;
}
