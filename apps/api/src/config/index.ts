import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from root or current directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const EnvSchema = z.object({
  PORT: z
    .string()
    .default('4000')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val <= 65535, {
      message: 'PORT must be a valid port number between 1 and 65535',
    }),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI is required')
    .default('mongodb://localhost:27017/repo-analyzer'),
  GITHUB_TOKEN: z.string().default(''),
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  MAX_CONCURRENT_SCANS: z
    .string()
    .default('2')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 10, {
      message: 'MAX_CONCURRENT_SCANS must be between 1 and 10',
    }),
  FILE_INGESTION_CONCURRENCY: z
    .string()
    .default('8')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 20, {
      message: 'FILE_INGESTION_CONCURRENCY must be between 1 and 20',
    }),
});

const parsedEnv = EnvSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('[Config] Invalid environment configuration:');
  for (const err of parsedEnv.error.errors) {
    console.error(`  - ${err.path.join('.')}: ${err.message}`);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Fatal: Invalid environment configuration in production.');
  }
}

const validated = parsedEnv.success
  ? parsedEnv.data
  : {
      PORT: 4000,
      NODE_ENV: 'development' as const,
      CORS_ORIGIN: 'http://localhost:3000',
      MONGODB_URI: 'mongodb://localhost:27017/repo-analyzer',
      GITHUB_TOKEN: '',
      GEMINI_API_KEY: '',
      GEMINI_MODEL: 'gemini-2.5-flash',
      MAX_CONCURRENT_SCANS: 2,
      FILE_INGESTION_CONCURRENCY: 8,
    };

export const config = {
  port: validated.PORT,
  nodeEnv: validated.NODE_ENV,
  corsOrigin: validated.CORS_ORIGIN,
  mongodbUri: validated.MONGODB_URI,
  githubToken: validated.GITHUB_TOKEN,
  geminiApiKey: validated.GEMINI_API_KEY,
  geminiModel: validated.GEMINI_MODEL,
  maxConcurrentScans: validated.MAX_CONCURRENT_SCANS,
  fileIngestionConcurrency: validated.FILE_INGESTION_CONCURRENCY,
};
