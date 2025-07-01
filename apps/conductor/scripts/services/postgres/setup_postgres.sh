#!/bin/sh

# PostgreSQL Setup Script - Simplified Version
# File: /conductor/scripts/services/postgres/setup_postgres.sh
# Purpose: Auto-discover and execute all SQL files in the configs directory

# Define some basic configurations
RETRY_COUNT=0
MAX_RETRIES=10          
RETRY_DELAY=10          

# Default SQL configs directory
SQL_CONFIGS_DIR=${POSTGRES_CONFIGS_DIR:-"conductor/configs/postgresConfigs"}

# Debug function for logging
debug() {
    if [ "$DEBUG" = "true" ]; then
        echo "[DEBUG] $1"
    fi
}

printf "\033[1;36mConductor:\033[0m Checking if PostgreSQL is available\n"

# Wait for PostgreSQL to be ready
until PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" > /dev/null 2>&1; do
   RETRY_COUNT=$((RETRY_COUNT + 1))
   
   if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
       printf "\033[1;31mFailed to connect to PostgreSQL after %d attempts\033[0m\n" "$MAX_RETRIES"
       exit 1
   fi
   
   printf "\033[1;36mPostgreSQL:\033[0m Not yet available, checking again in %d seconds\n" "$RETRY_DELAY"
   sleep "$RETRY_DELAY"
done

printf "\033[1;32mSuccess:\033[0m PostgreSQL is available at %s:%s/%s\n" "$POSTGRES_HOST" "$POSTGRES_PORT" "$POSTGRES_DB"

# Check if SQL configs directory exists
if [ ! -d "$SQL_CONFIGS_DIR" ]; then
    printf "\033[1;36mPostgreSQL:\033[0m No SQL configs directory found at %s, skipping setup\n" "$SQL_CONFIGS_DIR"
    exit 0
fi

# Find all SQL files in the directory
SQL_FILES=$(find "$SQL_CONFIGS_DIR" -name "*.sql" -type f | sort)

if [ -z "$SQL_FILES" ]; then
    printf "\033[1;36mPostgreSQL:\033[0m No SQL files found in %s, skipping setup\n" "$SQL_CONFIGS_DIR"
    exit 0
fi

# Count the SQL files
SQL_FILE_COUNT=$(echo "$SQL_FILES" | wc -l)
printf "\033[1;36mPostgreSQL:\033[0m Found %d SQL files in %s\n" "$SQL_FILE_COUNT" "$SQL_CONFIGS_DIR"

# Create tracking table if it doesn't exist
debug "Checking if tracking table exists"
TABLE_CHECK_SQL="SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'conductor_sql_executed');"

if ! PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "$TABLE_CHECK_SQL" | grep -q "t"; then
    debug "Creating tracking table for executed SQL files"
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
        CREATE TABLE IF NOT EXISTS conductor_sql_executed (
            id SERIAL PRIMARY KEY,
            sql_name VARCHAR(255) UNIQUE NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            file_hash VARCHAR(64)
        );
    " > /dev/null
    printf "\033[1;36mInfo:\033[0m Created tracking table for SQL execution history\n"
fi

# Process each SQL file
echo "$SQL_FILES" | while IFS= read -r sql_file; do
    if [ -z "$sql_file" ]; then
        continue
    fi
    
    # Extract filename without path and extension for the name
    sql_name=$(basename "$sql_file" .sql)
    
    debug "Processing SQL file: $sql_file (name: $sql_name)"
    
    printf "\033[1;36mExecuting SQL:\033[0m %s\n" "$sql_name"
    
    # Calculate file hash to detect changes
    if command -v md5sum > /dev/null 2>&1; then
        FILE_HASH=$(md5sum "$sql_file" | cut -d' ' -f1)
        debug "Using md5sum, hash: $FILE_HASH"
    elif command -v md5 > /dev/null 2>&1; then
        FILE_HASH=$(md5 -q "$sql_file")
        debug "Using md5, hash: $FILE_HASH"
    else
        FILE_HASH="unknown"
        debug "No hash command available, using: $FILE_HASH"
    fi
    
    # Check if this specific SQL file (by name and hash) has been executed
    EXECUTION_CHECK="SELECT COUNT(*) FROM conductor_sql_executed WHERE sql_name = '$sql_name' AND file_hash = '$FILE_HASH';"
    ALREADY_EXECUTED=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "$EXECUTION_CHECK" | tr -d ' ')
    
    debug "Execution check result: $ALREADY_EXECUTED"
    
    if [ "$ALREADY_EXECUTED" = "0" ]; then
        printf "\033[1;36mInfo:\033[0m Executing SQL file: %s\n" "$(basename "$sql_file")"
        
        # Execute the SQL file
        if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$sql_file" > /dev/null 2>&1; then
            debug "SQL execution successful, recording in tracking table"
            # Record successful execution
            PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
                INSERT INTO conductor_sql_executed (sql_name, file_path, file_hash) 
                VALUES ('$sql_name', '$sql_file', '$FILE_HASH')
                ON CONFLICT (sql_name) DO UPDATE SET 
                    file_path = EXCLUDED.file_path,
                    file_hash = EXCLUDED.file_hash,
                    executed_at = CURRENT_TIMESTAMP;
            " > /dev/null
            
            printf "\033[1;32mSuccess:\033[0m Executed SQL file %s\n" "$sql_name"
        else
            printf "\033[1;31mError:\033[0m Failed to execute SQL file %s\n" "$sql_name"
            debug "SQL execution failed for file: $sql_file"
            exit 1
        fi
    else
        printf "\033[1;36mInfo:\033[0m SQL file %s already executed (hash: %s...), skipping\n" "$sql_name" "${FILE_HASH%%${FILE_HASH#????????}}"
    fi
done

printf "\033[1;32mSuccess:\033[0m PostgreSQL setup completed successfully\n"