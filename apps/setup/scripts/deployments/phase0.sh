#!/bin/bash
# Comprehensive Pre-Deployment Checks for Prelude Application

# Minimum Requirements
DOCKER_ENGINE_MIN_VERSION="28.0.0"  # Docker engine version requirement
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

# Main Deployment Check Script
main() {
    printf "\n\033[1;36m╔═════════════════════════════════╗\033[0m\n"
    printf "\033[1;36m║  Running Pre-deployment checks  ║\033[0m\n"
    printf "\033[1;36m╚═════════════════════════════════╝\033[0m\n"

    # Check Docker
    printf "\n\033[1;35m[1/2]\033[0m Checking Docker...\n"
    
    # Check Docker CLI installation
    if ! command -v docker >/dev/null 2>&1; then
        printf "\n\033[1;31mError:\033[0m Docker is not installed\033[0m\n"
        exit 1
    fi

    ENGINE_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
    
    # Check Docker Engine version
    if ! version_check "$DOCKER_ENGINE_MIN_VERSION" "$ENGINE_VERSION"; then
        printf "\n\033[1;31mError:\033[0m Docker Engine version %s does not meet minimum requirement of %s\033[0m\n" "$ENGINE_VERSION" "$DOCKER_ENGINE_MIN_VERSION"
        printf "\n\033[1;33mHow to update Docker:\033[0m\n"
        printf "   1. Visit https://docs.docker.com/get-docker/ to download the latest version\n"
        printf "   2. Or update via Docker Desktop: Settings → Software Updates → Check for updates\n"
        printf "   3. Restart Docker Desktop after updating\n"
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
    printf "\n\033[1;35m[2/2]\033[0m Checking Docker Resources\n"
    DOCKER_INFO=$(docker info 2>/dev/null)
    
    # CPU Cores Check
    CPU_CORES=$(docker info 2>/dev/null | grep "CPUs:" | awk '{print $2}' || echo "0")
    if [ "$CPU_CORES" = "0" ]; then
        # Fallback to system CPU if Docker info doesn't show CPU allocation
        CPU_CORES=$(sysctl -n hw.ncpu 2>/dev/null || nproc 2>/dev/null || echo "0")
    fi
    if ! safe_compare -lt "$CPU_CORES" "$DOCKER_MIN_CPU_CORES"; then
        printf "\033[1;36mInfo:\033[0m Docker CPU allocation meets minimum requirements (%s cores)\033[0m\n" "$CPU_CORES"
    else
        printf "\033[1;33m⚠ Docker CPU cores (%s) are less than recommended (%s)\033[0m\n" "$CPU_CORES" "$DOCKER_MIN_CPU_CORES"
        printf "\n\033[1;33mRecommendation:\033[0m Please increase Docker CPU allocation to %s cores for Docker.\n" "$DOCKER_MIN_CPU_CORES"
        printf "This will improve build performance and container execution speed.\n"
        printf "\nDo you want to continue anyway? [y/N] "
        read -r response
        case "$response" in
            [yY]|[yY][eE][sS])
                printf "Continuing with current CPU allocation...\n"
                ;;
            *)
                printf "\nDeployment cancelled. Please increase Docker CPU allocation and try again.\n"
                exit 1
                ;;
        esac
    fi

    # Memory Check
    TOTAL_MEMORY=$(docker info 2>/dev/null | grep "Total Memory" | awk '{print $3 $4}')
    MEMORY_GB=$(echo "$TOTAL_MEMORY" | sed 's/GiB//')
    if ! safe_compare -lt "$MEMORY_GB" "$DOCKER_MIN_MEMORY_GB"; then
        printf "\033[1;36mInfo:\033[0m Docker memory allocation meets minimum requirements (%s GB)\033[0m\n" "$MEMORY_GB"
    else
        printf "\033[1;33m⚠ Docker memory (%s GB) is less than recommended (%s GB)\033[0m\n" "$MEMORY_GB" "$DOCKER_MIN_MEMORY_GB"
        printf "\n\033[1;33mRecommendation:\033[0m Please increase Docker memory allocation to %s GB for Docker.\n" "$DOCKER_MIN_MEMORY_GB"
        printf "This will improve performance and prevent potential out-of-memory issues.\n"
        printf "\nDo you want to continue anyway? [y/N] "
        read -r response
        case "$response" in
            [yY]|[yY][eE][sS])
                printf "Continuing with current memory allocation...\n"
                ;;
            *)
                printf "\nDeployment cancelled. Please increase Docker memory allocation and try again.\n"
                exit 1
                ;;
        esac
    fi

    # Disk Space Check
    DOCKER_DISK_SPACE=$(diskutil info / 2>/dev/null | grep "Total Space" | awk '{print $3 $4}' | sed 's/[()]//g')
    DISK_GB=$(echo "$DOCKER_DISK_SPACE" | sed 's/[^0-9.]//g')  # strip everything except numbers/dot

    if ! safe_compare -lt "$DISK_GB" "$DOCKER_MIN_DISK_GB"; then
        printf "\033[1;36mInfo:\033[0m Docker virtual disk space meets minimum requirements (%s GB)\033[0m\n" "$DISK_GB"
    else
        printf "\033[1;33m⚠ Docker virtual disk space (%s GB) is less than recommended (%s GB)\033[0m\n" "$DISK_GB" "$DOCKER_MIN_DISK_GB"
        printf "\n\033[1;33mRecommendation:\033[0m Please increase Docker virtual disk allocation to %s GB for Docker.\n" "$DOCKER_MIN_DISK_GB"
        printf "This will prevent disk space issues during container operations and data storage.\n"
        printf "\nDo you want to continue anyway? [y/N] "
        read -r response
        case "$response" in
            [yY]|[yY][eE][sS])
                printf "Continuing with current disk allocation...\n"
                ;;
            *)
                printf "\nDeployment cancelled. Please increase Docker disk allocation and try again.\n"
                exit 1
                ;;
        esac
    fi
    
    # System info summary
    printf "\n\033[1;34mSystem Info Summary\033[0m\n"
    printf "─────────────────────────────\n"
    printf "Docker Engine: \033[0;32m%s\033[0m\n" "$ENGINE_VERSION"
    printf "CPU Cores:    \033[0;32m%s\033[0m\n" "$CPU_CORES"
    printf "Total Memory: \033[0;32m%s\033[0m\n" "$TOTAL_MEMORY"
    printf "Disk Space:   \033[0;32m%s GB\033[0m\n" "$DISK_GB"
    printf "─────────────────────────────"
    # Success message + system info
    printf "\n\033[1;32mSuccess, 🚀 ready to deploy \033[0m\n"
}

# Run the main function
main