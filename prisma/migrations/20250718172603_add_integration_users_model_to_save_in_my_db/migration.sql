BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Integration_Users] (
    [Id] NVARCHAR(255) NOT NULL,
    [FirstName] NVARCHAR(30) NOT NULL,
    [LastName] NVARCHAR(30) NOT NULL,
    [RoleIds] NVARCHAR(60) NOT NULL,
    [SuperAdmin] BIT NOT NULL,
    [IntegrationId] INT NOT NULL,
    CONSTRAINT [Integration_Users_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Integration_Users] ADD CONSTRAINT [Integration_Users_IntegrationId_fkey] FOREIGN KEY ([IntegrationId]) REFERENCES [dbo].[Integrations]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
