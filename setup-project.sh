#!/bin/bash
# setup-project.sh
# Nakksha Consulting Platform - Complete Project Setup Script
# Run this script to initialize your development environment

set -e  # Exit on any error

echo "🚀 Setting up Nakksha Consulting Platform..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18 or higher."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version must be 18 or higher. Current version: $(node -v)"
        exit 1
    fi
    
    print_success "Node.js version: $(node -v)"
}

# Check if pnpm is installed
check_pnpm() {
    if ! command -v pnpm &> /dev/null; then
        print_warning "pnpm is not installed. Installing pnpm..."
        npm install -g pnpm
    fi
    print_success "pnpm version: $(pnpm -v)"
}

# Install dependencies
install_dependencies() {
    print_step "📦 Installing project dependencies..."
    pnpm install
    print_success "Dependencies installed successfully"
}

# Generate JWT secrets
generate_jwt_secrets() {
    print_step "🔐 Generating JWT secrets..."
    
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    
    echo "JWT_SECRET=\"$JWT_SECRET\"" >> .env.secrets
    echo "JWT_REFRESH_SECRET=\"$JWT_REFRESH_SECRET\"" >> .env.secrets
    
    print_success "JWT secrets generated and saved to .env.secrets"
    print_warning "Remember to add these to your actual .env files!"
}

# Setup environment files
setup_env_files() {
    print_step "📄 Setting up environment files..."
    
    # API environment
    if [ ! -f "apps/api/.env" ]; then
        print_warning "Please create apps/api/.env file with your database and service credentials"
        print_warning "Refer to the environment setup guide for details"
    else
        print_success "API environment file exists"
    fi
    
    # Frontend environment
    if [ ! -f "apps/consultant-dashboard/.env.local" ]; then
        print_warning "Please create apps/consultant-dashboard/.env.local file"
        print_warning "Refer to the environment setup guide for details"
    else
        print_success "Frontend environment file exists"
    fi
    
    # Database environment
    if [ ! -f "packages/database/.env" ]; then
        print_warning "Please create packages/database/.env file with DATABASE_URL"
    else
        print_success "Database environment file exists"
    fi
}

# Initialize database
init_database() {
    print_step "🗄️  Initializing database..."
    
    if [ -f "packages/database/.env" ]; then
        cd packages/database
        
        # Generate Prisma client
        print_step "Generating Prisma client..."
        pnpm prisma generate
        
        # Push database schema
        print_step "Pushing database schema..."
        pnpm prisma db push
        
        cd ../..
        print_success "Database initialized successfully"
    else
        print_error "Database .env file not found. Please create packages/database/.env first"
        return 1
    fi
}

# Create admin user
create_admin_user() {
    print_step "👤 Creating admin user..."
    
    # This would typically be a separate script
    cat << 'EOF' > create-admin.js
// create-admin.js - Run this script to create the first admin user
const { PrismaClient } = require('@nakksha/database');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  const prisma = new PrismaClient();
  
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@nakksha.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  
  try {
    const admin = await prisma.admin.create({
      data: {
        email: adminEmail,
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'SUPER_ADMIN',
        isActive: true
      }
    });
    
    console.log('✅ Admin user created successfully:');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('⚠️  Please change the password after first login!');
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('ℹ️  Admin user already exists');
    } else {
      console.error('Error creating admin user:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
EOF
    
    print_success "Admin creation script generated: create-admin.js"
    print_warning "Run 'node create-admin.js' after setting up your database to create the admin user"
}

# Build the project
build_project() {
    print_step "🔨 Building the project..."
    pnpm build
    print_success "Project built successfully"
}

# Setup development scripts
setup_dev_scripts() {
    print_step "🛠️  Setting up development scripts..."
    
    cat << 'EOF' > dev-start.sh
#!/bin/bash
# Development startup script

echo "🚀 Starting Nakksha Platform in development mode..."

# Start API server
echo "Starting API server..."
cd apps/api && pnpm dev &
API_PID=$!

# Start frontend
echo "Starting frontend..."
cd apps/consultant-dashboard && pnpm dev &
FRONTEND_PID=$!

# Wait for interrupt
echo "✅ Both servers started successfully!"
echo "📍 API: http://localhost:8000"
echo "📍 Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all servers"

# Cleanup function
cleanup() {
    echo "Stopping servers..."
    kill $API_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

wait
EOF
    
    chmod +x dev-start.sh
    print_success "Development script created: dev-start.sh"
}

# Main setup function
main() {
    echo "Starting project setup..."
    echo "========================"
    
    check_node
    check_pnpm
    install_dependencies
    generate_jwt_secrets
    setup_env_files
    
    # Ask user if they want to initialize database
    echo ""
    read -p "Do you want to initialize the database now? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        init_database
        create_admin_user
    else
        print_warning "Skipping database initialization. Run 'pnpm db:push' when ready."
    fi
    
    setup_dev_scripts
    
    echo ""
    echo "🎉 Project setup completed successfully!"
    echo "========================================"
    echo ""
    echo "Next steps:"
    echo "1. Create and configure your .env files (see environment setup guide)"
    echo "2. Set up your database (Neon PostgreSQL)"
    echo "3. Set up Redis cache (Upstash)"
    echo "4. Configure email service (Resend)"
    echo "5. Run './dev-start.sh' to start development servers"
    echo ""
    echo "📚 Documentation: Check CLAUDE.md and documentation.md"
    echo "🐛 Issues: Check the project issues or create new ones"
    echo ""
    print_success "Happy coding! 🚀"
}

# Run main function
main "$@"