SELECT TOP (0) * INTO dbo.Rooms_Deleted FROM dbo.Rooms;
ALTER TABLE dbo.Rooms_Deleted DROP COLUMN Version; ALTER TABLE dbo.Rooms_Deleted ADD Version BINARY(8) NOT NULL;
ALTER TABLE dbo.Rooms_Deleted ADD DeletedAt DATETIME2 NOT NULL CONSTRAINT DF_Rooms_Deleted_At DEFAULT SYSUTCDATETIME(), DeletedBy VARCHAR(100) NOT NULL;
CREATE INDEX IX_Rooms_Deleted_Id ON dbo.Rooms_Deleted(RoomId, DeletedAt);

SELECT TOP (0) * INTO dbo.Services_Deleted FROM dbo.Services;
ALTER TABLE dbo.Services_Deleted DROP COLUMN Version; ALTER TABLE dbo.Services_Deleted ADD Version BINARY(8) NOT NULL;
ALTER TABLE dbo.Services_Deleted ADD DeletedAt DATETIME2 NOT NULL CONSTRAINT DF_Services_Deleted_At DEFAULT SYSUTCDATETIME(), DeletedBy VARCHAR(100) NOT NULL;
CREATE INDEX IX_Services_Deleted_Id ON dbo.Services_Deleted(ServiceId, DeletedAt);

SELECT TOP (0) * INTO dbo.Suppliers_Deleted FROM dbo.Suppliers;
ALTER TABLE dbo.Suppliers_Deleted DROP COLUMN Version; ALTER TABLE dbo.Suppliers_Deleted ADD Version BINARY(8) NOT NULL;
ALTER TABLE dbo.Suppliers_Deleted ADD DeletedAt DATETIME2 NOT NULL CONSTRAINT DF_Suppliers_Deleted_At DEFAULT SYSUTCDATETIME(), DeletedBy VARCHAR(100) NOT NULL;
CREATE INDEX IX_Suppliers_Deleted_Id ON dbo.Suppliers_Deleted(SupplierId, DeletedAt);

SELECT TOP (0) * INTO dbo.ConsentTemplates_Deleted FROM dbo.ConsentTemplates;
ALTER TABLE dbo.ConsentTemplates_Deleted DROP COLUMN Version; ALTER TABLE dbo.ConsentTemplates_Deleted ADD Version BINARY(8) NOT NULL;
ALTER TABLE dbo.ConsentTemplates_Deleted ADD DeletedAt DATETIME2 NOT NULL CONSTRAINT DF_ConsentTemplates_Deleted_At DEFAULT SYSUTCDATETIME(), DeletedBy VARCHAR(100) NOT NULL;
CREATE INDEX IX_ConsentTemplates_Deleted_Id ON dbo.ConsentTemplates_Deleted(ConsentTemplateId, DeletedAt);

SELECT TOP (0) * INTO dbo.Patients_Deleted FROM dbo.Patients;
ALTER TABLE dbo.Patients_Deleted DROP COLUMN Version; ALTER TABLE dbo.Patients_Deleted ADD Version BINARY(8) NOT NULL;
ALTER TABLE dbo.Patients_Deleted ADD DeletedAt DATETIME2 NOT NULL CONSTRAINT DF_Patients_Deleted_At DEFAULT SYSUTCDATETIME(), DeletedBy VARCHAR(100) NOT NULL;
CREATE INDEX IX_Patients_Deleted_Id ON dbo.Patients_Deleted(PatientId, DeletedAt);

SELECT TOP (0) * INTO dbo.Appointments_Deleted FROM dbo.Appointments;
ALTER TABLE dbo.Appointments_Deleted DROP COLUMN Version; ALTER TABLE dbo.Appointments_Deleted ADD Version BINARY(8) NOT NULL;
ALTER TABLE dbo.Appointments_Deleted ADD DeletedAt DATETIME2 NOT NULL CONSTRAINT DF_Appointments_Deleted_At DEFAULT SYSUTCDATETIME(), DeletedBy VARCHAR(100) NOT NULL;
CREATE INDEX IX_Appointments_Deleted_Id ON dbo.Appointments_Deleted(AppointmentId, DeletedAt);

SELECT TOP (0) * INTO dbo.Warehouses_Deleted FROM dbo.Warehouses;
ALTER TABLE dbo.Warehouses_Deleted DROP COLUMN Version; ALTER TABLE dbo.Warehouses_Deleted ADD Version BINARY(8) NOT NULL;
ALTER TABLE dbo.Warehouses_Deleted ADD DeletedAt DATETIME2 NOT NULL CONSTRAINT DF_Warehouses_Deleted_At DEFAULT SYSUTCDATETIME(), DeletedBy VARCHAR(100) NOT NULL;
CREATE INDEX IX_Warehouses_Deleted_Id ON dbo.Warehouses_Deleted(WarehouseId, DeletedAt);

SELECT TOP (0) * INTO dbo.Items_Deleted FROM dbo.Items;
ALTER TABLE dbo.Items_Deleted DROP COLUMN Version; ALTER TABLE dbo.Items_Deleted ADD Version BINARY(8) NOT NULL;
ALTER TABLE dbo.Items_Deleted ADD DeletedAt DATETIME2 NOT NULL CONSTRAINT DF_Items_Deleted_At DEFAULT SYSUTCDATETIME(), DeletedBy VARCHAR(100) NOT NULL;
CREATE INDEX IX_Items_Deleted_Id ON dbo.Items_Deleted(ItemId, DeletedAt);

SELECT TOP (0) * INTO dbo.Assets_Deleted FROM dbo.Assets;
ALTER TABLE dbo.Assets_Deleted DROP COLUMN Version; ALTER TABLE dbo.Assets_Deleted ADD Version BINARY(8) NOT NULL;
ALTER TABLE dbo.Assets_Deleted ADD DeletedAt DATETIME2 NOT NULL CONSTRAINT DF_Assets_Deleted_At DEFAULT SYSUTCDATETIME(), DeletedBy VARCHAR(100) NOT NULL;
CREATE INDEX IX_Assets_Deleted_Id ON dbo.Assets_Deleted(AssetId, DeletedAt);
