// File: app/api/_lib/redis.ts
import { Redis } from '@upstash/redis';

// This will initialize the client using the environment variables we just set.
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});