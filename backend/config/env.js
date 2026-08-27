// Load backend/.env regardless of the process working directory.
// (`npm run server` from the repo root would otherwise look for ./.env)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

dotenv.config({ path: path.join(backendRoot, '.env') });

export { backendRoot };
