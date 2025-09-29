#!/bin/bash

# NX Monorepo Template Release Script
# This script handles versioning, building, testing, and releasing

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
NX Monorepo Template Release Script

Usage: $0 [VERSION_TYPE] [OPTIONS]

VERSION_TYPE:
    major           Increment major version (1.0.0 -> 2.0.0)
    minor           Increment minor version (1.0.0 -> 1.1.0)
    patch           Increment patch version (1.0.0 -> 1.0.1)
    prerelease      Create prerelease version (1.0.0 -> 1.0.1-0)
    x.y.z           Specific version number

OPTIONS:
    -h, --help          Show this help message
    --dry-run           Show what would be done without making changes
    --skip-tests        Skip test execution
    --skip-build        Skip build step
    --skip-publish      Skip NPM publishing
    --skip-github       Skip GitHub release creation
    --beta              Create beta release
    --alpha             Create alpha release
    --tag <tag>         Custom tag name
    --push              Push changes to remote
    --verbose           Enable verbose output
    -y, --yes           Skip confirmation prompts

EXAMPLES:
    $0 patch            Create patch release (1.0.0 -> 1.0.1)
    $0 minor --beta     Create minor beta release
    $0 1.2.3 --dry-run  Show what releasing version 1.2.3 would do
    $0 major --skip-tests  Create major release without running tests

WORKFLOW:
    1. Check git status and branch
    2. Version bump
    3. Generate changelog
    4. Update package versions
    5. Run tests
    6. Build all projects
    7. Create git tag
    8. Push to remote (if --push)
    9. Publish to NPM (if configured)
    10. Create GitHub release

EOF
}

# Default options
VERSION_TYPE=""
DRY_RUN=false
SKIP_TESTS=false
SKIP_BUILD=false
SKIP_PUBLISH=false
SKIP_GITHUB=false
IS_BETA=false
IS_ALPHA=false
CUSTOM_TAG=""
PUSH_CHANGES=false
VERBOSE=false
SKIP_CONFIRMATION=false
CURRENT_VERSION=""
NEW_VERSION=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        major|minor|patch|prerelease)
            VERSION_TYPE="$1"
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-publish)
            SKIP_PUBLISH=true
            shift
            ;;
        --skip-github)
            SKIP_GITHUB=true
            shift
            ;;
        --beta)
            IS_BETA=true
            shift
            ;;
        --alpha)
            IS_ALPHA=true
            shift
            ;;
        --tag)
            CUSTOM_TAG="$2"
            shift 2
            ;;
        --push)
            PUSH_CHANGES=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            set -x
            shift
            ;;
        -y|--yes)
            SKIP_CONFIRMATION=true
            shift
            ;;
        [0-9]*.[0-9]*.[0-9]*)
            VERSION_TYPE="$1"
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate version type
if [[ -z "$VERSION_TYPE" ]]; then
    log_error "Version type is required. Use: major, minor, patch, prerelease, or x.y.z"
    show_help
    exit 1
fi

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    log_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Execute command with dry-run support
execute() {
    local cmd="$1"
    local description="$2"

    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would execute: $cmd"
        if [[ -n "$description" ]]; then
            echo "  Description: $description"
        fi
    else
        if [[ "$VERBOSE" == true ]]; then
            log_info "Executing: $cmd"
        fi
        eval "$cmd"
    fi
}

# Check git status and branch
check_git_status() {
    log_info "Checking git status..."

    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a git repository"
        exit 1
    fi

    # Check for uncommitted changes
    if [[ -n $(git status --porcelain) ]]; then
        log_error "You have uncommitted changes. Please commit or stash them before releasing."
        git status --short
        exit 1
    fi

    # Get current branch
    local current_branch=$(git branch --show-current)
    log_info "Current branch: $current_branch"

    # Warn if not on main/master
    if [[ "$current_branch" != "main" && "$current_branch" != "master" ]]; then
        log_warning "You are not on the main branch. Current branch: $current_branch"
        if [[ "$SKIP_CONFIRMATION" != true ]]; then
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "Release cancelled"
                exit 0
            fi
        fi
    fi

    log_success "Git status check passed"
}

# Get current version
get_current_version() {
    CURRENT_VERSION=$(node -p "require('./package.json').version")
    log_info "Current version: $CURRENT_VERSION"
}

# Calculate new version
calculate_new_version() {
    log_info "Calculating new version..."

    case "$VERSION_TYPE" in
        major|minor|patch|prerelease)
            local suffix=""
            if [[ "$IS_ALPHA" == true ]]; then
                suffix="-alpha"
            elif [[ "$IS_BETA" == true ]]; then
                suffix="-beta"
            fi

            # Use npm version to calculate new version
            if [[ "$DRY_RUN" == true ]]; then
                NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version --dry-run 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+.*' || echo "x.y.z")
                # Reset any changes made by npm version in dry-run
                git checkout -- package.json 2>/dev/null || true
            else
                NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version | sed 's/^v//')
            fi

            if [[ -n "$suffix" ]]; then
                NEW_VERSION="${NEW_VERSION}${suffix}"
            fi
            ;;
        *)
            # Specific version provided
            NEW_VERSION="$VERSION_TYPE"
            ;;
    esac

    log_info "New version: $NEW_VERSION"
}

