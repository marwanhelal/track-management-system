@echo off
echo ============================================
echo CDTMS - Pre-Deployment Cleanup Script
echo ============================================
echo.
echo This script will DELETE duplicate and unnecessary files.
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo [1/7] Deleting duplicate migration files...
del "database\migrations\002_add_smart_warning_system.sql" 2>nul
del "database\migrations\002_add_smart_warning_system_all_uuid.sql" 2>nul
del "database\migrations\002_add_smart_warning_system_fixed.sql" 2>nul
del "database\migrations\002_add_smart_warning_system_full_uuid.sql" 2>nul
del "database\migrations\002_add_smart_warning_system_minimal.sql" 2>nul
del "database\migrations\002_add_smart_warning_system_uuid.sql" 2>nul
echo    ✓ Deleted 6 duplicate migration files

echo.
echo [2/7] Deleting unused SQL files...
del "backend\drop_preferences_tables.sql" 2>nul
echo    ✓ Deleted drop_preferences_tables.sql

echo.
echo [3/7] Checking remaining migration files...
dir "database\migrations\*.sql" /b
echo    ✓ Should see only:
echo       - 001_add_early_access_to_phases.sql
echo       - 001_performance_optimizations.sql
echo       - 002_add_smart_warning_system_integer.sql

echo.
echo [4/7] Listing environment files...
echo    Backend environment files:
dir "backend\.env*" /b
echo    Frontend environment files:
dir "frontend\.env*" /b

echo.
echo [5/7] Checking .gitignore exists...
if exist ".gitignore" (
    echo    ✓ .gitignore file exists
) else (
    echo    ✗ .gitignore file missing!
)

echo.
echo [6/7] Checking production environment files...
if exist "backend\.env.production" (
    echo    ✓ backend\.env.production exists
) else (
    echo    ✗ backend\.env.production missing!
)
if exist "frontend\.env.production" (
    echo    ✓ frontend\.env.production exists
) else (
    echo    ✗ frontend\.env.production missing!
)

echo.
echo [7/7] Cleanup Summary:
echo ============================================
echo ✓ Duplicate migration files deleted
echo ✓ Unused SQL files removed
echo ✓ Production environment files checked
echo ============================================

echo.
echo NEXT STEPS:
echo 1. Edit backend\.env.production (add JWT secrets and DB password)
echo 2. Edit frontend\.env.production (add server IP)
echo 3. Review PRE_DEPLOYMENT_FIXES.md for security steps
echo 4. Follow SYSTEM_REVIEW_AND_DEPLOYMENT.md for deployment
echo.
echo Press any key to exit...
pause >nul
