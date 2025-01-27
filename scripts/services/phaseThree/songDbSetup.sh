#!/bin/sh
        
# Create missing empty directories not tracked by git and needed by postgres
echo -e "Setting up empty directories for Songs postgres database"
mkdir -p song/db-folder-init/pg_tblspc
mkdir -p song/db-folder-init/pg_stat
mkdir -p song/db-folder-init/pg_stat_tmp
mkdir -p song/db-folder-init/pg_twophase
mkdir -p song/db-folder-init/pg_snapshots
mkdir -p song/db-folder-init/pg_commit_ts
mkdir -p song/db-folder-init/pg_logical/snapshotss
mkdir -p song/db-folder-init/pg_logical/mappings
mkdir -p song/db-folder-init/pg_replslot
mkdir -p song/db-folder-init/pg_logical/snapshots
