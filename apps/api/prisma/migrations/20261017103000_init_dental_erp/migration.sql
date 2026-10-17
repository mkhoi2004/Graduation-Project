BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[Role] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] VARCHAR(50) NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Role_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Role_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Role_code_key] UNIQUE NONCLUSTERED ([code])
);

CREATE TABLE [dbo].[User] (
    [id] INT NOT NULL IDENTITY(1,1),
    [username] VARCHAR(50) NOT NULL,
    [fullName] NVARCHAR(150) NOT NULL,
    [passwordHash] VARCHAR(255) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [User_isActive_df] DEFAULT 1,
    [roleId] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_username_key] UNIQUE NONCLUSTERED ([username]),
    CONSTRAINT [User_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[Role]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE [dbo].[Payment] (
    [id] INT NOT NULL IDENTITY(1,1),
    [intakeCode] VARCHAR(50) NOT NULL,
    [orderId] VARCHAR(100) NOT NULL,
    [requestId] VARCHAR(100) NOT NULL,
    [partnerCode] VARCHAR(50) NOT NULL,
    [method] VARCHAR(20) NOT NULL,
    [status] VARCHAR(20) NOT NULL,
    [amount] INT NOT NULL,
    [gatewayPayload] NVARCHAR(MAX),
    [paidAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Payment_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Payment_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Payment_orderId_key] UNIQUE NONCLUSTERED ([orderId]),
    CONSTRAINT [Payment_requestId_key] UNIQUE NONCLUSTERED ([requestId])
);

CREATE NONCLUSTERED INDEX [User_roleId_idx] ON [dbo].[User]([roleId]);
CREATE NONCLUSTERED INDEX [Payment_intakeCode_idx] ON [dbo].[Payment]([intakeCode]);

COMMIT TRAN;

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRAN;
    THROW;
END CATCH
