-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('PERSONAL', 'WEBINAR');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'ONGOING', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RETURNED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'QUEUED');

-- CreateTable
CREATE TABLE "consultants" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone_country_code" TEXT NOT NULL DEFAULT '+91',
    "phone_number" TEXT NOT NULL,
    "profile_photo_url" TEXT,
    "consultancy_sector" TEXT,
    "bank_name" TEXT,
    "account_number" TEXT,
    "ifsc_code" TEXT,
    "personal_session_title" TEXT,
    "personal_session_description" TEXT,
    "webinar_session_title" TEXT,
    "webinar_session_description" TEXT,
    "description" TEXT,
    "experience_months" INTEGER NOT NULL DEFAULT 0,
    "personal_session_price" DECIMAL(10,2),
    "webinar_session_price" DECIMAL(10,2),
    "instagram_url" TEXT,
    "linkedin_url" TEXT,
    "x_url" TEXT,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_approved_by_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "profile_completed" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionPlan" TEXT NOT NULL DEFAULT 'free',
    "subscription_expires_at" TIMESTAMP(3),
    "slug" TEXT NOT NULL,
    "email_verification_token" TEXT,
    "email_verification_token_expires" TIMESTAMP(3),
    "password_reset_token" TEXT,
    "password_reset_token_expires" TIMESTAMP(3),
    "teams_access_token" TEXT,
    "teams_refresh_token" TEXT,
    "teams_token_expires_at" TIMESTAMP(3),
    "teams_user_email" TEXT,
    "teams_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "consultants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "consultant_id" TEXT,
    "admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone_number" TEXT,
    "phone_country_code" TEXT DEFAULT '+91',
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT DEFAULT 'India',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "total_sessions" INTEGER NOT NULL DEFAULT 0,
    "total_amount_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "consultant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "consultant_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "session_type" "SessionType" NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'PENDING',
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "scheduled_time" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "meeting_id" TEXT,
    "meeting_link" TEXT,
    "meeting_password" TEXT,
    "platform" TEXT DEFAULT 'zoom',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "payment_method" TEXT,
    "payment_id" TEXT,
    "client_notes" TEXT,
    "consultant_notes" TEXT,
    "notes" TEXT,
    "reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "booking_source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_slots" (
    "id" TEXT NOT NULL,
    "consultant_id" TEXT NOT NULL,
    "session_type" "SessionType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "is_booked" BOOLEAN NOT NULL DEFAULT false,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_availability_patterns" (
    "id" TEXT NOT NULL,
    "consultant_id" TEXT NOT NULL,
    "session_type" "SessionType" NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_availability_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" TEXT NOT NULL,
    "consultant_id" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "client_email" TEXT NOT NULL,
    "client_company" TEXT,
    "title" TEXT NOT NULL,
    "quotation_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "base_amount" DECIMAL(10,2) NOT NULL,
    "discount_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "final_amount" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "valid_until" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "terms" TEXT,
    "notes" TEXT,
    "quotation_image_url" TEXT,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "quotation_number" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "session_id" TEXT,
    "quotation_id" TEXT,
    "consultant_id" TEXT NOT NULL,
    "client_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "payment_method" TEXT,
    "gateway_payment_id" TEXT,
    "gateway_order_id" TEXT,
    "gateway_signature" TEXT,
    "gateway_response" JSONB,
    "client_email" TEXT,
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "transaction_type" TEXT NOT NULL,
    "description" TEXT,
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_analytics" (
    "id" TEXT NOT NULL,
    "consultant_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_sessions" INTEGER NOT NULL DEFAULT 0,
    "completed_sessions" INTEGER NOT NULL DEFAULT 0,
    "cancelled_sessions" INTEGER NOT NULL DEFAULT 0,
    "no_show_sessions" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "personal_session_revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "webinar_session_revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "new_clients" INTEGER NOT NULL DEFAULT 0,
    "unique_clients" INTEGER NOT NULL DEFAULT 0,
    "quotations_sent" INTEGER NOT NULL DEFAULT 0,
    "quotations_accepted" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html_content" TEXT NOT NULL,
    "text_content" TEXT,
    "variables" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "from" TEXT,
    "subject" TEXT NOT NULL,
    "template_name" TEXT,
    "email_type" TEXT,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "consultant_id" TEXT,
    "client_id" TEXT,
    "session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "consultants_email_key" ON "consultants"("email");

-- CreateIndex
CREATE UNIQUE INDEX "consultants_slug_key" ON "consultants"("slug");

-- CreateIndex
CREATE INDEX "consultants_email_idx" ON "consultants"("email");

-- CreateIndex
CREATE INDEX "consultants_slug_idx" ON "consultants"("slug");

-- CreateIndex
CREATE INDEX "consultants_is_approved_by_admin_idx" ON "consultants"("is_approved_by_admin");

-- CreateIndex
CREATE INDEX "consultants_is_active_idx" ON "consultants"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "clients_consultant_id_idx" ON "clients"("consultant_id");

-- CreateIndex
CREATE INDEX "clients_email_idx" ON "clients"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clients_email_consultant_id_key" ON "clients"("email", "consultant_id");

-- CreateIndex
CREATE INDEX "sessions_consultant_id_idx" ON "sessions"("consultant_id");

-- CreateIndex
CREATE INDEX "sessions_client_id_idx" ON "sessions"("client_id");

-- CreateIndex
CREATE INDEX "sessions_status_idx" ON "sessions"("status");

-- CreateIndex
CREATE INDEX "sessions_payment_status_idx" ON "sessions"("payment_status");

-- CreateIndex
CREATE INDEX "sessions_scheduled_date_idx" ON "sessions"("scheduled_date");

-- CreateIndex
CREATE INDEX "sessions_session_type_idx" ON "sessions"("session_type");

-- CreateIndex
CREATE INDEX "availability_slots_consultant_id_idx" ON "availability_slots"("consultant_id");

-- CreateIndex
CREATE INDEX "availability_slots_date_idx" ON "availability_slots"("date");

-- CreateIndex
CREATE INDEX "availability_slots_session_type_idx" ON "availability_slots"("session_type");

-- CreateIndex
CREATE INDEX "availability_slots_is_booked_idx" ON "availability_slots"("is_booked");

-- CreateIndex
CREATE UNIQUE INDEX "availability_slots_consultant_id_session_type_date_start_ti_key" ON "availability_slots"("consultant_id", "session_type", "date", "start_time");

-- CreateIndex
CREATE INDEX "weekly_availability_patterns_consultant_id_idx" ON "weekly_availability_patterns"("consultant_id");

-- CreateIndex
CREATE INDEX "weekly_availability_patterns_session_type_idx" ON "weekly_availability_patterns"("session_type");

-- CreateIndex
CREATE INDEX "weekly_availability_patterns_day_of_week_idx" ON "weekly_availability_patterns"("day_of_week");

-- CreateIndex
CREATE INDEX "weekly_availability_patterns_is_active_idx" ON "weekly_availability_patterns"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_availability_patterns_consultant_id_session_type_day_key" ON "weekly_availability_patterns"("consultant_id", "session_type", "day_of_week", "start_time");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_quotation_number_key" ON "quotations"("quotation_number");

-- CreateIndex
CREATE INDEX "quotations_consultant_id_idx" ON "quotations"("consultant_id");

-- CreateIndex
CREATE INDEX "quotations_status_idx" ON "quotations"("status");

-- CreateIndex
CREATE INDEX "quotations_client_email_idx" ON "quotations"("client_email");

-- CreateIndex
CREATE INDEX "quotations_valid_until_idx" ON "quotations"("valid_until");

-- CreateIndex
CREATE INDEX "payment_transactions_session_id_idx" ON "payment_transactions"("session_id");

-- CreateIndex
CREATE INDEX "payment_transactions_quotation_id_idx" ON "payment_transactions"("quotation_id");

-- CreateIndex
CREATE INDEX "payment_transactions_consultant_id_idx" ON "payment_transactions"("consultant_id");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

-- CreateIndex
CREATE INDEX "payment_transactions_gateway_payment_id_idx" ON "payment_transactions"("gateway_payment_id");

-- CreateIndex
CREATE INDEX "daily_analytics_consultant_id_idx" ON "daily_analytics"("consultant_id");

-- CreateIndex
CREATE INDEX "daily_analytics_date_idx" ON "daily_analytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_analytics_consultant_id_date_key" ON "daily_analytics"("consultant_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "system_settings_category_idx" ON "system_settings"("category");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_name_key" ON "email_templates"("name");

-- CreateIndex
CREATE INDEX "email_logs_status_idx" ON "email_logs"("status");

-- CreateIndex
CREATE INDEX "email_logs_created_at_idx" ON "email_logs"("created_at");

-- CreateIndex
CREATE INDEX "email_logs_consultant_id_idx" ON "email_logs"("consultant_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "consultants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "consultants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "consultants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "consultants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_availability_patterns" ADD CONSTRAINT "weekly_availability_patterns_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "consultants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "consultants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "consultants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
