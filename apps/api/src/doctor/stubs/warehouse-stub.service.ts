import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { allocateStock } from '../../warehouse/warehouse-domain.js';

export interface CheckStockResult {
  available: boolean;
  currentStock: number;
  supplyCode: string;
}

export interface ReserveStockInput {
  examinationId: number;
  supplyCode: string;
  quantityInBaseUnit: number;
}

/**
 * WarehouseServiceStub
 * 
 * Compatibility adapter between the doctor workflow and the warehouse ledger.
 * 
 * Business rules:
 * - Stock is checked before adding supplies.
 * - Prior to completion, supplies are marked as "RESERVED" (SupplyReservation).
 * - Actual inventory deduction occurs upon "Ghi sổ" (Hoàn thành hoặc Ngừng khám).
 * - If cancelled without using supplies, reservations are released back to stock.
 */
@Injectable()
export class WarehouseServiceStub {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Kiểm tra tồn kho trước khi chỉ định VTYT.
   * Chỉ tính các lô còn hạn sử dụng cho bệnh nhân.
   */
  async checkStock(supplyCode: string, quantityInBaseUnit: number): Promise<CheckStockResult> {
    const supply = await this.prisma.medicalSupply.findUnique({
      where: { code: supplyCode },
      include: {
        inventoryBatches: {
          where: { quantity: { gt: 0 } },
        },
      },
    });
    if (!supply) {
      throw new NotFoundException(`Không tìm thấy vật tư y tế với mã ${supplyCode}.`);
    }

    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const availableStock = supply.inventoryBatches && supply.inventoryBatches.length > 0
      ? supply.inventoryBatches
          .filter((b) => !b.expiryDate || Date.UTC(b.expiryDate.getUTCFullYear(), b.expiryDate.getUTCMonth(), b.expiryDate.getUTCDate()) > todayUtc)
          .reduce((sum, b) => sum + Number(b.quantity), 0)
      : supply.inStock;

    const available = availableStock >= quantityInBaseUnit;
    return {
      available,
      currentStock: availableStock,
      supplyCode,
    };
  }

  /**
   * Giữ chỗ tồn kho (Reservation) cho ca khám đang diễn ra.
   * Chặn không cho giữ chỗ các lô đã hết hạn sử dụng.
   */
  async reserveStock(input: ReserveStockInput): Promise<{ reservationId: number }> {
    const supply = await this.prisma.medicalSupply.findUnique({
      where: { code: input.supplyCode },
      include: {
        inventoryBatches: {
          where: { quantity: { gt: 0 } },
        },
      },
    });
    if (!supply) {
      throw new NotFoundException(`Không tìm thấy vật tư y tế với mã ${input.supplyCode}.`);
    }

    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const availableStock = supply.inventoryBatches && supply.inventoryBatches.length > 0
      ? supply.inventoryBatches
          .filter((b) => !b.expiryDate || Date.UTC(b.expiryDate.getUTCFullYear(), b.expiryDate.getUTCMonth(), b.expiryDate.getUTCDate()) > todayUtc)
          .reduce((sum, b) => sum + Number(b.quantity), 0)
      : supply.inStock;

    if (availableStock < input.quantityInBaseUnit) {
      throw new BadRequestException(
        `Không đủ tồn kho khả dụng (còn hạn) cho ${supply.name}. Yêu cầu: ${input.quantityInBaseUnit} ${supply.baseUnit}, còn khả dụng: ${availableStock} ${supply.baseUnit}.`,
      );
    }

    const reservation = await this.prisma.supplyReservation.create({
      data: {
        examinationId: input.examinationId,
        supplyId: supply.id,
        quantity: input.quantityInBaseUnit,
        status: 'RESERVED',
      },
    });

    return { reservationId: reservation.id };
  }