# Update package versions
update_package_versions() {
    log_info "Updating package versions..."

    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would update package.json version to $NEW_VERSION"
        return
    fi

    # Update main package.json
    execute "npm version $NEW_VERSION --no-git-tag-version" "Update main package.json"

    # Update workspace packages (if they exist)
    if [[ -d "libs" ]] || [[ -d "apps" ]]; then
        # Find all package.json files in workspace
        find libs apps -name "package.json" -type f 2>/dev/null | while read -r pkg_file; do
            if [[ -f "$pkg_file" ]]; then
                execute "npm version $NEW_VERSION --no-git-tag-version --prefix $(dirname $pkg_file)" "Update $pkg_file"
            fi
        done
    fi

    log_success "Package versions updated"
}

# Generate changelog
generate_changelog() {
    log_info "Generating changelog..."

    local changelog_file="CHANGELOG.md"
    local temp_changelog="CHANGELOG.tmp"

    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would generate changelog entries"
        return
    fi

    # Get commits since last tag
    local last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
    local commit_range="HEAD"

    if [[ -n "$last_tag" ]]; then
        commit_range="${last_tag}..HEAD"
        log_info "Generating changelog from $last_tag to HEAD"
    else
        log_info "No previous tags found, generating changelog from all commits"
    fi

    # Create changelog entry
    {
        echo "# Changelog"
        echo
        echo "## [$NEW_VERSION] - $(date +%Y-%m-%d)"
        echo

        # Get commits and categorize them
        local features=$(git log $commit_range --oneline --grep="feat:" --grep="feature:" 2>/dev/null || true)
        local fixes=$(git log $commit_range --oneline --grep="fix:" --grep="bug:" 2>/dev/null || true)
        local breaking=$(git log $commit_range --oneline --grep="BREAKING" 2>/dev/null || true)

        if [[ -n "$breaking" ]]; then
            echo "### 💥 BREAKING CHANGES"
            echo "$breaking" | sed 's/^[a-f0-9]* /- /'
            echo
        fi

        if [[ -n "$features" ]]; then
            echo "### ✨ Features"
            echo "$features" | sed 's/^[a-f0-9]* /- /'
            echo
        fi

        if [[ -n "$fixes" ]]; then
            echo "### 🐛 Bug Fixes"
            echo "$fixes" | sed 's/^[a-f0-9]* /- /'
            echo
        fi

        # Add all other commits
        local other_commits=$(git log $commit_range --oneline --invert-grep --grep="feat:" --grep="feature:" --grep="fix:" --grep="bug:" --grep="BREAKING" 2>/dev/null || true)
        if [[ -n "$other_commits" ]]; then
            echo "### 🔧 Other Changes"
            echo "$other_commits" | sed 's/^[a-f0-9]* /- /'
            echo
        fi

    } > "$temp_changelog"

    # Merge with existing changelog
    if [[ -f "$changelog_file" ]]; then
        # Skip the first line (# Changelog) of existing file
        tail -n +2 "$changelog_file" >> "$temp_changelog"
    fi

    execute "mv $temp_changelog $changelog_file" "Update changelog"

    log_success "Changelog generated"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        log_info "Skipping tests"
        return
    fi

    log_info "Running tests..."
    execute "pnpm test:all" "Run all tests"
    log_success "All tests passed"
}

# Build all projects
build_projects() {
    if [[ "$SKIP_BUILD" == true ]]; then
        log_info "Skipping build"
        return
    fi

    log_info "Building all projects..."
    execute "pnpm build" "Build all projects"
    log_success "Build completed successfully"
}

# Create git tag
create_git_tag() {
    log_info "Creating git tag..."

    local tag_name="v$NEW_VERSION"
    if [[ -n "$CUSTOM_TAG" ]]; then
        tag_name="$CUSTOM_TAG"
    fi

    # Commit changes
    execute "git add ." "Stage all changes"
    execute "git commit -m \"chore: release $NEW_VERSION\"" "Commit release changes"

    # Create tag
    execute "git tag -a $tag_name -m \"Release $NEW_VERSION\"" "Create git tag"

    # Push if requested
    if [[ "$PUSH_CHANGES" == true ]]; then
        execute "git push origin HEAD" "Push commits"
        execute "git push origin $tag_name" "Push tag"
    fi

    log_success "Git tag created: $tag_name"
}

