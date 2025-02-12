# Configuration
STUDY_ID="demo" 

: ${AUTH_TOKEN:="123"}  # Default Auth Token

# Check if environment variables are set
if [ -z "$SONG_URL" ]; then
    printf "\033[1;31mError:\033[0m SONG_URL environment variable is not set\n"
    exit 1
fi

if [ -z "$AUTH_TOKEN" ]; then
    printf "\033[1;31mError:\033[0m AUTH_TOKEN environment variable is not set\n"
    exit 1
fi

# Study payload
STUDY_PAYLOAD=$(cat <<EOF
{
    "description": "string",
    "info": {},
    "name": "string", 
    "organization": "string",
    "studyId": "$STUDY_ID"
}
EOF
)

printf "\033[1;36mStudy Upload:\033[0m Uploading study to %s\n" "$SONG_URL/studies/$STUDY_ID/"

# Upload study
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$SONG_URL/studies/$STUDY_ID/" \
    -H "accept: */*" \
    -H "Authorization: $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$STUDY_PAYLOAD")

# Check the response status
if [ "$response" -eq 200 ] || [ "$response" -eq 201 ]; then
    printf "\033[1;32mSuccess:\033[0m Study ID: $STUDY_ID created successfully\n"
    exit 0
else
    printf "\033[1;31mError:\033[0m Study creation failed with HTTP status %s\n" "$response"
    
    # Troubleshooting logs
    printf "\033[1;33mTroubleshooting:\033[0m\n"
    printf "SONG_URL: %s\n" "$SONG_URL"
    printf "Study ID: %s\n" "$STUDY_ID"
    
    # Check if the study already exists
    exists_response=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$SONG_URL/studies/$STUDY_ID")
    if [ "$exists_response" -eq 200 ]; then
        printf "\033[1;33mWarning:\033[0m Study ID %s already exists\n" "$STUDY_ID"
    fi
    
    # Check if SONG_URL is reachable
    ping_response=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$SONG_URL/isAlive")
    if [ "$ping_response" -ne 200 ]; then
        printf "\033[1;33mWarning:\033[0m SONG server at %s is not reachable\n" "$SONG_URL"
    fi
    
    exit 1
fi