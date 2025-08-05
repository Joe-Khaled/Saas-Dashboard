BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Engagement] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [IntegrationId] INT NOT NULL,
    [Type] NVARCHAR(1000) NOT NULL,
    [Subject] NVARCHAR(1000),
    [Timestamp] DATETIME2 NOT NULL,
    [Details] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Engagement_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[Attendance] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [IntegrationId] INT NOT NULL,
    [EmployeeId] NVARCHAR(1000) NOT NULL,
    [Status] NVARCHAR(1000) NOT NULL,
    [Date] DATETIME2 NOT NULL,
    CONSTRAINT [Attendance_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[IntegrationOwners] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [UserId] INT NOT NULL,
    [IntegrationId] INT NOT NULL,
    [HubspotOwnerId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [IntegrationOwners_pkey] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [IntegrationOwners_HubspotOwnerId_IntegrationId_key] UNIQUE NONCLUSTERED ([HubspotOwnerId],[IntegrationId])
);

-- AddForeignKey
ALTER TABLE [dbo].[Engagement] ADD CONSTRAINT [Engagement_IntegrationId_fkey] FOREIGN KEY ([IntegrationId]) REFERENCES [dbo].[Integrations]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Attendance] ADD CONSTRAINT [Attendance_IntegrationId_fkey] FOREIGN KEY ([IntegrationId]) REFERENCES [dbo].[Integrations]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[IntegrationOwners] ADD CONSTRAINT [IntegrationOwners_UserId_fkey] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[IntegrationOwners] ADD CONSTRAINT [IntegrationOwners_IntegrationId_fkey] FOREIGN KEY ([IntegrationId]) REFERENCES [dbo].[Integrations]([Id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