  /**
   * Trừ kho chính thức khi Ghi sổ (Hoàn thành hoặc Ngừng khám có tiêu hao).
   */
  async deductStock(examinationId: number): Promise<{ success: boolean; deductedItems: number }> {
    return this.prisma.$transaction(async (tx) => {
      const idempotencyKey = `doctor-examination-${examinationId}`;
      const existing = await tx.stockDocument.findFirst({ where: { idempotencyKey } });
      if (existing) return { success: true, deductedItems: 0 };
      const [reservations, examination] = await Promise.all([
        tx.supplyReservation.findMany({ where: { examinationId, status: 'RESERVED' }, include: { supply: true } }),
        tx.doctorExamination.findUnique({ where: { id: examinationId } }),
      ]);
      if (!examination) throw new NotFoundException(`Không tìm thấy ca khám #${examinationId}.`);
      if (!reservations.length) return { success: true, deductedItems: 0 };

      const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
      const document = await tx.stockDocument.create({
        data: {
          code: `XVT${stamp}/K${String(examinationId).padStart(5, '0')}`,
          type: 'OUT', outboundType: 'PATIENT', status: 'POSTED', patientId: examination.patientId,
          examinationId, recipientDepartment: 'Điều trị bệnh nhân', reason: `Vật tư tiêu hao ca khám ${examination.code}`,
          idempotencyKey, postedAt: new Date(),
          lines: { create: reservations.map((res) => ({ supplyId: res.supplyId, inputQuantity: res.quantity, inputUnit: res.supply.baseUnit, conversionFactor: 1, convertedQuantity: res.quantity, inputUnitPrice: 0, vatRate: 0 })) },
        }, include: { lines: true },
      });

      for (const reservation of reservations) {
        if (reservation.supply.inStock < reservation.quantity) throw new BadRequestException(`Không đủ tồn kho để trừ cho ${reservation.supply.name}. Tồn kho không được phép âm!`);
        const batches = await tx.inventoryBatch.findMany({ where: { supplyId: reservation.supplyId, quantity: { gt: 0 } } });
        let allocations;
        try { allocations = allocateStock(batches.map((b) => ({ id: b.id, quantity: Number(b.quantity), receivedAt: b.receivedAt, expiryDate: b.expiryDate })), reservation.quantity, new Date(), false); }
        catch (error) { throw new BadRequestException(`${reservation.supply.name}: ${(error as Error).message}`); }
        const line = document.lines.find((item) => item.supplyId === reservation.supplyId)!;
        for (const allocation of allocations) {
          const batch = batches.find((item) => item.id === allocation.batchId)!;
          const amount = Math.round(allocation.quantity * Number(batch.unitCost));
          await tx.inventoryBatch.update({ where: { id: batch.id }, data: { quantity: { decrement: allocation.quantity } } });
          await tx.stockAllocation.create({ data: { documentLineId: line.id, batchId: batch.id, quantity: allocation.quantity, unitCost: batch.unitCost, amount } });
          await tx.stockLedgerEntry.create({ data: { documentId: document.id, documentLineId: line.id, supplyId: reservation.supplyId, batchId: batch.id, direction: 'OUT', quantity: allocation.quantity, unitCost: batch.unitCost, amount, balanceAfter: reservation.supply.inStock - reservation.quantity } });
        }
        await tx.medicalSupply.update({ where: { id: reservation.supplyId }, data: { inStock: { decrement: reservation.quantity } } });
        await tx.supplyReservation.update({ where: { id: reservation.id }, data: { status: 'DEDUCTED' } });
      }
      await tx.accountingWarehouseEntry.create({ data: { documentId: document.id, eventType: 'PATIENT_USAGE', goodsAmount: reservations.reduce((sum, r) => sum + r.supply.costPrice * r.quantity, 0), totalAmount: reservations.reduce((sum, r) => sum + r.supply.costPrice * r.quantity, 0), payloadJson: JSON.stringify({ examinationId, examinationCode: examination.code }) } });
      await tx.warehouseAuditLog.create({ data: { documentId: document.id, action: 'AUTO_POST_FROM_EXAMINATION', changesJson: JSON.stringify({ examinationId }) } });
      return { success: true, deductedItems: reservations.length };
    }, { timeout: 15000 });
  }

  /**
   * Hoàn trả số lượng giữ chỗ nếu ca khám bị hủy/sửa và không dùng đến.
   */
  async releaseStock(examinationId: number): Promise<{ success: boolean; releasedItems: number }> {
    const result = await this.prisma.supplyReservation.updateMany({
      where: { examinationId, status: 'RESERVED' },
      data: { status: 'RELEASED' },
    });

    return { success: true, releasedItems: result.count };
  }
}
