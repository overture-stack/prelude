#!/bin/sh

# Configuration
CATEGORY_NAME=${CATEGORY_NAME:-"clinical"}
DICTIONARY_NAME=${DICTIONARY_NAME:-"clinical_data_dictionary"}
DICTIONARY_VERSION=${DICTIONARY_VERSION:-"1.0"}
DEFAULT_CENTRIC_ENTITY=${DEFAULT_CENTRIC_ENTITY:-"patient"}

# Check if LYRIC_URL environment variable is set
if [ -z "$LYRIC_URL" ]; then
    printf "\033[1;31mError:\033[0m LYRIC_URL environment variable is not set\n"
    exit 1
fi

# Ensure URL includes /dictionary/register endpoint
REGISTER_URL="${LYRIC_URL%/}/dictionary/register"

printf "\033[1;36mRegistering Dictionary:\033[0m\n"
printf "URL: %s\n" "$REGISTER_URL"
printf "Category: %s\n" "$CATEGORY_NAME"
printf "Dictionary: %s\n" "$DICTIONARY_NAME"
printf "Version: %s\n" "$DICTIONARY_VERSION"
printf "Centric Entity: %s\n" "$DEFAULT_CENTRIC_ENTITY"

# Construct the form data
FORM_DATA="categoryName=${CATEGORY_NAME}&dictionaryName=${DICTIONARY_NAME}&dictionaryVersion=${DICTIONARY_VERSION}&defaultCentricEntity=${DEFAULT_CENTRIC_ENTITY}"

# Make the API call and capture response
response=$(curl -s -X POST "$REGISTER_URL" \
    -H "accept: application/json" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "$FORM_DATA")

if [ $? -eq 0 ]; then
    # Check if response contains error
    if echo "$response" | grep -q "\"error\""; then
        printf "\033[1;31mError:\033[0m %s\n" "$response"
        exit 1
    fi
    printf "\033[1;32mSuccess:\033[0m %s\n" "$response"
    exit 0
else
    printf "\033[1;31mError:\033[0m Dictionary registration failed\n"
    printf "Response: %s\n" "$response"
    exit 1
fi