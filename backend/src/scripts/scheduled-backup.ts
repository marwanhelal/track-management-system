import DatabaseBackup from './backup-database';
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Scheduled Backup Service
 * Automatically creates database backups on a schedule
 */
class ScheduledBackupService {
  private backup: DatabaseBackup;
  private isRunning: boolean = false;

  constructor() {
    this.backup = new DatabaseBackup();
  }

  /**
   * Start the scheduled backup service
   * Default: Every day at 2:00 AM
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️  Backup service is already running');
      return;
    }

    const schedule = process.env.BACKUP_SCHEDULE || '0 2 * * *'; // Daily at 2 AM
    const keepBackups = parseInt(process.env.BACKUP_KEEP_COUNT || '7');

    console.log('🚀 Starting Scheduled Backup Service');
    console.log(`⏰ Schedule: ${schedule} (cron format)`);
    console.log(`📦 Keeping last ${keepBackups} backups`);

    // Schedule automatic backups
    cron.schedule(schedule, async () => {
      console.log('\n⏰ Scheduled backup triggered');
      try {
        await this.backup.createBackup();
        this.backup.cleanOldBackups(keepBackups);
        console.log('✅ Scheduled backup completed\n');
      } catch (error) {
        console.error('❌ Scheduled backup failed:', error);
      }
    });

    this.isRunning = true;
    console.log('✅ Backup service started successfully\n');
  }

  /**
   * Perform an immediate backup (manual trigger)
   */
  async backupNow(): Promise<void> {
    console.log('🔄 Manual backup triggered');
    try {
      await this.backup.createBackup();
      this.backup.getBackupStats();
      console.log('✅ Manual backup completed');
    } catch (error) {
      console.error('❌ Manual backup failed:', error);
      throw error;
    }
  }
}

// Run the service if called directly
if (require.main === module) {
  const service = new ScheduledBackupService();

  // Start scheduled backups
  service.start();

  // Keep the process running
  console.log('Press Ctrl+C to stop the backup service');

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down backup service...');
    process.exit(0);
  });
}

export default ScheduledBackupService;
