# Nakksha Consulting Platform - Complete Architecture Documentation
# 🎯 Project Overview
Nakksha is a comprehensive consulting management platform that serves two primary user types:
Consultants - Professionals who provide consulting services and need to manage their business
Clients - Individuals who book and pay for consulting sessions
The platform consists of multiple interconnected systems working together to provide a seamless consulting business management experience.
🏗️ System Architecture Overview
High-Level Architecture
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Public Web    │    │  Consultant      │    │   Admin         │
│   (Next.js)     │◄──►│  Dashboard       │◄──►│   Dashboard     │
│                 │    │  (Next.js)       │    │   (Next.js)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     API Gateway         │
                    │    (Express.js)         │
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌────────▼────────┐    ┌────────▼────────┐    ┌────────▼────────┐
│   PostgreSQL    │    │     Redis       │    │   File Storage  │
│   (Primary DB)  │    │   (Cache/Queue) │    │   (Cloudinary)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘

📊 Detailed Database Schema
Core Tables Structure
-- ============================================================================
-- USER MANAGEMENT TABLES
-- ============================================================================

-- Consultants (Main users of the platform)
CREATE TABLE consultants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_country_code VARCHAR(5) NOT NULL DEFAULT '+91',
    phone_number VARCHAR(15) NOT NULL,
    consultancy_sector VARCHAR(100),
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    personal_session_title VARCHAR(200),
    webinar_session_title VARCHAR(200),
    description TEXT,
    experience_months INTEGER DEFAULT 0,
    personal_session_price DECIMAL(10,2),
    webinar_session_price DECIMAL(10,2),
    instagram_url VARCHAR(255),
    linkedin_url VARCHAR(255),
    twitter_url VARCHAR(255),
    profile_photo_url VARCHAR(500),
    slug VARCHAR(100) UNIQUE, -- For /[consultantName] URLs
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    subscription_plan VARCHAR(50) DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CLIENT MANAGEMENT TABLES
-- ============================================================================

-- Clients (People who book sessions with consultants)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_country_code VARCHAR(5) DEFAULT '+91',
    phone_number VARCHAR(15),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    is_active BOOLEAN DEFAULT true,
    total_sessions INTEGER DEFAULT 0,
    total_amount_paid DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(consultant_id, email) -- One client per consultant per email
);

-- ============================================================================
-- SESSION MANAGEMENT TABLES
-- ============================================================================

-- Sessions (Appointments/meetings)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('personal', 'webinar')),
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('zoom', 'meet', 'teams')),
    meeting_link VARCHAR(500),
    meeting_id VARCHAR(100),
    meeting_password VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'returned', 'abandoned', 'no_show')),
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    payment_id VARCHAR(100), -- Razorpay payment_id
    payment_method VARCHAR(50),
    notes TEXT,
    consultant_notes TEXT,
    is_repeat_client BOOLEAN DEFAULT false,
    booking_source VARCHAR(50) DEFAULT 'website',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AVAILABILITY MANAGEMENT TABLES
-- ============================================================================

-- Consultant availability slots
CREATE TABLE availability_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
    session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('personal', 'webinar')),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_booked BOOLEAN DEFAULT false,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(consultant_id, session_type, date, start_time)
);

-- ============================================================================
-- QUOTATION MANAGEMENT TABLES
-- ============================================================================

-- Quotations
CREATE TABLE quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    client_email VARCHAR(255) NOT NULL, -- For non-registered clients
    client_name VARCHAR(200) NOT NULL,
    quotation_name VARCHAR(300) NOT NULL,
    description TEXT,
    base_amount DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    final_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    duration_text VARCHAR(100), -- e.g., "Valid for 30 days"
    expires_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),
    quotation_image_url VARCHAR(500),
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- ============================================================================
-- PAYMENT TRACKING TABLES
-- ============================================================================

-- Payment transactions
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL REFERENCES consultants(id),
    session_id UUID REFERENCES sessions(id),
    quotation_id UUID REFERENCES quotations(id),
    client_email VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    payment_gateway VARCHAR(50) DEFAULT 'razorpay',
    gateway_payment_id VARCHAR(100),
    gateway_order_id VARCHAR(100),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    gateway_response JSONB,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATION & EMAIL LOGS
-- ============================================================================

