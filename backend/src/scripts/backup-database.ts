import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);

interface BackupConfig {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
  backupDir: string;
}

/**
 * Automated PostgreSQL Database Backup System
 * Supports both local and Render.com deployments
 */
class DatabaseBackup {
  private config: BackupConfig;

  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '5432',
      database: process.env.DB_NAME || 'track_management',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      backupDir: process.env.BACKUP_DIR || './backups'
    };
  }

  /**
   * Create backup directory if it doesn't exist
   */
  private ensureBackupDir(): void {
    if (!fs.existsSync(this.config.backupDir)) {
      fs.mkdirSync(this.config.backupDir, { recursive: true });
      console.log(`✅ Created backup directory: ${this.config.backupDir}`);
    }
  }

  /**
   * Generate backup filename with timestamp
   */
  private generateBackupFilename(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `backup-${this.config.database}-${timestamp}.sql`;
  }

  /**
   * Get pg_dump executable path (Windows compatibility)
   */
  private getPgDumpPath(): string {
    // Try common PostgreSQL installation paths on Windows
    const windowsPaths = [
      'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
    ];

    // Check if pg_dump is in PATH (Linux/Mac or if added to Windows PATH)
    if (process.platform !== 'win32') {
      return 'pg_dump';
    }

    // Check Windows paths
    for (const pgPath of windowsPaths) {
      if (fs.existsSync(pgPath)) {
        return `"${pgPath}"`;
      }
    }

    // Fallback to pg_dump (will fail if not in PATH)
    return 'pg_dump';
  }

  /**
   * Create a full database backup using pg_dump
   */
  async createBackup(): Promise<string> {
    try {
      this.ensureBackupDir();

      const filename = this.generateBackupFilename();
      const filepath = path.join(this.config.backupDir, filename);

      console.log('🔄 Starting database backup...');
      console.log(`📍 Database: ${this.config.database}@${this.config.host}`);

      // Set environment variable for password
      const env = { ...process.env, PGPASSWORD: this.config.password };

      const pgDump = this.getPgDumpPath();

      // Use pg_dump to create backup
      const command = `${pgDump} -h ${this.config.host} -p ${this.config.port} -U ${this.config.user} -d ${this.config.database} -F p -f "${filepath}"`;

      await execAsync(command, { env });

      // Get file size
      const stats = fs.statSync(filepath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      console.log('✅ Backup completed successfully!');
      console.log(`📦 File: ${filename}`);
      console.log(`💾 Size: ${sizeInMB} MB`);
      console.log(`📁 Path: ${filepath}`);

      return filepath;
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }

  /**
   * Restore database from backup file
   */
  async restoreBackup(backupFile: string): Promise<void> {
    try {
      console.log('🔄 Starting database restoration...');
      console.log(`📂 Backup file: ${backupFile}`);

      if (!fs.existsSync(backupFile)) {
        throw new Error(`Backup file not found: ${backupFile}`);
      }

      const env = { ...process.env, PGPASSWORD: this.config.password };

      // Use psql to restore backup
      const command = `psql -h ${this.config.host} -p ${this.config.port} -U ${this.config.user} -d ${this.config.database} -f "${backupFile}"`;

      await execAsync(command, { env });

      console.log('✅ Database restored successfully!');
    } catch (error) {
      console.error('❌ Restoration failed:', error);
      throw error;
    }
  }

  /**
   * List all available backups
   */
  listBackups(): string[] {
    this.ensureBackupDir();

    const files = fs.readdirSync(this.config.backupDir)
      .filter(file => file.endsWith('.sql'))
      .sort()
      .reverse(); // Most recent first

    return files.map(file => path.join(this.config.backupDir, file));
  }

  /**
   * Delete old backups, keeping only the most recent N backups
   */
  cleanOldBackups(keepCount: number = 7): void {
    const backups = this.listBackups();

    if (backups.length <= keepCount) {
      console.log(`✅ No old backups to clean (${backups.length}/${keepCount})`);
      return;
    }

    const toDelete = backups.slice(keepCount);

    console.log(`🗑️  Cleaning ${toDelete.length} old backup(s)...`);

    toDelete.forEach(file => {
      fs.unlinkSync(file);
      console.log(`   Deleted: ${path.basename(file)}`);
    });

    console.log('✅ Old backups cleaned');
  }

  /**
   * Get backup statistics
   */
  getBackupStats(): void {
    const backups = this.listBackups();

    console.log('\n📊 Backup Statistics:');
    console.log(`   Total backups: ${backups.length}`);

    if (backups.length > 0) {
      const totalSize = backups.reduce((sum, file) => {
        return sum + fs.statSync(file).size;
      }, 0);

      console.log(`   Total size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
      const latestBackup = backups[0];
      if (latestBackup) {
        console.log(`   Latest: ${path.basename(latestBackup)}`);
      }
    }
  }
}

// CLI Interface
async function main() {
  const backup = new DatabaseBackup();
  const action = process.argv[2];

  try {
    switch (action) {
      case 'create':
        await backup.createBackup();
        backup.getBackupStats();
        backup.cleanOldBackups(7); // Keep last 7 backups
        break;

      case 'restore':
        const backupFile = process.argv[3];
        if (!backupFile) {
          console.error('❌ Please provide backup file path');
          console.log('Usage: npm run backup:restore <backup-file-path>');
          process.exit(1);
        }
        await backup.restoreBackup(backupFile as string);
        break;

      case 'list':
        const backups = backup.listBackups();
        console.log('\n📋 Available Backups:\n');
        backups.forEach((file, index) => {
          const stats = fs.statSync(file);
          const size = (stats.size / (1024 * 1024)).toFixed(2);
          const date = stats.mtime.toLocaleString();
          console.log(`${index + 1}. ${path.basename(file)}`);
          console.log(`   Size: ${size} MB | Date: ${date}\n`);
        });
        break;

      case 'clean':
        const keepCount = parseInt(process.argv[3] || '7') || 7;
        backup.cleanOldBackups(keepCount);
        break;

      case 'stats':
        backup.getBackupStats();
        break;

      default:
        console.log(`
🔄 Database Backup System

Usage:
  npm run backup:create          Create a new backup
  npm run backup:restore <file>  Restore from backup file
  npm run backup:list            List all available backups
  npm run backup:clean [count]   Keep only N most recent backups (default: 7)
  npm run backup:stats           Show backup statistics

Examples:
  npm run backup:create
  npm run backup:restore ./backups/backup-track_management-2025-10-06.sql
  npm run backup:list
  npm run backup:clean 10
        `);
        process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default DatabaseBackup;
