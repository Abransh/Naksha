# Dashboard & Profile Management Implementation Guide

## Overview

This document outlines the complete implementation of the dynamic dashboard system and consultant profile management for the Nakksha Consulting Platform. The system provides real-time analytics, metrics, insights, and comprehensive profile management for consultants.

## Recent Critical Fixes (June 27, 2025)

### 🚨 PRODUCTION FIXES: Settings Page 400 Error & Next.js Compilation Issues

**Issues Fixed:**
1. **Settings Page 400 Bad Request Error** - Profile updates failing with validation errors
2. **Next.js Params Async Error** - Consultant showcase pages failing to compile/load
3. **API Field Mapping Issues** - Missing fields in profile update responses
4. **Validation Schema Problems** - Handling of empty strings, null values, and URLs

**Technical Details:**

#### 1. API Validation Schema Fix (`apps/api/src/routes/v1/consultant.ts`)

**Problem:** The Zod validation schema was too strict with optional fields, causing 400 errors when frontend sent empty strings or null values.

**Before:**
```typescript
instagramUrl: z.string().url().optional().or(z.literal('')),
phoneNumber: z.string().regex(/^\d{6,15}$/, 'Invalid phone number').optional(),
consultancySector: z.string().max(100).optional(),
```

**After:**
```typescript
instagramUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional().transform(val => val === '' || val === null ? null : val),
phoneNumber: z.union([z.string().regex(/^\d{6,15}$/, 'Invalid phone number'), z.literal(''), z.null()]).optional().transform(val => val === '' || val === null ? null : val),
consultancySector: z.union([z.string().max(100), z.literal(''), z.null()]).optional().transform(val => val === '' || val === null ? null : val),
```

**Benefits:**
- Handles empty strings from form inputs
- Accepts null values from frontend state
- Transforms empty strings to null for database consistency
- Maintains URL validation for social media links

#### 2. Next.js Async Params Fix (`apps/consultant-dashboard/src/app/[consultantname]/page.tsx`)

**Problem:** Next.js 15+ requires params to be awaited before accessing properties, causing compilation errors.

**Before:**
```typescript
export default function ConsultantProfile({ params }: ConsultantProfileProps) {
  const { consultantname } = params; // ❌ Error: params should be awaited
  const { profile, isLoading } = useConsultantShowcase(consultantname);
}
```

**After:**
```typescript
interface ConsultantProfileProps {
  params: Promise<{ consultantname: string }>; // ✅ Params is now a Promise
}

export default function ConsultantProfile({ params }: ConsultantProfileProps) {
  const [consultantSlug, setConsultantSlug] = useState<string | null>(null);
  
  // Resolve params asynchronously
  useEffect(() => {
    params.then((resolvedParams) => {
      setConsultantSlug(resolvedParams.consultantname);
    });
  }, [params]);

  const { profile, isLoading } = useConsultantShowcase(consultantSlug);
  
  // Handle loading state while slug is being resolved
  if (!consultantSlug || isLoading) {
    return <LoadingComponent />;
  }
}
```

**Benefits:**
- Complies with Next.js 15+ async params requirement
- Maintains client-side component functionality
- Proper loading state management
- Compatible with React hooks

#### 3. API Response Enhancement

**Problem:** Profile update endpoint was missing banking and other important fields in the response.

**Added Missing Fields:**
```typescript
select: {
  // ... existing fields
  bankName: true,
  accountNumber: true,
  ifscCode: true,
  isActive: true,
  isEmailVerified: true,
  subscriptionPlan: true,
  subscriptionExpiresAt: true,
  createdAt: true,
  // ... other fields
}
```

**Enhanced Response Format:**
```typescript
res.json({
  message: 'Profile updated successfully',
  data: {
    consultant: {
      ...updatedConsultant,
      personalSessionPrice: updatedConsultant.personalSessionPrice ? Number(updatedConsultant.personalSessionPrice) : null,
      webinarSessionPrice: updatedConsultant.webinarSessionPrice ? Number(updatedConsultant.webinarSessionPrice) : null,
      stats: {
        totalSessions: 0,
        totalClients: 0,
        totalQuotations: 0
      },
      isProfileComplete: !!(/* completion logic */)
    }
  }
});
```

## Previous Major Updates (June 26, 2025)

### ✅ Dynamic Consultant Profile System Implemented

**Problem Solved:**
- Previously static settings page with hardcoded form data
- Static consultant showcase page with placeholder content
- No database integration for profile management

**Comprehensive Implementation:**

1. **Backend API Integration** - Leveraged existing robust API endpoints:
   - `GET/PUT /api/v1/consultant/profile` - Profile management
   - `GET /api/v1/consultant/:slug` - Public profile data
   - `POST /api/v1/consultant/upload-photo` - Photo upload
   - `GET /api/v1/consultant/slug-check/:slug` - Slug validation