-- Email logs for tracking all sent emails
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID REFERENCES consultants(id),
    recipient_email VARCHAR(255) NOT NULL,
    email_type VARCHAR(100) NOT NULL, -- 'session_confirmation', 'quotation_shared', etc.
    subject VARCHAR(500),
    template_used VARCHAR(100),
    status VARCHAR(50) NOT NULL CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'bounced')),
    external_id VARCHAR(255), -- SendGrid message ID
    error_message TEXT,
    metadata JSONB,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ANALYTICS & REPORTING TABLES
-- ============================================================================

-- Daily analytics aggregations for dashboard performance
CREATE TABLE daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    sessions_created INTEGER DEFAULT 0,
    sessions_completed INTEGER DEFAULT 0,
    sessions_cancelled INTEGER DEFAULT 0,
    new_clients INTEGER DEFAULT 0,
    revenue_earned DECIMAL(10,2) DEFAULT 0,
    quotations_sent INTEGER DEFAULT 0,
    quotations_accepted INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(consultant_id, date)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Session queries
CREATE INDEX idx_sessions_consultant_date ON sessions(consultant_id, scheduled_date);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_payment_status ON sessions(payment_status);

-- Client queries
CREATE INDEX idx_clients_consultant ON clients(consultant_id);
CREATE INDEX idx_clients_email ON clients(consultant_id, email);

-- Availability queries
CREATE INDEX idx_availability_consultant_date ON availability_slots(consultant_id, date, session_type);

-- Analytics queries
CREATE INDEX idx_daily_analytics_consultant_date ON daily_analytics(consultant_id, date);

-- Conversation queries
CREATE INDEX idx_conversations_consultant ON conversations(consultant_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, sent_at);

🛠️ Complete Tech Stack Decision Matrix
Frontend Stack
// Core Framework
Next.js 14+ (App Router)
├── TypeScript (Type Safety)
├── Tailwind CSS (Styling)
├── Headless UI (Accessible Components)
├── React Hook Form (Form Management)
├── Zod (Validation)
├── Zustand (State Management)
├── React Query (Server State)
├── Framer Motion (Animations)
└── Recharts (Charts & Analytics)

Backend Stack
// API Layer
Express.js + TypeScript
├── Prisma ORM (Database Operations)
├── JWT + Refresh Tokens (Authentication)
├── Bcrypt (Password Hashing)
├── Multer + Cloudinary (File Uploads)
├── Node-cron (Scheduled Tasks)
├── Bull Queue (Background Jobs)
└── Helmet (Security)

Database & Caching
-- Primary Database
PostgreSQL 17
├── Connection Pooling (PgBouncer)
├── Read Replicas (Analytics Queries)
└── Automated Backups

-- Caching Layer
Redis 7+
├── Session Storage
├── Queue Management
├── Real-time Data Cache
└── Rate Limiting

External Services Integration
# Payment Processing
Razorpay:
  - Payment Gateway
  - Subscription Management
  - Webhook Handling
  - Refund Processing

# Email Service
Resend
  - Transactional Emails
  - Template Management
  - Delivery Analytics
  - Bounce Handling

# File Storage
Cloudinary:
  - Image Upload & Optimization
  - Document Storage
  - CDN Delivery
  - Automatic Transformations

# Video Conferencing APIs
Google Calendar + Meet:
  - Event Creation
  - Meet Link Generation
  - Calendar Sync

Microsoft Graph API:
  - Teams Integration
  - Outlook Calendar

📱 Application Structure & Routing
Public Website Structure
/
├── / (Home Page)
├── /pricing (Pricing Plans)
├── /[consultantSlug] (Dynamic Consultant Pages)
│   ├── Book Session Form
│   ├── Available Slots
│   ├── Payment Integration
│   └── Consultant Profile
├── /auth/login
├── /auth/signup
└── /auth/forgot-password

Consultant Dashboard Structure
/dashboard
├── /dashboard (Overview & Analytics)
├── /dashboard/sessions
│   ├── Session List & Filters
│   ├── Session Creation Modal
│   ├── Session Details View
│   └── Calendar View
├── /dashboard/clients
│   ├── Client List & Search
│   ├── Client Profile Pages
│   ├── Client Creation Modal
│   └── Client Analytics
├── /dashboard/quotations
│   ├── Quotation List
│   ├── Quotation Builder
│   ├── Quotation Analytics
│   └── Email Integration
└── /dashboard/settings
    ├── Profile Settings
    ├── Availability Management
    ├── Payment Configuration
    ├── Notification Preferences
    └── Account Management

