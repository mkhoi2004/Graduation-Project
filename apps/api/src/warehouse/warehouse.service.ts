import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../infrastructure/database/prisma.service.js';
import { AccountingService } from '../accounting/accounting.service.js';
import {
  allocateStock,
  calculateReceiptLine,
  classifyBatch,
  computeDocumentHash,
  readVietnameseCurrency,
} from './warehouse-domain.js';
import type {
  CreateIssueDto,
  CreateReceiptDto,
  CreateSupplierDto,
  CreateSupplyItemDto,
  DisposeBatchDto,
  UpdateDocumentDto,
} from './dto/warehouse.dto.js';

const documentInclude = {
  supplier: true,
  lines: {
    include: {
      supply: true,
      allocations: {
        include: {
          batch: true,
        },
      },
    },
  },
  printLogs: {
    orderBy: { printedAt: 'desc' as const },
  },
  auditLogs: {
    orderBy: { createdAt: 'desc' as const },
  },
} as const;

@Injectable()
export class WarehouseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounting?: AccountingService,
  ) {}

  async overview() {
    const [supplies, batches, recentDocuments] = await Promise.all([
      this.prisma.medicalSupply.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      this.prisma.inventoryBatch.findMany({
        where: { quantity: { gt: 0 } },
        include: { supply: true },
        orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
      }),
      this.prisma.stockDocument.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { supplier: true },
      }),
    ]);

    const now = new Date();
    const rows = supplies.map((s) => {
      const ownBatches = batches.filter((b) => b.supplyId === s.id);
      const totalQty = ownBatches.reduce((sum, b) => sum + Number(b.quantity), 0);
      const totalVal = ownBatches.reduce((sum, b) => sum + Number(b.quantity) * Number(b.unitCost), 0);
      return {
        ...s,
        quantity: totalQty,
        value: Math.round(totalVal),
      };
    });

    const lowStockList = rows.filter((r) => r.quantity <= r.minimumStock);

    const expiringBatches: Array<any> = [];
    const expiredBatches: Array<any> = [];

    for (const b of batches) {
      const classification = classifyBatch(
        {
          quantity: Number(b.quantity),
          minimumStock: b.supply.minimumStock,
          expiryDate: b.expiryDate,
        },
        now,
        b.supply.expiryWarningDays,
      );

      const batchSummary = {
        ...b,
        quantity: Number(b.quantity),
        unitCost: Number(b.unitCost),
        daysRemaining: classification.daysRemaining,
      };

      if (classification.expiryStatus === 'EXPIRED') {
        expiredBatches.push(batchSummary);
      } else if (classification.expiryStatus === 'EXPIRING_SOON') {
        expiringBatches.push(batchSummary);
      }
    }

    const groupNames: Record<string, string> = {
      THUONG: 'Vật tư y tế thường',
      VO_CAM: 'Thuốc & vật tư vô cảm',
      VAN_PHONG: 'Văn phòng phẩm',
    };

    const groups = (['THUONG', 'VO_CAM', 'VAN_PHONG'] as const).map((groupKey) => {
      const groupRows = rows.filter((r) => r.group === groupKey);
      return {
        group: groupKey,
        groupName: groupNames[groupKey],
        itemCount: groupRows.length,
        quantity: groupRows.reduce((sum, r) => sum + r.quantity, 0),
        inventoryValue: groupRows.reduce((sum, r) => sum + r.value, 0),
      };
    });

    return {
      metrics: {
        itemCount: supplies.length,
        inventoryValue: Math.round(rows.reduce((sum, r) => sum + r.value, 0)),
        lowStockCount: lowStockList.length,
        expiringCount: expiringBatches.length,
        expiredCount: expiredBatches.length,
      },
      groups,
      lowStock: lowStockList.slice(0, 10),
      expiring: expiringBatches.slice(0, 10),
      expired: expiredBatches.slice(0, 10),
      recentDocuments,
    };
  }

  async items(group?: string, search?: string) {
    const items = await this.prisma.medicalSupply.findMany({
      where: {
        isActive: true,
        ...(group ? { group } : {}),
        ...(search
          ? {
              OR: [
                { code: { contains: search } },
                { name: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        inventoryBatches: {
          where: { quantity: { gt: 0 } },
          orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
        },
      },
      orderBy: { name: 'asc' },
    });

    const now = new Date();
    return items.map((item) => {
      const batches = item.inventoryBatches.map((b) => {
        const cls = classifyBatch(
          {
            quantity: Number(b.quantity),
            minimumStock: item.minimumStock,
            expiryDate: b.expiryDate,
          },
          now,
          item.expiryWarningDays,
        );
        return {
          ...b,
          quantity: Number(b.quantity),
          unitCost: Number(b.unitCost),
          expiryStatus: cls.expiryStatus,
          daysRemaining: cls.daysRemaining,
        };
      });

      const availableQuantity = batches.reduce((sum, b) => sum + b.quantity, 0);
      const inventoryValue = Math.round(batches.reduce((sum, b) => sum + b.quantity * b.unitCost, 0));

      return {
        ...item,
        availableQuantity,
        inventoryValue,
        inventoryBatches: batches,
      };
    });
  }

  async usage(filters?: {
    startDate?: string;
    endDate?: string;
    doctorId?: number;
    roomId?: number;
    supplyCode?: string;
  }) {
    // 1. Clinical usage from doctor examinations
    const doctorUsages = await this.prisma.examinationSupply.findMany({
      where: {
        ...(filters?.supplyCode ? { supply: { code: filters.supplyCode } } : {}),
        ...(filters?.doctorId ? { examination: { doctorId: filters.doctorId } } : {}),
        ...(filters?.roomId ? { examination: { roomId: filters.roomId } } : {}),
        ...(filters?.startDate || filters?.endDate
          ? {
              createdAt: {
                ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
                ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
              },
            }
          : {}),
      },
      include: {
        supply: true,
        examination: {
          include: {
            patient: true,
            doctor: true,
            room: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // 2. Warehouse issues with PATIENT_USE
    const warehousePatientIssues = await this.prisma.stockDocumentLine.findMany({
      where: {
        document: {
          type: 'OUT',
          outboundType: 'PATIENT_USE',
          status: 'POSTED',
          ...(filters?.doctorId ? { doctorId: filters.doctorId } : {}),
          ...(filters?.roomId ? { roomId: filters.roomId } : {}),
          ...(filters?.startDate || filters?.endDate
            ? {
                createdAt: {
                  ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
                  ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
                },
              }
            : {}),
        },
        ...(filters?.supplyCode ? { supply: { code: filters.supplyCode } } : {}),
      },
      include: {
        supply: true,
        document: true,
        allocations: {
          include: { batch: true },
        },
      },
      orderBy: { id: 'desc' },
      take: 200,
    });

    const clinicContext = await this.getClinicContext();
    const patientMap = new Map(clinicContext.patients.map((p) => [p.id, p]));
    const doctorMap = new Map(clinicContext.doctors.map((d) => [d.id, d]));
    const roomMap = new Map(clinicContext.rooms.map((r) => [r.id, r]));

    const clinicalRecords = doctorUsages.map((u) => ({
      id: `EXAM-${u.id}`,
      documentCode: u.examination.code,
      sourceType: 'DOCTOR_EXAM',
      supplyId: u.supplyId,
      supplyCode: u.supply.code,
      supplyName: u.supply.name,
      baseUnit: u.supply.baseUnit,
      patientCode: u.examination.patient.code,
      patientName: u.examination.patient.fullName,
      doctorName: u.examination.doctor?.fullName || 'BS. Điều trị',
      roomName: u.examination.room?.name || 'Phòng khám',
      usedAt: u.createdAt,
      batchNo: 'Lô theo ca',
      quantity: u.quantityInBaseUnit,
      unitCost: u.costPriceSnapshot,
      totalAmount: Math.round(u.quantityInBaseUnit * u.costPriceSnapshot),
    }));

    const warehouseRecords = warehousePatientIssues.map((line) => {
      const doc = line.document;
      const patient = doc.patientId ? patientMap.get(doc.patientId) : undefined;
      const doctor = doc.doctorId ? doctorMap.get(doc.doctorId) : undefined;
      const room = doc.roomId ? roomMap.get(doc.roomId) : undefined;
      const batchNo = line.allocations.map((a) => a.batch.batchNo).filter(Boolean).join(', ') || line.batchNo || 'Theo FEFO';

      return {
        id: `WH-${line.id}`,
        documentCode: doc.code,
        sourceType: 'WAREHOUSE_ISSUE',
        supplyId: line.supplyId,
        supplyCode: line.supply.code,
        supplyName: line.supply.name,
        baseUnit: line.supply.baseUnit,
        patientCode: patient?.code || '—',
        patientName: patient?.fullName || 'Bệnh nhân',
        doctorName: doctor?.fullName || '—',
        roomName: room?.name || doc.recipientDepartment || 'Kho phòng khám',
        usedAt: doc.postedAt || doc.createdAt,
        batchNo,
        quantity: Number(line.convertedQuantity),
        unitCost: Number(line.allocations[0]?.unitCost ?? 0),
        totalAmount: line.totalAmount,
      };
    });

    const combined = [...clinicalRecords, ...warehouseRecords].sort(
      (a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime(),
    );

    return combined;
  }

  async documents(filters?: {
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return this.prisma.stockDocument.findMany({
      where: {
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.startDate || filters?.endDate
          ? {
              createdAt: {
                ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
                ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
              },
            }
          : {}),
      },
      take: 200,
      orderBy: { createdAt: 'desc' },
      include: documentInclude,
    });
  }

  async getDocument(id: number) {
    const doc = await this.prisma.stockDocument.findUnique({
      where: { id },
      include: documentInclude,
    });
    if (!doc) throw new NotFoundException('Không tìm thấy chứng từ kho.');
    return {
      ...doc,
      totalAmountInWords: readVietnameseCurrency(doc.totalAmount),
    };
  }

  async suppliers() {
    return this.prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createSupplier(dto: CreateSupplierDto) {
    const count = await this.prisma.supplier.count();
    const code = `NCC-${String(count + 1).padStart(3, '0')}`;
    return this.prisma.supplier.create({
      data: {
        code,
        name: dto.name,
        phone: dto.phone,
        address: dto.address,
        taxCode: dto.taxCode,
        isActive: true,
      },
    });
  }

  async createSupplyItem(dto: CreateSupplyItemDto) {
    const lastItem = await this.prisma.medicalSupply.findFirst({
      where: { code: { startsWith: 'VT-' } },
      orderBy: { code: 'desc' },
    });
    let nextNum = 1;
    if (lastItem) {
      const match = lastItem.code.match(/^VT-(\d+)$/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    } else {
      const totalCount = await this.prisma.medicalSupply.count();
      nextNum = totalCount + 1;
    }
    const code = `VT-${String(nextNum).padStart(4, '0')}`;

    return this.prisma.medicalSupply.create({
      data: {
        code,
        name: dto.name,
        group: dto.group,
        baseUnit: dto.baseUnit,
        conversionUnit: dto.conversionUnit,
        conversionRate: dto.conversionRate,
        minimumStock: dto.minimumStock ?? 10,
        expiryWarningDays: dto.expiryWarningDays ?? 90,
        inStock: 0,
        costPrice: 0,
        isActive: true,
      },
    });
  }

  async getClinicContext() {
    const [patients, doctors, rooms, activeIntakes] = await Promise.all([
      this.prisma.patient.findMany({
        take: 100,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, code: true, fullName: true, phone: true },
      }),
      this.prisma.user.findMany({
        where: { role: { code: 'DOCTOR' }, isActive: true },
        select: { id: true, username: true, fullName: true },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.clinicRoom.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: { code: 'asc' },
      }),
      this.prisma.intake.findMany({
        where: { status: { in: ['TRANSFERRED', 'IN_PROGRESS', 'READY', 'PAID'] } },
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { id: true, code: true, fullName: true } },
          doctor: { select: { id: true, fullName: true } },
          room: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { patients, doctors, rooms, activeIntakes };
  }

  private async nextCode(type: 'IN' | 'OUT', txClient?: Prisma.TransactionClient) {
    const client = txClient || this.prisma;
    const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const prefix = type === 'IN' ? 'MVT' : 'XVT';
    const docs = (await client.stockDocument?.findMany?.({
      where: { code: { startsWith: `${prefix}${stamp}/` } },
      select: { code: true },
    })) ?? [];
    let maxNum = 0;
    for (const d of docs) {
      const parts = d.code.split('/');
      if (parts[1] && /^\d+$/.test(parts[1])) {
        const num = parseInt(parts[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const nextNum = maxNum + 1;
    if (nextNum > 9999) {
      throw new BadRequestException('Hết số thứ tự chứng từ trong ngày (đạt giới hạn 9999).');
    }
    return `${prefix}${stamp}/${String(nextNum).padStart(4, '0')}`;
  }

  async createReceipt(dto: CreateReceiptDto, actorId?: number) {
    if (!dto.lines.length) throw new BadRequestException('Phiếu phải có ít nhất một dòng vật tư.');
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
    if (!supplier) throw new NotFoundException('Không tìm thấy nhà cung cấp.');

    const supplies = await this.prisma.medicalSupply.findMany({
      where: { code: { in: dto.lines.map((l) => l.supplyCode) }, isActive: true },
    });
    if (supplies.length !== new Set(dto.lines.map((l) => l.supplyCode)).size) {
      throw new BadRequestException('Có vật tư không tồn tại hoặc đã ngừng sử dụng.');
    }

    const linesData = dto.lines.map((line) => {
      const supply = supplies.find((s) => s.code === line.supplyCode)!;
      const amounts = calculateReceiptLine({
        inputQuantity: line.inputQuantity,
        conversionFactor: line.conversionFactor,
        convertedQuantity: line.convertedQuantity,
        inputUnitPrice: line.inputUnitPrice,
        vatRate: line.vatRate,
      });

      if (supply.group === 'VO_CAM' && (!line.batchNo?.trim() || !line.expiryDate)) {
        throw new BadRequestException(`Vật tư vô cảm ${supply.name} bắt buộc có số lô và hạn dùng.`);
      }
      if (supply.group === 'THUONG' && !line.expiryDate) {
        throw new BadRequestException(`Vật tư y tế thường ${supply.name} bắt buộc có hạn dùng.`);
      }
      if (line.expiryDate && (!Number.isFinite(new Date(line.expiryDate).getTime()) || new Date(line.expiryDate) <= new Date())) {
        throw new BadRequestException(`Hạn dùng của ${supply.name} phải là ngày trong tương lai.`);
      }
      if (!Number.isInteger(amounts.convertedQuantity)) {
        throw new BadRequestException(`Số lượng quy đổi của ${supply.name} (${amounts.convertedQuantity}) phải là số nguyên.`);
      }

      return {
        supplyId: supply.id,
        inputQuantity: line.inputQuantity,
        inputUnit: line.inputUnit,
        conversionFactor: amounts.conversionFactor,
        convertedQuantity: amounts.convertedQuantity,
        batchNo: line.batchNo || null,
        expiryDate: line.expiryDate ? new Date(line.expiryDate) : null,
        inputUnitPrice: line.inputUnitPrice ?? 0,
        vatRate: line.vatRate ?? 0,
        goodsAmount: amounts.goodsAmount,
        vatAmount: amounts.vatAmount,
        totalAmount: amounts.totalAmount,
      };
    });

    const code = await this.nextCode('IN');
    const goodsAmount = linesData.reduce((s, l) => s + l.goodsAmount, 0);
    const vatAmount = linesData.reduce((s, l) => s + l.vatAmount, 0);
    const totalAmount = linesData.reduce((s, l) => s + l.totalAmount, 0);

    const doc = await this.prisma.stockDocument.create({
      data: {
        code,
        type: 'IN',
        status: 'PENDING_APPROVAL',
        supplierId: dto.supplierId,
        reason: dto.reason,
        createdById: actorId,
        goodsAmount,
        vatAmount,
        totalAmount,
        lines: { create: linesData },
        auditLogs: {
          create: {
            action: 'CREATE',
            actorId,
            changesJson: JSON.stringify({ code, supplierId: dto.supplierId, totalAmount, status: 'PENDING_APPROVAL' }),
          },
        },
      },
      include: documentInclude,
    });

    return {
      ...doc,
      totalAmountInWords: readVietnameseCurrency(doc.totalAmount),
    };
  }

  async createIssue(dto: CreateIssueDto, actorId?: number) {
    if (!dto.lines.length) throw new BadRequestException('Phiếu phải có ít nhất một dòng vật tư.');

    const supplies = await this.prisma.medicalSupply.findMany({
      where: { code: { in: dto.lines.map((l) => l.supplyCode) }, isActive: true },
    });
    if (supplies.length !== new Set(dto.lines.map((l) => l.supplyCode)).size) {
      throw new BadRequestException('Có vật tư không tồn tại.');
    }

    if (dto.outboundType === 'PATIENT_USE' && (!dto.patientId || !dto.doctorId)) {
      throw new BadRequestException('Xuất dùng cho bệnh nhân bắt buộc chọn bệnh nhân và bác sĩ.');
    }
    if (dto.outboundType === 'DISPOSAL' && !dto.reason?.trim()) {
      throw new BadRequestException('Xuất hủy bắt buộc nhập lý do chi tiết.');
    }

    const linesData = dto.lines.map((line) => {
      const supply = supplies.find((s) => s.code === line.supplyCode)!;
      const conversionFactor = line.conversionFactor ?? 1;
      const convertedQuantity = line.convertedQuantity ?? line.inputQuantity * conversionFactor;

      if (!Number.isInteger(convertedQuantity)) {
        throw new BadRequestException(`Số lượng xuất quy đổi của ${supply.name} phải là số nguyên.`);
      }
      if (convertedQuantity > supply.inStock) {
        throw new BadRequestException(
          `Không đủ tồn kho để xuất ${supply.name}. Yêu cầu: ${convertedQuantity} ${supply.baseUnit}, Tồn hiện tại: ${supply.inStock} ${supply.baseUnit}.`,
        );
      }

      return {
        supplyId: supply.id,
        inputQuantity: line.inputQuantity,
        inputUnit: line.inputUnit,
        conversionFactor,
        convertedQuantity,
        batchNo: line.batchNo || null,
        expiryDate: line.expiryDate ? new Date(line.expiryDate) : null,
        inputUnitPrice: 0,
        vatRate: 0,
        goodsAmount: 0,
        vatAmount: 0,
        totalAmount: 0,
      };
    });

    const code = await this.nextCode('OUT');
    const doc = await this.prisma.stockDocument.create({
      data: {
        code,
        type: 'OUT',
        outboundType: dto.outboundType,
        recipientDepartment: dto.recipientDepartment,
        patientId: dto.patientId,
        intakeId: dto.intakeId,
        doctorId: dto.doctorId,
        roomId: dto.roomId,
        reason: dto.reason,
        nonFefoReason: dto.nonFefoReason,
        createdById: actorId,
        lines: { create: linesData },
        auditLogs: {
          create: {
            action: 'CREATE',
            actorId,
            changesJson: JSON.stringify({ code, outboundType: dto.outboundType }),
          },
        },
      },
      include: documentInclude,
    });

    return {
      ...doc,
      totalAmountInWords: readVietnameseCurrency(doc.totalAmount),
    };
  }

  async updateDocument(id: number, dto: UpdateDocumentDto, actorId?: number) {
    const doc = await this.prisma.stockDocument.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!doc) throw new NotFoundException('Không tìm thấy chứng từ.');
    if (doc.isLocked || doc.status === 'POSTED') {
      throw new BadRequestException('Chứng từ đã ghi sổ bị khóa, không thể chỉnh sửa.');
    }
    if (doc.status === 'CANCELLED') {
      throw new BadRequestException('Chứng từ đã hủy không thể chỉnh sửa.');
    }

    return this.prisma.$transaction(async (tx) => {
      // If was PRINTED, revert to DRAFT because content changed
      const nextStatus = 'DRAFT';

      let goodsAmount = doc.goodsAmount;
      let vatAmount = doc.vatAmount;
      let totalAmount = doc.totalAmount;

      if (dto.lines && dto.lines.length > 0) {
        await tx.stockDocumentLine.deleteMany({ where: { documentId: id } });

        const supplies = await tx.medicalSupply.findMany({
          where: { code: { in: dto.lines.map((l) => l.supplyCode) } },
        });

        const newLines = dto.lines.map((line) => {
          const supply = supplies.find((s) => s.code === line.supplyCode)!;
          const amounts = calculateReceiptLine({
            inputQuantity: line.inputQuantity,
            conversionFactor: line.conversionFactor,
            convertedQuantity: line.convertedQuantity,
            inputUnitPrice: line.inputUnitPrice,
            vatRate: line.vatRate,
          });
          return {
            documentId: id,
            supplyId: supply.id,
            inputQuantity: line.inputQuantity,
            inputUnit: line.inputUnit,
            conversionFactor: amounts.conversionFactor,
            convertedQuantity: amounts.convertedQuantity,
            batchNo: line.batchNo || null,
            expiryDate: line.expiryDate ? new Date(line.expiryDate) : null,
            inputUnitPrice: line.inputUnitPrice ?? 0,
            vatRate: line.vatRate ?? 0,
            goodsAmount: amounts.goodsAmount,
            vatAmount: amounts.vatAmount,
            totalAmount: amounts.totalAmount,
          };
        });

        await tx.stockDocumentLine.createMany({ data: newLines });

        goodsAmount = newLines.reduce((s, l) => s + l.goodsAmount, 0);
        vatAmount = newLines.reduce((s, l) => s + l.vatAmount, 0);
        totalAmount = newLines.reduce((s, l) => s + l.totalAmount, 0);
      }

      await tx.warehouseAuditLog.create({
        data: {
          documentId: id,
          action: 'UPDATE',
          actorId,
          changesJson: JSON.stringify({ dto, nextStatus }),
        },
      });

      return tx.stockDocument.update({
        where: { id },
        data: {
          status: nextStatus,
          supplierId: dto.supplierId ?? doc.supplierId,
          outboundType: dto.outboundType ?? doc.outboundType,
          recipientDepartment: dto.recipientDepartment ?? doc.recipientDepartment,
          patientId: dto.patientId ?? doc.patientId,
          intakeId: dto.intakeId ?? doc.intakeId,
          doctorId: dto.doctorId ?? doc.doctorId,
          roomId: dto.roomId ?? doc.roomId,
          reason: dto.reason ?? doc.reason,
          nonFefoReason: dto.nonFefoReason ?? doc.nonFefoReason,
          goodsAmount,
          vatAmount,
          totalAmount,
        },
        include: documentInclude,
      });
    });
  }

  async print(id: number, actorId?: number) {
    const doc = await this.prisma.stockDocument.findUnique({
      where: { id },
      include: documentInclude,
    });
    if (!doc) throw new NotFoundException('Không tìm thấy chứng từ.');
    if (doc.status === 'CANCELLED') throw new BadRequestException('Chứng từ đã hủy không thể in.');

    const contentHash = computeDocumentHash({
      code: doc.code,
      type: doc.type,
      outboundType: doc.outboundType,
      supplierId: doc.supplierId,
      lines: doc.lines.map((l) => ({
        supplyId: l.supplyId,
        convertedQuantity: Number(l.convertedQuantity),
        goodsAmount: l.goodsAmount,
        totalAmount: l.totalAmount,
      })),
      totalAmount: doc.totalAmount,
    });

    const isCopy = doc.printCount > 0;

    const updated = await this.prisma.stockDocument.update({
      where: { id },
      data: {
        status: doc.status === 'DRAFT' ? 'PRINTED' : doc.status,
        printedAt: new Date(),
        printCount: { increment: 1 },
        contentHash,
        printLogs: {
          create: {
            printedById: actorId,
            contentHash,
            isCopy,
          },
        },
        auditLogs: {
          create: {
            action: 'PRINT',
            actorId,
            changesJson: JSON.stringify({ printCount: doc.printCount + 1, isCopy }),
          },
        },
      },
      include: documentInclude,
    });

    return {
      ...updated,
      isCopy,
      totalAmountInWords: readVietnameseCurrency(updated.totalAmount),
    };
  }

  async post(id: number, actorId?: number, idempotencyKey?: string) {
    const document = await this.prisma.$transaction(
      async (tx) => {
        const doc = await tx.stockDocument.findUnique({
          where: { id },
          include: { lines: { include: { supply: true } } },
        });
        if (!doc) throw new NotFoundException('Không tìm thấy chứng từ.');
        if (doc.status === 'POSTED') {
          return tx.stockDocument.findUnique({ where: { id }, include: documentInclude });
        }
        if (doc.type === 'IN') {
          if (doc.status !== 'PRINTED' && doc.status !== 'PENDING_APPROVAL') {
            throw new BadRequestException('Phiếu nhập kho phải ở trạng thái chờ duyệt hoặc đã in.');
          }
          if (actorId) {
            const actorUser = await tx.user.findUnique({ where: { id: actorId }, include: { role: true } });
            if (actorUser?.role?.code && !['ACCOUNTING_STAFF', 'ADMIN'].includes(actorUser.role.code)) {
              throw new BadRequestException('Phiếu nhập kho bắt buộc phải do Kế toán duyệt trước khi ghi sổ.');
            }
          }
        } else {
          if (doc.status !== 'PRINTED') {
            throw new BadRequestException('Phải in phiếu trước khi ghi sổ.');
          }
        }

        // Strict content hash verification
        const currentHash = computeDocumentHash({
          code: doc.code,
          type: doc.type,
          outboundType: doc.outboundType,
          supplierId: doc.supplierId,
          lines: doc.lines.map((l) => ({
            supplyId: l.supplyId,
            convertedQuantity: Number(l.convertedQuantity),
            goodsAmount: l.goodsAmount,
            totalAmount: l.totalAmount,
          })),
          totalAmount: doc.totalAmount,
        });

        if (doc.contentHash && doc.contentHash !== currentHash) {
          throw new BadRequestException('Nội dung phiếu đã bị sửa đổi sau khi in. Vui lòng in lại trước khi ghi sổ.');
        }

        if (idempotencyKey) {
          const duplicate = await tx.stockDocument.findFirst({
            where: { idempotencyKey, id: { not: id } },
          });
          if (duplicate) throw new BadRequestException('Yêu cầu ghi sổ đã được xử lý (trùng idempotencyKey).');
        }

        let outboundGoodsAmount = 0;

        for (const line of doc.lines) {
          if (doc.type === 'IN') {
            const unitCost = Number(line.inputUnitPrice) / Number(line.conversionFactor);

            // Batch deduplication logic: if same (supplyId, batchNo, expiryDate, unitCost) exists, increment
            const existingBatch = await tx.inventoryBatch.findFirst({
              where: {
                supplyId: line.supplyId,
                batchNo: line.batchNo ?? null,
                expiryDate: line.expiryDate ?? null,
                unitCost: Math.round(unitCost * 10000) / 10000,
              },
            });

            let batchId: number;
            if (existingBatch) {
              const updatedBatch = await tx.inventoryBatch.update({
                where: { id: existingBatch.id },
                data: { quantity: { increment: line.convertedQuantity } },
              });
              batchId = updatedBatch.id;
            } else {
              const newBatch = await tx.inventoryBatch.create({
                data: {
                  supplyId: line.supplyId,
                  batchNo: line.batchNo,
                  expiryDate: line.expiryDate,
                  quantity: line.convertedQuantity,
                  unitCost: Math.round(unitCost * 10000) / 10000,
                  originalReceiptCode: doc.code,
                },
              });
              batchId = newBatch.id;
            }

            const updatedSupply = await tx.medicalSupply.update({
              where: { id: line.supplyId },
              data: {
                inStock: { increment: Number(line.convertedQuantity) },
                costPrice: Math.round(unitCost),
              },
            });

            await tx.stockLedgerEntry.create({
              data: {
                documentId: doc.id,
                documentLineId: line.id,
                supplyId: line.supplyId,
                batchId,
                direction: 'IN',
                quantity: line.convertedQuantity,
                unitCost: Math.round(unitCost * 10000) / 10000,
                amount: line.goodsAmount,
                balanceAfter: updatedSupply.inStock,
              },
            });
          } else {
            // Outbound issue: allocate batches
            const batches = await tx.inventoryBatch.findMany({
              where: { supplyId: line.supplyId, quantity: { gt: 0 } },
              orderBy: [{ expiryDate: 'asc' }, { receivedAt: 'asc' }],
            });

            let allocations: Array<{ batchId: number; quantity: number }>;
            try {
              allocations = allocateStock(
                batches.map((b) => ({
                  id: b.id,
                  quantity: Number(b.quantity),
                  receivedAt: b.receivedAt,
                  expiryDate: b.expiryDate,
                  batchNo: b.batchNo,
                })),
                Number(line.convertedQuantity),
                new Date(),
                doc.outboundType === 'DISPOSAL',
              );
            } catch (error) {
              throw new BadRequestException(`${line.supply.name}: ${(error as Error).message}`);
            }

            let lineAmount = 0;
            for (const allocation of allocations) {
              const batch = batches.find((b) => b.id === allocation.batchId)!;
              await tx.inventoryBatch.update({
                where: { id: batch.id },
                data: { quantity: { decrement: allocation.quantity } },
              });

              const allocAmount = Math.round(allocation.quantity * Number(batch.unitCost));
              lineAmount += allocAmount;

              await tx.stockAllocation.create({
                data: {
                  documentLineId: line.id,
                  batchId: batch.id,
                  quantity: allocation.quantity,
                  unitCost: batch.unitCost,
                  amount: allocAmount,
                },
              });

              await tx.stockLedgerEntry.create({
                data: {
                  documentId: doc.id,
                  documentLineId: line.id,
                  supplyId: line.supplyId,
                  batchId: batch.id,
                  direction: 'OUT',
                  quantity: allocation.quantity,
                  unitCost: batch.unitCost,
                  amount: allocAmount,
                  balanceAfter: line.supply.inStock - Number(line.convertedQuantity),
                },
              });

              if (doc.outboundType === 'DISPOSAL') {
                const actorUser = actorId ? await tx.user.findUnique({ where: { id: actorId } }) : null;
                await tx.inventoryBatchDeleted.create({
                  data: {
                    originalId: batch.id,
                    supplyId: batch.supplyId,
                    batchNo: batch.batchNo,
                    expiryDate: batch.expiryDate,
                    quantity: allocation.quantity,
                    unitCost: batch.unitCost,
                    originalReceiptCode: batch.originalReceiptCode,
                    receivedAt: batch.receivedAt,
                    deletedAt: new Date(),
                    deletedBy: actorUser?.username || 'warehouse',
                    deleteReason: doc.reason || `Xuất hủy sản phẩm hư hỏng hoặc hết hạn theo phiếu ${doc.code}`,
                  },
                });
              }
            }

            outboundGoodsAmount += lineAmount;

            await tx.stockDocumentLine.update({
              where: { id: line.id },
              data: { goodsAmount: lineAmount, totalAmount: lineAmount },
            });

            await tx.medicalSupply.update({
              where: { id: line.supplyId },
              data: { inStock: { decrement: Number(line.convertedQuantity) } },
            });
          }
        }

        const postedGoodsAmount = doc.type === 'OUT' ? outboundGoodsAmount : doc.goodsAmount;
        const postedTotalAmount = doc.type === 'OUT' ? outboundGoodsAmount : doc.totalAmount;

        const eventType =
          doc.type === 'IN'
            ? 'PURCHASE_PAYABLE'
            : doc.outboundType === 'DISPOSAL'
            ? 'INVENTORY_LOSS'
            : 'INVENTORY_USAGE';

        await tx.accountingWarehouseEntry.create({
          data: {
            documentId: doc.id,
            eventType,
            goodsAmount: postedGoodsAmount,
            vatAmount: doc.vatAmount,
            totalAmount: postedTotalAmount,
            payloadJson: JSON.stringify({
              code: doc.code,
              type: doc.type,
              supplierId: doc.supplierId,
              patientId: doc.patientId,
              intakeId: doc.intakeId,
              doctorId: doc.doctorId,
              lines: doc.lines.map((l) => ({
                supplyId: l.supplyId,
                quantity: Number(l.convertedQuantity),
              })),
            }),
          },
        });

        await tx.warehouseAuditLog.create({
          data: {
            documentId: doc.id,
            action: 'POST',
            actorId,
          },
        });

        return tx.stockDocument.update({
          where: { id },
          data: {
            status: 'POSTED',
            isLocked: true,
            postedAt: new Date(),
            postedById: actorId,
            idempotencyKey,
            goodsAmount: postedGoodsAmount,
            totalAmount: postedTotalAmount,
          },
          include: documentInclude,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 },
    );

    const accountingEntry = await this.prisma.accountingWarehouseEntry.findFirst({
      where: { documentId: id },
      orderBy: { createdAt: 'desc' },
    });
    if (accountingEntry) {
      await this.accounting?.ingestWarehouseEvent(
        accountingEntry.id,
        idempotencyKey ?? `warehouse-entry-${accountingEntry.id}`,
      );
    }
    return document;
  }

  async cancel(id: number, actorId?: number, reason?: string) {
    if (!reason?.trim()) throw new BadRequestException('Bắt buộc phải nhập lý do hủy chứng từ.');

    return this.prisma.$transaction(async (tx) => {
      const doc = await tx.stockDocument.findUnique({
        where: { id },
        include: {
          lines: {
            include: {
              supply: true,
              allocations: { include: { batch: true } },
            },
          },
        },
      });

      if (!doc) throw new NotFoundException('Không tìm thấy chứng từ.');
      if (doc.status === 'CANCELLED') throw new BadRequestException('Chứng từ này đã bị hủy trước đó.');

      if (doc.status === 'POSTED' && doc.type === 'IN') {
        const payable = await tx.debt.findFirst({
          where: { sourceType: 'STOCK_DOCUMENT', sourceCode: doc.code },
          include: { payments: true },
        });
        if (payable?.payments.some((payment) => !payment.reversedAt)) {
          throw new BadRequestException(
            'Không thể hủy phiếu nhập vì khoản phải trả đã phát sinh thanh toán. Vui lòng xử lý tại Kế toán trước.',
          );
        }
      }

      if (doc.status === 'DRAFT' || doc.status === 'PRINTED' || doc.status === 'PENDING_APPROVAL' || doc.status === 'REJECTED') {
        await tx.warehouseAuditLog.create({
          data: {
            documentId: id,
            action: 'CANCEL',
            actorId,
            changesJson: JSON.stringify({ reason }),
          },
        });

        return tx.stockDocument.update({
          where: { id },
          data: {
            status: 'CANCELLED',
            isLocked: true,
            cancelledAt: new Date(),
            reason,
          },
          include: documentInclude,
        });
      }

      // If document is POSTED, execute REVERSAL
      // Check stock safety
      if (doc.type === 'IN') {
        for (const line of doc.lines) {
          if (line.supply.inStock < Number(line.convertedQuantity)) {
            throw new BadRequestException(
              `Không thể hủy phiếu nhập: tồn kho của ${line.supply.name} (${line.supply.inStock.toString()}) nhỏ hơn số lượng cần trừ hoàn (${line.convertedQuantity.toString()}). Lô hàng có thể đã bị xuất dùng.`,
            );
          }
          await tx.medicalSupply.update({
            where: { id: line.supplyId },
            data: { inStock: { decrement: Number(line.convertedQuantity) } },
          });

          // Decrement batches from this receipt
          const batches = await tx.inventoryBatch.findMany({
            where: { supplyId: line.supplyId, originalReceiptCode: doc.code },
          });
          let remainingToDeduct = Number(line.convertedQuantity);
          for (const b of batches) {
            if (remainingToDeduct <= 0) break;
            const deduct = Math.min(Number(b.quantity), remainingToDeduct);
            await tx.inventoryBatch.update({
              where: { id: b.id },
              data: { quantity: { decrement: deduct } },
            });
            remainingToDeduct -= deduct;
          }

          await tx.stockLedgerEntry.create({
            data: {
              documentId: doc.id,
              documentLineId: line.id,
              supplyId: line.supplyId,
              direction: 'OUT_REVERSAL',
              quantity: line.convertedQuantity,
              unitCost: line.inputUnitPrice,
              amount: line.goodsAmount,
              balanceAfter: line.supply.inStock - Number(line.convertedQuantity),
            },
          });
        }
      } else {
        // Reverse OUT issue: restore stock back
        for (const line of doc.lines) {
          for (const alloc of line.allocations) {
            await tx.inventoryBatch.update({
              where: { id: alloc.batchId },
              data: { quantity: { increment: alloc.quantity } },
            });
          }
          await tx.medicalSupply.update({
            where: { id: line.supplyId },
            data: { inStock: { increment: Number(line.convertedQuantity) } },
          });

          await tx.stockLedgerEntry.create({
            data: {
              documentId: doc.id,
              documentLineId: line.id,
              supplyId: line.supplyId,
              direction: 'IN_REVERSAL',
              quantity: line.convertedQuantity,
              unitCost: 0,
              amount: line.goodsAmount,
              balanceAfter: line.supply.inStock + Number(line.convertedQuantity),
            },
          });
        }
      }

      // Reverse accounting entry
      await tx.accountingWarehouseEntry.create({
        data: {
          documentId: doc.id,
          eventType: doc.type === 'IN' ? 'PURCHASE_PAYABLE_REVERSAL' : 'INVENTORY_REVERSAL',
          goodsAmount: -doc.goodsAmount,
          vatAmount: -doc.vatAmount,
          totalAmount: -doc.totalAmount,
          payloadJson: JSON.stringify({
            reversedCode: doc.code,
            reason,
          }),
        },
      });

      await tx.warehouseAuditLog.create({
        data: {
          documentId: id,
          action: 'CANCEL_REVERSAL',
          actorId,
          changesJson: JSON.stringify({ reason }),
        },
      });

      return tx.stockDocument.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          isLocked: true,
          cancelledAt: new Date(),
          reason,
        },
        include: documentInclude,
      });
    });
  }

  /**
   * Hủy sản phẩm hư hỏng hoặc hết hạn từ một lô cụ thể,
   * tự động trừ tồn kho, lập bút toán hao hụt và chuyển thông tin sang bảng InventoryBatchDeleted.
   */
  async disposeBatch(batchId: number, dto: DisposeBatchDto, actorId?: number) {
    if (!dto.reason?.trim()) {
      throw new BadRequestException('Bắt buộc phải nhập lý do hủy sản phẩm hư hỏng hoặc hết hạn.');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const batch = await tx.inventoryBatch.findUnique({
          where: { id: batchId },
          include: { supply: true },
        });
        if (!batch) {
          throw new NotFoundException(`Không tìm thấy lô hàng #${batchId}.`);
        }
        const currentBatchQty = Number(batch.quantity);
        if (currentBatchQty <= 0) {
          throw new BadRequestException('Lô hàng này hiện không còn tồn kho để hủy.');
        }

        const disposeQty = dto.quantity ? Math.min(currentBatchQty, dto.quantity) : currentBatchQty;
        if (disposeQty <= 0) {
          throw new BadRequestException('Số lượng hủy phải lớn hơn 0.');
        }

        const actorUser = actorId ? await tx.user.findUnique({ where: { id: actorId } }) : null;
        const actorName = actorUser?.username || 'warehouse';

        // 1. Giảm số lượng tồn kho của lô
        const updatedBatch = await tx.inventoryBatch.update({
          where: { id: batch.id },
          data: { quantity: { decrement: disposeQty } },
        });

        // 2. Giảm số lượng tồn kho của danh mục VTYT
        const updatedSupply = await tx.medicalSupply.update({
          where: { id: batch.supplyId },
          data: { inStock: { decrement: disposeQty } },
        });

        // 3. Tự động sinh chứng từ xuất hủy (XVT - DISPOSAL) để đồng bộ kế toán và thẻ kho
        const code = await this.nextCode('OUT', tx);
        const lineAmount = Math.round(disposeQty * Number(batch.unitCost));

        const doc = await tx.stockDocument.create({
          data: {
            code,
            type: 'OUT',
            outboundType: 'DISPOSAL',
            status: 'POSTED',
            isLocked: true,
            reason: dto.reason.trim(),
            goodsAmount: lineAmount,
            vatAmount: 0,
            totalAmount: lineAmount,
            createdById: actorId,
            postedById: actorId,
            postedAt: new Date(),
            lines: {
              create: [
                {
                  supplyId: batch.supplyId,
                  inputQuantity: disposeQty,
                  inputUnit: batch.supply.baseUnit,
                  conversionFactor: 1,
                  convertedQuantity: disposeQty,
                  batchNo: batch.batchNo,
                  expiryDate: batch.expiryDate,
                  inputUnitPrice: Number(batch.unitCost),
                  vatRate: 0,
                  goodsAmount: lineAmount,
                  vatAmount: 0,
                  totalAmount: lineAmount,
                },
              ],
            },
            auditLogs: {
              create: {
                action: 'DISPOSE_BATCH',
                actorId,
                changesJson: JSON.stringify({ batchId, disposeQty, reason: dto.reason }),
              },
            },
          },
          include: { lines: true },
        });

        const line = doc.lines[0];

        // 4. Tạo StockAllocation
        await tx.stockAllocation.create({
          data: {
            documentLineId: line.id,
            batchId: batch.id,
            quantity: disposeQty,
            unitCost: batch.unitCost,
            amount: lineAmount,
          },
        });

        // 5. Ghi thẻ kho StockLedgerEntry
        await tx.stockLedgerEntry.create({
          data: {
            documentId: doc.id,
            documentLineId: line.id,
            supplyId: batch.supplyId,
            batchId: batch.id,
            direction: 'OUT',
            quantity: disposeQty,
            unitCost: batch.unitCost,
            amount: lineAmount,
            balanceAfter: updatedSupply.inStock,
          },
        });

        // 6. Ghi bút toán kế toán hao hụt AccountingWarehouseEntry
        await tx.accountingWarehouseEntry.create({
          data: {
            documentId: doc.id,
            eventType: 'INVENTORY_LOSS',
            goodsAmount: lineAmount,
            vatAmount: 0,
            totalAmount: lineAmount,
            payloadJson: JSON.stringify({
              code: doc.code,
              type: 'OUT',
              outboundType: 'DISPOSAL',
              batchId: batch.id,
              batchNo: batch.batchNo,
              reason: dto.reason,
            }),
          },
        });

        // 7. Chuyển thông tin sản phẩm / lô hư hỏng sang bảng InventoryBatchDeleted
        const deletedRecord = await tx.inventoryBatchDeleted.create({
          data: {
            originalId: batch.id,
            supplyId: batch.supplyId,
            batchNo: batch.batchNo,
            expiryDate: batch.expiryDate,
            quantity: disposeQty,
            unitCost: batch.unitCost,
            originalReceiptCode: batch.originalReceiptCode,
            receivedAt: batch.receivedAt,
            deletedAt: new Date(),
            deletedBy: actorName,
            deleteReason: dto.reason.trim(),
          },
        });

        return {
          success: true,
          message: `Đã hủy ${disposeQty} ${batch.supply.baseUnit} ${batch.supply.name} (Lô: ${batch.batchNo || 'Không số lô'}) và chuyển thành công sang bảng InventoryBatchDeleted (Bản ghi #${deletedRecord.id}).`,
          deletedBatch: deletedRecord,
          documentCode: doc.code,
          remainingBatchQuantity: Number(updatedBatch.quantity),
          remainingSupplyStock: updatedSupply.inStock,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 },
    );
  }

  /**
   * Xóa hoặc hủy bỏ danh mục sản phẩm hư hỏng / hết hạn,
   * chuyển toàn bộ thông tin sản phẩm sang MedicalSupplyDeleted và các lô sang InventoryBatchDeleted.
   */
  async deleteSupplyItem(id: number, reason: string, actorId?: number) {
    if (!reason?.trim()) {
      throw new BadRequestException('Bắt buộc phải nhập lý do hủy sản phẩm.');
    }

    return this.prisma.$transaction(async (tx) => {
      const supply = await tx.medicalSupply.findUnique({
        where: { id },
        include: { inventoryBatches: { where: { quantity: { gt: 0 } } } },
      });
      if (!supply) {
        throw new NotFoundException(`Không tìm thấy vật tư y tế #${id}.`);
      }

      const actorUser = actorId ? await tx.user.findUnique({ where: { id: actorId } }) : null;
      const actorName = actorUser?.username || 'warehouse';
      const now = new Date();

      // 1. Chuyển các lô tồn còn lại (nếu có) sang InventoryBatchDeleted
      const backedUpBatches = [];
      for (const batch of supply.inventoryBatches) {
        const deletedBatch = await tx.inventoryBatchDeleted.create({
          data: {
            originalId: batch.id,
            supplyId: batch.supplyId,
            batchNo: batch.batchNo,
            expiryDate: batch.expiryDate,
            quantity: batch.quantity,
            unitCost: batch.unitCost,
            originalReceiptCode: batch.originalReceiptCode,
            receivedAt: batch.receivedAt,
            deletedAt: now,
            deletedBy: actorName,
            deleteReason: `Hủy toàn bộ sản phẩm ${supply.name}: ${reason.trim()}`,
          },
        });
        backedUpBatches.push(deletedBatch);

        await tx.inventoryBatch.update({
          where: { id: batch.id },
          data: { quantity: 0 },
        });
      }

      // 2. Chuyển thông tin sản phẩm sang MedicalSupplyDeleted
      const deletedSupply = await tx.medicalSupplyDeleted.create({
        data: {
          originalId: supply.id,
          code: supply.code,
          name: supply.name,
          group: supply.group,
          baseUnit: supply.baseUnit,
          conversionUnit: supply.conversionUnit,
          conversionRate: supply.conversionRate,
          costPrice: supply.costPrice,
          inStock: supply.inStock,
          isActive: false,
          deletedAt: now,
          deletedBy: actorName,
          deleteReason: reason.trim(),
        },
      });

      // 3. Đánh dấu ngưng hoạt động và đưa tồn về 0
      await tx.medicalSupply.update({
        where: { id },
        data: { isActive: false, inStock: 0 },
      });

      return {
        success: true,
        message: `Đã hủy sản phẩm ${supply.name} (${supply.code}) và chuyển sang bảng MedicalSupplyDeleted`,
        deletedSupply,
        deletedBatchesCount: backedUpBatches.length,
      };
    }, { timeout: 15000 });
  }

  /**
   * Xóa chứng từ nháp, lưu bản sao lưu sang StockDocumentDeleted và StockDocumentLineDeleted
   */
  async deleteDocument(id: number, reason: string, actorId?: number) {
    if (!reason?.trim()) throw new BadRequestException('Bắt buộc phải nhập lý do xóa chứng từ.');
    return this.prisma.$transaction(async (tx) => {
      const doc = await tx.stockDocument.findUnique({
        where: { id },
        include: { lines: true },
      });
      if (!doc) throw new NotFoundException('Không tìm thấy chứng từ.');
      if (doc.status === 'POSTED') {
        throw new BadRequestException('Chứng từ đã ghi sổ không thể xóa, vui lòng dùng chức năng Hủy (Cancel).');
      }

      const actorUser = actorId ? await tx.user.findUnique({ where: { id: actorId } }) : null;
      const actorName = actorUser?.username || 'warehouse';
      const now = new Date();

      await tx.stockDocumentDeleted.create({
        data: {
          originalId: doc.id,
          code: doc.code,
          type: doc.type,
          outboundType: doc.outboundType,
          status: doc.status,
          supplierId: doc.supplierId,
          patientId: doc.patientId,
          examinationId: doc.examinationId,
          doctorId: doc.doctorId,
          roomId: doc.roomId,
          intakeId: doc.intakeId,
          recipientDepartment: doc.recipientDepartment,
          reason: doc.reason,
          nonFefoReason: doc.nonFefoReason,
          goodsAmount: doc.goodsAmount,
          vatAmount: doc.vatAmount,
          totalAmount: doc.totalAmount,
          contentHash: doc.contentHash,
          printCount: doc.printCount,
          isLocked: doc.isLocked,
          createdById: doc.createdById,
          postedById: doc.postedById,
          printedAt: doc.printedAt,
          postedAt: doc.postedAt,
          cancelledAt: doc.cancelledAt,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          deletedAt: now,
          deletedBy: actorName,
          deleteReason: reason.trim(),
        },
      });

      for (const line of doc.lines) {
        await tx.stockDocumentLineDeleted.create({
          data: {
            originalId: line.id,
            documentId: line.documentId,
            supplyId: line.supplyId,
            inputQuantity: line.inputQuantity,
            inputUnit: line.inputUnit,
            conversionFactor: line.conversionFactor,
            convertedQuantity: line.convertedQuantity,
            batchNo: line.batchNo,
            expiryDate: line.expiryDate,
            inputUnitPrice: line.inputUnitPrice,
            vatRate: line.vatRate,
            goodsAmount: line.goodsAmount,
            vatAmount: line.vatAmount,
            totalAmount: line.totalAmount,
            deletedAt: now,
            deletedBy: actorName,
            deleteReason: reason.trim(),
          },
        });
      }

      await tx.stockDocumentLine.deleteMany({ where: { documentId: id } });
      await tx.warehouseAuditLog.deleteMany({ where: { documentId: id } });
      await tx.warehousePrintLog.deleteMany({ where: { documentId: id } });
      await tx.stockDocument.delete({ where: { id } });

      return {
        success: true,
        message: `Đã xóa chứng từ ${doc.code} và lưu bản sao lưu vào bảng StockDocumentDeleted`,
      };
    }, { timeout: 15000 });
  }

  /**
   * Tra cứu danh sách các bản ghi đã xóa / hủy được sao lưu trong các bảng *Deleted của phân hệ Kho
   */
  async getDeletedBackups() {
    const [batches, supplies, documents, lines, allocations, ledgers] = await Promise.all([
      this.prisma.inventoryBatchDeleted.findMany({ orderBy: { deletedAt: 'desc' }, take: 100 }),
      this.prisma.medicalSupplyDeleted.findMany({ orderBy: { deletedAt: 'desc' }, take: 100 }),
      this.prisma.stockDocumentDeleted.findMany({ orderBy: { deletedAt: 'desc' }, take: 100 }),
      this.prisma.stockDocumentLineDeleted.findMany({ orderBy: { deletedAt: 'desc' }, take: 100 }),
      this.prisma.stockAllocationDeleted.findMany({ orderBy: { deletedAt: 'desc' }, take: 100 }),
      this.prisma.stockLedgerEntryDeleted.findMany({ orderBy: { deletedAt: 'desc' }, take: 100 }),
    ]);

    return {
      batches,
      supplies,
      documents,
      lines,
      allocations,
      ledgers,
    };
  }
}

