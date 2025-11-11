# Jitte - MTG Commander Deck Manager
# https://github.com/nightconcept/jitte

# Push changes with auto-incrementing version
push MESSAGE="":
    #!/usr/bin/env bash
    set -e

    # Colors for output
    GREEN='\033[0;32m'
    RED='\033[0;31m'
    YELLOW='\033[1;33m'
    NC='\033[0m' # No Color

    echo -e "${YELLOW}Starting push process...${NC}"

    # Read current version from package.json
    CURRENT_VERSION=$(node -p "require('./package.json').version")
    echo -e "Current version: ${CURRENT_VERSION}"

    # Parse version components
    # Format: 0.1.0-alpha.5
    BASE_VERSION=$(echo $CURRENT_VERSION | sed -E 's/\.[0-9]+$//')
    BUILD_NUMBER=$(echo $CURRENT_VERSION | grep -oE '[0-9]+$')

    # Increment build number
    NEW_BUILD=$((BUILD_NUMBER + 1))
    NEW_VERSION="${BASE_VERSION}.${NEW_BUILD}"
    echo -e "New version: ${GREEN}${NEW_VERSION}${NC}"

    # Backup package.json
    cp package.json package.json.backup

    # Update package.json with new version
    node -e "const pkg = require('./package.json'); pkg.version = '${NEW_VERSION}'; require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');"

    # Determine commit message
    if [ -z "{{MESSAGE}}" ]; then
        COMMIT_MSG="chore: bump to v${NEW_VERSION}"
    else
        COMMIT_MSG="{{MESSAGE}}"
    fi

    echo -e "${YELLOW}Staging changes...${NC}"
    git add .

    echo -e "${YELLOW}Committing changes...${NC}"
    git commit -m "$COMMIT_MSG"

    # Try to push
    echo -e "${YELLOW}Pushing to main...${NC}"
    if git push origin main; then
        echo -e "${GREEN}✓ Successfully pushed v${NEW_VERSION}${NC}"
        # Cleanup backup
        rm package.json.backup
    else
        echo -e "${RED}✗ Push failed! Rolling back version...${NC}"
        # Restore backup
        mv package.json.backup package.json
        # Reset the commit
        git reset --soft HEAD~1
        exit 1
    fi
