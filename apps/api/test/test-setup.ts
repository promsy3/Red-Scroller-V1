// Load test environment variables for E2E tests
import 'dotenv/config';
import { config } from 'dotenv';

// Explicitly load .env.test file
const path = require('path');
const envPath = path.resolve(__dirname, '../.env.test');
const result = config({ path: envPath });

if (result.error) {
  console.warn('Warning: Failed to load .env.test file:', result.error.message);
} else {
  console.log('Test environment loaded from .env.test');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
}
