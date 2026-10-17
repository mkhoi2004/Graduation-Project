import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';

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
 * NOTE: /warehouse module is not yet implemented.
 * This stub acts as the boundary interface between /doctor and /warehouse.
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
   * TODO: Khi phân hệ /warehouse sẵn sàng, thay thế bằng lời gọi RPC hoặc REST tới WarehouseService.
   */
  async checkStock(supplyCode: string, quantityInBaseUnit: number): Promise<CheckStockResult> {
    const supply = await this.prisma.medicalSupply.findUnique({
      where: { code: supplyCode },
    });
    if (!supply) {
      throw new NotFoundException(`Không tìm thấy vật tư y tế với mã ${supplyCode}.`);
    }

    const available = supply.inStock >= quantityInBaseUnit;
    return {
      available,
      currentStock: supply.inStock,
      supplyCode,
    };
  }

  /**
   * Giữ chỗ tồn kho (Reservation) cho ca khám đang diễn ra.
   */
  async reserveStock(input: ReserveStockInput): Promise<{ reservationId: number }> {
    const supply = await this.prisma.medicalSupply.findUnique({
      where: { code: input.supplyCode },
    });
    if (!supply) {
      throw new NotFoundException(`Không tìm thấy vật tư y tế với mã ${input.supplyCode}.`);
    }

    if (supply.inStock < input.quantityInBaseUnit) {
      throw new BadRequestException(
        `Không đủ tồn kho cho ${supply.name}. Yêu cầu: ${input.quantityInBaseUnit} ${supply.baseUnit}, còn tồn: ${supply.inStock} ${supply.baseUnit}.`,
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
    const reservations = await this.prisma.supplyReservation.findMany({
      where: { examinationId, status: 'RESERVED' },
      include: { supply: true },
    });

    let count = 0;
    for (const res of reservations) {
      const supply = await this.prisma.medicalSupply.findUnique({
        where: { id: res.supplyId },
      });
      if (!supply) continue;

      if (supply.inStock < res.quantity) {
        throw new BadRequestException(
          `Không đủ tồn kho để trừ cho ${supply.name}. Yêu cầu trừ: ${res.quantity} ${supply.baseUnit}, tồn kho hiện tại: ${supply.inStock} ${supply.baseUnit}. Tồn kho không được phép âm!`,
        );
      }

      await this.prisma.$transaction([
        this.prisma.medicalSupply.update({
          where: { id: res.supplyId },
          data: {
            inStock: {
              decrement: res.quantity,
            },
          },
        }),
        this.prisma.supplyReservation.update({
          where: { id: res.id },
          data: { status: 'DEDUCTED' },
        }),
      ]);
      count += 1;
    }

    return { success: true, deductedItems: count };
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
