export function createInventoryController({ inventoryService }) {
  // Warehouses
  async function createWarehouse(req, res, next) {
    try {
      const data = await inventoryService.createWarehouse(req.body, req.user);
      res.status(201).json({ success: true, message: 'Tạo kho hàng thành công.', data });
    } catch (err) {
      next(err);
    }
  }

  async function getWarehouses(req, res, next) {
    try {
      const data = await inventoryService.getWarehouses(req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  // Suppliers
  async function createSupplier(req, res, next) {
    try {
      const data = await inventoryService.createSupplier(req.body, req.user);
      res.status(201).json({ success: true, message: 'Tạo nhà cung cấp thành công.', data });
    } catch (err) {
      next(err);
    }
  }

  async function getSuppliers(req, res, next) {
    try {
      const data = await inventoryService.getSuppliers(req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  // Items
  async function createItem(req, res, next) {
    try {
      const data = await inventoryService.createItem(req.body, req.user);
      res.status(201).json({ success: true, message: 'Tạo danh mục mặt hàng thành công.', data });
    } catch (err) {
      next(err);
    }
  }

  async function getItems(req, res, next) {
    try {
      const data = await inventoryService.getItems(req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  // Goods Receipts
  async function createGoodsReceipt(req, res, next) {
    try {
      const data = await inventoryService.createGoodsReceipt(req.body, req.user);
      res.status(201).json({ success: true, message: 'Nhập kho thành công.', data });
    } catch (err) {
      next(err);
    }
  }

  // FEFO & Dispense (AT-07)
  async function getAvailableLotsFEFO(req, res, next) {
    try {
      const { warehouseId, itemId } = req.query;
      const data = await inventoryService.getAvailableLotsFEFO(warehouseId, itemId, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async function dispenseStock(req, res, next) {
    try {
      const data = await inventoryService.dispenseStock(req.body, req.user);
      res.json({ success: true, message: 'Xuất kho theo FEFO thành công (AT-07).', data });
    } catch (err) {
      next(err);
    }
  }

  // Lot Recall (AT-08)
  async function recallLot(req, res, next) {
    try {
      const { stockLotId } = req.params;
      const data = await inventoryService.recallLot(stockLotId, req.body, req.user);
      res.status(201).json({ success: true, message: 'Ban hành quyết định thu hồi lô thành công (AT-08).', data });
    } catch (err) {
      next(err);
    }
  }

  async function traceLotUsage(req, res, next) {
    try {
      const { stockLotId } = req.params;
      const data = await inventoryService.traceLotUsage(stockLotId, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  // Serial Implant (AT-12)
  async function implantSerial(req, res, next) {
    try {
      const data = await inventoryService.implantSerial(req.body, req.user);
      res.json({ success: true, message: 'Ghi nhận cấy ghép Implant thành công (AT-12).', data });
    } catch (err) {
      next(err);
    }
  }

  // Balances
  async function getStockBalances(req, res, next) {
    try {
      const { warehouseId } = req.query;
      const data = await inventoryService.getStockBalances(warehouseId, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
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
