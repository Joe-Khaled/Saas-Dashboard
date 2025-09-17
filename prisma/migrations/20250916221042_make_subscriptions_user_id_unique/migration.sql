/*
  Warnings:

  - A unique constraint covering the columns `[UserId]` on the table `Subscriptions` will be added. If there are existing duplicate values, this will fail.

*/
BEGIN TRY

BEGIN TRAN;

-- CreateIndex
ALTER TABLE [dbo].[Subscriptions] ADD CONSTRAINT [Subscriptions_UserId_key] UNIQUE NONCLUSTERED ([UserId]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
