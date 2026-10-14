-- Phase 4A: webforms, landing pages, coupons

-- CreateTable
CREATE TABLE `web_forms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL DEFAULT 0,
    `form_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `submit_button_label` VARCHAR(191) NOT NULL DEFAULT 'Submit',
    `submit_success_action` VARCHAR(191) NOT NULL DEFAULT 'message',
    `submit_success_content` VARCHAR(191) NULL,
    `create_lead` BOOLEAN NOT NULL DEFAULT true,
    `background_color` VARCHAR(191) NULL,
    `form_background_color` VARCHAR(191) NULL,
    `form_title_color` VARCHAR(191) NULL,
    `form_submit_button_color` VARCHAR(191) NULL,
    `attribute_label_color` VARCHAR(191) NULL,
    `view_count` INTEGER NOT NULL DEFAULT 0,
    `submit_count` INTEGER NOT NULL DEFAULT 0,
    `lead_source_id` INTEGER NULL,
    `lead_campaign_id` INTEGER NULL,
    `type_id` INTEGER NULL,
    `application_form_id` INTEGER NULL,
    `extra_fields_json` JSON NULL,
    `created_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `web_forms_organization_id_idx`(`organization_id`),
    UNIQUE INDEX `web_forms_organization_id_form_id_key`(`organization_id`, `form_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `web_form_attributes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `web_form_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `placeholder` VARCHAR(191) NULL,
    `is_required` BOOLEAN NOT NULL DEFAULT false,
    `is_hidden` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `type` VARCHAR(191) NOT NULL DEFAULT 'text',
    `options` VARCHAR(191) NULL,
    `default_value` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `web_form_attributes_web_form_id_idx`(`web_form_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `landing_pages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL DEFAULT 0,
    `campaign_id` INTEGER NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `layout_name` VARCHAR(191) NOT NULL DEFAULT 'velzon',
    `status` INTEGER NOT NULL DEFAULT 1,
    `meta` JSON NULL,
    `view_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `landing_pages_organization_id_idx`(`organization_id`),
    UNIQUE INDEX `landing_pages_organization_id_slug_key`(`organization_id`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `landing_page_sections` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `page_id` INTEGER NOT NULL,
    `section_key` VARCHAR(191) NOT NULL,
    `content_json` JSON NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `landing_page_sections_page_id_section_key_key`(`page_id`, `section_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coupons` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'flat',
    `value` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `min_amount` DECIMAL(10, 2) NULL,
    `max_discount` DECIMAL(10, 2) NULL,
    `usage_type` VARCHAR(191) NOT NULL DEFAULT 'single',
    `usage_limit` INTEGER NULL,
    `used_count` INTEGER NOT NULL DEFAULT 0,
    `start_at` DATETIME(3) NULL,
    `end_at` DATETIME(3) NULL,
    `status` INTEGER NOT NULL DEFAULT 1,
    `created_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `coupons_organization_id_code_key`(`organization_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coupon_usages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL,
    `coupon_id` INTEGER NOT NULL,
    `lead_id` INTEGER NULL,
    `application_id` INTEGER NULL,
    `used_by_user_id` INTEGER NULL,
    `used_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `discount_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `order_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `meta_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `coupon_usages_coupon_id_idx`(`coupon_id`),
    INDEX `coupon_usages_organization_id_idx`(`organization_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `web_forms` ADD CONSTRAINT `web_forms_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `web_forms` ADD CONSTRAINT `web_forms_lead_source_id_fkey` FOREIGN KEY (`lead_source_id`) REFERENCES `lead_sources`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `web_forms` ADD CONSTRAINT `web_forms_lead_campaign_id_fkey` FOREIGN KEY (`lead_campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `web_forms` ADD CONSTRAINT `web_forms_type_id_fkey` FOREIGN KEY (`type_id`) REFERENCES `lead_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `web_form_attributes` ADD CONSTRAINT `web_form_attributes_web_form_id_fkey` FOREIGN KEY (`web_form_id`) REFERENCES `web_forms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `landing_pages` ADD CONSTRAINT `landing_pages_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `landing_page_sections` ADD CONSTRAINT `landing_page_sections_page_id_fkey` FOREIGN KEY (`page_id`) REFERENCES `landing_pages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coupon_usages` ADD CONSTRAINT `coupon_usages_coupon_id_fkey` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
