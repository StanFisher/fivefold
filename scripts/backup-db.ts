import { backupDatabase, getEnvironmentInfo } from '../src/lib/db';

const env = getEnvironmentInfo();
console.log(`Creating database backup for environment: ${env.name} (${env.dbFileName})...`);
const backupPath = backupDatabase();
console.log(`✓ Backup successfully created at: ${backupPath}`);
