/*
  Warnings:

  - Added the required column `invoiceId` to the `Payments` table without a default value. This is not possible if the table is not empty.
  - Made the column `Amount` on table `Payments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `Status` on table `Payments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `InvoiceUrl` on table `Payments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `PaidAt` on table `Payments` required. This step will fail if there are existing NULL values in that column.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Payments] ALTER COLUMN [Amount] DECIMAL(10,2) NOT NULL;
ALTER TABLE [dbo].[Payments] ALTER COLUMN [Status] NVARCHAR(20) NOT NULL;
ALTER TABLE [dbo].[Payments] ALTER COLUMN [InvoiceUrl] NVARCHAR(max) NOT NULL;
ALTER TABLE [dbo].[Payments] ALTER COLUMN [PaidAt] DATETIME NOT NULL;
ALTER TABLE [dbo].[Payments] ADD [invoiceId] NVARCHAR(1000) NOT NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
