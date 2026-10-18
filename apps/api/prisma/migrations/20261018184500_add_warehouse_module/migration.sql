BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[MedicalSupply] ADD [expiryWarningDays] INT NOT NULL CONSTRAINT [MedicalSupply_expiryWarningDays_df] DEFAULT 90,
[isBaseUnitDivisible] BIT NOT NULL CONSTRAINT [MedicalSupply_isBaseUnitDivisible_df] DEFAULT 0,
[minimumStock] INT NOT NULL CONSTRAINT [MedicalSupply_minimumStock_df] DEFAULT 10;

-- CreateTable
CREATE TABLE [dbo].[Supplier] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] VARCHAR(30) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [phone] VARCHAR(30),
    [address] NVARCHAR(500),
    [taxCode] VARCHAR(30),
    [isActive] BIT NOT NULL CONSTRAINT [Supplier_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Supplier_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Supplier_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Supplier_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[InventoryBatch] (
    [id] INT NOT NULL IDENTITY(1,1),
    [supplyId] INT NOT NULL,
    [batchNo] VARCHAR(80),
    [expiryDate] DATE,
    [quantity] DECIMAL(18,4) NOT NULL CONSTRAINT [InventoryBatch_quantity_df] DEFAULT 0,
    [unitCost] DECIMAL(18,2) NOT NULL CONSTRAINT [InventoryBatch_unitCost_df] DEFAULT 0,
    [originalReceiptCode] VARCHAR(40),
    [receivedAt] DATETIME2 NOT NULL CONSTRAINT [InventoryBatch_receivedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [InventoryBatch_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[StockDocument] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] VARCHAR(40) NOT NULL,
    [type] VARCHAR(10) NOT NULL,
    [outboundType] VARCHAR(20),
    [status] VARCHAR(20) NOT NULL CONSTRAINT [StockDocument_status_df] DEFAULT 'DRAFT',
    [supplierId] INT,
    [patientId] INT,
    [examinationId] INT,
    [recipientDepartment] NVARCHAR(150),
    [reason] NVARCHAR(500),
    [idempotencyKey] VARCHAR(100),
    [originalDocumentId] INT,
    [goodsAmount] INT NOT NULL CONSTRAINT [StockDocument_goodsAmount_df] DEFAULT 0,
    [vatAmount] INT NOT NULL CONSTRAINT [StockDocument_vatAmount_df] DEFAULT 0,
    [totalAmount] INT NOT NULL CONSTRAINT [StockDocument_totalAmount_df] DEFAULT 0,
    [contentHash] VARCHAR(128),
    [printCount] INT NOT NULL CONSTRAINT [StockDocument_printCount_df] DEFAULT 0,
    [createdById] INT,
    [postedById] INT,
    [printedAt] DATETIME2,
    [postedAt] DATETIME2,
    [cancelledAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [StockDocument_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [StockDocument_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [StockDocument_code_key] UNIQUE NONCLUSTERED ([code])
);

CREATE UNIQUE NONCLUSTERED INDEX [StockDocument_idempotencyKey_key]
ON [dbo].[StockDocument]([idempotencyKey])
WHERE [idempotencyKey] IS NOT NULL;

-- CreateTable
CREATE TABLE [dbo].[StockDocumentLine] (
    [id] INT NOT NULL IDENTITY(1,1),
    [documentId] INT NOT NULL,
    [supplyId] INT NOT NULL,
    [inputQuantity] DECIMAL(18,4) NOT NULL,
    [inputUnit] NVARCHAR(50) NOT NULL,
    [conversionFactor] DECIMAL(18,4) NOT NULL CONSTRAINT [StockDocumentLine_conversionFactor_df] DEFAULT 1,
    [convertedQuantity] DECIMAL(18,4) NOT NULL,
    [batchNo] VARCHAR(80),
    [expiryDate] DATE,
    [inputUnitPrice] DECIMAL(18,2) NOT NULL CONSTRAINT [StockDocumentLine_inputUnitPrice_df] DEFAULT 0,
    [vatRate] DECIMAL(5,2) NOT NULL CONSTRAINT [StockDocumentLine_vatRate_df] DEFAULT 0,
    [goodsAmount] INT NOT NULL CONSTRAINT [StockDocumentLine_goodsAmount_df] DEFAULT 0,
    [vatAmount] INT NOT NULL CONSTRAINT [StockDocumentLine_vatAmount_df] DEFAULT 0,
    [totalAmount] INT NOT NULL CONSTRAINT [StockDocumentLine_totalAmount_df] DEFAULT 0,
    CONSTRAINT [StockDocumentLine_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[StockAllocation] (
    [id] INT NOT NULL IDENTITY(1,1),
    [documentLineId] INT NOT NULL,
    [batchId] INT NOT NULL,
    [quantity] DECIMAL(18,4) NOT NULL,
    [unitCost] DECIMAL(18,2) NOT NULL,
    [amount] INT NOT NULL,
    CONSTRAINT [StockAllocation_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[StockLedgerEntry] (
    [id] INT NOT NULL IDENTITY(1,1),
    [documentId] INT NOT NULL,
    [documentLineId] INT NOT NULL,
    [supplyId] INT NOT NULL,
    [batchId] INT,
    [direction] VARCHAR(10) NOT NULL,
    [quantity] DECIMAL(18,4) NOT NULL,
    [unitCost] DECIMAL(18,2) NOT NULL,
    [amount] INT NOT NULL,
    [balanceAfter] DECIMAL(18,4) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [StockLedgerEntry_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [StockLedgerEntry_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WarehousePrintLog] (
    [id] INT NOT NULL IDENTITY(1,1),
    [documentId] INT NOT NULL,
    [printedById] INT,
    [contentHash] VARCHAR(128) NOT NULL,
    [isCopy] BIT NOT NULL CONSTRAINT [WarehousePrintLog_isCopy_df] DEFAULT 0,
    [printedAt] DATETIME2 NOT NULL CONSTRAINT [WarehousePrintLog_printedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [WarehousePrintLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[WarehouseAuditLog] (
    [id] INT NOT NULL IDENTITY(1,1),
    [documentId] INT NOT NULL,
    [action] VARCHAR(50) NOT NULL,
    [actorId] INT,
    [changesJson] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [WarehouseAuditLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [WarehouseAuditLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AccountingWarehouseEntry] (
    [id] INT NOT NULL IDENTITY(1,1),
    [documentId] INT NOT NULL,
    [eventType] VARCHAR(40) NOT NULL,
    [goodsAmount] INT NOT NULL CONSTRAINT [AccountingWarehouseEntry_goodsAmount_df] DEFAULT 0,
    [vatAmount] INT NOT NULL CONSTRAINT [AccountingWarehouseEntry_vatAmount_df] DEFAULT 0,
    [totalAmount] INT NOT NULL CONSTRAINT [AccountingWarehouseEntry_totalAmount_df] DEFAULT 0,
    [payloadJson] NVARCHAR(max) NOT NULL,
    [status] VARCHAR(20) NOT NULL CONSTRAINT [AccountingWarehouseEntry_status_df] DEFAULT 'PENDING',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AccountingWarehouseEntry_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [sentAt] DATETIME2,
    CONSTRAINT [AccountingWarehouseEntry_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [InventoryBatch_supplyId_expiryDate_receivedAt_idx] ON [dbo].[InventoryBatch]([supplyId], [expiryDate], [receivedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [InventoryBatch_quantity_idx] ON [dbo].[InventoryBatch]([quantity]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StockDocument_type_status_createdAt_idx] ON [dbo].[StockDocument]([type], [status], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StockDocument_examinationId_idx] ON [dbo].[StockDocument]([examinationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StockDocumentLine_documentId_idx] ON [dbo].[StockDocumentLine]([documentId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StockDocumentLine_supplyId_idx] ON [dbo].[StockDocumentLine]([supplyId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StockAllocation_batchId_idx] ON [dbo].[StockAllocation]([batchId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StockLedgerEntry_supplyId_createdAt_idx] ON [dbo].[StockLedgerEntry]([supplyId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StockLedgerEntry_documentId_idx] ON [dbo].[StockLedgerEntry]([documentId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WarehousePrintLog_documentId_printedAt_idx] ON [dbo].[WarehousePrintLog]([documentId], [printedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WarehouseAuditLog_documentId_createdAt_idx] ON [dbo].[WarehouseAuditLog]([documentId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AccountingWarehouseEntry_status_createdAt_idx] ON [dbo].[AccountingWarehouseEntry]([status], [createdAt]);

-- AddForeignKey
ALTER TABLE [dbo].[InventoryBatch] ADD CONSTRAINT [InventoryBatch_supplyId_fkey] FOREIGN KEY ([supplyId]) REFERENCES [dbo].[MedicalSupply]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StockDocument] ADD CONSTRAINT [StockDocument_supplierId_fkey] FOREIGN KEY ([supplierId]) REFERENCES [dbo].[Supplier]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StockDocument] ADD CONSTRAINT [StockDocument_originalDocumentId_fkey] FOREIGN KEY ([originalDocumentId]) REFERENCES [dbo].[StockDocument]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StockDocumentLine] ADD CONSTRAINT [StockDocumentLine_documentId_fkey] FOREIGN KEY ([documentId]) REFERENCES [dbo].[StockDocument]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StockDocumentLine] ADD CONSTRAINT [StockDocumentLine_supplyId_fkey] FOREIGN KEY ([supplyId]) REFERENCES [dbo].[MedicalSupply]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StockAllocation] ADD CONSTRAINT [StockAllocation_documentLineId_fkey] FOREIGN KEY ([documentLineId]) REFERENCES [dbo].[StockDocumentLine]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StockAllocation] ADD CONSTRAINT [StockAllocation_batchId_fkey] FOREIGN KEY ([batchId]) REFERENCES [dbo].[InventoryBatch]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StockLedgerEntry] ADD CONSTRAINT [StockLedgerEntry_documentId_fkey] FOREIGN KEY ([documentId]) REFERENCES [dbo].[StockDocument]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StockLedgerEntry] ADD CONSTRAINT [StockLedgerEntry_documentLineId_fkey] FOREIGN KEY ([documentLineId]) REFERENCES [dbo].[StockDocumentLine]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StockLedgerEntry] ADD CONSTRAINT [StockLedgerEntry_supplyId_fkey] FOREIGN KEY ([supplyId]) REFERENCES [dbo].[MedicalSupply]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StockLedgerEntry] ADD CONSTRAINT [StockLedgerEntry_batchId_fkey] FOREIGN KEY ([batchId]) REFERENCES [dbo].[InventoryBatch]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WarehousePrintLog] ADD CONSTRAINT [WarehousePrintLog_documentId_fkey] FOREIGN KEY ([documentId]) REFERENCES [dbo].[StockDocument]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WarehouseAuditLog] ADD CONSTRAINT [WarehouseAuditLog_documentId_fkey] FOREIGN KEY ([documentId]) REFERENCES [dbo].[StockDocument]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AccountingWarehouseEntry] ADD CONSTRAINT [AccountingWarehouseEntry_documentId_fkey] FOREIGN KEY ([documentId]) REFERENCES [dbo].[StockDocument]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Preserve operational stock from the legacy aggregate column as opening batches.
INSERT INTO [dbo].[InventoryBatch] ([supplyId], [batchNo], [quantity], [unitCost], [originalReceiptCode], [receivedAt])
SELECT m.[id], CONCAT('OPENING-', m.[code]), CAST(m.[inStock] AS DECIMAL(18,4)), CAST(m.[costPrice] AS DECIMAL(18,2)), 'MIGRATION-OPENING', CURRENT_TIMESTAMP
FROM [dbo].[MedicalSupply] m
WHERE m.[inStock] > 0 AND NOT EXISTS (SELECT 1 FROM [dbo].[InventoryBatch] b WHERE b.[supplyId] = m.[id]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
