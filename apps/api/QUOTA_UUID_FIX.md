# Quotation UUID Validation Fix

## Issue Description
The quotation email sending functionality was failing with a validation error:
```
❌ Validation Error: {
  "validation": "uuid",
  "code": "invalid_string",
  "message": "Invalid uuid",
  "path": ["id"]
}
```

## Root Cause
- **Prisma generates CUIDs by default** (e.g., `cmco1yrjk0007j85pyx80w8s5`)
- **API validation was expecting UUIDs** (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- **CUID format**: 25 character alphanumeric string
- **UUID format**: 36 character hyphenated string

## Solution Applied

### 1. Enhanced Validation Schema
Updated `src/middleware/validation.ts` to support both formats:

```typescript
// Added CUID support
cuid: z.string().cuid('Invalid CUID format'),

// Added generic ID validator that accepts both UUID and CUID
id: z.string().refine(
  (value) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cuidRegex = /^[a-z0-9]{25}$/i;
    return uuidRegex.test(value) || cuidRegex.test(value);
  },
  'Invalid ID format'
),
```

### 2. Updated Route Validations
Fixed all affected routes to use `commonSchemas.id` instead of `z.string().uuid()`:

**Files Updated:**
- `src/routes/v1/quotations.ts`:
  - `GET /:id` - Get quotation by ID
  - `PUT /:id` - Update quotation
  - `POST /:id/send` - Send quotation (the failing endpoint)
  - `DELETE /:id` - Delete quotation
  - `createQuotationSchema.clientId` - Client ID reference

- `src/routes/v1/consultant.ts`:
  - `DELETE /availability/:id` - Delete availability slot
  - `updateAvailabilitySchema.availabilitySlotIds` - Availability slot IDs

### 3. Before vs After

**Before (Failing)**:
```typescript
router.post('/:id/send',
  validateRequest(z.object({ id: z.string().uuid() }), 'params'),
  // ... would fail for CUID: cmco1yrjk0007j85pyx80w8s5
```

**After (Working)**:
```typescript
router.post('/:id/send',
  validateRequest(z.object({ id: commonSchemas.id }), 'params'),
  // ... accepts both UUID and CUID formats
```

## Testing the Fix

### Test with CUID (Prisma default):
```bash
curl -X POST http://localhost:8000/api/v1/quotations/cmco1yrjk0007j85pyx80w8s5/send \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"emailMessage": "", "includeAttachment": false}'
```

### Test with UUID (legacy support):
```bash
curl -X POST http://localhost:8000/api/v1/quotations/550e8400-e29b-41d4-a716-446655440000/send \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"emailMessage": "", "includeAttachment": false}'
```

## Benefits
1. **Backward Compatibility**: Supports both UUID and CUID formats
2. **Prisma Alignment**: Works with Prisma's default CUID generation
3. **Future Flexibility**: Can switch between ID formats without breaking changes
4. **Consistent Validation**: All routes now use the same ID validation logic

## Status
✅ **Fixed and Deployed**
- All UUID validations updated to support CUID format
- Build passes successfully
- Quotation sending functionality restored

The quotation email sending feature should now work correctly with Prisma-generated CUID identifiers.