Admin Dashboard Structure
/admin
├── /admin (Admin Overview)
├── /admin/consultants
│   ├── All Consultants List
│   ├── Consultant Analytics
│   ├── Account Management
│   └── Subscription Management
├── /admin/sessions
│   ├── Platform-wide Sessions
│   ├── Revenue Analytics
│   └── Performance Metrics
└── /admin/settings
    ├── Platform Configuration
    ├── Email Templates
    └── System Monitoring

🔄 Core Business Logic Flows
1. User Onboarding Flow
graph TD
    A[User Signs Up] --> B[Email Verification]
    B --> C[Redirect to Settings]
    C --> D[Complete Profile Form]
    D --> E[Upload Profile Photo]
    E --> F[Set Availability Slots]
    F --> G[Preview Consultant Page]
    G --> H[Account Active]

2. Session Booking Flow
graph TD
    A[Client Visits /[consultant]] --> B[Select Session Type]
    B --> C[Choose Available Slot]
    C --> D[Fill Client Details]
    D --> E[Payment Processing]
    E --> F[Payment Success]
    F --> G[Send Confirmation Emails]
    G --> H[Generate Meeting Link]
    H --> I[Update Dashboard Analytics]

3. Payment Processing Flow
graph TD
    A[User Clicks Pay] --> B[Create Razorpay Order]
    B --> C[Open Payment Modal]
    C --> D[User Completes Payment]
    D --> E[Razorpay Webhook]
    E --> F[Verify Payment Signature]
    F --> G[Update Session Status]
    G --> H[Send Email Confirmations]
    H --> I[Update Analytics]

📧 Email Automation System
Email Templates Required
interface EmailTemplates {
  // Consultant Emails
  session_booked: {
    to: string; // consultant email
    data: { clientName, sessionDate, amount, meetingLink }
  };
  
  session_cancelled: {
    to: string;
    data: { clientName, sessionDate, reason }
  };
  
  quotation_viewed: {
    to: string;
    data: { clientName, quotationName, viewedAt }
  };
  
  // Client Emails
  session_confirmation: {
    to: string; // client email
    data: { consultantName, sessionDate, meetingLink, amount }
  };
  
  session_reminder: {
    to: string;
    data: { consultantName, sessionDate, meetingLink }
  };
  
  quotation_received: {
    to: string;
    data: { quotationLink, consultantName, validUntil }
  };
}

Email Automation Triggers
// Trigger: New session booked
const onSessionBooked = async (sessionId: string) => {
  const session = await getSessionWithDetails(sessionId);
  
  // 1. Send confirmation to client
  await sendEmail('session_confirmation', {
    to: session.client.email,
    data: {
      consultantName: session.consultant.name,
      sessionDate: session.scheduledDate,
      meetingLink: session.meetingLink,
      amount: session.amount
    }
  });
  
  // 2. Notify consultant
  await sendEmail('session_booked', {
    to: session.consultant.email,
    data: {
      clientName: session.client.name,
      sessionDate: session.scheduledDate,
      amount: session.amount,
      meetingLink: session.meetingLink
    }
  });
  
  // 3. Schedule reminder (24h before)
  await scheduleEmail('session_reminder', {
    scheduledFor: subHours(session.scheduledDateTime, 24),
    to: session.client.email,
    data: { /* reminder data */ }
  });
};

📊 Analytics & Dashboard Implementation
Dashboard Metrics Calculation
interface DashboardMetrics {
  // Time-based filters
  timeframe: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  
  // Session Metrics
  totalSessions: number;
  pendingSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  sessionCompletionRate: number; // %
  
  // Revenue Metrics
  totalRevenue: number;
  revenueToday: number;
  averageSessionValue: number;
  revenueGrowth: number; // % compared to previous period
  
  // Client Metrics
  totalClients: number;
  newClientsToday: number;
  activeClients: number;
  repeatClientRate: number; // %
  
  // Business Metrics
  quotationsSent: number;
  quotationsAccepted: number;
  quotationConversionRate: number; // %
  abandonedSessions: number;
}

