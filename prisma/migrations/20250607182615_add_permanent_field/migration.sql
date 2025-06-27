/*
  Warnings:

  - You are about to drop the column `tempAscii` on the `Users` table. All the data in the column will be lost.
  - You are about to drop the column `tempBase32` on the `Users` table. All the data in the column will be lost.
  - You are about to drop the column `tempHex` on the `Users` table. All the data in the column will be lost.
  - You are about to drop the column `tempOtpUrl` on the `Users` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Users] DROP COLUMN [tempAscii],
[tempBase32],
[tempHex],
[tempOtpUrl];
ALTER TABLE [dbo].[Users] ADD [ascii] NVARCHAR(1000),
[base32] NVARCHAR(1000),
[hex] NVARCHAR(1000),
[otpUrl] NVARCHAR(1000),
[permanent] BIT NOT NULL CONSTRAINT [Users_permanent_df] DEFAULT 0;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
