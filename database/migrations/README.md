# Database Migrations

## Migration History

| Migration | Description | Date | Status |
|-----------|-------------|------|--------|
| 001_performance_optimizations | Database performance optimizations | Sept 2024 | ✅ Applied |
| 001_add_early_access_to_phases | Early access feature for phases | Sept 2024 | ✅ Applied |
| 002_add_smart_warning_system_integer | Smart warning system (integer IDs) | Sept 2024 | ✅ Applied |
| 003_add_manual_progress_tracking | Manual progress tracking by supervisors | Oct 2024 | ✅ Applied |
| 004_add_administrator_role | Administrator role and permissions | Oct 2024 | ✅ Applied |
| 005_add_submitted_approved_dates | Submitted and approved date tracking | Oct 2024 | ✅ Applied |

## Archived Migrations

Previous attempts and experimental versions are stored in the `archive/` folder:
- 6 versions of the smart warning system migration (kept for reference)

## Running Migrations

### Using npm scripts (recommended):
```bash
cd backend
npm run db:migrate
```

### Manual execution:
```bash
psql -U postgres -d track_management -f migrations/XXX_*.sql
```

### Using the migration script:
```bash
node scripts/database/run_migration.js
```

## Creating New Migrations

1. Create a new SQL file with naming convention: `XXX_description.sql`
   - XXX = sequential number (e.g., 006, 007)
   - description = brief description in snake_case

2. Include rollback comments in your migration:
   ```sql
   -- Migration: Add new feature
   -- Rollback: DROP TABLE IF EXISTS new_feature;

   CREATE TABLE new_feature (...);
   ```

3. Test migration on development database first
4. Update this README with migration details
5. Commit migration file with clear commit message

## Migration Best Practices

- Always test migrations on a backup of production data
- Include rollback instructions in migration comments
- Keep migrations idempotent when possible (use IF NOT EXISTS, etc.)
- Document any manual steps required after migration
- Never edit applied migrations - create new ones instead

## Rollback Procedure

If a migration fails:
1. Restore from backup: `npm run backup:restore`
2. Fix the migration SQL
3. Re-apply: `npm run db:migrate`

---

*Last updated: October 2025*
