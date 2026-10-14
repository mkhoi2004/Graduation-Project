import { ApiError } from '../utils/api-error.js';

export function createInventoryService({ inventoryRepo, userRepo }) {
  function assertWarehouseRole(user, actionName = 'quản lý kho') {
    const allowed = ['ADMIN', 'WAREHOUSE'];
    if (!allowed.includes(user.role)) {
      throw new ApiError(403, 'WAREHOUSE_ROLE_REQUIRED', `Chỉ thủ kho hoặc quản trị viên mới được phép ${actionName}.`);
    }
  }

  function assertClinicalOrWarehouseRole(user, actionName = 'thao tác vật tư y tế') {
    const allowed = ['ADMIN', 'WAREHOUSE', 'DOCTOR'];
    if (!allowed.includes(user.role)) {
      throw new ApiError(403, 'PERMISSION_DENIED', `Bạn không có quyền ${actionName}.`);
    }
  }

  // Warehouses
  async function createWarehouse(payload, user) {
    assertWarehouseRole(user, 'tạo kho hàng');
    return inventoryRepo.createWarehouse(payload, user);
  }

  async function getWarehouses(user) {
    return inventoryRepo.getWarehouses();
  }

  // Suppliers
  async function createSupplier(payload, user) {
    assertWarehouseRole(user, 'tạo nhà cung cấp');
    return inventoryRepo.createSupplier(payload, user);
  }

  async function getSuppliers(user) {
    return inventoryRepo.getSuppliers();
  }

  // Items
  async function createItem(payload, user) {
    assertWarehouseRole(user, 'tạo mặt hàng/thuốc/vật tư');
    return inventoryRepo.createItem(payload, user);
  }

  async function getItems(user) {
    return inventoryRepo.getItems();
  }

  // Goods Receipts
  async function createGoodsReceipt(payload, user) {
    assertWarehouseRole(user, 'nhập kho hàng hóa');
    return inventoryRepo.createGoodsReceipt(payload, user);
  }

  // FEFO & Dispense (AT-07)
  async function getAvailableLotsFEFO(warehouseId, itemId, user) {
    return inventoryRepo.getAvailableLotsFEFO(warehouseId, itemId);
  }

  async function dispenseStock(payload, user) {
    assertClinicalOrWarehouseRole(user, 'xuất kho vật tư y tế/thuốc');
    return inventoryRepo.dispenseStock(payload, user);
  }

  // Lot Recall & Tracing (AT-08)
  async function recallLot(stockLotId, payload, user) {
    assertWarehouseRole(user, 'ban hành lệnh thu hồi lô hàng');
    return inventoryRepo.recallLot(stockLotId, payload, user);
  }

  async function traceLotUsage(stockLotId, user) {
    assertClinicalOrWarehouseRole(user, 'truy vết bệnh nhân đã sử dụng lô thuốc/vật tư');
    return inventoryRepo.traceLotUsage(stockLotId);
  }

  // Serial / Implant (AT-12)
  async function implantSerial(payload, user) {
    assertClinicalOrWarehouseRole(user, 'ghi nhận cấy ghép trụ Implant');
    return inventoryRepo.implantSerial(payload, user);
  }

  // Balances
  async function getStockBalances(warehouseId, user) {
    return inventoryRepo.getStockBalances(warehouseId);
  }

  return {
    createWarehouse,
    getWarehouses,
    createSupplier,
    getSuppliers,
    createItem,
    getItems,
    createGoodsReceipt,
    getAvailableLotsFEFO,
    dispenseStock,
    recallLot,
    traceLotUsage,
    implantSerial,
    getStockBalances,
  };
}
