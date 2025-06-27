BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[AuditLogs] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [UserId] INT NOT NULL,
    [Action] NVARCHAR(100),
    [Meta] NVARCHAR(max),
    [CreatedAt] DATETIME CONSTRAINT [DF__AuditLogs__Creat__52593CB8] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK__AuditLog__3214EC0766CBEF2A] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[Integrations] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [UserId] INT NOT NULL,
    [Provider] NVARCHAR(100),
    [AccessToken] NVARCHAR(max),
    [RefreshToken] NVARCHAR(max),
    [ConnectedAt] DATETIME CONSTRAINT [DF__Integrati__Conne__46E78A0C] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK__Integrat__3214EC07A7D7D2EC] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[Notifications] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [UserId] INT NOT NULL,
    [Message] NVARCHAR(max),
    [Type] NVARCHAR(20),
    [IsRead] BIT CONSTRAINT [DF__Notificat__IsRea__4D94879B] DEFAULT 0,
    [SentAt] DATETIME CONSTRAINT [DF__Notificat__SentA__4E88ABD4] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK__Notifica__3214EC078ED55443] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[Payments] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [UserId] INT NOT NULL,
    [Amount] DECIMAL(10,2),
    [Status] NVARCHAR(20),
    [InvoiceUrl] NVARCHAR(max),
    [PaidAt] DATETIME,
    CONSTRAINT [PK__Payments__3214EC0781ADA3C3] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[Reports] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [UserId] INT NOT NULL,
    [Name] NVARCHAR(100),
    [Config] NVARCHAR(max),
    [GeneratedAt] DATETIME,
    [Format] NVARCHAR(10),
    CONSTRAINT [PK__Reports__3214EC0795DDC036] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[Subscriptions] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [UserId] INT NOT NULL,
    [Plan] NVARCHAR(50),
    [IsActive] BIT CONSTRAINT [DF__Subscript__IsAct__59063A47] DEFAULT 1,
    [StartedAt] DATETIME CONSTRAINT [DF__Subscript__Start__59FA5E80] DEFAULT CURRENT_TIMESTAMP,
    [RenewedAt] DATETIME,
    CONSTRAINT [PK__Subscrip__3214EC0727A8D9DB] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[sysdiagrams] (
    [name] NVARCHAR(128) NOT NULL,
    [principal_id] INT NOT NULL,
    [diagram_id] INT NOT NULL IDENTITY(1,1),
    [version] INT,
    [definition] VARBINARY(max),
    CONSTRAINT [PK__sysdiagr__C2B05B6144327115] PRIMARY KEY CLUSTERED ([diagram_id]),
    CONSTRAINT [UK_principal_name] UNIQUE NONCLUSTERED ([principal_id],[name])
);

-- CreateTable
CREATE TABLE [dbo].[Users] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [Name] NVARCHAR(100),
    [GoogleID] NVARCHAR(100),
    [ProfilePic] NVARCHAR(100),
    [Email] NVARCHAR(150) NOT NULL,
    [PasswordHash] NVARCHAR(max),
    [IsVerified] BIT CONSTRAINT [DF__Users__IsVerifie__38996AB5] DEFAULT 0,
    [CreatedAt] DATETIME CONSTRAINT [DF__Users__CreatedAt__398D8EEE] DEFAULT CURRENT_TIMESTAMP,
    [Role] NVARCHAR(100),
    CONSTRAINT [PK__Users__3214EC07568AE5A4] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ__Users__A9D10534EFC25F9C] UNIQUE NONCLUSTERED ([Email])
);

-- CreateTable
CREATE TABLE [dbo].[Widgets] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [UserId] INT NOT NULL,
    [Type] NVARCHAR(50),
    [Config] NVARCHAR(max),
    [Position] INT,
    [CreatedAt] DATETIME CONSTRAINT [DF__Widgets__Created__4316F928] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK__Widgets__3214EC07143CB218] PRIMARY KEY CLUSTERED ([Id])
);

-- AddForeignKey
ALTER TABLE [dbo].[AuditLogs] ADD CONSTRAINT [FK__AuditLogs__UserI__534D60F1] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Integrations] ADD CONSTRAINT [FK__Integrati__UserI__47DBAE45] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Notifications] ADD CONSTRAINT [FK__Notificat__UserI__4F7CD00D] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Payments] ADD CONSTRAINT [FK__Payments__UserId__5629CD9C] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Reports] ADD CONSTRAINT [FK__Reports__UserId__4AB81AF0] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Subscriptions] ADD CONSTRAINT [FK__Subscript__UserI__5AEE82B9] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Widgets] ADD CONSTRAINT [FK__Widgets__UserId__440B1D61] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
