/*
  Warnings:

  - You are about to drop the column `invoiceId` on the `Payments` table. All the data in the column will be lost.
  - Added the required column `InvoiceId` to the `Payments` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Payments] DROP COLUMN [invoiceId];
ALTER TABLE [dbo].[Payments] ADD [InvoiceId] NVARCHAR(1000) NOT NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
