-- Campaign scheduling + application document uploads

-- CreateTable
CREATE TABLE `application_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL DEFAULT 0,
    `response_id` INTEGER NOT NULL,
    `document_type` VARCHAR(191) NOT NULL,
    `original_name` VARCHAR(191) NOT NULL,
    `stored_name` VARCHAR(191) NOT NULL,
    `mime_type` VARCHAR(191) NULL,
    `size_bytes` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'uploaded',
    `verified_by_user_id` INTEGER NULL,
    `verified_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `campaigns`
    ADD COLUMN `channel` VARCHAR(191) NULL,
    ADD COLUMN `template_id` INTEGER NULL,
    ADD COLUMN `scheduled_at` DATETIME(3) NULL,
    ADD COLUMN `dispatched_at` DATETIME(3) NULL,
    ADD COLUMN `audience_status_id` INTEGER NULL,
    ADD COLUMN `dispatched_lead_count` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `last_error` VARCHAR(191) NULL;

ALTER TABLE `application_forms` ADD COLUMN `required_documents` JSON NULL;

-- AddForeignKey
ALTER TABLE `application_documents` ADD CONSTRAINT `application_documents_organization_id_fkey`
    FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `application_documents` ADD CONSTRAINT `application_documents_response_id_fkey`
    FOREIGN KEY (`response_id`) REFERENCES `application_form_responses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
