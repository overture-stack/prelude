#!/bin/sh
# Comprehensive Pre-Deployment Checks for Prelude Application

# Minimum Requirements
DOCKER_ENGINE_MIN_VERSION="20.0.0"  # Docker engine version requirement
NODE_MIN_VERSION="20.18.1"
DOCKER_MIN_CPU_CORES=8
DOCKER_MIN_MEMORY_GB=8
DOCKER_MIN_DISK_GB=64

# Function to compare version numbers
version_check() {
    local required="$1"
    local actual="$2"
    
    # Remove any leading 'v' or 'V'
    actual=$(echo "$actual" | sed -e 's/^[vV]//')
    required=$(echo "$required" | sed -e 's/^[vV]//')
    
    # Use sort to compare versions
    result=$(printf '%s\n%s\n' "$required" "$actual" | sort -V | tail -n1)
    
    [ "$result" = "$actual" ]
}

# Function to safely compare numeric values
safe_compare() {
    local op="$1"
    local a="$2"
    local b="$3"

    # Handle empty or non-numeric values
    if [ -z "$a" ] || [ -z "$b" ] || \
       { ! echo "$a" | grep -q '^[0-9.]*$'; } || \
       { ! echo "$b" | grep -q '^[0-9.]*$'; }; then
        return 1
    fi

    case "$op" in
        -lt) [ "$(echo "$a < $b" | bc)" -eq 1 ] ;;
        -le) [ "$(echo "$a <= $b" | bc)" -eq 1 ] ;;
        -gt) [ "$(echo "$a > $b" | bc)" -eq 1 ] ;;
        -ge) [ "$(echo "$a >= $b" | bc)" -eq 1 ] ;;
        *) return 1 ;;
    esac
}

# Print Minimum Requirements
print_requirements() {
    printf "\n\033[1;33mMinimum System Requirements:\033[0m\n"
    printf "\n\033[1;33m1. Docker:\033[0m\n"
    printf "   - Engine Version: %s or higher\n" "$DOCKER_ENGINE_MIN_VERSION"
    printf "   - CPU: %s cores\n" "$DOCKER_MIN_CPU_CORES"
    printf "   - Memory: %s GB\n" "$DOCKER_MIN_MEMORY_GB"
    printf "   - Virtual Disk: %s GB\n" "$DOCKER_MIN_DISK_GB"
    printf "\n\033[1;33m2. Node.js:\033[0m\n"
    printf "   - Version: %s or higher\n" "$NODE_MIN_VERSION"
    printf "\n"
}

