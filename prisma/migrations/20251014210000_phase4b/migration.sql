-- Phase 4B: custom attributes, application forms, settings extensions

-- CreateTable
CREATE TABLE `attributes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL DEFAULT 0,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'text',
    `lookup_type` VARCHAR(191) NULL,
    `entity_type` VARCHAR(191) NOT NULL DEFAULT 'lead',
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `validation` VARCHAR(191) NULL,
    `options` VARCHAR(191) NULL,
    `is_required` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `attributes_organization_id_entity_type_code_key`(`organization_id`, `entity_type`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `application_forms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL DEFAULT 0,
    `unique_code` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `status` INTEGER NOT NULL DEFAULT 1,
    `created_by` INTEGER NULL,
    `allowed_countries` JSON NULL,
    `allowed_institutes` JSON NULL,
    `fees` DECIMAL(10, 2) NULL,
    `tax` DECIMAL(5, 2) NULL,
    `total_amount` DECIMAL(10, 2) NULL,
    `gateway` VARCHAR(191) NULL DEFAULT 'manual',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `application_forms_organization_id_idx`(`organization_id`),
    UNIQUE INDEX `application_forms_organization_id_unique_code_key`(`organization_id`, `unique_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `application_form_responses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL DEFAULT 0,
    `lead_form_id` INTEGER NOT NULL,
    `lead_id` INTEGER NOT NULL DEFAULT 0,
    `sessionId` VARCHAR(191) NULL,
    `response_json` JSON NOT NULL,
    `fill_percentage` INTEGER NOT NULL DEFAULT 0,
    `current_step` INTEGER NOT NULL DEFAULT 0,
    `email_verified` INTEGER NOT NULL DEFAULT 0,
    `otp_verified` INTEGER NOT NULL DEFAULT 0,
    `otpCode` VARCHAR(191) NULL,
    `otp_expires_at` DATETIME(3) NULL,
    `payment_amount` INTEGER NOT NULL DEFAULT 0,
    `payment_method` VARCHAR(191) NULL,
    `payment_status` INTEGER NOT NULL DEFAULT 0,
    `payment_need_to_take` INTEGER NOT NULL DEFAULT 0,
    `assigned_to` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NULL DEFAULT 'draft',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `application_form_responses_lead_form_id_idx`(`lead_form_id`),
    INDEX `application_form_responses_organization_id_idx`(`organization_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead_applications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lead_id` INTEGER NULL,
    `application_form_id` INTEGER NULL,
    `application_score` INTEGER NULL,
    `payment_status` VARCHAR(191) NULL DEFAULT 'pending',
    `payment_method` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `lead_applications_lead_id_idx`(`lead_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `attributes` ADD CONSTRAINT `attributes_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_forms` ADD CONSTRAINT `application_forms_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_form_responses` ADD CONSTRAINT `application_form_responses_lead_form_id_fkey` FOREIGN KEY (`lead_form_id`) REFERENCES `application_forms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `leads` ADD COLUMN `application_form_id` INTEGER NULL;

ALTER TABLE `general_settings`
  ADD COLUMN `default_payment_gateway` VARCHAR(191) NULL,
  ADD COLUMN `payment_credentials` JSON NULL,
  ADD COLUMN `maintenance_mode` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `maintenance_message` VARCHAR(191) NULL;
