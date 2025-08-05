/*
  Warnings:

  - A unique constraint covering the columns `[Id]` on the table `Integration_Users` will be added. If there are existing duplicate values, this will fail.

*/
BEGIN TRY

BEGIN TRAN;

-- CreateIndex
ALTER TABLE [dbo].[Integration_Users] ADD CONSTRAINT [Integration_Users_Id_key] UNIQUE NONCLUSTERED ([Id]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