# Main Deployment Check Script
main() {
  printf "\n\033[1;36m╔═════════════════════════════════╗\033[0m
\033[1;36m║  Running Pre-deployment checks  ║\033[0m
\033[1;36m╚═════════════════════════════════╝\033[0m\n"

    # Check Docker
    printf "\n\033[1;35m[1/3]\033[1m Checking Docker...\n"
    
    # Check Docker CLI installation
    if ! command -v docker >/dev/null 2>&1; then
        printf "\n\033[1;31mError:\033[0m Docker is not installed\033[0m\n"
        print_requirements
        exit 1
    fi

    ENGINE_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
    
    # Check Docker Engine version
    if ! version_check "$DOCKER_ENGINE_MIN_VERSION" "$ENGINE_VERSION"; then
        printf "\n\033[1;31mError:\033[0m Docker Engine version %s does not meet minimum requirement of %s\033[0m\n" "$ENGINE_VERSION" "$DOCKER_ENGINE_MIN_VERSION"
        print_requirements
        exit 1
    fi
    printf "\033[1;36mInfo:\033[0m Docker Engine version %s detected\033[0m\n" "$ENGINE_VERSION"

    # Check Docker is running
    if ! docker info >/dev/null 2>&1; then
        printf "\n\033[1;31mError:\033[0m Docker daemon is not running\033[0m\n"
        exit 1
    fi
    printf "\033[1;36mInfo:\033[0m Docker daemon is running\033[0m\n"

    # Check Docker Resources    
    printf "\n\033[1;35m[2/3]\033[1m Checking Docker Resources\n"
    DOCKER_INFO=$(docker info 2>/dev/null)
    
    # CPU Cores Check
    CPU_CORES=$(sysctl -n hw.ncpu 2>/dev/null || nproc 2>/dev/null || echo "0")
    if ! safe_compare -lt "$CPU_CORES" "$DOCKER_MIN_CPU_CORES"; then
        printf "\033[1;36mInfo:\033[0m Docker CPU allocation meets minimum requirements (%s cores)\033[0m\n" "$CPU_CORES"
    else
        printf "\033[1;33m⚠ Docker CPU cores (%s) are less than recommended (%s)\033[0m\n" "$CPU_CORES" "$DOCKER_MIN_CPU_CORES"
    fi

    # Memory Check
    TOTAL_MEMORY=$(docker info 2>/dev/null | grep "Total Memory" | awk '{print $3 $4}')
    MEMORY_GB=$(echo "$TOTAL_MEMORY" | sed 's/GiB//')
    if ! safe_compare -lt "$MEMORY_GB" "$DOCKER_MIN_MEMORY_GB"; then
        printf "\033[1;36mInfo:\033[0m Docker memory allocation meets minimum requirements (%s GB)\033[0m\n" "$MEMORY_GB"
    else
        printf "\033[1;33m⚠ Docker memory (%s GB) is less than recommended (%s GB)\033[0m\n" "$MEMORY_GB" "$DOCKER_MIN_MEMORY_GB"
    fi

    # Disk Space Check
    # Use `diskutil` on macOS for disk space info
    DOCKER_DISK_SPACE=$(diskutil info / 2>/dev/null | grep "Total Space" | awk '{print $3 $4}' | sed 's/[()]//g')
    DISK_GB=$(echo "$DOCKER_DISK_SPACE" | sed 's/GB//')

    if ! safe_compare -lt "$DISK_GB" "$DOCKER_MIN_DISK_GB"; then
        printf "\033[1;36mInfo:\033[0m Docker virtual disk space meets minimum requirements (%s GB)\033[0m\n" "$DISK_GB"
    else
        printf "\033[1;33m⚠ Docker virtual disk space (%s GB) is less than recommended (%s GB)\033[0m\n" "$DISK_GB" "$DOCKER_MIN_DISK_GB"
    fi

    # Node.js Check
    printf "\n\033[1;35m[3/3]\033[1m Checking Node.js\n"
    if ! command -v node >/dev/null 2>&1; then
        printf "\n\033[1;31mError:\033[0m Node.js is not installed\033[0m\n"
        print_requirements
        exit 1
    fi

    NODE_VERSION=$(node --version | cut -d 'v' -f2)
    if ! version_check "$NODE_MIN_VERSION" "$NODE_VERSION"; then
        printf "\n\033[1;31mError:\033[0m Node.js version %s does not meet minimum requirement of %s\033[0m\n" "$NODE_VERSION" "$NODE_MIN_VERSION"
        print_requirements
        exit 1
    fi
    printf "\033[1;36mInfo:\033[0m Node.js version %s meets requirements\033[0m\n" "$NODE_VERSION"

    # Final Success
    printf "\n\033[1;32mSuccess:\033[0m All requirements met\n"
    printf "\n\033[1;33mSystem Resources:\033[0m\n"
    printf "Docker Engine:        \033[0;32m%s\033[0m\n" "$ENGINE_VERSION"
    printf "CPU Cores:            \033[0;32m%s\033[0m\n" "$CPU_CORES"
    printf "Total Memory:         \033[0;32m%s\033[0m\n" "$TOTAL_MEMORY"
    printf "Disk Space:           \033[0;32m%s GB\033[0m\n" "$DISK_GB"
    printf "Node.js:              \033[0;32m%s\033[0m\n" "$NODE_VERSION"
    printf "\nTo setup stage move into its directory\n"
    printf "\033[1;33mcd apps/stage\033[0m\n"
    printf "\nAnd then run:\n"
    printf "\033[1;33mdocker build -t stageimage:1.0 .\033[0m\n"
    printf "\nOnce built you should be able to successfully run:\n"
    printf "\033[1;33mmake phase1\033[0m\n"
}

# Run the main function
main