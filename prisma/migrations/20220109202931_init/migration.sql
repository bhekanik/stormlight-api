-- CreateTable
CREATE TABLE `Character` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `born` VARCHAR(191) NULL,
    `abilities` VARCHAR(191) NULL,
    `bonded` VARCHAR(191) NULL,
    `titles` VARCHAR(191) NULL,
    `aliases` VARCHAR(191) NULL,
    `profession` VARCHAR(191) NULL,
    `groups` VARCHAR(191) NULL,
    `birthPlace` VARCHAR(191) NULL,
    `residence` VARCHAR(191) NULL,
    `nationality` VARCHAR(191) NULL,
    `imageId` INTEGER NULL,

    UNIQUE INDEX `Character_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Src` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `url` VARCHAR(191) NOT NULL,
    `imageId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Image` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `src` VARCHAR(191) NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
