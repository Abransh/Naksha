# Nakksha Consulting Platform - Project Structure

## Complete Directory Structure

```
nakksha-platform/
├── apps/
│   ├── api/                           # Backend API (Express.js + TypeScript)
│   │   ├── src/
│   │   │   ├── config/                # Configuration files
│   │   │   │   ├── database.ts        # PostgreSQL connection
│   │   │   │   ├── redis.ts           # Redis connection
│   │   │   │   ├── cloudinary.ts      # File upload config
│   │   │   │   ├── email.ts           # Email service config
│   │   │   │   └── razorpay.ts        # Payment gateway config
│   │   │   ├── controllers/           # Route handlers
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── consultant.controller.ts
│   │   │   │   ├── dashboard.controller.ts
│   │   │   │   ├── session.controller.ts
│   │   │   │   ├── client.controller.ts
│   │   │   │   ├── quotation.controller.ts
│   │   │   │   ├── admin.controller.ts
│   │   │   │   ├── upload.controller.ts
│   │   │   │   ├── payment.controller.ts
│   │   │   │   └── webhook.controller.ts
│   │   │   ├── middleware/             # Express middleware
│   │   │   │   ├── auth.ts            # JWT authentication
│   │   │   │   ├── validation.ts      # Request validation
│   │   │   │   ├── errorHandler.ts    # Error handling
│   │   │   │   ├── rateLimiter.ts     # Rate limiting
│   │   │   │   ├── upload.ts          # File upload handling
│   │   │   │   └── adminAuth.ts       # Admin-only routes
│   │   │   ├── models/                # Database models & queries
│   │   │   │   ├── consultant.model.ts
│   │   │   │   ├── session.model.ts
│   │   │   │   ├── client.model.ts
│   │   │   │   ├── quotation.model.ts
│   │   │   │   ├── availability.model.ts
│   │   │   │   ├── admin.model.ts
│   │   │   │   └── analytics.model.ts
│   │   │   ├── routes/                # API routes
│   │   │   │   ├── v1/
│   │   │   │   │   ├── auth.routes.ts
│   │   │   │   │   ├── consultant.routes.ts
│   │   │   │   │   ├── dashboard.routes.ts
│   │   │   │   │   ├── session.routes.ts
│   │   │   │   │   ├── client.routes.ts
│   │   │   │   │   ├── quotation.routes.ts
│   │   │   │   │   ├── admin.routes.ts
│   │   │   │   │   ├── upload.routes.ts
│   │   │   │   │   ├── payment.routes.ts
│   │   │   │   │   └── webhook.routes.ts
│   │   │   │   └── index.ts           # Route aggregator
│   │   │   ├── services/              # Business logic
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── email.service.ts
│   │   │   │   ├── payment.service.ts
│   │   │   │   ├── upload.service.ts
│   │   │   │   ├── calendar.service.ts
│   │   │   │   ├── analytics.service.ts
│   │   │   │   └── notification.service.ts
│   │   │   ├── utils/                 # Utility functions
│   │   │   │   ├── logger.ts
│   │   │   │   ├── validation.ts
│   │   │   │   ├── helpers.ts
│   │   │   │   ├── constants.ts
│   │   │   │   └── encryption.ts
│   │   │   ├── types/                 # TypeScript types
│   │   │   │   ├── auth.types.ts
│   │   │   │   ├── consultant.types.ts
│   │   │   │   ├── session.types.ts
│   │   │   │   ├── payment.types.ts
│   │   │   │   └── api.types.ts
│   │   │   ├── app.ts                 # Express app setup
│   │   │   └── server.ts              # Server entry point
│   │   ├── prisma/                    # Database schema & migrations
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── tests/                     # Test files
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── e2e/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── .env.example
│   │   └── Dockerfile
│   │
│   ├── consultant-dashboard/          # Consultant Dashboard (Next.js 14)
│   │   ├── src/
│   │   │   ├── app/                   # App Router (Next.js 14)
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/
│   │   │   │   │   └── signup/
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── page.tsx       # Dashboard home
│   │   │   │   │   ├── sessions/
│   │   │   │   │   ├── clients/
│   │   │   │   │   ├── quotations/
│   │   │   │   │   └── settings/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── error.tsx
│   │   │   │   ├── not-found.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── components/
│   │   │   │   ├── ui/                # Shadcn/ui components
│   │   │   │   ├── dashboard/         # Dashboard specific components
│   │   │   │   ├── forms/             # Form components
│   │   │   │   ├── layout/            # Layout components
│   │   │   │   └── charts/            # Chart components
│   │   │   ├── lib/                   # Utilities & configs
│   │   │   │   ├── api.ts             # API client
│   │   │   │   ├── auth.ts            # Auth helpers
│   │   │   │   ├── utils.ts           # General utilities
│   │   │   │   └── validations.ts     # Form validations
│   │   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── store/                 # Zustand store
│   │   │   └── types/                 # TypeScript types
│   │   ├── public/
│   │   ├── package.json
│   │   ├── tailwind.config.js
│   │   ├── tsconfig.json
│   │   └── next.config.js
│   │
│   ├── public-web/                    # Public Website (Next.js 14)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── page.tsx           # Home page
│   │   │   │   ├── pricing/
│   │   │   │   ├── [consultantSlug]/  # Dynamic consultant pages
│   │   │   │   └── auth/
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   └── types/
│   │   └── ...
│   │
│   └── admin-dashboard/               # Admin Dashboard (Next.js 14)
│       ├── src/
│       │   ├── app/
│       │   │   ├── admin/
│       │   │   │   ├── page.tsx       # Admin overview
│       │   │   │   ├── consultants/   # Manage consultants
│       │   │   │   ├── sessions/      # View all sessions
│       │   │   │   └── settings/      # Platform settings
│       │   │   └── ...
│       │   └── ...
│       └── ...
│
├── packages/                          # Shared packages
│   ├── database/                      # Shared database utilities
│   │   ├── prisma/
│   │   └── package.json
│   ├── ui/                           # Shared UI components
│   │   ├── components/
│   │   └── package.json
│   ├── types/                        # Shared TypeScript types
│   │   ├── src/
│   │   └── package.json
│   ├── utils/                        # Shared utilities
│   │   ├── src/
│   │   └── package.json
│   └── email-templates/              # Email templates
│       ├── templates/
│       └── package.json
│
├── docs/                             # Documentation
│   ├── api/                          # API documentation
│   ├── deployment/                   # Deployment guides
│   └── development/                  # Development setup
│
├── docker/                           # Docker configurations
│   ├── docker-compose.yml            # Development environment
│   ├── docker-compose.prod.yml       # Production environment
│   ├── api.Dockerfile
│   ├── dashboard.Dockerfile
│   └── nginx.conf
│
├── scripts/                          # Build & deployment scripts
│   ├── build.sh
│   ├── deploy.sh
│   ├── setup-dev.sh
│   └── backup-db.sh
│
├── .gitignore
├── package.json                      # Root package.json (workspace)
├── turbo.json                        # Turborepo configuration
├── README.md
└── LICENSE
```

