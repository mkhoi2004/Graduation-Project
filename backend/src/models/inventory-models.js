import { DataTypes } from 'sequelize';

export function initInventoryModels(sequelize, userModels, patientVisitModels, clinicalModels) {
  const { User, Branch } = userModels;
  const { Visit } = patientVisitModels;
  const { ServiceCompletionEvent } = clinicalModels;

  const Warehouse = sequelize.define('Warehouses', {
    warehouseId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'WarehouseId',
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'BranchId',
    },
    code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      field: 'Code',
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'Name',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'IsActive',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'CreatedAt',
    },
    createdBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'CreatedBy',
    },
  }, {
    tableName: 'Warehouses',
    timestamps: false,
  });

  const Supplier = sequelize.define('Suppliers', {
    supplierId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'SupplierId',
    },
    code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      field: 'Code',
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'Name',
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'Phone',
    },
    taxCode: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'TaxCode',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'IsActive',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'CreatedAt',
    },
    createdBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'CreatedBy',
    },
  }, {
    tableName: 'Suppliers',
    timestamps: false,
  });

  const Item = sequelize.define('Items', {
    itemId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'ItemId',
    },
    code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      field: 'Code',
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'Name',
    },
    baseUnit: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'BaseUnit',
    },
    conversionFactor: {
      type: DataTypes.DECIMAL(18, 4),
      defaultValue: 1,
      field: 'ConversionFactor',
    },
    isSerialized: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'IsSerialized',
    },
    requiresLot: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'RequiresLot',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'IsActive',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'CreatedAt',
    },
    createdBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'CreatedBy',
    },
  }, {
    tableName: 'Items',
    timestamps: false,
  });

  const GoodsReceipt = sequelize.define('GoodsReceipts', {
    goodsReceiptId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'GoodsReceiptId',
    },
    receiptNo: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
      field: 'ReceiptNo',
    },
    warehouseId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'WarehouseId',
    },
    supplierId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'SupplierId',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'POSTED',
      field: 'Status',
    },
    receivedAt: {
      type: DataTypes.DATE,
      field: 'ReceivedAt',
    },
    inspectedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'InspectedBy',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'CreatedAt',
    },
    createdBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'CreatedBy',
    },
  }, {
    tableName: 'GoodsReceipts',
    timestamps: false,
  });

  const StockLot = sequelize.define('StockLots', {
    stockLotId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'StockLotId',
    },
    itemId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'ItemId',
    },
    warehouseId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'WarehouseId',
    },
    goodsReceiptId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'GoodsReceiptId',
    },
    lotNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'LotNumber',
    },
    expiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'ExpiryDate',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'RELEASED',
      field: 'Status',
    },
    unitCost: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'UnitCost',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'CreatedAt',
    },
    createdBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'CreatedBy',
    },
  }, {
    tableName: 'StockLots',
    timestamps: false,
  });

  const StockBalance = sequelize.define('StockBalances', {
    stockBalanceId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'StockBalanceId',
    },
    warehouseId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'WarehouseId',
    },
    itemId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'ItemId',
    },
    stockLotId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'StockLotId',
    },
    onHand: {
      type: DataTypes.DECIMAL(18, 4),
      defaultValue: 0,
      field: 'OnHand',
    },
    reserved: {
      type: DataTypes.DECIMAL(18, 4),
      defaultValue: 0,
      field: 'Reserved',
    },
    quarantined: {
      type: DataTypes.DECIMAL(18, 4),
      defaultValue: 0,
      field: 'Quarantined',
    },
    blocked: {
      type: DataTypes.DECIMAL(18, 4),
      defaultValue: 0,
      field: 'Blocked',
    },
    available: {
      type: DataTypes.DECIMAL(18, 4),
      field: 'Available',
      // Computed column in SQL Server
    },
  }, {
    tableName: 'StockBalances',
    timestamps: false,
  });

  const StockSerial = sequelize.define('StockSerials', {
    stockSerialId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'StockSerialId',
    },
    stockLotId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'StockLotId',
    },
    serialNumber: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: 'SerialNumber',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'AVAILABLE',
      field: 'Status',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'CreatedAt',
    },
    createdBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'CreatedBy',
    },
  }, {
    tableName: 'StockSerials',
    timestamps: false,
  });

  const StockMovement = sequelize.define('StockMovements', {
    stockMovementId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'StockMovementId',
    },
    warehouseId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'WarehouseId',
    },
    itemId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'ItemId',
    },
    stockLotId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'StockLotId',
    },
    stockSerialId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'StockSerialId',
    },
    stockReservationId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'StockReservationId',
    },
    movementType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: 'MovementType',
    },
    quantity: {
      type: DataTypes.DECIMAL(18, 4),
      allowNull: false,
      field: 'Quantity',
    },
    unitCost: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
      field: 'UnitCost',
    },
    sourceEventId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'SourceEventId',
    },
    originalId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'OriginalId',
    },
    occurredAt: {
      type: DataTypes.DATE,
      field: 'OccurredAt',
    },
    createdBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'CreatedBy',
    },
  }, {
    tableName: 'StockMovements',
    timestamps: false,
  });

  const LotRecall = sequelize.define('LotRecalls', {
    lotRecallId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'LotRecallId',
    },
    stockLotId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'StockLotId',
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'Reason',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'OPEN',
      field: 'Status',
    },
    initiatedAt: {
      type: DataTypes.DATE,
      field: 'InitiatedAt',
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'ClosedAt',
    },
    createdBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'CreatedBy',
    },
  }, {
    tableName: 'LotRecalls',
    timestamps: false,
  });

  // Relationships
  Warehouse.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
  Warehouse.hasMany(StockBalance, { foreignKey: 'warehouseId', as: 'balances' });
  Warehouse.hasMany(StockLot, { foreignKey: 'warehouseId', as: 'lots' });

  GoodsReceipt.belongsTo(Warehouse, { foreignKey: 'warehouseId', as: 'warehouse' });
  GoodsReceipt.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });
  GoodsReceipt.belongsTo(User, { foreignKey: 'inspectedBy', as: 'inspector' });
  GoodsReceipt.hasMany(StockLot, { foreignKey: 'goodsReceiptId', as: 'lots' });

  StockLot.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });
  StockLot.belongsTo(Warehouse, { foreignKey: 'warehouseId', as: 'warehouse' });
  StockLot.belongsTo(GoodsReceipt, { foreignKey: 'goodsReceiptId', as: 'goodsReceipt' });
  StockLot.hasMany(StockSerial, { foreignKey: 'stockLotId', as: 'serials' });
  StockLot.hasMany(LotRecall, { foreignKey: 'stockLotId', as: 'recalls' });
  StockLot.hasMany(StockBalance, { foreignKey: 'stockLotId', as: 'balances' });
  StockLot.hasMany(StockMovement, { foreignKey: 'stockLotId', as: 'movements' });

  StockSerial.belongsTo(StockLot, { foreignKey: 'stockLotId', as: 'lot' });
  StockSerial.hasMany(StockMovement, { foreignKey: 'stockSerialId', as: 'movements' });

  StockBalance.belongsTo(Warehouse, { foreignKey: 'warehouseId', as: 'warehouse' });
  StockBalance.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });
  StockBalance.belongsTo(StockLot, { foreignKey: 'stockLotId', as: 'lot' });

  StockMovement.belongsTo(Warehouse, { foreignKey: 'warehouseId', as: 'warehouse' });
  StockMovement.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });
  StockMovement.belongsTo(StockLot, { foreignKey: 'stockLotId', as: 'lot' });
  StockMovement.belongsTo(StockSerial, { foreignKey: 'stockSerialId', as: 'serial' });

  LotRecall.belongsTo(StockLot, { foreignKey: 'stockLotId', as: 'lot' });

  return {
    Warehouse,
    Supplier,
    Item,
    GoodsReceipt,
    StockLot,
    StockBalance,
    StockSerial,
    StockMovement,
    LotRecall,
  };
}
