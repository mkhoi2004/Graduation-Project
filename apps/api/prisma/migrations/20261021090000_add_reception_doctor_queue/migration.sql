BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[Intake] ADD
    [priorityReason] NVARCHAR(500),
    [roomOverrideReason] NVARCHAR(500);

UPDATE [dbo].[Intake]
SET [priority] = N'Thường', [priorityReason] = NULL
WHERE [priority] NOT IN (N'Thường', N'Ưu tiên');

ALTER TABLE [dbo].[Intake]
ADD CONSTRAINT [Intake_priority_check]
CHECK ([priority] IN (N'Thường', N'Ưu tiên'));

CREATE TABLE [dbo].[RoomQueueCounter] (
    [id] INT NOT NULL IDENTITY(1,1),
    [businessDate] DATE NOT NULL,
    [roomId] INT NOT NULL,
    [lastIssuedNumber] INT NOT NULL CONSTRAINT [RoomQueueCounter_lastIssuedNumber_df] DEFAULT 0,
    [currentTicketId] INT,
    [currentNumber] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RoomQueueCounter_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [RoomQueueCounter_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RoomQueueCounter_businessDate_roomId_key] UNIQUE NONCLUSTERED ([businessDate], [roomId]),
    CONSTRAINT [RoomQueueCounter_lastIssuedNumber_check] CHECK ([lastIssuedNumber] BETWEEN 0 AND 9999),
    CONSTRAINT [RoomQueueCounter_currentNumber_check] CHECK ([currentNumber] IS NULL OR [currentNumber] BETWEEN 1 AND 9999),
    CONSTRAINT [RoomQueueCounter_roomId_fkey] FOREIGN KEY ([roomId]) REFERENCES [dbo].[ClinicRoom]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE [dbo].[QueueTicket] (
    [id] INT NOT NULL IDENTITY(1,1),
    [intakeId] INT NOT NULL,
    [businessDate] DATE NOT NULL,
    [roomId] INT NOT NULL,
    [queueNumber] INT NOT NULL,
    [status] VARCHAR(20) NOT NULL CONSTRAINT [QueueTicket_status_df] DEFAULT 'WAITING',
    [issuedById] INT,
    [issuedAt] DATETIME2 NOT NULL CONSTRAINT [QueueTicket_issuedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [calledAt] DATETIME2,
    [absentAt] DATETIME2,
    [cancelledAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [QueueTicket_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [QueueTicket_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [QueueTicket_intakeId_key] UNIQUE NONCLUSTERED ([intakeId]),
    CONSTRAINT [QueueTicket_businessDate_roomId_queueNumber_key] UNIQUE NONCLUSTERED ([businessDate], [roomId], [queueNumber]),
    CONSTRAINT [QueueTicket_queueNumber_check] CHECK ([queueNumber] BETWEEN 1 AND 9999),
    CONSTRAINT [QueueTicket_status_check] CHECK ([status] IN ('WAITING', 'CALLED', 'COMPLETED', 'STOPPED', 'ABSENT', 'CANCELLED')),
    CONSTRAINT [QueueTicket_intakeId_fkey] FOREIGN KEY ([intakeId]) REFERENCES [dbo].[Intake]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [QueueTicket_roomId_fkey] FOREIGN KEY ([roomId]) REFERENCES [dbo].[ClinicRoom]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [QueueTicket_issuedById_fkey] FOREIGN KEY ([issuedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE [dbo].[QueueCallHistory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ticketId] INT NOT NULL,
    [action] VARCHAR(40) NOT NULL,
    [actorId] INT,
    [occurredAt] DATETIME2 NOT NULL CONSTRAINT [QueueCallHistory_occurredAt_df] DEFAULT CURRENT_TIMESTAMP,
    [metadataJson] NVARCHAR(MAX),
    CONSTRAINT [QueueCallHistory_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [QueueCallHistory_action_check] CHECK ([action] IN ('CALL', 'AUTO_CALL_AFTER_ABSENT', 'ABSENT')),
    CONSTRAINT [QueueCallHistory_ticketId_fkey] FOREIGN KEY ([ticketId]) REFERENCES [dbo].[QueueTicket]([id]) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT [QueueCallHistory_actorId_fkey] FOREIGN KEY ([actorId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE [dbo].[IntakePrintHistory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [intakeId] INT NOT NULL,
    [printedById] INT,
    [printedAt] DATETIME2 NOT NULL CONSTRAINT [IntakePrintHistory_printedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [isCopy] BIT NOT NULL CONSTRAINT [IntakePrintHistory_isCopy_df] DEFAULT 0,
    [contentSnapshot] NVARCHAR(MAX) NOT NULL,
    CONSTRAINT [IntakePrintHistory_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [IntakePrintHistory_intakeId_fkey] FOREIGN KEY ([intakeId]) REFERENCES [dbo].[Intake]([id]) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT [IntakePrintHistory_printedById_fkey] FOREIGN KEY ([printedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE [dbo].[IntakeAuditLog] (
    [id] INT NOT NULL IDENTITY(1,1),
    [intakeId] INT NOT NULL,
    [action] VARCHAR(50) NOT NULL,
    [actorId] INT,
    [reason] NVARCHAR(500),
    [changesJson] NVARCHAR(MAX),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [IntakeAuditLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [IntakeAuditLog_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [IntakeAuditLog_intakeId_fkey] FOREIGN KEY ([intakeId]) REFERENCES [dbo].[Intake]([id]) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT [IntakeAuditLog_actorId_fkey] FOREIGN KEY ([actorId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE NONCLUSTERED INDEX [RoomQueueCounter_roomId_businessDate_idx] ON [dbo].[RoomQueueCounter]([roomId], [businessDate]);
CREATE NONCLUSTERED INDEX [QueueTicket_businessDate_roomId_status_queueNumber_idx] ON [dbo].[QueueTicket]([businessDate], [roomId], [status], [queueNumber]);
CREATE NONCLUSTERED INDEX [QueueTicket_issuedById_idx] ON [dbo].[QueueTicket]([issuedById]);
CREATE NONCLUSTERED INDEX [QueueCallHistory_ticketId_occurredAt_idx] ON [dbo].[QueueCallHistory]([ticketId], [occurredAt]);
CREATE NONCLUSTERED INDEX [QueueCallHistory_actorId_idx] ON [dbo].[QueueCallHistory]([actorId]);
CREATE NONCLUSTERED INDEX [IntakePrintHistory_intakeId_printedAt_idx] ON [dbo].[IntakePrintHistory]([intakeId], [printedAt]);
CREATE NONCLUSTERED INDEX [IntakePrintHistory_printedById_idx] ON [dbo].[IntakePrintHistory]([printedById]);
CREATE NONCLUSTERED INDEX [IntakeAuditLog_intakeId_createdAt_idx] ON [dbo].[IntakeAuditLog]([intakeId], [createdAt]);
CREATE NONCLUSTERED INDEX [IntakeAuditLog_actorId_idx] ON [dbo].[IntakeAuditLog]([actorId]);

DECLARE @businessDate DATE = CAST((SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'SE Asia Standard Time') AS DATE);

;WITH ActiveQueue AS (
    SELECT
        i.[id] AS [intakeId],
        i.[roomId],
        i.[createdById] AS [issuedById],
        COALESCE(i.[transferredAt], i.[createdAt]) AS [issuedAt],
        i.[status],
        ROW_NUMBER() OVER (
            PARTITION BY i.[roomId]
            ORDER BY COALESCE(i.[transferredAt], i.[createdAt]), i.[id]
        ) AS [queueNumber]
    FROM [dbo].[Intake] i
    WHERE i.[roomId] IS NOT NULL
      AND i.[status] IN ('TRANSFERRED', 'IN_PROGRESS')
      AND CAST((COALESCE(i.[transferredAt], i.[createdAt]) AT TIME ZONE 'UTC' AT TIME ZONE 'SE Asia Standard Time') AS DATE) = @businessDate
)
INSERT INTO [dbo].[QueueTicket] (
    [intakeId], [businessDate], [roomId], [queueNumber], [status], [issuedById],
    [issuedAt], [calledAt], [createdAt], [updatedAt]
)
SELECT
    [intakeId], @businessDate, [roomId], [queueNumber],
    CASE WHEN [status] = 'IN_PROGRESS' THEN 'CALLED' ELSE 'WAITING' END,
    [issuedById], [issuedAt],
    CASE WHEN [status] = 'IN_PROGRESS' THEN SYSUTCDATETIME() ELSE NULL END,
    SYSUTCDATETIME(), SYSUTCDATETIME()
FROM ActiveQueue;

INSERT INTO [dbo].[RoomQueueCounter] (
    [businessDate], [roomId], [lastIssuedNumber], [currentTicketId], [currentNumber], [createdAt], [updatedAt]
)
SELECT
    q.[businessDate], q.[roomId], q.[lastIssuedNumber],
    currentCall.[id], currentCall.[queueNumber],
    SYSUTCDATETIME(), SYSUTCDATETIME()
FROM (
    SELECT [businessDate], [roomId], MAX([queueNumber]) AS [lastIssuedNumber]
    FROM [dbo].[QueueTicket]
    WHERE [businessDate] = @businessDate
    GROUP BY [businessDate], [roomId]
) q
OUTER APPLY (
    SELECT TOP (1) called.[id], called.[queueNumber]
    FROM [dbo].[QueueTicket] called
    WHERE called.[businessDate] = q.[businessDate]
      AND called.[roomId] = q.[roomId]
      AND called.[status] = 'CALLED'
    ORDER BY called.[calledAt] DESC, called.[id] DESC
) currentCall;

COMMIT TRAN;

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRAN;
    THROW;
END CATCH