## Key Architectural Decisions Implemented

### 1. **Monorepo Structure with Turborepo**
- Clean separation of concerns
- Shared packages for common functionality
- Efficient build and deployment pipeline

### 2. **API-First Architecture**
- RESTful API with versioning (`/api/v1/`)
- Separate authentication for consultants and admins
- Comprehensive middleware stack

### 3. **Database Strategy**
- PostgreSQL with Prisma ORM
- Complete schema implementation from day 1
- Optimized queries with proper indexing

### 4. **Security-First Approach**
- JWT with refresh tokens
- Role-based access control
- Input validation and sanitization
- Rate limiting and CORS protection

### 5. **Scalability Considerations**
- Redis for caching and session management
- Background job processing
- File upload optimization
- Database query optimization

## Development Workflow

### Phase 1 Implementation Order:
1. **Database Setup** (`apps/api/prisma/`)
2. **Core Authentication** (`apps/api/src/controllers/auth.controller.ts`)
3. **Consultant Management** (`apps/api/src/controllers/consultant.controller.ts`)
4. **Dashboard Backend** (`apps/api/src/controllers/dashboard.controller.ts`)
5. **Settings Management** (Complete profile setup)

### Phase 2 Implementation:
1. **Session Management** (`apps/api/src/controllers/session.controller.ts`)
2. **Payment Integration** (`apps/api/src/controllers/payment.controller.ts`)
3. **Email Automation** (`apps/api/src/services/email.service.ts`)

### Phase 3 Implementation:
1. **Analytics & Reports** (`apps/api/src/services/analytics.service.ts`)
2. **Quotation System** (`apps/api/src/controllers/quotation.controller.ts`)
3. **Advanced Dashboard Features**

## Next Steps

Ready to start implementing the backend! Let's begin with:

1. **Database Schema Setup** - Complete Prisma schema
2. **Core API Structure** - Express app setup with middleware
3. **Authentication System** - JWT with admin approval logic
4. **Consultant Management** - CRUD operations with admin approval

Which component would you like me to start implementing first?