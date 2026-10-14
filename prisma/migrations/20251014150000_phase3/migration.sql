-- CreateTable
CREATE TABLE `webhooks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(191) NOT NULL,
    `entity_type` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `method` VARCHAR(191) NOT NULL DEFAULT 'POST',
    `end_point` VARCHAR(191) NOT NULL,
    `query_params` JSON NULL,
    `headers` JSON NULL,
    `payload_type` VARCHAR(191) NULL,
    `raw_payload_type` VARCHAR(191) NULL,
    `payload` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `automation_rules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NULL,
    `name` VARCHAR(191) NULL,
    `trigger_event` VARCHAR(191) NULL,
    `conditions` JSON NULL,
    `actions` JSON NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `automation_rule_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `org_id` INTEGER NOT NULL,
    `rule_id` INTEGER NOT NULL,
    `lead_id` INTEGER NOT NULL,
    `trigger_event` VARCHAR(191) NOT NULL,
    `action_type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'success',
    `message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `communication_log_id` INTEGER NULL,
    `organization_id` INTEGER NULL,
    `user_id` INTEGER NULL,
    `template_name` VARCHAR(191) NULL,
    `to_email` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NULL,
    `body` LONGTEXT NULL,
    `status` VARCHAR(191) NULL,
    `response_message` TEXT NULL,
    `provider` VARCHAR(191) NULL,
    `sent_by` INTEGER NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `sent_at` DATETIME(3) NULL,
    `last_attempt_at` DATETIME(3) NULL,
    `lead_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sms_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `communication_log_id` INTEGER NULL,
    `organization_id` INTEGER NOT NULL,
    `lead_id` INTEGER NULL,
    `mobile` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `provider` VARCHAR(191) NULL DEFAULT 'demo',
    `provider_message_id` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL DEFAULT 'pending',
    `response_json` TEXT NULL,
    `sent_by` INTEGER NULL,
    `full_url` TEXT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `sent_at` DATETIME(3) NULL,
    `last_attempt_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `whatsapp_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `communication_log_id` INTEGER NULL,
    `organization_id` INTEGER NOT NULL,
    `lead_id` INTEGER NULL,
    `mobile` VARCHAR(191) NULL,
    `template_id` VARCHAR(191) NULL,
    `message` TEXT NULL,
    `media_url` TEXT NULL,
    `provider` VARCHAR(191) NULL DEFAULT 'demo',
    `provider_message_id` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL DEFAULT 'pending',
    `response_json` TEXT NULL,
    `sent_by` INTEGER NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `sent_at` DATETIME(3) NULL,
    `last_attempt_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NULL,
    `mail_mailer` VARCHAR(191) NULL,
    `mail_host` VARCHAR(191) NULL,
    `mail_port` VARCHAR(191) NULL,
    `mail_username` VARCHAR(191) NULL,
    `mail_password` VARCHAR(191) NULL,
    `mail_encryption` VARCHAR(191) NULL,
    `mail_from_address` VARCHAR(191) NULL,
    `mail_from_name` VARCHAR(191) NULL,
    `mail_validatessl` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `webhooks` ADD CONSTRAINT `webhooks_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_rules` ADD CONSTRAINT `automation_rules_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_rule_logs` ADD CONSTRAINT `automation_rule_logs_rule_id_fkey` FOREIGN KEY (`rule_id`) REFERENCES `automation_rules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