// Real-time calculation function
const calculateDashboardMetrics = async (
  consultantId: string, 
  timeframe: string
): Promise<DashboardMetrics> => {
  const dateRange = getDateRangeFromTimeframe(timeframe);
  
  const [sessions, clients, quotations] = await Promise.all([
    getSessionsInRange(consultantId, dateRange),
    getClientsInRange(consultantId, dateRange),
    getQuotationsInRange(consultantId, dateRange)
  ]);
  
  return {
    totalSessions: sessions.length,
    completedSessions: sessions.filter(s => s.status === 'completed').length,
    totalRevenue: sessions
      .filter(s => s.paymentStatus === 'paid')
      .reduce((sum, s) => sum + s.amount, 0),
    // ... other calculations
  };
};

Chart Data Preparation
interface ChartData {
  sessionsTrend: {
    date: string;
    sessions: number;
    revenue: number;
  }[];
  
  clientsGrowth: {
    month: string;
    newClients: number;
    totalClients: number;
  }[];
  
  revenueBreakdown: {
    sessionType: 'personal' | 'webinar';
    amount: number;
    percentage: number;
  }[];
}

🔐 Security Implementation Strategy
Authentication & Authorization
// JWT Token Structure
interface JWTPayload {
  sub: string; // user ID
  email: string;
  role: 'consultant' | 'admin';
  consultantSlug?: string; // for consultant users
  iat: number;
  exp: number;
}

// Middleware for route protection
const authenticateConsultant = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
    req.user = await getConsultantById(payload.sub);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

Data Security & Privacy
// Data encryption for sensitive fields
const encryptSensitiveData = {
  bankDetails: {
    accountNumber: encrypt(accountNumber),
    ifscCode: encrypt(ifscCode)
  },
  
  // PII handling
  clientData: {
    phone: hashPhone(phoneNumber),
    email: normalizeEmail(email)
  }
};

// GDPR Compliance
const gdprCompliance = {
  dataRetention: '7 years', // for financial records
  rightToDelete: async (userId) => {
    // Anonymize instead of delete (preserve business records)
    await anonymizeUserData(userId);
  },
  dataPortability: async (userId) => {
    return await exportUserData(userId);
  }
};

🚀 Deployment Architecture
Production Environment Setup
# Docker Compose Production
version: '3.8'
services:
  # Frontend Applications
  public-web:
    build: ./apps/public-web
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.nakksha.com
    
  consultant-dashboard:
    build: ./apps/consultant-dashboard
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.nakksha.com
  
  admin-dashboard:
    build: ./apps/admin-dashboard
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.nakksha.com
  
  # Backend API
  api-server:
    build: ./apps/api
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - RAZORPAY_KEY=${RAZORPAY_KEY}
    depends_on:
      - postgres
      - redis
  
  # Databases
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=nakksha_prod
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:

CI/CD Pipeline
# GitHub Actions Workflow
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run type-check
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to AWS ECS
        run: |
          aws ecs update-service \
            --cluster nakksha-prod \
            --service nakksha-api \
            --force-new-deployment

📈 Performance Optimization Strategy
Database Optimization
-- Query optimization for dashboard
CREATE MATERIALIZED VIEW consultant_dashboard_stats AS
SELECT 
  c.id as consultant_id,
  COUNT(DISTINCT s.id) as total_sessions,
  COUNT(DISTINCT cl.id) as total_clients,
  SUM(CASE WHEN s.payment_status = 'paid' THEN s.amount ELSE 0 END) as total_revenue,
  COUNT(CASE WHEN s.created_at >= CURRENT_DATE THEN 1 END) as sessions_today
FROM consultants c
LEFT JOIN sessions s ON c.id = s.consultant_id
LEFT JOIN clients cl ON c.id = cl.consultant_id
GROUP BY c.id;

-- Refresh every hour
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW consultant_dashboard_stats;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh
SELECT cron.schedule('refresh-dashboard', '0 * * * *', 'SELECT refresh_dashboard_stats();');

