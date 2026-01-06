#!/bin/sh

# Stage Image Build Check Utility
# Checks if stageimage:1.0 exists and prompts for rebuild if needed

IMAGE_NAME="stageimage:1.0"
STAGE_DIR="/apps/stage"

# Function to check if Docker image exists
check_image_exists() {
    if docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
        return 0  # Image exists
    else
        return 1  # Image does not exist
    fi
}

# Function to build stage image
build_stage_image() {
    printf "\033[1;36mInfo:\033[0m Building Stage image from %s\n" "$STAGE_DIR"

    if [ ! -d "$STAGE_DIR" ]; then
        printf "\033[1;31mError:\033[0m Stage directory not found: %s\n" "$STAGE_DIR"
        return 1
    fi

    if [ ! -f "$STAGE_DIR/Dockerfile" ]; then
        printf "\033[1;31mError:\033[0m Dockerfile not found in: %s\n" "$STAGE_DIR"
        return 1
    fi

    # Build the image
    if (cd "$STAGE_DIR" && docker build -t "$IMAGE_NAME" .); then
        printf "\033[1;32mSuccess:\033[0m Stage image built successfully\n"
        return 0
    else
        printf "\033[1;31mError:\033[0m Failed to build Stage image\n"
        return 1
    fi
}

# Function to prompt user for rebuild
prompt_rebuild() {
    printf "\033[1;33mStage image '%s' already exists.\033[0m\n" "$IMAGE_NAME"
    printf "Have you made changes to the Stage application that require a rebuild? [y/N]: "
    read -r rebuild_choice

    case "$rebuild_choice" in
        [Yy]|[Yy][Ee][Ss])
            return 0  # User wants to rebuild
            ;;
        *)
            return 1  # User doesn't want to rebuild
            ;;
    esac
}

# Main stage image check function
check_and_build_stage() {
    printf "\033[1;36mInfo:\033[0m Checking Stage image status\n"

    if check_image_exists; then
        # Image exists, ask user if they want to rebuild
        if prompt_rebuild; then
            printf "\033[1;36mInfo:\033[0m Rebuilding Stage image...\n"
            if ! build_stage_image; then
                printf "\033[1;31mFailed:\033[0m Stage image build failed\n"
                return 1
            fi
        else
            printf "\033[1;32mInfo:\033[0m Using existing Stage image\n"
        fi
    else
        # Image doesn't exist, build it
        printf "\033[1;36mInfo:\033[0m Stage image not found, building...\n"
        if ! build_stage_image; then
            printf "\033[1;31mFailed:\033[0m Stage image build failed\n"
            return 1
        fi
    fi

    return 0
}

# Run the check (always run since called directly)
check_and_build_stage