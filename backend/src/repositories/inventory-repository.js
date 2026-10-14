import crypto from 'node:crypto';
import { Op } from 'sequelize';
import { ApiError } from '../utils/api-error.js';
import { setSessionUser } from '../utils/session-context.js';

export function createInventoryRepository({
  sequelize,
  models,
  userModels,
  patientVisitModels,
  clinicalModels,
}) {
  const {
    Warehouse,
    Supplier,
    Item,
    GoodsReceipt,
    StockLot,
    StockBalance,
    StockSerial,
    StockMovement,
    LotRecall,
  } = models;

  const { ServiceCompletionEvent, ServiceLine } = clinicalModels;
  const { Visit, Patient } = patientVisitModels;
  const { User } = userModels;

  // --- Warehouses & Suppliers ---
  async function createWarehouse(payload, user) {
    const { branchId, code, name } = payload;
    return Warehouse.create({
      branchId,
      code,
      name,
      isActive: true,
      createdAt: new Date(),
      createdBy: user.username,
    });
  }

  async function getWarehouses() {
    return Warehouse.findAll({ order: [['code', 'ASC']] });
  }

  async function createSupplier(payload, user) {
    const { code, name, phone, taxCode } = payload;
    return Supplier.create({
      code,
      name,
      phone,
      taxCode,
      isActive: true,
      createdAt: new Date(),
      createdBy: user.username,
    });
  }

  async function getSuppliers() {
    return Supplier.findAll({ order: [['name', 'ASC']] });
  }

  // --- Items ---
  async function createItem(payload, user) {
    const { code, name, baseUnit, conversionFactor = 1, isSerialized = false, requiresLot = false } = payload;
    return Item.create({
      code,
      name,
      baseUnit,
      conversionFactor,
      isSerialized,
      requiresLot,
      isActive: true,
      createdAt: new Date(),
      createdBy: user.username,
    });
  }

  async function getItems() {
    return Item.findAll({
      order: [['code', 'ASC']],
    });
  }

  async function getItemById(itemId) {
    return Item.findByPk(itemId);
  }

  // --- Goods Receipts (Nhập kho) ---
  async function createGoodsReceipt(payload, user) {
    const { warehouseId, supplierId, receiptNo, items } = payload;

    if (!items || items.length === 0) {
      throw new ApiError(400, 'ITEMS_REQUIRED', 'Phiếu nhập kho phải có ít nhất 1 mặt hàng.');
    }

    try {
      return await sequelize.transaction(async (t) => {
        await setSessionUser(sequelize, t, user.username);

        const receipt = await GoodsReceipt.create({
        receiptNo: receiptNo || `PNK-${Date.now().toString().slice(-6)}`,
        warehouseId,
        supplierId,
        status: 'POSTED',
        receivedAt: new Date(),
        inspectedBy: user.userId,
        createdAt: new Date(),
        createdBy: user.username,
      }, { transaction: t });

      for (const it of items) {
        const { itemId, lotNumber, expiryDate, quantity, unitCost, serialNumbers = [] } = it;
        const qty = Number(quantity);

        if (isNaN(qty) || qty <= 0) {
          throw new ApiError(400, 'INVALID_QUANTITY', 'Số lượng nhập phải lớn hơn 0.');
        }

        const itemRecord = await Item.findByPk(itemId, { transaction: t });
        if (!itemRecord) {
          throw new ApiError(404, 'ITEM_NOT_FOUND', `Không tìm thấy mặt hàng ID: ${itemId}`);
        }

        // Create StockLot
        const lot = await StockLot.create({
          itemId,
          warehouseId,
          goodsReceiptId: receipt.goodsReceiptId,
          lotNumber: lotNumber || `LOT-${Date.now().toString().slice(-4)}`,
          expiryDate,
          status: 'RELEASED',
          unitCost: unitCost || 0,
          createdAt: new Date(),
          createdBy: user.username,
        }, { transaction: t });

        // If serialized (e.g. Implant), generate StockSerials
        if (itemRecord.isSerialized) {
          if (serialNumbers.length !== qty) {
            throw new ApiError(400, 'SERIAL_COUNT_MISMATCH', `Mặt hàng quản lý Serial (${itemRecord.name}) yêu cầu cung cấp đúng ${qty} mã Serial duy nhất.`);
          }
          for (const sNum of serialNumbers) {
            await StockSerial.create({
              stockLotId: lot.stockLotId,
              serialNumber: sNum,
              status: 'AVAILABLE',
              createdAt: new Date(),
              createdBy: user.username,
            }, { transaction: t });
          }
        }

        // Increase StockBalances
        let balance = await StockBalance.findOne({
          where: {
            warehouseId,
            itemId,
            stockLotId: lot.stockLotId,
          },
          transaction: t,
        });

        if (!balance) {
          balance = await StockBalance.create({
            warehouseId,
            itemId,
            stockLotId: lot.stockLotId,
            onHand: qty,
            reserved: 0,
            quarantined: 0,
            blocked: 0,
          }, { transaction: t });
        } else {
          await balance.update({
            onHand: Number(balance.onHand) + qty,
          }, { transaction: t });
        }

        // Log StockMovement
        await StockMovement.create({
          warehouseId,
          itemId,
          stockLotId: lot.stockLotId,
          movementType: 'RECEIPT',
          quantity: qty,
          unitCost: unitCost || 0,
          sourceEventId: receipt.goodsReceiptId,
          occurredAt: new Date(),
          createdBy: user.username,
        }, { transaction: t });
      }

      return receipt;
    });
    } catch (err) {
      console.error('GOODS RECEIPT ERROR:', err);
      throw err;
    }
  }

  // --- FEFO & Expiry Validation (AT-07) ---
  async function getAvailableLotsFEFO(warehouseId, itemId) {
    const today = new Date().toISOString().split('T')[0];

    const lots = await StockLot.findAll({
      where: {
        warehouseId,
        itemId,
        status: 'RELEASED',
      },
      include: [
        {
          model: StockBalance,
          as: 'balances',
          where: { onHand: { [Op.gt]: 0 } },
        },
      ],
      // AT-07: First Expired, First Out
      order: [['expiryDate', 'ASC']],
    });

    return lots.map((l) => {
      const balance = l.balances?.[0]?.onHand || 0;
      const isExpired = l.expiryDate < today;
      return {
        ...l.toJSON(),
        availableOnHand: Number(balance),
        isExpired,
      };
    });
  }

  async function dispenseStock(payload, user) {
    const { warehouseId, itemId, quantity, sourceEventId = null, specificLotId = null } = payload;
    const dispenseQty = Number(quantity);

    if (isNaN(dispenseQty) || dispenseQty <= 0) {
      throw new ApiError(400, 'INVALID_QUANTITY', 'Số lượng xuất kho phải lớn hơn 0.');
    }

    const today = new Date().toISOString().split('T')[0];

    return sequelize.transaction(async (t) => {
      await setSessionUser(sequelize, t, user.username);

      let targetLot = null;

      if (specificLotId) {
        targetLot = await StockLot.findByPk(specificLotId, {
          include: [{ model: StockBalance, as: 'balances', where: { warehouseId } }],
          transaction: t,
        });

        if (!targetLot) {
          throw new ApiError(404, 'LOT_NOT_FOUND', 'Không tìm thấy lô hàng.');
        }
      } else {
        // AT-07: Auto pick candidate using FEFO
        const candidateLots = await StockLot.findAll({
          where: {
            warehouseId,
            itemId,
            status: 'RELEASED',
          },
          include: [
            {
              model: StockBalance,
              as: 'balances',
              where: { onHand: { [Op.gt]: 0 } },
            },
          ],
          order: [['expiryDate', 'ASC']],
          transaction: t,
        });

        if (candidateLots.length === 0) {
          throw new ApiError(400, 'INSUFFICIENT_STOCK', 'Không còn tồn kho khả dụng cho mặt hàng này.');
        }

        targetLot = candidateLots[0];
      }

      // AT-08: Reject if lot is recalled
      if (targetLot.status === 'RECALLED') {
        throw new ApiError(409, 'LOT_RECALLED_CANNOT_DISPENSE', `Lô hàng (${targetLot.lotNumber}) đã bị THU HỒI theo quyết định an toàn y tế. Nghiêm cấm xuất sử dụng (AT-08).`);
      }

      // AT-07: Reject if lot is expired
      if (targetLot.expiryDate < today) {
        throw new ApiError(400, 'EXPIRED_LOT_CANNOT_DISPENSE', `Lô hàng (${targetLot.lotNumber}) đã HẾT HẠN DÙNG (${targetLot.expiryDate}). Hệ thống chặn xuất kho theo quy tắc an toàn FEFO (AT-07).`);
      }

      // Lock & check onHand
      const balance = await StockBalance.findOne({
        where: {
          warehouseId,
          itemId: targetLot.itemId,
          stockLotId: targetLot.stockLotId,
        },
        transaction: t,
      });

      const currentOnHand = Number(balance?.onHand || 0);
      if (currentOnHand < dispenseQty) {
        throw new ApiError(409, 'INSUFFICIENT_LOT_STOCK', `Số lượng tồn của lô (${currentOnHand}) không đủ để xuất (${dispenseQty}).`);
      }

      // Deduct balance
      await balance.update({
        onHand: currentOnHand - dispenseQty,
      }, { transaction: t });

      // Log movement (MovementType = 'CONSUME')
      const movement = await StockMovement.create({
        warehouseId,
        itemId: targetLot.itemId,
        stockLotId: targetLot.stockLotId,
        movementType: 'CONSUME',
        quantity: dispenseQty,
        unitCost: targetLot.unitCost,
        sourceEventId: sourceEventId || crypto.randomUUID(),
        occurredAt: new Date(),
        createdBy: user.username,
      }, { transaction: t });

      return {
        movement,
        dispensedLot: targetLot,
        remainingOnHand: currentOnHand - dispenseQty,
      };
    });
  }

  // --- Lot Recall & Patient Tracing (AT-08) ---
  async function recallLot(stockLotId, payload, user) {
    const { reason } = payload;
    if (!reason) {
      throw new ApiError(400, 'REASON_REQUIRED', 'Lý do thu hồi lô là bắt buộc (AT-08).');
    }

    return sequelize.transaction(async (t) => {
      await setSessionUser(sequelize, t, user.username);

      const lot = await StockLot.findByPk(stockLotId, { transaction: t });
      if (!lot) {
        throw new ApiError(404, 'LOT_NOT_FOUND', 'Không tìm thấy lô hàng.');
      }

      if (lot.status === 'RECALLED') {
        throw new ApiError(409, 'LOT_ALREADY_RECALLED', 'Lô hàng này đã có quyết định thu hồi trước đó.');
      }

      // Create LotRecall record
      const recall = await LotRecall.create({
        stockLotId,
        reason,
        status: 'OPEN',
        initiatedAt: new Date(),
        createdBy: user.username,
      }, { transaction: t });

      // Update lot status
      await lot.update({ status: 'RECALLED' }, { transaction: t });

      // Quarantine remaining stock
      const balances = await StockBalance.findAll({
        where: { stockLotId },
        transaction: t,
      });

      for (const b of balances) {
        const available = Math.max(0, Number(b.onHand) - Number(b.reserved) - Number(b.quarantined) - Number(b.blocked));
        if (available > 0) {
          await b.update({
            blocked: Number(b.blocked) + available,
          }, { transaction: t });
        }
      }

      return recall;
    });
  }

  async function traceLotUsage(stockLotId) {
    const lot = await StockLot.findByPk(stockLotId, {
      include: [{ model: Item, as: 'item' }],
    });
    if (!lot) {
      throw new ApiError(404, 'LOT_NOT_FOUND', 'Không tìm thấy lô hàng.');
    }

    // Find all consume movements for this lot
    const movements = await StockMovement.findAll({
      where: {
        stockLotId,
        movementType: 'CONSUME',
      },
      include: [{ model: StockSerial, as: 'serial' }],
      order: [['occurredAt', 'DESC']],
    });

    const tracedRecords = [];

    for (const m of movements) {
      let patientInfo = null;
      let doctorInfo = null;
      let visitInfo = null;

      if (m.sourceEventId) {
        // Try linking through ServiceCompletionEvent
        const event = await ServiceCompletionEvent.findByPk(m.sourceEventId, {
          include: [
            {
              model: ServiceLine,
              as: 'serviceLine',
              include: [
                {
                  model: Visit,
                  as: 'visit',
                  include: [
                    { model: Patient, as: 'patient' },
                    { model: User, as: 'doctor' },
                  ],
                },
              ],
            },
          ],
        });

        if (event?.serviceLine?.visit) {
          visitInfo = {
            visitId: event.serviceLine.visit.visitId,
            visitCode: event.serviceLine.visit.visitCode,
          };
          patientInfo = event.serviceLine.visit.patient;
          doctorInfo = event.serviceLine.visit.doctor;
        }
      }

      tracedRecords.push({
        movementId: m.stockMovementId,
        occurredAt: m.occurredAt,
        quantity: Number(m.quantity),
        serialNumber: m.serial?.serialNumber || null,
        patient: patientInfo
          ? {
              patientId: patientInfo.patientId,
              fullName: patientInfo.fullName,
              phone: patientInfo.phone,
              patientCode: patientInfo.patientCode,
            }
          : null,
        doctor: doctorInfo
          ? {
              userId: doctorInfo.userId,
              displayName: doctorInfo.displayName,
            }
          : null,
        visit: visitInfo,
      });
    }

    return {
      lot: {
        stockLotId: lot.stockLotId,
        lotNumber: lot.lotNumber,
        expiryDate: lot.expiryDate,
        status: lot.status,
        item: lot.item,
      },
      totalDispensed: tracedRecords.reduce((sum, r) => sum + r.quantity, 0),
      tracedPatients: tracedRecords.filter((r) => r.patient !== null),
      allMovements: tracedRecords,
    };
  }

  // --- Serial / Implant Lifecycle Management (AT-12) ---
  async function implantSerial(payload, user) {
    const { serialNumber, serviceCompletionEventId } = payload;

    return sequelize.transaction(async (t) => {
      await setSessionUser(sequelize, t, user.username);

      const serial = await StockSerial.findOne({
        where: { serialNumber },
        include: [{ model: StockLot, as: 'lot', include: [{ model: Item, as: 'item' }] }],
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!serial) {
        throw new ApiError(404, 'SERIAL_NOT_FOUND', `Không tìm thấy mã Serial: ${serialNumber}.`);
      }

      // AT-12: Anti-reuse protection for implanted devices
      if (serial.status === 'CONSUMED') {
        throw new ApiError(409, 'SERIAL_ALREADY_IMPLANTED', `Trụ Implant Serial (${serialNumber}) đã được cấy ghép cho một bệnh nhân khác trước đó. Nghiêm cấm tái sử dụng thiết bị y tế cấy ghép (AT-12).`);
      }

      if (serial.status !== 'AVAILABLE') {
        throw new ApiError(400, 'SERIAL_NOT_AVAILABLE', `Serial (${serialNumber}) hiện không ở trạng thái sẵn sàng trong kho (Trạng thái hiện tại: ${serial.status}).`);
      }

      // Update serial status to CONSUMED
      await serial.update({
        status: 'CONSUMED',
      }, { transaction: t });

      // Deduct balance
      const balance = await StockBalance.findOne({
        where: { stockLotId: serial.stockLotId },
        transaction: t,
      });

      if (balance) {
        const onHand = Number(balance.onHand);
        await balance.update({
          onHand: Math.max(0, onHand - 1),
        }, { transaction: t });
      }

      // Log movement with Serial (MovementType = 'CONSUME')
      const movement = await StockMovement.create({
        warehouseId: serial.lot.warehouseId,
        itemId: serial.lot.itemId,
        stockLotId: serial.stockLotId,
        stockSerialId: serial.stockSerialId,
        movementType: 'CONSUME',
        quantity: 1,
        unitCost: serial.lot.unitCost,
        sourceEventId: serviceCompletionEventId || crypto.randomUUID(),
        occurredAt: new Date(),
        createdBy: user.username,
      }, { transaction: t });

      return {
        serial,
        movement,
      };
    });
  }

  async function getStockBalances(warehouseId) {
    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;

    return StockBalance.findAll({
      where,
      include: [
        { model: Item, as: 'item' },
        { model: StockLot, as: 'lot' },
        { model: Warehouse, as: 'warehouse' },
      ],
      order: [['onHand', 'DESC']],
    });
  }

  return {
    createWarehouse,
    getWarehouses,
    createSupplier,
    getSuppliers,
    createItem,
    getItems,
    getItemById,
    createGoodsReceipt,
    getAvailableLotsFEFO,
    dispenseStock,
    recallLot,
    traceLotUsage,
    implantSerial,
    getStockBalances,
  };
}