Caching Strategy
// Redis caching for expensive queries
const cacheManager = {
  // Dashboard metrics cache (5 minutes)
  getDashboardMetrics: async (consultantId: string) => {
    const cacheKey = `dashboard:${consultantId}`;
    let metrics = await redis.get(cacheKey);
    
    if (!metrics) {
      metrics = await calculateDashboardMetrics(consultantId);
      await redis.setex(cacheKey, 300, JSON.stringify(metrics)); // 5 min cache
    }
    
    return JSON.parse(metrics);
  },
  
  // Session list cache (30 seconds)
  getSessionsList: async (consultantId: string, filters: any) => {
    const cacheKey = `sessions:${consultantId}:${JSON.stringify(filters)}`;
    // ... similar caching logic
  }
};

🔧 Development Workflow & Project Structure
Monorepo Structure
nakksha-platform/
├── apps/
│   ├── public-web/                 # Next.js - Public website
│   ├── consultant-dashboard/       # Next.js - Consultant dashboard
│   ├── admin-dashboard/           # Next.js - Admin dashboard
│   └── api/                       # Express.js - Backend API
├── packages/
│   ├── ui/                        # Shared UI components
│   ├── types/                     # Shared TypeScript types
│   ├── database/                  # Prisma schema & migrations
│   ├── email-templates/           # Email template components
│   └── utils/                     # Shared utility functions
├── docs/                          # Documentation
├── docker/                        # Docker configurations
└── scripts/                       # Build & deployment scripts

Environment Configuration
# .env.local (Development)
DATABASE_URL="postgresql://user:pass@localhost:5432/nakksha_dev"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"

# Payment Gateway
RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxx"
RAZORPAY_KEY_SECRET="your-razorpay-secret"
RAZORPAY_WEBHOOK_SECRET="webhook-secret"

# Email Service
Resend api keys 

# File Upload
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Google Calendar API
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Microsoft Graph API
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"

# Frontend URLs
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

This comprehensive documentation covers every aspect of the Nakksha consulting platform. Each section provides detailed implementation guidance that can be used by developers to build the complete system.
Next Steps:
Review and approve this architecture
Set up the development environment
Begin with database schema implementation
Build the authentication system
Develop the core dashboard features
Integrate payment processing
Implement email automation
Add real-time features
Deploy and test



SOME interactions between me and CLAUDE Earlier
Given this is a startup, should we follow an MVP approach? I suggest this order:
1. **Phase 1**: Core authentication + basic dashboard + settings page
2. **Phase 2**: Session booking + payment integration
3. **Phase 3**: Advanced features  (analytics, quotations)
**Decision needed:** Do you agree with this phased approach, or do you want to build everything simultaneously?
yes lets do this

lets do a thing

we will not make messaging feature, store this in your memory, we will not make messaging with clients right now at all. 


**2. Database & Infrastructure Strategy**
I notice we have a very comprehensive schema. For a startup:
* **Option A**: Start with core tables only (consultants, sessions, clients) and add features incrementally
* **Option B**: Implement the full schema from day 1
**Decision needed:** Should we start minimal and expand, or implement the complete database schema immediately?

I prefer option B


**3. Authentication Architecture**
The docs show we plan both consultant and admin roles.
**Decision needed:** Should we build a unified auth system for all user types, or separate systems for consultants vs clients?


lets separate, since also store this in your memory that consultants can access dashboard once they get permission from admin
so in admin side of project we should have a way to give access to consultants view the whole dashboard, unless then, consultants can sign up, login, and all but cant see the dashboard 

**4. Payment Integration Complexity**
For MVP, should we start with:
* **Simple**: Basic Razorpay integration (pay-per-session)
* **Advanced**: Full subscription management + multiple payment methods
**Decision needed:** How complex should our initial payment system be?
lets do simple ones for now, but we might need subscription sooner or later

**5. API Architecture Pattern**
I recommend following these patterns for scalability:

```
/api/v1/auth/*          - Authentication
/api/v1/consultants/*   - Consultant management  
/api/v1/sessions/*      - Session management
/api/v1/payments/*      - Payment processing
```

yes this sounds good, help me make the project directory/project structure. 


when you code, always mention the path at top in comments, do proper documentation and think the logic before implementing it, so it doesn't break later on


read the project files, I have initiated the project, help me go further and write code, make sure you write well commented code with internal testing commands at end so if in future some issues come I can fix them, code like a cto I believe in you I know you will ultra think for whole project and all documentations we talked about and you will code the most effienct backend and services lets work and make this website properly