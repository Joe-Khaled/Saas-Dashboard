/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Integration_Users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `Integration_Users` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Integration_Users] ADD [email] NVARCHAR(150) NOT NULL;

-- CreateIndex
ALTER TABLE [dbo].[Integration_Users] ADD CONSTRAINT [Integration_Users_email_key] UNIQUE NONCLUSTERED ([email]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
