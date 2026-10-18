const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to SQL Server to apply warehouse schema updates...');

  // 1. Add columns to StockDocument if missing
  const alterStockDocCols = [
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('StockDocument') AND name = 'doctorId') ALTER TABLE StockDocument ADD doctorId INT NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('StockDocument') AND name = 'roomId') ALTER TABLE StockDocument ADD roomId INT NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('StockDocument') AND name = 'intakeId') ALTER TABLE StockDocument ADD intakeId INT NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('StockDocument') AND name = 'nonFefoReason') ALTER TABLE StockDocument ADD nonFefoReason NVARCHAR(500) NULL;`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('StockDocument') AND name = 'isLocked') ALTER TABLE StockDocument ADD isLocked BIT NOT NULL DEFAULT 0;`,
  ];
  for (const sql of alterStockDocCols) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log('StockDocument columns updated.');

  // 2. Update Decimal precision to (18, 4)
  await prisma.$executeRawUnsafe(`ALTER TABLE InventoryBatch ALTER COLUMN unitCost DECIMAL(18, 4) NOT NULL;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE StockAllocation ALTER COLUMN unitCost DECIMAL(18, 4) NOT NULL;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE StockLedgerEntry ALTER COLUMN unitCost DECIMAL(18, 4) NOT NULL;`);
  console.log('Decimal precision for unitCost updated to (18, 4).');

  // 3. Create 9 *Deleted backup tables if not exist
  const createDeletedTables = [
    `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SupplierDeleted')
     CREATE TABLE SupplierDeleted (
       id INT IDENTITY(1,1) PRIMARY KEY,
       originalId INT NULL,
       code VARCHAR(30) NOT NULL,
       name NVARCHAR(200) NOT NULL,
       phone VARCHAR(30) NULL,
       address NVARCHAR(500) NULL,
       taxCode VARCHAR(30) NULL,
       isActive BIT NOT NULL DEFAULT 1,
       createdAt DATETIME2 NULL,
       updatedAt DATETIME2 NULL,
       deletedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
       deletedBy NVARCHAR(100) NULL,
       deleteReason NVARCHAR(500) NULL
     );`,
    `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'InventoryBatchDeleted')
     CREATE TABLE InventoryBatchDeleted (
       id INT IDENTITY(1,1) PRIMARY KEY,
       originalId INT NULL,
       supplyId INT NOT NULL,
       batchNo VARCHAR(80) NULL,
       expiryDate DATE NULL,
       quantity DECIMAL(18, 4) NOT NULL,
       unitCost DECIMAL(18, 4) NOT NULL,
       originalReceiptCode VARCHAR(40) NULL,
       receivedAt DATETIME2 NULL,
       deletedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
       deletedBy NVARCHAR(100) NULL,
       deleteReason NVARCHAR(500) NULL
     );`,
    `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StockDocumentDeleted')
     CREATE TABLE StockDocumentDeleted (
       id INT IDENTITY(1,1) PRIMARY KEY,
       originalId INT NULL,
       code VARCHAR(40) NOT NULL,
       type VARCHAR(10) NOT NULL,
       outboundType VARCHAR(20) NULL,
       status VARCHAR(20) NOT NULL,
       supplierId INT NULL,
       patientId INT NULL,
       examinationId INT NULL,
       doctorId INT NULL,
       roomId INT NULL,
       intakeId INT NULL,
       recipientDepartment NVARCHAR(150) NULL,
       reason NVARCHAR(500) NULL,
       nonFefoReason NVARCHAR(500) NULL,
       goodsAmount INT NOT NULL DEFAULT 0,
       vatAmount INT NOT NULL DEFAULT 0,
       totalAmount INT NOT NULL DEFAULT 0,
       contentHash VARCHAR(128) NULL,
       printCount INT NOT NULL DEFAULT 0,
       isLocked BIT NOT NULL DEFAULT 0,
       createdById INT NULL,
       postedById INT NULL,
       printedAt DATETIME2 NULL,
       postedAt DATETIME2 NULL,
       cancelledAt DATETIME2 NULL,
       createdAt DATETIME2 NULL,
       updatedAt DATETIME2 NULL,
       deletedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
       deletedBy NVARCHAR(100) NULL,
       deleteReason NVARCHAR(500) NULL
     );`,
    `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StockDocumentLineDeleted')
     CREATE TABLE StockDocumentLineDeleted (
       id INT IDENTITY(1,1) PRIMARY KEY,
       originalId INT NULL,
       documentId INT NOT NULL,
       supplyId INT NOT NULL,
       inputQuantity DECIMAL(18, 4) NOT NULL,
       inputUnit NVARCHAR(50) NOT NULL,
       conversionFactor DECIMAL(18, 4) NOT NULL,
       convertedQuantity DECIMAL(18, 4) NOT NULL,
       batchNo VARCHAR(80) NULL,
       expiryDate DATE NULL,
       inputUnitPrice DECIMAL(18, 2) NOT NULL,
       vatRate DECIMAL(5, 2) NOT NULL,
       goodsAmount INT NOT NULL DEFAULT 0,
       vatAmount INT NOT NULL DEFAULT 0,
       totalAmount INT NOT NULL DEFAULT 0,
       deletedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
       deletedBy NVARCHAR(100) NULL,
       deleteReason NVARCHAR(500) NULL
     );`,
    `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StockAllocationDeleted')
     CREATE TABLE StockAllocationDeleted (
       id INT IDENTITY(1,1) PRIMARY KEY,
       originalId INT NULL,
       documentLineId INT NOT NULL,
       batchId INT NOT NULL,
       quantity DECIMAL(18, 4) NOT NULL,
       unitCost DECIMAL(18, 4) NOT NULL,
       amount INT NOT NULL,
       deletedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
       deletedBy NVARCHAR(100) NULL,
       deleteReason NVARCHAR(500) NULL
     );`,
    `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StockLedgerEntryDeleted')
     CREATE TABLE StockLedgerEntryDeleted (
       id INT IDENTITY(1,1) PRIMARY KEY,
       originalId INT NULL,
       documentId INT NOT NULL,
       documentLineId INT NOT NULL,
       supplyId INT NOT NULL,
       batchId INT NULL,
       direction VARCHAR(10) NOT NULL,
       quantity DECIMAL(18, 4) NOT NULL,
       unitCost DECIMAL(18, 4) NOT NULL,
       amount INT NOT NULL,
       balanceAfter DECIMAL(18, 4) NOT NULL,
       createdAt DATETIME2 NULL,
       deletedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
       deletedBy NVARCHAR(100) NULL,
       deleteReason NVARCHAR(500) NULL
     );`,
    `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WarehousePrintLogDeleted')
     CREATE TABLE WarehousePrintLogDeleted (
       id INT IDENTITY(1,1) PRIMARY KEY,
       originalId INT NULL,
       documentId INT NOT NULL,
       printedById INT NULL,
       contentHash VARCHAR(128) NOT NULL,
       isCopy BIT NOT NULL DEFAULT 0,
       printedAt DATETIME2 NULL,
       deletedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
       deletedBy NVARCHAR(100) NULL,
       deleteReason NVARCHAR(500) NULL
     );`,
    `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WarehouseAuditLogDeleted')
     CREATE TABLE WarehouseAuditLogDeleted (
       id INT IDENTITY(1,1) PRIMARY KEY,
       originalId INT NULL,
       documentId INT NOT NULL,
       action VARCHAR(50) NOT NULL,
       actorId INT NULL,
       changesJson NVARCHAR(MAX) NULL,
       createdAt DATETIME2 NULL,
       deletedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
       deletedBy NVARCHAR(100) NULL,
       deleteReason NVARCHAR(500) NULL
     );`,
    `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AccountingWarehouseEntryDeleted')
     CREATE TABLE AccountingWarehouseEntryDeleted (
       id INT IDENTITY(1,1) PRIMARY KEY,
       originalId INT NULL,
       documentId INT NOT NULL,
       eventType VARCHAR(40) NOT NULL,
       goodsAmount INT NOT NULL DEFAULT 0,
       vatAmount INT NOT NULL DEFAULT 0,
       totalAmount INT NOT NULL DEFAULT 0,
       payloadJson NVARCHAR(MAX) NOT NULL,
       status VARCHAR(20) NOT NULL,
       createdAt DATETIME2 NULL,
       sentAt DATETIME2 NULL,
       deletedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
       deletedBy NVARCHAR(100) NULL,
       deleteReason NVARCHAR(500) NULL
     );`,
  ];
  for (const sql of createDeletedTables) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log('Warehouse *Deleted tables created/verified.');

  // 4. Add CHECK constraints
  const checks = [
    `IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_InventoryBatch_quantity')
     ALTER TABLE InventoryBatch ADD CONSTRAINT CK_InventoryBatch_quantity CHECK ([quantity] >= 0);`,
    `IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_StockDocumentLine_qty')
     ALTER TABLE StockDocumentLine ADD CONSTRAINT CK_StockDocumentLine_qty CHECK ([inputQuantity] > 0 AND [convertedQuantity] > 0);`,
    `IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_StockDocumentLine_price')
     ALTER TABLE StockDocumentLine ADD CONSTRAINT CK_StockDocumentLine_price CHECK ([inputUnitPrice] >= 0);`,
    `IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_StockDocumentLine_vat')
     ALTER TABLE StockDocumentLine ADD CONSTRAINT CK_StockDocumentLine_vat CHECK ([vatRate] >= 0 AND [vatRate] <= 100);`,
  ];
  for (const sql of checks) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e) {
      console.warn('Constraint warning:', e.message);
    }
  }
  console.log('CHECK constraints applied.');

  console.log('Migration script completed successfully!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
