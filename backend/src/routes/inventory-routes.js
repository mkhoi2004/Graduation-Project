import { Router } from 'express';

export function createInventoryRoutes({ inventoryController, authMiddlewares }) {
  const router = Router();
  const { authenticate } = authMiddlewares;

  router.use(authenticate);

  // Warehouses
  router.get('/warehouses', inventoryController.getWarehouses);
  router.post('/warehouses', inventoryController.createWarehouse);

  // Suppliers
  router.get('/suppliers', inventoryController.getSuppliers);
  router.post('/suppliers', inventoryController.createSupplier);

  // Items
  router.get('/items', inventoryController.getItems);
  router.post('/items', inventoryController.createItem);

  // Goods Receipts (Nhập kho)
  router.post('/receipts', inventoryController.createGoodsReceipt);

  // FEFO & Dispense (AT-07)
  router.get('/lots/fefo', inventoryController.getAvailableLotsFEFO);
  router.post('/dispense', inventoryController.dispenseStock);

  // Lot Recall & Tracing (AT-08)
  router.post('/lots/:stockLotId/recall', inventoryController.recallLot);
  router.get('/lots/:stockLotId/trace', inventoryController.traceLotUsage);

  // Serial Implant (AT-12)
  router.post('/serials/implant', inventoryController.implantSerial);

  // Balances
  router.get('/balances', inventoryController.getStockBalances);

  return router;
}
