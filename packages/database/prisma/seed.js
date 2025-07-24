// packages/database/prisma/seed.ts
// Database seeding script
import { PrismaClient, AdminRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create super admin
  const adminPassword = await bcrypt.hash('admin123!', 12);
  
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@nakksha.in' },
    update: {},
    create: {
      email: 'admin@nakksha.in',
      passwordHash: adminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: AdminRole.SUPER_ADMIN
    }
  });

  console.log('✅ Super admin created:', admin.email);

  // Create sample consultant (for testing)
  const consultantPassword = await bcrypt.hash('consultant123!', 12);
  
  const consultant = await prisma.consultant.upsert({
    where: { email: 'consultant@example.com' },
    update: {},
    create: {
      email: 'consultant@example.com',
      passwordHash: consultantPassword,
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '9876543210',
      slug: 'john-doe',
      consultancySector: 'Technology',
      personalSessionTitle: 'Technology Consultation',
      webinarSessionTitle: 'Tech Leadership Workshop',
      description: 'Experienced technology consultant with 10+ years in the industry.',
      experienceMonths: 120,
      personalSessionPrice: 2500,
      webinarSessionPrice: 5000,
      isEmailVerified: true,
      isApprovedByAdmin: true,
      profileCompleted: true
    }
  });

  console.log('✅ Sample consultant created:', consultant.email);
  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });