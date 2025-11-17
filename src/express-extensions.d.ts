import { DataSource } from 'typeorm';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      userId: number;
      companyId: number;
      email: string;
      role: string;
      warehouseId?: number | null; // Only for 'user' role
    };
    dataSource?: DataSource;
  }
}