# Publish to NPM
publish_to_npm() {
    if [[ "$SKIP_PUBLISH" == true ]]; then
        log_info "Skipping NPM publishing"
        return
    fi

    # Check if we should publish (only if package is not private)
    local is_private=$(node -p "require('./package.json').private || false")
    if [[ "$is_private" == "true" ]]; then
        log_info "Package is private, skipping NPM publishing"
        return
    fi

    log_info "Publishing to NPM..."

    local npm_tag="latest"
    if [[ "$IS_ALPHA" == true ]]; then
        npm_tag="alpha"
    elif [[ "$IS_BETA" == true ]]; then
        npm_tag="beta"
    fi

    execute "npm publish --tag $npm_tag" "Publish to NPM with tag $npm_tag"
    log_success "Published to NPM"
}

# Create GitHub release
create_github_release() {
    if [[ "$SKIP_GITHUB" == true ]]; then
        log_info "Skipping GitHub release"
        return
    fi

    # Check if gh CLI is available
    if ! command -v gh &> /dev/null; then
        log_warning "GitHub CLI (gh) not found, skipping GitHub release creation"
        return
    fi

    log_info "Creating GitHub release..."

    local tag_name="v$NEW_VERSION"
    if [[ -n "$CUSTOM_TAG" ]]; then
        tag_name="$CUSTOM_TAG"
    fi

    local release_title="Release $NEW_VERSION"
    local prerelease_flag=""

    if [[ "$IS_ALPHA" == true ]] || [[ "$IS_BETA" == true ]]; then
        prerelease_flag="--prerelease"
        release_title="Pre-release $NEW_VERSION"
    fi

    # Extract changelog for this version
    local release_notes=""
    if [[ -f "CHANGELOG.md" ]]; then
        release_notes=$(awk "/^## \[$NEW_VERSION\]/,/^## \[/{print; if(/^## \[/ && !/^## \[$NEW_VERSION\]/) exit}" CHANGELOG.md | head -n -1)
    fi

    if [[ -z "$release_notes" ]]; then
        release_notes="Release $NEW_VERSION"
    fi

    execute "gh release create $tag_name --title \"$release_title\" --notes \"$release_notes\" $prerelease_flag" "Create GitHub release"
    log_success "GitHub release created"
}

# Confirmation prompt
confirm_release() {
    if [[ "$SKIP_CONFIRMATION" == true ]]; then
        return 0
    fi

    echo
    log_info "📋 Release Summary:"
    echo "  Current version: $CURRENT_VERSION"
    echo "  New version: $NEW_VERSION"
    echo "  Version type: $VERSION_TYPE"
    if [[ "$IS_ALPHA" == true ]]; then
        echo "  Release type: Alpha"
    elif [[ "$IS_BETA" == true ]]; then
        echo "  Release type: Beta"
    else
        echo "  Release type: Stable"
    fi
    echo "  Skip tests: $SKIP_TESTS"
    echo "  Skip build: $SKIP_BUILD"
    echo "  Skip publish: $SKIP_PUBLISH"
    echo "  Push changes: $PUSH_CHANGES"

    echo
    read -p "Proceed with release? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Release cancelled"
        exit 0
    fi
}

# Display success message
show_success_message() {
    echo
    if [[ "$DRY_RUN" == true ]]; then
        log_success "🔍 Dry run completed - no changes were made"
    else
        log_success "🚀 Release $NEW_VERSION completed successfully!"
    fi

    echo
    echo -e "${GREEN}Release details:${NC}"
    echo "  Version: $CURRENT_VERSION → $NEW_VERSION"
    echo "  Tag: v$NEW_VERSION"

    if [[ "$DRY_RUN" != true ]]; then
        if [[ "$SKIP_PUBLISH" != true ]]; then
            echo "  NPM: Published"
        fi
        if [[ "$SKIP_GITHUB" != true ]]; then
            echo "  GitHub: Release created"
        fi
        if [[ "$PUSH_CHANGES" == true ]]; then
            echo "  Git: Changes pushed to remote"
        else
            echo "  Git: Changes committed locally (not pushed)"
        fi
    fi

    echo
    if [[ "$PUSH_CHANGES" != true && "$DRY_RUN" != true ]]; then
        echo -e "${YELLOW}Next steps:${NC}"
        echo "  1. Run 'git push origin HEAD' to push commits"
        echo "  2. Run 'git push origin v$NEW_VERSION' to push the tag"
    fi
    echo
}

# Main execution
main() {
    log_info "Starting release process for NX Monorepo Template..."

    check_git_status
    get_current_version
    calculate_new_version
    confirm_release

    update_package_versions
    generate_changelog
    run_tests
    build_projects
    create_git_tag
    publish_to_npm
    create_github_release

    show_success_message
}

# Trap errors and cleanup
cleanup_on_error() {
    log_error "Release failed. Cleaning up..."

    if [[ "$DRY_RUN" != true ]]; then
        # Reset package.json if it was modified
        if git diff --quiet package.json 2>/dev/null; then
            git checkout -- package.json 2>/dev/null || true
        fi

        # Remove any uncommitted changes
        git reset --hard HEAD 2>/dev/null || true
    fi
}

trap cleanup_on_error ERR

# Run main function
main "$@"