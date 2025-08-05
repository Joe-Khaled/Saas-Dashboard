/*
  Warnings:

  - You are about to drop the column `email` on the `Integration_Users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[Email]` on the table `Integration_Users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `Email` to the `Integration_Users` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- DropIndex
ALTER TABLE [dbo].[Integration_Users] DROP CONSTRAINT [Integration_Users_email_key];

-- AlterTable
ALTER TABLE [dbo].[Integration_Users] DROP COLUMN [email];
ALTER TABLE [dbo].[Integration_Users] ADD [Email] NVARCHAR(150) NOT NULL;

-- CreateIndex
ALTER TABLE [dbo].[Integration_Users] ADD CONSTRAINT [Integration_Users_Email_key] UNIQUE NONCLUSTERED ([Email]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