2. **Frontend Hooks System** (`apps/consultant-dashboard/src/hooks/`):
   - **`useConsultantProfile.ts`** - Profile CRUD operations
   - **`usePublicProfile.ts`** - Public showcase data
   - **`useSettingsForm.ts`** - Form state management
   - **`useProfileCompletion.ts`** - Completion tracking

3. **Dynamic Settings Page** (`apps/consultant-dashboard/src/app/dashboard/settings/page.tsx`):
   - Real-time profile data loading
   - Form validation and error handling
   - Profile completion tracking (with percentage)
   - Photo upload functionality
   - Live save/unsaved changes detection

4. **Dynamic Consultant Showcase** (`apps/consultant-dashboard/src/app/[consultantname]/page.tsx`):
   - URL-based consultant profile lookup
   - Dynamic service pricing and descriptions
   - Real testimonials and ratings integration
   - Social media links integration
   - Availability slots display

**Key Features Added:**
- **Profile Completion Tracking**: Visual progress indicators
- **Real-time Form Management**: Auto-save capabilities and change detection
- **Photo Upload**: Cloudinary integration with image optimization
- **Error Handling**: Toast notifications and graceful error states
- **Loading States**: Skeleton screens and progressive loading
- **URL Slug Management**: Custom consultant page URLs
- **Social Media Integration**: Dynamic social links display

## Architecture

### Backend API Structure

#### Dashboard Controller (`apps/api/src/controllers/dashboard.controller.ts`)

**Key Endpoints:**
- `GET /api/v1/dashboard/overview` - Comprehensive dashboard data
- `GET /api/v1/dashboard/stats` - Additional statistics

**Data Sources:**
- `PaymentTransaction` - Revenue and payment analytics
- `Session` - Session metrics and completion rates
- `Client` - Client growth and engagement data
- `Quotation` - Quote conversion analytics
- `Consultant` - Service configuration data

### Frontend Implementation

#### Dashboard Hook (`apps/consultant-dashboard/src/hooks/useDashboard.ts`)

**Features:**
- Real-time data fetching with auto-refresh (60s interval)
- Error handling and loading states
- Parallel API requests for optimal performance
- Data caching and state management

#### Dashboard Page (`apps/consultant-dashboard/src/app/dashboard/page.tsx`)

**Components:**
- Revenue metrics with change indicators
- Client analytics and quotation tracking
- Session statistics and completion rates
- Service overview and activity metrics
- Revenue split visualization
- Recent sessions list with status indicators
- Weekly session chart with visual data representation

## Data Flow

### 1. Authentication Flow Updates

**Login Redirect Logic:**
- New users (incomplete profile) → `/dashboard/settings`
- Existing users → `/dashboard`

**Signup Flow:**
- User registers → Email verification required
- Email verified → Login → Profile completion check → Appropriate redirect

### 2. Dashboard Data Pipeline

```
Frontend Hook → API Call → Database Queries → Data Processing → Response → UI Update
      ↓              ↓              ↓              ↓              ↓         ↓
  useDashboard  → dashboard/   → Prisma ORM   → Calculations → JSON    → React 
                  overview                                               Components
```

### 3. Real-time Updates

- Auto-refresh every 60 seconds
- Manual refresh capability
- Error retry mechanism
- Loading state management

## Database Schema Integration

### Key Models Used

**PaymentTransaction:**
- Revenue calculations
- Payment method analytics
- Transaction success rates

**Session:**
- Total, pending, completed counts
- Abandonment rate calculations
- Weekly trend data

**Client:**
- Client growth metrics
- Retention analytics
- Geographic distribution

**Quotation:**
- Conversion rates
- Pipeline analytics
- Business development metrics

### Query Optimizations

1. **Parallel Execution:** Multiple queries run simultaneously for better performance
2. **Date Range Filtering:** Efficient time-based data aggregation
3. **Selective Field Queries:** Only fetching required data fields
4. **Indexed Lookups:** Utilizing database indexes for consultant-specific data

## Performance Considerations

### Backend Optimizations

1. **Caching Strategy:**
   - Redis caching for frequently accessed data
   - Cache TTL: 5-10 minutes for dashboard metrics
   - Cache invalidation on data updates

2. **Database Efficiency:**
   - Aggregate queries for metrics calculation
   - Parallel query execution
   - Proper indexing on consultant_id and date fields

3. **Response Optimization:**
   - Minimal data transfer
   - Pre-calculated percentages and changes
   - Structured response format

### Frontend Optimizations

1. **State Management:**
   - React hooks for clean state handling
   - Automatic refresh with configurable intervals
   - Error boundary implementation

2. **UI Performance:**
   - Loading states for better UX
   - Progressive data loading
   - Efficient re-renders with React optimization

