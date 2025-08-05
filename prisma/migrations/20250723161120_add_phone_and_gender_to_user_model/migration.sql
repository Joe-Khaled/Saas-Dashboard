/*
  Warnings:

  - You are about to drop the `IntegrationOwners` table. If the table is not empty, all the data it contains will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[IntegrationOwners] DROP CONSTRAINT [IntegrationOwners_IntegrationId_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[IntegrationOwners] DROP CONSTRAINT [IntegrationOwners_UserId_fkey];

-- AlterTable
ALTER TABLE [dbo].[Users] ADD [Gender] NVARCHAR(12),
[Phone] NVARCHAR(100);

-- DropTable
DROP TABLE [dbo].[IntegrationOwners];

-- CreateTable
CREATE TABLE [dbo].[Employees] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [UserId] INT NOT NULL,
    [IntegrationId] INT NOT NULL,
    [HubspotOwnerId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Employees_pkey] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [Employees_HubspotOwnerId_IntegrationId_key] UNIQUE NONCLUSTERED ([HubspotOwnerId],[IntegrationId])
);

-- AddForeignKey
ALTER TABLE [dbo].[Employees] ADD CONSTRAINT [Employees_UserId_fkey] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Employees] ADD CONSTRAINT [Employees_IntegrationId_fkey] FOREIGN KEY ([IntegrationId]) REFERENCES [dbo].[Integrations]([Id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
