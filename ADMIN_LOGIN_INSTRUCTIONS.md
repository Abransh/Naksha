# Nakksha Admin Login Instructions

## How to Login as Admin

### 1. Create Default Admin User

First, you need to create a default admin user in the database:

```bash
# Navigate to the database package
cd packages/database

# Install dependencies (if not already done)
npm install

# Run the admin seeder script to create default admin
npm run admin:seed
```

This will create a default admin user with the following credentials:
- **Email**: `admin@nakksha.in`
- **Password**: `Admin@123!`
- **Role**: `SUPER_ADMIN`

### 2. Access Admin Login Page

Navigate to the admin login page in your browser:
```
http://localhost:3000/admin/login
```

### 3. Login with Admin Credentials

Use the credentials created by the seeder:
- **Email**: `admin@nakksha.in`
- **Password**: `Admin@123!`

### 4. Access Admin Dashboard

After successful login, you'll be redirected to the admin dashboard at:
```
http://localhost:3000/admin
```

## Admin Dashboard Features

The admin dashboard provides:

### ✅ **Real-time Consultant Management**
- View all consultant applications with filtering and search
- Approve or reject consultant applications
- Update consultant information and status
- View detailed consultant profiles with sessions, clients, and revenue data

### ✅ **Advanced Filtering & Search**
- Filter by status: All, Pending Approval, Approved, Verified/Unverified emails
- Real-time search across consultant names, emails, and sectors
- Pagination for large consultant lists

### ✅ **Bulk Operations**
- Select multiple consultants for bulk actions
- Bulk approve/reject consultants
- Bulk email verification operations
- Export consultant data

### ✅ **Live Statistics Dashboard**
- Total consultants count
- Pending approvals count
- Approved consultants count
- Active consultants count
- Email verification statistics

### ✅ **Interactive Data Management**
- Inline editing of consultant information
- Real-time status updates
- Loading states and error handling
- Professional toast notifications

## Technical Implementation Details

### Backend Integration
- **Admin API Endpoint**: `/api/v1/auth/admin/login`
- **Admin Dashboard API**: `/api/v1/admin/*`
- **Real Database**: All data comes from PostgreSQL via Prisma
- **JWT Authentication**: Secure admin token management

### Frontend Features
- **React Hooks**: Complete state management for admin operations
- **TypeScript**: Full type safety for admin API calls
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Responsive Design**: Mobile-optimized admin interface

### Security Features
- **Secure Authentication**: JWT tokens with automatic logout on expired tokens
- **Role-based Access**: SUPER_ADMIN and ADMIN role support
- **Session Management**: Automatic token refresh and secure logout
- **Audit Logging**: All admin actions are logged for security

## Creating Additional Admin Users

To create additional admin users, you can:

1. **Use the Admin Dashboard** (once logged in as SUPER_ADMIN)
2. **Use the Database Seeder** with custom data
3. **Use API endpoints** programmatically

### Example: Creating Multiple Admins
```bash
cd packages/database
# Edit scripts/seed-admin.ts to include additional admins
# Then run the seeder
npm run admin:seed
```

## Important Security Notes

⚠️ **Change Default Password**: Please change the default password after first login
🔒 **Store Credentials Securely**: Keep admin credentials in a secure password manager
📝 **Monitor Admin Activity**: All admin actions are logged for audit purposes
🔐 **Use Strong Passwords**: Ensure all admin passwords meet security requirements

## Troubleshooting

### "Authentication Required" Error
- Check if admin token is valid
- Clear browser localStorage and login again
- Verify API server is running

### "Admin Not Found" Error
- Ensure admin user was created with seeder script
- Check database connection
- Verify admin email and password

### API Connection Issues
- Ensure API server is running on correct port
- Check CORS configuration
- Verify API_URL environment variables

## Production Deployment Notes

For production deployment:
1. **Change default admin credentials**
2. **Set up proper environment variables**
3. **Configure secure session management**
4. **Enable HTTPS for admin access**
5. **Set up proper database backups**
6. **Configure monitoring and alerting**

---

## Summary

You now have a fully functional admin authentication system with:
- ✅ Complete admin login page (`/admin/login`)
- ✅ Real backend API integration
- ✅ Secure JWT authentication
- ✅ Production-ready admin dashboard
- ✅ Real-time consultant management
- ✅ Professional UI/UX with error handling

The admin system is ready for production use with proper security measures and comprehensive functionality!