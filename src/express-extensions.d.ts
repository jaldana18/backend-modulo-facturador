import { DataSource } from 'typeorm';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      userId: number;
      companyId: number;
      email: string;
      role: string;
    };
    dataSource?: DataSource;
  }
}
