/*
  Warnings:

  - You are about to alter the column `IsActive` on the `Jobs` table. The data in that column could be lost. The data in that column will be cast from `NVarChar(1000)` to `Bit`.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Jobs] ALTER COLUMN [IsActive] BIT NOT NULL;
ALTER TABLE [dbo].[Jobs] ADD CONSTRAINT [Jobs_IsActive_df] DEFAULT 1 FOR [IsActive];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
