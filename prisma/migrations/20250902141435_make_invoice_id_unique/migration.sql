/*
  Warnings:

  - You are about to alter the column `InvoiceId` on the `Payments` table. The data in that column could be lost. The data in that column will be cast from `NVarChar(1000)` to `NVarChar(50)`.
  - A unique constraint covering the columns `[InvoiceId]` on the table `Payments` will be added. If there are existing duplicate values, this will fail.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Payments] ALTER COLUMN [InvoiceId] NVARCHAR(50) NOT NULL;

-- CreateIndex
ALTER TABLE [dbo].[Payments] ADD CONSTRAINT [Payments_InvoiceId_key] UNIQUE NONCLUSTERED ([InvoiceId]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
