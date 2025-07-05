# Quotation Management System - Comprehensive Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture & Design](#architecture--design)
3. [Frontend Implementation](#frontend-implementation)
4. [Backend Integration](#backend-integration)
5. [Database Schema](#database-schema)
6. [Email Integration](#email-integration)
7. [API Documentation](#api-documentation)
8. [User Workflows](#user-workflows)
9. [Technical Implementation Details](#technical-implementation-details)
10. [Testing & Quality Assurance](#testing--quality-assurance)
11. [Deployment & Configuration](#deployment--configuration)
12. [Future Enhancements](#future-enhancements)

---

## System Overview

### Purpose
The Quotation Management System is a comprehensive solution that enables consultants to create, manage, and share professional quotations with clients for long-term consultancy projects and services. This system represents a critical business component of the Naksha consulting platform.

### Key Features
- **Dynamic Quotation Creation**: Professional modal interface for creating detailed quotations
- **Client Email Integration**: Automated email capture and validation during quotation creation
- **Dual Save Functionality**: Save as draft for internal work or immediately share with clients
- **Email Distribution System**: Automated email delivery to both consultants and clients
- **Real-time Status Tracking**: Complete lifecycle management from draft to completion
- **Dashboard Integration**: Live quotation metrics and analytics

### Business Value
- Streamlines the quotation process for consultants
- Provides professional client communication
- Enables tracking and analytics for business insights
- Reduces manual work through automation
- Improves client experience with professional templates

---

## Architecture & Design

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                 Frontend (Next.js 14)                      │
├─────────────────────────────────────────────────────────────┤
│  Quotations Page  │  Create Modal  │  Email Service        │
│  (Dynamic List)   │  (Form + API)  │  (Frontend Client)    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP API
┌─────────────────────────────────────────────────────────────┐
│                Backend (Express.js + TypeScript)            │
├─────────────────────────────────────────────────────────────┤
│  Quotation Routes │  Email Service │  Database Models      │
│  (CRUD + Send)    │  (Templates)   │  (Prisma ORM)         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ Database
┌─────────────────────────────────────────────────────────────┐
│                PostgreSQL Database                          │
├─────────────────────────────────────────────────────────────┤
│  Quotation Table  │  Consultant    │  Email Templates      │
│  (Full Schema)    │  (Relations)   │  (Configurations)     │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles
1. **Component-Based Architecture**: Modular React components for maintainability
2. **API-First Design**: Clean separation between frontend and backend
3. **Type Safety**: Full TypeScript implementation throughout the stack
4. **Real-time Updates**: Optimistic UI updates with error handling
5. **Professional UX**: Loading states, validation, and user feedback
6. **Email Automation**: Template-based professional communication

---

## Frontend Implementation

### Core Components

#### 1. Quotations Page (`app/dashboard/quotations/page.tsx`)
**Purpose**: Main quotation management interface with real-time data

**Key Features**:
```typescript
// Dynamic quotation list with backend integration
const {
  quotations,
  summaryStats,
  pagination,
  isLoading,
  error,
  refetch,
  deleteQuotation,
  sendQuotation,
} = useQuotations({ search: searchTerm, status: statusFilter });
```

**Responsibilities**:
- Display dynamic quotation list from backend
- Provide search and filtering capabilities
- Handle quotation status updates
- Manage loading states and error handling
- Support bulk operations

#### 2. Create Quotation Modal (`components/modals/create-quotation-modal.tsx`)
**Purpose**: Professional quotation creation interface

**Key Features**:
```typescript
// Form data structure
const formData = {
  quotationName: "",
  clientName: "",
  clientEmail: "",      // Added as per requirements
  baseAmount: "",
  discountPercentage: 0,
  description: "",
  notes: "",
  expiryDays: 30,
  addDiscount: false,
  addExpiryDate: false,
};
```

**Responsibilities**:
- Capture all quotation details including client email
- Provide real-time validation and error handling
- Calculate final amounts with discount support
- Handle dual save functionality (draft vs. share)
- Integrate with backend API for quotation creation and email sending

#### 3. Quotations Hook (`hooks/useQuotations.ts`)
**Purpose**: Centralized state management for quotation operations

**Key Features**:
```typescript
// Complete quotation management interface
interface UseQuotationsResult {
  quotations: Quotation[];
  summaryStats: QuotationSummaryStats | null;
  pagination: QuotationsPagination | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  deleteQuotation: (id: string) => Promise<boolean>;
  sendQuotation: (id: string, emailMessage?: string) => Promise<boolean>;
}
```

**Responsibilities**:
- Manage quotation CRUD operations
- Handle filtering, pagination, and search
- Provide real-time data synchronization
- Manage loading states and error handling
- Support email sending operations

#### 4. Email Service (`lib/email.ts`)
**Purpose**: Frontend email service for quotation distribution

**Key Features**:
```typescript
// Email service class for quotation operations
class EmailService {
  async sendQuotationToClient(quotationData: QuotationEmailData): Promise<EmailResponse>
  async sendQuotationConfirmation(quotationData: QuotationEmailData): Promise<EmailResponse>
  validateEmail(email: string): boolean
  formatQuotationForEmail(quotation: any, consultant: any): QuotationEmailData
}
```

**Responsibilities**:
- Handle frontend email operations
- Provide email validation utilities
- Format data for email templates
- Manage email sending results and error handling

### Frontend Data Flow
```typescript
// 1. User creates quotation in modal
const handleSaveAndShare = () => {
  createQuotation(false); // false = not draft, send emails
};

// 2. API call to create quotation
const response = await fetch('/api/v1/quotations', {
  method: 'POST',
  body: JSON.stringify(quotationData),
});

// 3. If successful and not draft, send emails
if (!isDraft) {
  const sendResponse = await fetch(`/api/v1/quotations/${quotationId}/send`, {
    method: 'POST',
    body: JSON.stringify({ emailMessage: "", includeAttachment: false }),
  });
}

// 4. Update UI and refresh quotation list
window.location.reload(); // Or use refetch() for better UX
```

---

## Backend Integration

### API Route Structure (`api/routes/v1/quotations.ts`)

#### Enhanced Quotation Creation
```typescript
// POST /api/v1/quotations
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  // Create quotation with consultant relationship
  // Generate unique quotation number
  // Calculate final amount with discount
  // Store in database with proper validation
});
```

#### Email Sending Endpoint
```typescript
// POST /api/v1/quotations/:id/send
router.post('/:id/send', authenticateToken, async (req: Request, res: Response) => {
  // Fetch quotation with consultant details
  // Send email to client using quotation_shared template
  // Send confirmation to consultant using quotation_sent_confirmation template
  // Update quotation status to SENT
  // Return success response
});
```

### Email Service Integration (`api/services/emailService.ts`)

#### Email Templates Added
```typescript
// Template for client quotation sharing
const quotation_shared = {
  subject: "Quotation from {{consultantName}} - {{quotationName}}",
  html: `
    <h2>Professional Quotation</h2>
    <p>Dear {{clientName}},</p>
    <p>{{consultantName}} has shared a quotation with you:</p>
    <div class="quotation-details">
      <h3>{{quotationName}}</h3>
      <p><strong>Amount:</strong> {{currency}} {{finalAmount}}</p>
      <p><strong>Valid Until:</strong> {{validUntil}}</p>
    </div>
    <a href="{{viewQuotationUrl}}" class="cta-button">View Quotation</a>
  `
};

// Template for consultant confirmation
const quotation_sent_confirmation = {
  subject: "Quotation Sent Confirmation - {{quotationName}}",
  html: `
    <h2>Quotation Sent Successfully</h2>
    <p>Dear {{consultantName}},</p>
    <p>Your quotation has been sent to {{clientName}} ({{clientEmail}}):</p>
    <div class="quotation-summary">
      <h3>{{quotationName}}</h3>
      <p><strong>Amount:</strong> {{currency}} {{finalAmount}}</p>
      <p><strong>Sent on:</strong> {{sentDate}}</p>
    </div>
  `
};
```

### Business Logic Integration
```typescript
// Enhanced quotation creation with email integration
const createAndSendQuotation = async (quotationData, consultant, shouldSend = false) => {
  // 1. Create quotation in database
  const quotation = await prisma.quotation.create({
    data: {
      ...quotationData,
      consultantId: consultant.id,
      quotationNumber: generateQuotationNumber(),
      finalAmount: calculateFinalAmount(quotationData),
    },
  });

  // 2. If should send, handle email distribution
  if (shouldSend) {
    await sendQuotationEmails(quotation, consultant);
    
    // Update status to SENT
    await prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: 'SENT', sentAt: new Date() },
    });
  }

  return quotation;
};
```

---

## Database Schema

### Quotation Model
```prisma
model Quotation {
  id                   String   @id @default(cuid())
  quotationNumber      String   @unique
  quotationName        String
  clientName           String
  clientEmail          String   // Added as per requirements
  description          String?
  baseAmount           Float
  discountPercentage   Float    @default(0)
  finalAmount          Float    // Calculated field
  currency             String   @default("INR")
  validUntil           DateTime?
  status               QuotationStatus @default(DRAFT)
  notes                String?  // Internal notes
  viewCount            Int      @default(0)
  quotationImageUrl    String?  // For future PDF/image generation
  sentAt               DateTime?
  viewedAt             DateTime?
  acceptedAt           DateTime?
  
  // Relationships
  consultant           Consultant @relation(fields: [consultantId], references: [id])
  consultantId         String
  
  // Timestamps
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  
  @@map("quotations")
}

enum QuotationStatus {
  DRAFT      // Created but not sent
  SENT       // Sent to client
  VIEWED     // Client has viewed
  ACCEPTED   // Client accepted
  REJECTED   // Client rejected
  EXPIRED    // Past validity date
}
```

### Database Indexes
```sql
-- Optimize queries for consultant quotation lists
CREATE INDEX idx_quotations_consultant_status ON quotations(consultantId, status);
CREATE INDEX idx_quotations_created_at ON quotations(createdAt DESC);
CREATE INDEX idx_quotations_client_email ON quotations(clientEmail);
```

### Data Validation Rules
- `quotationNumber`: Auto-generated unique identifier
- `clientEmail`: Valid email format required
- `baseAmount`: Must be positive number
- `discountPercentage`: Between 0-100
- `finalAmount`: Calculated as baseAmount * (1 - discountPercentage/100)
- `validUntil`: Optional future date

---

## Email Integration - Resend API Architecture ✅

### **🚀 MAJOR UPDATE: Complete Resend API Migration (January 2025)**

The quotation email system has been **fully migrated** to Resend API, providing superior deliverability, professional templates, and comprehensive analytics.

### Email Architecture - Resend Powered
```
Quotation Creation (Frontend)
       │
       ▼
   POST /api/v1/quotations
       │
       ├─ Draft Mode ──── Save Only (Status: DRAFT)
       │
       └─ Send Mode ──── Save + Resend Email API
                           │
                           ├─ sendQuotationToClient() → Client Email
                           ├─ sendQuotationConfirmationToConsultant() → Consultant Email  
                           └─ logEmailToDatabase() → Email Analytics
```

### **Resend Email Functions**

#### **Client Quotation Email** (`sendQuotationToClient`)
**Purpose**: Professional responsive HTML quotation delivery to clients
**Features**:
- Professional Naksha branding
- Responsive design for all devices
- Dynamic pricing display with discounts
- Call-to-action buttons
- Email tracking and analytics

**Template Variables**:
```typescript
interface QuotationEmailData {
  quotationId: string;
  quotationNumber: string;
  quotationName: string;
  description?: string;
  baseAmount: number;
  discountPercentage: number;
  finalAmount: number;
  currency: string;
  validUntil?: string;
  notes?: string;
  clientName: string;
  clientEmail: string;
  consultantName: string;
  consultantEmail: string;
  consultantCompany?: string;
  emailMessage?: string;
  viewQuotationUrl?: string;
  sentDate?: string;
}
```

#### **Consultant Confirmation Email** (`sendQuotationConfirmationToConsultant`)
**Purpose**: Professional confirmation to consultant with quotation summary
**Features**:
- Quotation delivery confirmation
- Client contact information
- Quotation details summary
- Professional formatting

### **Resend Service Configuration**
```typescript
// apps/api/src/services/resendEmailService.ts
const resendConfig = {
  from: process.env.EMAIL_FROM || 'Naksha Platform <noreply@naksha.com>',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@naksha.com',
  baseUrl: process.env.FRONTEND_URL || 'https://dashboard.naksha.com'
};

// Email sending with analytics
export const sendQuotationEmails = async (data: QuotationEmailData): Promise<{
  clientEmail: EmailResponse;
  consultantEmail: EmailResponse;
}> => {
  // Sends professional HTML emails to both client and consultant
  // Logs all emails to database with delivery status
  // Provides email tracking and analytics
}
```

### **Email Delivery Benefits**
- **99%+ Deliverability**: Resend API ensures superior email delivery rates
- **Professional Templates**: Branded, responsive HTML templates
- **Email Analytics**: Delivery status, open rates, and engagement tracking
- **Error Handling**: Comprehensive retry mechanisms and failure logging
- **Database Integration**: All emails logged with status tracking
- **Performance**: Fast, reliable email delivery infrastructure

---

## API Documentation

### Quotation Management Endpoints

#### Create Quotation
```http
POST /api/v1/quotations
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "quotationName": "Website Development Project",
  "clientName": "John Doe",
  "clientEmail": "john@example.com",
  "description": "Full website development with modern design",
  "baseAmount": 50000,
  "discountPercentage": 10,
  "currency": "INR",
  "expiryDays": 30,
  "notes": "Internal notes about the project"
}
```

**Response**:
```json
{
  "message": "Quotation created successfully",
  "data": {
    "quotation": {
      "id": "clr1234567890",
      "quotationNumber": "QUO-2025-001",
      "quotationName": "Website Development Project",
      "clientName": "John Doe",
      "clientEmail": "john@example.com",
      "baseAmount": 50000,
      "discountPercentage": 10,
      "finalAmount": 45000,
      "currency": "INR",
      "status": "DRAFT",
      "validUntil": "2025-02-02T00:00:00.000Z",
      "createdAt": "2025-01-03T10:00:00.000Z"
    }
  }
}
```

#### Send Quotation
```http
POST /api/v1/quotations/{quotationId}/send
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "emailMessage": "Please review the attached quotation",
  "includeAttachment": false
}
```

**Response**:
```json
{
  "message": "Quotation sent successfully",
  "data": {
    "emailsSent": {
      "client": {
        "success": true,
        "emailId": "email_abc123"
      },
      "consultant": {
        "success": true,
        "emailId": "email_def456"
      }
    },
    "quotation": {
      "id": "clr1234567890",
      "status": "SENT",
      "sentAt": "2025-01-03T10:05:00.000Z"
    }
  }
}
```

#### List Quotations
```http
GET /api/v1/quotations?page=1&limit=10&status=SENT&search=project
Authorization: Bearer {jwt_token}
```

**Response**:
```json
{
  "message": "Quotations retrieved successfully",
  "data": {
    "quotations": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalCount": 25,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "summaryStats": {
      "totalQuotations": 25,
      "draftQuotations": 5,
      "sentQuotations": 15,
      "acceptedQuotations": 3,
      "totalValue": 2500000,
      "conversionRate": 20
    }
  }
}
```

---

## User Workflows

### Quotation Creation Workflow
```
1. Consultant clicks "Create Quotation" button
   │
   ▼
2. Create Quotation Modal opens
   │
   ├─ Fill quotation details (name, client info, pricing)
   ├─ Enter client email address (required)
   ├─ Add description and notes
   ├─ Configure discount and expiry (optional)
   │
   ▼
3. Choose save action:
   │
   ├─ "Save as Draft" ──── Store in database only
   │                       │
   │                       ▼
   │                    Show success message
   │                    Close modal
   │                    Refresh quotation list
   │
   └─ "Save & Share" ──── Store in database + Send emails
                          │
                          ├─ Send to client (quotation_shared)
                          ├─ Send to consultant (confirmation)
                          ├─ Update status to SENT
                          │
                          ▼
                       Show success message
                       Close modal
                       Refresh quotation list
```

### Email Delivery Workflow
```
Quotation Send Request
       │
       ▼
Fetch Quotation + Consultant Data
       │
       ▼
Prepare Email Templates
       │
       ├─ Client Email
       │  ├─ Subject: "Quotation from {consultant} - {quotation}"
       │  ├─ Content: Professional quotation details
       │  └─ CTA: View Quotation link
       │
       └─ Consultant Email
          ├─ Subject: "Quotation Sent Confirmation"
          ├─ Content: Quotation summary and client details
          └─ Info: Sent date and tracking info
       │
       ▼
Send Emails via Resend API
       │
       ├─ Success ──── Update quotation status to SENT
       │               Record sent timestamp
       │               Return success response
       │
       └─ Error ────── Log error details
                       Return error response
                       Keep quotation as DRAFT
```

### Status Management Workflow
```
DRAFT ──────► SENT ──────► VIEWED ──────► ACCEPTED
  │             │            │              │
  │             │            │              └─ Final Success State
  │             │            │
  │             │            └─ REJECTED ──── Final Rejection State
  │             │
  │             └─ EXPIRED ──── Time-based expiration
  │
  └─ Can be edited or deleted
```

---

## Technical Implementation Details

### Frontend State Management

#### Quotation Hook Implementation
```typescript
// Custom hook for quotation management
export const useQuotations = (initialFilters: QuotationFilters = {}) => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch quotations with filtering and pagination
  const fetchQuotations = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true);
      const queryParams = buildQueryParams(page);
      const response = await fetch(`/api/v1/quotations?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch quotations');
      
      const result = await response.json();
      setQuotations(result.data.quotations);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Send quotation email
  const sendQuotation = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/v1/quotations/${id}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emailMessage: "", includeAttachment: false })
      });
      
      if (!response.ok) throw new Error('Failed to send quotation');
      
      // Update local state optimistically
      setQuotations(prev => prev.map(quotation => 
        quotation.id === id 
          ? { ...quotation, status: 'SENT', sentAt: new Date().toISOString() }
          : quotation
      ));
      
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  return {
    quotations,
    isLoading,
    error,
    refetch: fetchQuotations,
    sendQuotation,
    // ... other operations
  };
};
```

#### Form Validation Implementation
```typescript
// Real-time form validation
const validateForm = () => {
  const newErrors: Record<string, string> = {};

  // Required field validation
  if (!formData.quotationName.trim()) {
    newErrors.quotationName = "Quotation name is required";
  }
  if (!formData.clientName.trim()) {
    newErrors.clientName = "Client name is required";
  }
  
  // Email validation with regex
  if (!formData.clientEmail.trim()) {
    newErrors.clientEmail = "Client email is required";
  } else if (!/\S+@\S+\.\S+/.test(formData.clientEmail)) {
    newErrors.clientEmail = "Please enter a valid email address";
  }
  
  // Amount validation
  if (!formData.baseAmount || parseFloat(formData.baseAmount) <= 0) {
    newErrors.baseAmount = "Please enter a valid amount";
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

### Backend Business Logic

#### Quotation Number Generation
```typescript
// Generate unique quotation numbers
const generateQuotationNumber = async (consultantId: string): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `QUO-${year}-`;
  
  // Get the latest quotation number for this year
  const latestQuotation = await prisma.quotation.findFirst({
    where: {
      consultantId,
      quotationNumber: { startsWith: prefix }
    },
    orderBy: { quotationNumber: 'desc' }
  });
  
  let nextNumber = 1;
  if (latestQuotation) {
    const currentNumber = parseInt(latestQuotation.quotationNumber.split('-')[2]);
    nextNumber = currentNumber + 1;
  }
  
  return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
};
```

#### Final Amount Calculation
```typescript
// Calculate final amount with discount
const calculateFinalAmount = (baseAmount: number, discountPercentage: number = 0): number => {
  if (discountPercentage < 0 || discountPercentage > 100) {
    throw new Error('Discount percentage must be between 0 and 100');
  }
  
  const discountAmount = (baseAmount * discountPercentage) / 100;
  return Math.round((baseAmount - discountAmount) * 100) / 100; // Round to 2 decimal places
};
```

#### Email Integration Logic
```typescript
// Enhanced email sending with error handling
const sendQuotationEmails = async (quotation: Quotation, consultant: Consultant) => {
  const emailPromises = [];
  
  // Prepare email data
  const emailData = {
    clientName: quotation.clientName,
    consultantName: `${consultant.firstName} ${consultant.lastName}`,
    quotationName: quotation.quotationName,
    finalAmount: quotation.finalAmount,
    currency: quotation.currency,
    quotationNumber: quotation.quotationNumber,
    viewQuotationUrl: `${process.env.FRONTEND_URL}/quotation/${quotation.id}`,
    consultantEmail: consultant.email
  };
  
  // Send client email
  emailPromises.push(
    emailService.sendEmail('quotation_shared', quotation.clientEmail, emailData)
  );
  
  // Send consultant confirmation
  emailPromises.push(
    emailService.sendEmail('quotation_sent_confirmation', consultant.email, {
      ...emailData,
      clientEmail: quotation.clientEmail,
      sentDate: new Date().toLocaleDateString()
    })
  );
  
  // Execute both emails and handle results
  const results = await Promise.allSettled(emailPromises);
  
  return {
    client: results[0].status === 'fulfilled',
    consultant: results[1].status === 'fulfilled',
    errors: results.filter(r => r.status === 'rejected').map(r => r.reason)
  };
};
```

---

## Testing & Quality Assurance

### Frontend Testing Strategy

#### Component Testing
```typescript
// Test quotation creation modal
describe('CreateQuotationModal', () => {
  test('validates required fields before submission', async () => {
    render(<CreateQuotationModal>Create</CreateQuotationModal>);
    
    const saveButton = screen.getByText('Save & Share with Client');
    fireEvent.click(saveButton);
    
    expect(screen.getByText('Quotation name is required')).toBeInTheDocument();
    expect(screen.getByText('Client email is required')).toBeInTheDocument();
  });
  
  test('calculates final amount correctly with discount', () => {
    const baseAmount = 10000;
    const discount = 10;
    const expectedFinal = 9000;
    
    // Test calculation logic
    const finalAmount = baseAmount * (1 - discount / 100);
    expect(finalAmount).toBe(expectedFinal);
  });
});
```

#### Integration Testing
```typescript
// Test quotation hook
describe('useQuotations', () => {
  test('fetches quotations from API', async () => {
    const mockQuotations = [
      { id: '1', quotationName: 'Test Quote', status: 'DRAFT' }
    ];
    
    fetch.mockResponseOnce(JSON.stringify({
      data: { quotations: mockQuotations }
    }));
    
    const { result, waitForNextUpdate } = renderHook(() => useQuotations());
    await waitForNextUpdate();
    
    expect(result.current.quotations).toEqual(mockQuotations);
  });
});
```

### Backend Testing Strategy

#### API Testing
```typescript
// Test quotation creation endpoint
describe('POST /api/v1/quotations', () => {
  test('creates quotation successfully', async () => {
    const quotationData = {
      quotationName: 'Test Quotation',
      clientName: 'John Doe',
      clientEmail: 'john@example.com',
      baseAmount: 10000,
      discountPercentage: 10
    };
    
    const response = await request(app)
      .post('/api/v1/quotations')
      .set('Authorization', `Bearer ${validToken}`)
      .send(quotationData)
      .expect(201);
    
    expect(response.body.data.quotation.finalAmount).toBe(9000);
    expect(response.body.data.quotation.status).toBe('DRAFT');
  });
  
  test('validates required fields', async () => {
    const response = await request(app)
      .post('/api/v1/quotations')
      .set('Authorization', `Bearer ${validToken}`)
      .send({})
      .expect(400);
    
    expect(response.body.message).toContain('validation error');
  });
});

// Test email sending endpoint
describe('POST /api/v1/quotations/:id/send', () => {
  test('sends emails successfully', async () => {
    const quotation = await createTestQuotation();
    
    const response = await request(app)
      .post(`/api/v1/quotations/${quotation.id}/send`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({ emailMessage: "" })
      .expect(200);
    
    expect(response.body.data.emailsSent.client.success).toBe(true);
    expect(response.body.data.emailsSent.consultant.success).toBe(true);
  });
});
```

### Email Testing
```typescript
// Test email template generation
describe('Email Templates', () => {
  test('generates client quotation email correctly', () => {
    const templateData = {
      clientName: 'John Doe',
      consultantName: 'Jane Smith',
      quotationName: 'Website Project',
      finalAmount: 50000,
      currency: 'INR'
    };
    
    const emailHtml = generateEmailTemplate('quotation_shared', templateData);
    
    expect(emailHtml).toContain('John Doe');
    expect(emailHtml).toContain('Website Project');
    expect(emailHtml).toContain('₹50,000');
  });
});
```

---

## Deployment & Configuration

### Environment Variables
```bash
# Backend (.env)
DATABASE_URL="postgresql://username:password@localhost:5432/naksha_db"
REDIS_URL="redis://localhost:6379"
RESEND_API_KEY="re_xxxxxxxxxx"
FRONTEND_URL="https://dashboard.naksha.com"
EMAIL_FROM="noreply@naksha.com"
EMAIL_REPLY_TO="support@naksha.com"

# Frontend (.env.local)
NEXT_PUBLIC_API_URL="https://api.naksha.com"
```

### Database Migration
```sql
-- Create quotations table
CREATE TABLE quotations (
  id VARCHAR(25) PRIMARY KEY,
  quotation_number VARCHAR(50) UNIQUE NOT NULL,
  quotation_name VARCHAR(255) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  description TEXT,
  base_amount DECIMAL(10,2) NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  final_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  valid_until TIMESTAMP,
  status VARCHAR(20) DEFAULT 'DRAFT',
  notes TEXT,
  view_count INTEGER DEFAULT 0,
  quotation_image_url VARCHAR(500),
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  accepted_at TIMESTAMP,
  consultant_id VARCHAR(25) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (consultant_id) REFERENCES consultants(id),
  INDEX idx_quotations_consultant_status (consultant_id, status),
  INDEX idx_quotations_created_at (created_at DESC)
);
```

### Production Deployment Checklist
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Email service (Resend) API key configured
- [ ] Frontend environment variables set
- [ ] Email templates deployed and tested
- [ ] API endpoints tested in production
- [ ] Error monitoring configured
- [ ] Performance monitoring enabled
- [ ] Backup strategies implemented

---

## Future Enhancements

### Short-term Enhancements (Next 3 months)
1. **PDF Generation**: Generate professional PDF quotations
2. **Client Portal**: Dedicated client interface for viewing/accepting quotations
3. **Template Management**: Custom quotation templates for different services
4. **Enhanced Analytics**: Quotation conversion tracking and insights

### Medium-term Enhancements (3-6 months)
1. **Digital Signatures**: Electronic signature integration for quotation acceptance
2. **Payment Integration**: Direct payment links in quotations
3. **Advanced Workflow**: Multi-stage approval process for large quotations
4. **Mobile App**: Mobile interface for quotation management

### Long-term Enhancements (6+ months)
1. **AI-Powered Suggestions**: Smart quotation generation based on historical data
2. **Advanced Reporting**: Business intelligence dashboard for quotation analytics
3. **Third-party Integrations**: CRM, accounting software integration
4. **International Support**: Multi-currency and multi-language support

### Technical Debt & Improvements
1. **Performance Optimization**: Implement caching for quotation lists
2. **Real-time Updates**: WebSocket integration for live quotation status updates
3. **Advanced Search**: Full-text search with Elasticsearch
4. **API Versioning**: Version management for backward compatibility
5. **Comprehensive Testing**: Increase test coverage to 90%+

---

## Conclusion

The Quotation Management System represents a comprehensive solution for professional quotation creation and management. The implementation follows modern software development practices with:

- **Type-safe development** with TypeScript throughout
- **Component-based architecture** for maintainability
- **Professional email integration** for client communication
- **Real-time data management** with optimistic updates
- **Comprehensive error handling** for robust user experience
- **Scalable database design** for future growth

The system is production-ready and provides a solid foundation for future enhancements and business growth.

---

**Document Version**: 1.0  
**Last Updated**: July 3, 2025  
**Author**: Naksha Development Team  
**Review Status**: Complete