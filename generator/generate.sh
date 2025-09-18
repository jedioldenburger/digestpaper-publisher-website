#!/bin/bash

# DigestPaper Media - Batch Page Generation Script
# This script provides easy access to all generator functions

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Function to print colored output
print_header() {
    echo -e "${PURPLE}================================================================${NC}"
    echo -e "${PURPLE}  DigestPaper Media - Website Generator${NC}"
    echo -e "${PURPLE}================================================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to check dependencies
check_dependencies() {
    print_info "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 14 or higher."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 14 ]; then
        print_error "Node.js version 14 or higher is required. Current version: $(node --version)"
        exit 1
    fi
    
    if [ ! -f "enhanced-generator.js" ]; then
        print_error "Generator script not found in current directory."
        exit 1
    fi
    
    if [ ! -f "config.json" ]; then
        print_error "Configuration file not found in current directory."
        exit 1
    fi
    
    if [ ! -d "../templates" ]; then
        print_error "Templates directory not found. Expected: ../templates/"
        exit 1
    fi
    
    print_success "All dependencies satisfied"
}

# Function to show usage
show_usage() {
    echo -e "${CYAN}Usage: $0 [COMMAND] [OPTIONS]${NC}"
    echo ""
    echo "Commands:"
    echo "  generate <page>     Generate a specific page"
    echo "  generate-all        Generate all pages"
    echo "  sitemap             Generate sitemap.xml"
    echo "  list                List all available pages"
    echo "  stats               Show generation statistics"
    echo "  config              Show current configuration"
    echo "  clean               Remove all generated files"
    echo "  build               Full build (deterministic + sitemap)"
    echo "  rebuild             Clean and build"
    echo "  validate            Validate generated output"
    echo "  help                Show this help message"
    echo ""
    echo "Options:"
    echo "  --deterministic     Use deterministic content generation"
    echo "  --output-dir DIR    Specify custom output directory"
    echo "  --verbose           Show detailed output"
    echo ""
    echo "Examples:"
    echo "  $0 generate projects"
    echo "  $0 generate-all --deterministic"
    echo "  $0 build"
    echo "  $0 validate"
}

# Function to generate specific page
generate_page() {
    local page="$1"
    local options="$2"
    
    print_info "Generating page: $page"
    
    if node enhanced-generator.js "$page" $options; then
        print_success "Page generated successfully: $page"
    else
        print_error "Failed to generate page: $page"
        exit 1
    fi
}

# Function to generate all pages
generate_all() {
    local options="$1"
    
    print_info "Generating all pages..."
    
    if node enhanced-generator.js --all $options; then
        print_success "All pages generated successfully"
    else
        print_error "Failed to generate all pages"
        exit 1
    fi
}

# Function to generate sitemap
generate_sitemap() {
    print_info "Generating sitemap..."
    
    if node enhanced-generator.js --sitemap; then
        print_success "Sitemap generated successfully"
    else
        print_error "Failed to generate sitemap"
        exit 1
    fi
}

# Function to list pages
list_pages() {
    node enhanced-generator.js --list
}

# Function to show stats
show_stats() {
    node enhanced-generator.js --stats
}

# Function to show config
show_config() {
    node enhanced-generator.js --config
}

# Function to clean generated files
clean_files() {
    print_info "Cleaning generated files..."
    
    # Remove generated HTML files
    if [ -d "../public" ]; then
        find ../public -name "index.html" -type f -delete 2>/dev/null || true
        rm -f ../public/sitemap.xml 2>/dev/null || true
        print_success "Cleaned generated files"
    else
        print_warning "Public directory not found, nothing to clean"
    fi
}

# Function to do full build
build_site() {
    local options="$1"
    
    print_info "Starting full build..."
    
    # Generate all pages with deterministic content
    if node enhanced-generator.js --all --deterministic $options; then
        print_success "All pages generated"
    else
        print_error "Failed to generate pages"
        exit 1
    fi
    
    # Generate sitemap
    if node enhanced-generator.js --sitemap; then
        print_success "Sitemap generated"
    else
        print_error "Failed to generate sitemap"
        exit 1
    fi
    
    print_success "Build completed successfully"
}

# Function to validate output
validate_output() {
    print_info "Validating generated output..."
    
    if [ ! -d "../public" ]; then
        print_error "Public directory not found. Run build first."
        exit 1
    fi
    
    # Count generated files
    HTML_COUNT=$(find ../public -name "index.html" -type f | wc -l)
    
    print_info "Found $HTML_COUNT HTML files"
    
    # Check for sitemap
    if [ -f "../public/sitemap.xml" ]; then
        print_success "Sitemap found"
    else
        print_warning "Sitemap not found"
    fi
    
    # Basic HTML validation (check for required elements)
    INVALID_FILES=0
    
    while IFS= read -r -d '' file; do
        if ! grep -q "<title>" "$file" || ! grep -q "</html>" "$file"; then
            print_error "Invalid HTML structure in: $file"
            ((INVALID_FILES++))
        fi
    done < <(find ../public -name "index.html" -type f -print0)
    
    if [ $INVALID_FILES -eq 0 ]; then
        print_success "All HTML files have valid structure"
    else
        print_error "$INVALID_FILES files have invalid HTML structure"
        exit 1
    fi
    
    print_success "Validation completed successfully"
}

# Parse command line arguments
COMMAND="$1"
shift || true

OPTIONS=""
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --deterministic)
            OPTIONS="$OPTIONS --deterministic"
            shift
            ;;
        --output-dir)
            OPTIONS="$OPTIONS --output-dir $2"
            shift 2
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        *)
            # Unknown option, pass it to the generator
            OPTIONS="$OPTIONS $1"
            shift
            ;;
    esac
done

# Main execution
print_header

check_dependencies

case "$COMMAND" in
    "generate")
        if [ -z "$1" ]; then
            print_error "Page name required for generate command"
            echo ""
            show_usage
            exit 1
        fi
        generate_page "$1" "$OPTIONS"
        ;;
    "generate-all")
        generate_all "$OPTIONS"
        ;;
    "sitemap")
        generate_sitemap
        ;;
    "list")
        list_pages
        ;;
    "stats")
        show_stats
        ;;
    "config")
        show_config
        ;;
    "clean")
        clean_files
        ;;
    "build")
        build_site "$OPTIONS"
        ;;
    "rebuild")
        clean_files
        build_site "$OPTIONS"
        ;;
    "validate")
        validate_output
        ;;
    "help"|"--help"|"-h")
        show_usage
        ;;
    "")
        print_warning "No command specified"
        echo ""
        show_usage
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        echo ""
        show_usage
        exit 1
        ;;
esac

print_success "Operation completed successfully"