## API Documentation

### Dashboard Overview Endpoint

```typescript
GET /api/v1/dashboard/overview

Response:
{
  message: "Dashboard overview retrieved successfully",
  data: {
    revenue: {
      amount: number,
      change: number,
      withdrawn: number
    },
    clients: {
      total: number,
      change: number,
      quotationsShared: number,
      quotationChange: number
    },
    sessions: {
      all: number,
      pending: number,
      completed: number,
      change: number,
      abandonedPercentage: number
    },
    services: {
      all: number,
      active: number,
      change: number
    },
    revenueSplit: {
      fromNaksha: number,
      manuallyAdded: number,
      total: number
    },
    recentSessions: Session[],
    chartData: ChartDataPoint[],
    metrics: SummaryMetrics
  }
}
```

### Dashboard Stats Endpoint

```typescript
GET /api/v1/dashboard/stats

Response:
{
  message: "Dashboard statistics retrieved successfully",
  data: {
    monthlyRevenue: MonthlyRevenueData[],
    sessionsByType: SessionTypeBreakdown[],
    paymentMethods: PaymentMethodData[],
    topClients: ClientRankingData[]
  }
}
```

## Security Implementation

### Authentication Requirements

- All dashboard endpoints require consultant authentication
- Admin approval required for dashboard access
- JWT token validation on every request
- Session-based access control

### Data Isolation

- Consultant-specific data filtering
- No cross-consultant data access
- Proper authorization checks
- Audit logging for data access

## Error Handling

### Backend Error Management

1. **Database Errors:** Graceful fallback with partial data
2. **Authentication Errors:** Clear error messages and codes
3. **Validation Errors:** Detailed field-level feedback
4. **Server Errors:** Comprehensive logging and monitoring

### Frontend Error Handling

1. **Network Errors:** Retry mechanism with exponential backoff
2. **Data Errors:** Fallback to cached data when available
3. **UI Errors:** User-friendly error messages
4. **Loading States:** Progressive loading indicators

## Testing Strategy

### Backend Testing

1. **Unit Tests:** Individual function testing
2. **Integration Tests:** API endpoint testing
3. **Performance Tests:** Query execution time validation
4. **Security Tests:** Authentication and authorization validation

### Frontend Testing

1. **Component Tests:** React component functionality
2. **Hook Tests:** Custom hook behavior validation
3. **Integration Tests:** End-to-end user flows
4. **Performance Tests:** Rendering and data loading optimization

## Deployment Considerations

### Production Setup

1. **Environment Configuration:**
   - Database connection pooling
   - Redis cache configuration
   - API rate limiting
   - CORS and security headers

2. **Monitoring:**
   - API response time tracking
   - Error rate monitoring
   - Database query performance
   - User engagement analytics

3. **Scaling:**
   - Horizontal API scaling capability
   - Database read replicas for analytics
   - CDN for static assets
   - Load balancing configuration

## Future Enhancements

### Phase 2 Features

1. **Advanced Analytics:**
   - Custom date range selection
   - Comparative period analysis
   - Export functionality
   - Detailed drill-down capabilities

2. **Real-time Features:**
   - WebSocket integration for live updates
   - Push notifications for important events
   - Real-time session tracking
   - Live chat integration

3. **Business Intelligence:**
   - Predictive analytics
   - Revenue forecasting
   - Client behavior analysis
   - Market trend insights

### Technical Improvements

1. **Performance:**
   - GraphQL implementation for flexible data fetching
   - Advanced caching strategies
   - Database query optimization
   - Frontend bundle optimization

2. **User Experience:**
   - Dashboard customization
   - Mobile-responsive design
   - Accessibility improvements
   - Keyboard navigation support

## Troubleshooting Guide

### Common Issues

1. **Data Not Loading:**
   - Check API connectivity
   - Verify authentication tokens
   - Review browser console for errors
   - Validate database connections

2. **Performance Issues:**
   - Monitor database query execution time
   - Check Redis cache hit rates
   - Review API response times
   - Analyze frontend rendering performance

3. **Authentication Problems:**
   - Verify JWT token validity
   - Check consultant approval status
   - Review session management
   - Validate CORS configuration

### Debug Commands

```bash
# Check API health
curl http://localhost:8000/health

# Test dashboard endpoint
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/dashboard/overview

# Monitor database queries
npm run db:studio

# Check API logs
docker logs nakksha-api

# Frontend development server
npm run dev
```

## Conclusion

The dashboard implementation provides a comprehensive, real-time analytics solution for consultants on the Nakksha platform. The architecture is designed for scalability, performance, and maintainability, with proper separation of concerns and robust error handling throughout the system.

The implementation follows modern best practices and provides a solid foundation for future enhancements and scaling requirements.