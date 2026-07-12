import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  datasource: {
    // Next.js runtime will use the pooled connection
    url: env('DATABASE_URL'), 
  },
});