// Database seeder script to create default admin user
// Run this script to create an initial admin for the platform

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedAdmin() {
  try {
    console.log('🌱 Starting admin user seeding...');

    // Default admin credentials
    const defaultAdmin = {
      email: 'admin@nakksha.in',
      password: 'Admin@123!', // Strong default password
      firstName: 'Admin',
      lastName: 'User',
      role: 'SUPER_ADMIN' as const
    };

    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: defaultAdmin.email }
    });

    if (existingAdmin) {
      console.log(`⚠️  Admin user already exists: ${defaultAdmin.email}`);
      console.log('ℹ️  Skipping admin creation');
      return;
    }

    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(defaultAdmin.password, saltRounds);

    // Create the admin user
    const admin = await prisma.admin.create({
      data: {
        email: defaultAdmin.email,
        passwordHash,
        firstName: defaultAdmin.firstName,
        lastName: defaultAdmin.lastName,
        role: defaultAdmin.role,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    console.log('✅ Successfully created default admin user:');
    console.log('📧 Email:', defaultAdmin.email);
    console.log('🔑 Password:', defaultAdmin.password);
    console.log('👤 Role:', defaultAdmin.role);
    console.log('🆔 ID:', admin.id);
    console.log('');
    console.log('⚠️  IMPORTANT SECURITY NOTICE:');
    console.log('📝 Please change the default password after first login');
    console.log('🔒 Store these credentials securely');
    console.log('');
    console.log('🚀 You can now login to the admin dashboard at: /admin/login');

  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Additional function to create multiple admin users
export async function seedMultipleAdmins() {
  try {
    console.log('🌱 Creating additional admin users...');

    const additionalAdmins = [
      {
        email: 'superadmin@nakksha.in',
        password: 'SuperAdmin@123!',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN' as const
      },
      {
        email: 'moderator@nakksha.in',
        password: 'Moderator@123!',
        firstName: 'Moderator',
        lastName: 'User',
        role: 'ADMIN' as const
      }
    ];

    for (const adminData of additionalAdmins) {
      const existingAdmin = await prisma.admin.findUnique({
        where: { email: adminData.email }
      });

      if (existingAdmin) {
        console.log(`⚠️  Admin user already exists: ${adminData.email}`);
        continue;
      }

      const passwordHash = await bcrypt.hash(adminData.password, 12);

      const admin = await prisma.admin.create({
        data: {
          email: adminData.email,
          passwordHash,
          firstName: adminData.firstName,
          lastName: adminData.lastName,
          role: adminData.role,
          isActive: true
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true
        }
      });

      console.log(`✅ Created admin: ${admin.email} (${admin.role})`);
    }

  } catch (error) {
    console.error('❌ Error seeding additional admins:', error);
    throw error;
  }
}

// Check if this script is being run directly
if (require.main === module) {
  seedAdmin()
    .then(() => {
      console.log('🎉 Admin seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Admin seeding failed:', error);
      process.exit(1);
    });
}

export default seedAdmin;