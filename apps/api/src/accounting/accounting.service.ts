import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/database/prisma.service.js';
import { readVietnameseCurrency } from '../warehouse/warehouse-domain.js';
import { ageDebt, calculateSettlement, calculateTax, summarizeCash } from './accounting-domain.js';

interface DoctorServiceLinePayload {
  intakeServiceId: number;
  serviceId: number;
  serviceType: string;
  revenue: number;
  taxRate?: number;
  taxClassification?: string;
  supplyCost: number;
}

interface DoctorEventPayload {
  examinationCode: string;
  patientId: number;
  intakeId: number;
  intakeCode?: string;
  roomId: number;
  doctorId: number;
  completedAt: string;
  serviceLines: DoctorServiceLinePayload[];
}

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  private eventKey(sourceType: string, sourceCode: string, eventType: string, idempotencyKey: string) {
    return { sourceType, sourceCode, eventType, idempotencyKey };
  }

  private async existingEvent(tx: any, key: ReturnType<AccountingService['eventKey']>) {
    return tx.accountingEvent.findUnique({
      where: { sourceType_sourceCode_eventType_idempotencyKey: key },
      include: { entries: true },
    });
  }

  private async assertOpenPeriod(tx: any, effectiveDate: Date) {
    const lock = await tx.accountingPeriodLock.findUnique({
      where: { year_month: { year: effectiveDate.getUTCFullYear(), month: effectiveDate.getUTCMonth() + 1 } },
    });
    if (lock) throw new BadRequestException('Kỳ kế toán đã khóa. Vui lòng ghi điều chỉnh ở kỳ đang mở.');
  }

  private validateMoney(amount: number, label = 'Số tiền') {
    if (!Number.isInteger(amount) || amount < 0) throw new BadRequestException(`${label} không hợp lệ.`);
  }

  async ingestReceptionPayment(paymentId: number, idempotencyKey: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { intake: true },
    });
    if (!payment) throw new NotFoundException('Không tìm thấy khoản thanh toán.');
    if (payment.status !== 'PAID' || !payment.paidAt) {
      throw new BadRequestException('Chỉ thanh toán thành công mới được ghi nhận kế toán.');
    }

    const key = this.eventKey('RECEPTION_PAYMENT', String(payment.id), 'PATIENT_ADVANCE_PAID', idempotencyKey);
    return this.prisma.$transaction(async (tx: any) => {
      const existing = await this.existingEvent(tx, key);
      if (existing) return { duplicate: true, eventId: existing.id, entryId: existing.entries[0]?.id };
      await this.assertOpenPeriod(tx, payment.paidAt!);

      const event = await tx.accountingEvent.create({
        data: {
          ...key,
          payloadJson: JSON.stringify({ paymentId: payment.id, intakeCode: payment.intakeCode, amount: payment.amount }),
          status: 'PROCESSING',
        },
      });
      const entry = await tx.accountingEntry.create({
        data: {
          eventId: event.id,
          ledgerView: 'CASH',
          direction: 'IN',
          category: 'PATIENT_ADVANCE',
          effectiveDate: payment.paidAt,
          roomId: payment.intake?.roomId ?? null,
          patientId: payment.intake?.patientId ?? null,
          sourceType: 'INTAKE',
          sourceCode: payment.intakeCode,
          preTaxAmount: payment.amount,
          taxAmount: 0,
          totalAmount: payment.amount,
          affectsCash: true,
          paymentMethod: payment.method,
          transactionCode: payment.orderId,
          paymentStatus: 'PAID',
          documentStatus: 'NOT_REQUIRED',
          actorId: payment.createdById,
        },
      });
      await tx.payment.update({ where: { id: payment.id }, data: { accountingEntryId: entry.id } });
      await tx.accountingEvent.update({ where: { id: event.id }, data: { status: 'PROCESSED', processedAt: new Date() } });
      return { duplicate: false, eventId: event.id, entryId: entry.id };
    });
  }

  async ingestDoctorEvent(outboxId: number, idempotencyKey: string) {
    const outbox = await this.prisma.accountingOutbox.findUnique({ where: { id: outboxId } });
    if (!outbox) throw new NotFoundException('Không tìm thấy sự kiện ca khám.');
    const payload = JSON.parse(outbox.payload ?? '{}') as DoctorEventPayload;
    if (!payload.examinationCode || !Array.isArray(payload.serviceLines)) {
      throw new BadRequestException('Payload ca khám chưa có dữ liệu theo dòng dịch vụ.');
    }
    const eventType = outbox.isCancelled ? 'EXAMINATION_CANCELLED' : 'EXAMINATION_COMPLETED';
    const key = this.eventKey('DOCTOR_EXAMINATION', payload.examinationCode, eventType, idempotencyKey);

    return this.prisma.$transaction(async (tx: any) => {
      const existing = await this.existingEvent(tx, key);
      if (existing) return { duplicate: true, eventId: existing.id };
      const effectiveDate = new Date(payload.completedAt);
      await this.assertOpenPeriod(tx, effectiveDate);

      const event = await tx.accountingEvent.create({
        data: { ...key, payloadJson: outbox.payload ?? '{}', status: 'PROCESSING' },
      });
      let recognizedRevenue = 0;
      let taxAmount = 0;
      for (const line of payload.serviceLines) {
        const tax = calculateTax({ preTaxAmount: outbox.isCancelled ? 0 : line.revenue, taxRate: line.taxRate ?? 0 });
        recognizedRevenue += tax.preTaxAmount;
        taxAmount += tax.taxAmount;
        await tx.performanceLine.create({
          data: {
            eventId: event.id,
            examinationId: outbox.examinationId,
            intakeServiceId: line.intakeServiceId,
            serviceId: line.serviceId,
            doctorId: payload.doctorId,
            roomId: payload.roomId,
            serviceType: line.serviceType,
            taxClassification: line.taxClassification,
            taxRate: tax.taxRate,
            taxAmount: tax.taxAmount,
            recognizedRevenue: tax.preTaxAmount,
            supplyCost: line.supplyCost,
            effectiveDate,
          },
        });
      }

      const advances = await tx.accountingEntry.findMany({
        where: { patientId: payload.patientId, category: 'PATIENT_ADVANCE', status: 'POSTED' },
        include: { advanceAllocations: true },
        orderBy: { createdAt: 'asc' },
      });
      advances.sort((left: any, right: any) => {
        const leftPriority = payload.intakeCode && left.sourceCode === payload.intakeCode ? 0 : 1;
        const rightPriority = payload.intakeCode && right.sourceCode === payload.intakeCode ? 0 : 1;
        return leftPriority - rightPriority || new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      });
      const availableAdvance = (entry: any) => entry.totalAmount - (entry.advanceAllocations ?? [])
        .filter((allocation: any) => !allocation.reversedAt)
        .reduce((sum: number, allocation: any) => sum + allocation.amount, 0);
      const totalAdvances = advances.reduce((sum: number, entry: any) => sum + Math.max(0, availableAdvance(entry)), 0);
      const settlement = calculateSettlement({ recognizedRevenue, taxAmount, advances: totalAdvances, cancelled: outbox.isCancelled });

      let remainingToApply = settlement.appliedAdvance;
      for (const advance of advances) {
        if (remainingToApply <= 0) break;
        const amount = Math.min(remainingToApply, Math.max(0, availableAdvance(advance)));
        if (amount <= 0) continue;
        await tx.patientAdvanceAllocation.create({
          data: {
            cashEntryId: advance.id,
            patientId: payload.patientId,
            intakeId: payload.intakeId,
            examinationId: outbox.examinationId,
            amount,
          },
        });
        remainingToApply -= amount;
      }

      if (settlement.receivable > 0) {
        await tx.debt.create({
          data: {
            debtType: 'PATIENT_RECEIVABLE',
            patientId: payload.patientId,
            roomId: payload.roomId,
            sourceType: 'EXAMINATION',
            sourceCode: payload.examinationCode,
            principalAmount: settlement.receivable,
            effectiveDate,
          },
        });
      }

      await tx.accountingEvent.update({ where: { id: event.id }, data: { status: 'PROCESSED', processedAt: new Date() } });
      return { duplicate: false, eventId: event.id, ...settlement };
    });
  }

  async ingestWarehouseEvent(entryId: number, idempotencyKey: string) {
    const source = await this.prisma.accountingWarehouseEntry.findUnique({
      where: { id: entryId },
      include: { document: true },
    });
    if (!source) throw new NotFoundException('Không tìm thấy sự kiện kho.');
    const payload = JSON.parse(source.payloadJson) as Record<string, any>;
    const key = this.eventKey('WAREHOUSE_DOCUMENT', String(payload.code ?? source.documentId), source.eventType, idempotencyKey);
    const effectiveDate = source.document?.postedAt ?? source.createdAt ?? new Date();

    return this.prisma.$transaction(async (tx: any) => {
      const existing = await this.existingEvent(tx, key);
      if (existing) return { duplicate: true, eventId: existing.id };
      await this.assertOpenPeriod(tx, effectiveDate);
      const event = await tx.accountingEvent.create({ data: { ...key, payloadJson: source.payloadJson, status: 'PROCESSING' } });
      let kind: 'SUPPLIER_PAYABLE' | 'LOSS' | 'PERFORMANCE';

      if (source.eventType === 'PURCHASE_PAYABLE') {
        kind = 'SUPPLIER_PAYABLE';
        await tx.debt.create({ data: {
          debtType: 'SUPPLIER_PAYABLE', supplierId: payload.supplierId ?? null,
          sourceType: 'STOCK_DOCUMENT', sourceCode: String(payload.code ?? source.documentId),
          principalAmount: source.totalAmount, effectiveDate,
        } });
      } else {
        kind = source.eventType === 'INVENTORY_LOSS' ? 'LOSS' : 'PERFORMANCE';
        await tx.accountingEntry.create({ data: {
          eventId: event.id,
          ledgerView: kind === 'LOSS' ? 'LOSS' : 'PERFORMANCE', direction: 'NONE',
          category: source.eventType, effectiveDate, roomId: payload.roomId ?? null,
          patientId: payload.patientId ?? null, supplierId: payload.supplierId ?? null,
          sourceType: 'STOCK_DOCUMENT', sourceCode: String(payload.code ?? source.documentId),
          preTaxAmount: source.goodsAmount, taxAmount: source.vatAmount, totalAmount: source.totalAmount,
          affectsCash: false, paymentStatus: 'NOT_APPLICABLE', documentStatus: 'POSTED',
        } });
      }

      await tx.accountingEvent.update({ where: { id: event.id }, data: { status: 'PROCESSED', processedAt: new Date() } });
      return { duplicate: false, eventId: event.id, kind };
    });
  }

  private dateWhere(filters: { startDate?: Date; endDate?: Date }) {
    if (!filters.startDate && !filters.endDate) return undefined;
    return { gte: filters.startDate, lte: filters.endDate };
  }

  async getCash(filters: { startDate?: Date; endDate?: Date; roomId?: number; category?: string; paymentMethod?: string } = {}) {
    return this.prisma.accountingEntry.findMany({
      where: {
        ledgerView: 'CASH',
        effectiveDate: this.dateWhere(filters),
        roomId: filters.roomId,
        category: filters.category,
        paymentMethod: filters.paymentMethod,
      },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  async getLosses(filters: { startDate?: Date; endDate?: Date; roomId?: number } = {}) {
    return this.prisma.accountingEntry.findMany({
      where: { ledgerView: 'LOSS', effectiveDate: this.dateWhere(filters), roomId: filters.roomId },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  async getDebts(filters: { debtType?: string; asOf?: Date } = {}) {
    const debts = await this.prisma.debt.findMany({
      where: { debtType: filters.debtType, status: { not: 'REVERSED' } },
      include: { payments: true },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });
    const asOf = filters.asOf ?? new Date();
    return debts.map((debt: any) => {
      const paidAmount = debt.payments
        .filter((payment: any) => !payment.reversedAt)
        .reduce((sum: number, payment: any) => sum + payment.amount, 0);
      return {
        ...debt,
        paidAmount,
        remainingAmount: Math.max(0, debt.principalAmount - paidAmount),
        ageBucket: ageDebt({ dueDate: debt.dueDate ?? debt.effectiveDate, asOf }),
      };
    });
  }

  async getOverview(filters: {
    startDate?: Date;
    endDate?: Date;
    roomId?: number;
    serviceType?: string;
    supplyType?: string;
    asOf?: Date;
  } = {}) {
    const [entries, performanceLines, debts] = await Promise.all([
      this.prisma.accountingEntry.findMany({
        where: { effectiveDate: this.dateWhere(filters), roomId: filters.roomId, status: 'POSTED' },
      }),
      this.prisma.performanceLine.findMany({
        where: {
          effectiveDate: this.dateWhere(filters),
          roomId: filters.roomId,
          serviceType: filters.serviceType,
          status: 'POSTED',
        },
      }),
      this.prisma.debt.findMany({ where: { status: { not: 'REVERSED' }, roomId: filters.roomId }, include: { payments: true } }),
    ]);

    const cashEntries = entries.map((entry: any) => ({
      direction: entry.direction,
      amount: entry.totalAmount,
      affectsCash: entry.affectsCash,
      sourceCode: entry.sourceCode,
      status: entry.status,
    }));
    const summary = summarizeCash(cashEntries);
    const cashByCategory = entries.filter((entry: any) => entry.affectsCash).reduce((result: Record<string, number>, entry: any) => {
      result[entry.category] = (result[entry.category] ?? 0) + entry.totalAmount;
      return result;
    }, {});
    const cashByMethod = entries.filter((entry: any) => entry.affectsCash).reduce((result: Record<string, number>, entry: any) => {
      const key = entry.paymentMethod ?? 'OTHER';
      result[key] = (result[key] ?? 0) + entry.totalAmount;
      return result;
    }, {});
    const revenue = performanceLines.reduce((sum: number, line: any) => sum + line.recognizedRevenue, 0);
    const supplyCost = performanceLines.reduce((sum: number, line: any) => sum + line.supplyCost, 0);

    const debtRows = debts.map((debt: any) => {
      const paid = debt.payments.filter((item: any) => !item.reversedAt).reduce((sum: number, item: any) => sum + item.amount, 0);
      return { ...debt, remaining: Math.max(0, debt.principalAmount - paid) };
    });
    const receivable = debtRows.filter((debt: any) => debt.debtType === 'PATIENT_RECEIVABLE').reduce((sum: number, debt: any) => sum + debt.remaining, 0);
    const payable = debtRows.filter((debt: any) => debt.debtType === 'SUPPLIER_PAYABLE').reduce((sum: number, debt: any) => sum + debt.remaining, 0);
    const aging = { '0-30': 0, '31-60': 0, '61-90': 0, '>90': 0 } as Record<string, number>;
    for (const debt of debtRows) {
      const bucket = ageDebt({ dueDate: debt.dueDate ?? debt.effectiveDate, asOf: filters.asOf ?? new Date() });
      aging[bucket] += debt.remaining;
    }

    return {
      cash: {
        summary,
        byCategory: cashByCategory,
        byMethod: cashByMethod,
        enteredTaxTotal: entries.reduce((sum: number, entry: any) => sum + entry.taxAmount, 0),
      },
      performance: { revenue, supplyCost, grossProfit: revenue - supplyCost },
      debt: { receivable, payable, aging },
      filterApplicability: {
        cash: { dateRange: true, roomId: true, serviceType: false, supplyType: false },
        performance: { dateRange: true, roomId: true, serviceType: true, supplyType: true },
        debt: { dateRange: false, roomId: true, serviceType: false, supplyType: false },
      },
    };
  }

  async createDebtPayment(
    debtId: number,
    input: { amount: number; method: string; transactionCode?: string; effectiveDate: Date },
    actor: { id: number; role: string },
  ) {
    if (actor.role !== 'ACCOUNTING_STAFF') throw new BadRequestException('Chỉ Kế toán được thanh toán công nợ.');
    this.validateMoney(input.amount);
    if (input.amount === 0) throw new BadRequestException('Số tiền thanh toán phải lớn hơn 0.');
    if (input.effectiveDate.getTime() > Date.now()) throw new BadRequestException('Ngày thanh toán không được ở tương lai.');

    return this.prisma.$transaction(async (tx: any) => {
      await this.assertOpenPeriod(tx, input.effectiveDate);
      const debt = await tx.debt.findUnique({ where: { id: debtId }, include: { payments: true } });
      if (!debt) throw new NotFoundException('Không tìm thấy khoản công nợ.');
      const paidBefore = debt.payments.filter((item: any) => !item.reversedAt).reduce((sum: number, item: any) => sum + item.amount, 0);
      const remainingBefore = Math.max(0, debt.principalAmount - paidBefore);
      if (input.amount > remainingBefore) throw new BadRequestException('Số tiền thanh toán vượt số dư công nợ.');

      const isReceivable = debt.debtType === 'PATIENT_RECEIVABLE';
      const cashEntry = await tx.accountingEntry.create({ data: {
        ledgerView: 'CASH', direction: isReceivable ? 'IN' : 'OUT',
        category: isReceivable ? 'PATIENT_DEBT_PAYMENT' : 'MATERIAL_PAYMENT',
        effectiveDate: input.effectiveDate, patientId: debt.patientId, supplierId: debt.supplierId,
        roomId: debt.roomId, sourceType: 'DEBT', sourceCode: debt.sourceCode,
        preTaxAmount: input.amount, taxAmount: 0, totalAmount: input.amount,
        affectsCash: true, paymentMethod: input.method, transactionCode: input.transactionCode,
        paymentStatus: 'PAID', documentStatus: 'NOT_REQUIRED', actorId: actor.id,
      } });
      await tx.debtPaymentAllocation.create({ data: { debtId, cashEntryId: cashEntry.id, amount: input.amount } });
      const paidAmount = paidBefore + input.amount;
      const remainingAmount = debt.principalAmount - paidAmount;
      const status = remainingAmount === 0 ? 'PAID' : 'PARTIAL';
      await tx.debt.update({ where: { id: debtId }, data: { status } });
      return { debtId, cashEntryId: cashEntry.id, paidAmount, remainingAmount, status };
    }, { isolationLevel: 'Serializable' });
  }

  async createExpense(
    input: {
      category: string;
      amount: number;
      method: string;
      transactionCode?: string;
      supplierId?: number;
      roomId?: number;
      effectiveDate: Date;
      reason: string;
    },
    actor: { id: number; role: string },
  ) {
    if (actor.role !== 'ACCOUNTING_STAFF') throw new BadRequestException('Chỉ Kế toán được ghi nhận khoản chi.');
    this.validateMoney(input.amount);
    if (input.amount === 0 || !input.reason?.trim()) throw new BadRequestException('Khoản chi và lý do là bắt buộc.');
    if (input.effectiveDate.getTime() > Date.now()) throw new BadRequestException('Ngày chi không được ở tương lai.');
    await this.assertOpenPeriod(this.prisma, input.effectiveDate);
    const dateStr = `${input.effectiveDate.getUTCFullYear()}${String(input.effectiveDate.getUTCMonth() + 1).padStart(2, '0')}${String(input.effectiveDate.getUTCDate()).padStart(2, '0')}`;
    const count = await this.prisma.accountingEntry.count({
      where: { sourceType: 'MANUAL_EXPENSE', sourceCode: { startsWith: `PC${dateStr}` } },
    });
    const sourceCode = `PC${dateStr}/${String(count + 1).padStart(4, '0')}`;

    return this.prisma.accountingEntry.create({ data: {
      ledgerView: 'CASH', direction: 'OUT', category: input.category,
      effectiveDate: input.effectiveDate, roomId: input.roomId, supplierId: input.supplierId,
      sourceType: 'MANUAL_EXPENSE', sourceCode,
      preTaxAmount: input.amount, taxAmount: 0, totalAmount: input.amount,
      affectsCash: true, paymentMethod: input.method, transactionCode: input.transactionCode,
      paymentStatus: 'PAID', documentStatus: 'PENDING', reason: input.reason.trim(), actorId: actor.id,
    } });
  }

  async getSupplierInvoices() {
    const invoices = await this.prisma.supplierInvoice.findMany({
      include: {
        links: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });
    const stockDocIds = invoices.flatMap((inv: any) => inv.links.map((l: any) => l.stockDocumentId));
    const stockDocs = stockDocIds.length > 0
      ? await this.prisma.stockDocument.findMany({
          where: { id: { in: stockDocIds } },
          select: { id: true, code: true, type: true, totalAmount: true },
        })
      : [];
    const stockDocMap = new Map(stockDocs.map((doc: any) => [doc.id, doc]));

    return invoices.map((inv: any) => ({
      ...inv,
      stockDocuments: inv.links.map((l: any) => ({
        stockDocumentId: l.stockDocumentId,
        linkedAmount: l.linkedAmount,
        code: stockDocMap.get(l.stockDocumentId)?.code ?? `MVT-${l.stockDocumentId}`,
        totalAmount: stockDocMap.get(l.stockDocumentId)?.totalAmount ?? l.linkedAmount,
      })),
    }));
  }

  async getPendingInvoiceStockDocuments() {
    const linkedLinks = await this.prisma.supplierInvoiceStockDocument.findMany({
      select: { stockDocumentId: true },
    });
    const linkedIds = new Set(linkedLinks.map((l: any) => l.stockDocumentId));

    const postedReceipts = await this.prisma.stockDocument.findMany({
      where: { type: 'IN', status: 'POSTED' },
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();
    return postedReceipts
      .filter((doc: any) => !linkedIds.has(doc.id))
      .map((doc: any) => {
        const daysWaiting = Math.floor((now - doc.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: doc.id,
          code: doc.code,
          supplierId: doc.supplierId,
          supplierName: doc.supplier?.name ?? 'Nhà cung cấp',
          totalAmount: doc.totalAmount,
          createdAt: doc.createdAt,
          daysWaiting,
          isOverdue: daysWaiting >= 7,
        };
      });
  }

  async getReconciliations() {
    return this.prisma.cashReconciliation.findMany({
      orderBy: { businessDate: 'desc' },
    });
  }

  async getPeriodLocks() {
    return this.prisma.accountingPeriodLock.findMany({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async getRefunds() {
    return this.prisma.refundRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAuditLogs() {
    return this.prisma.accountingAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getPerformanceDetails(filters: { startDate?: Date; endDate?: Date; roomId?: number } = {}) {
    const lines = await this.prisma.performanceLine.findMany({
      where: {
        effectiveDate: this.dateWhere(filters),
        roomId: filters.roomId,
        status: 'POSTED',
      },
    });

    const byServiceMap = new Map<number, { serviceId: number; serviceType: string; count: number; revenue: number; cost: number; profit: number }>();
    const byDoctorMap = new Map<number, { doctorId: number; count: number; revenue: number; cost: number; profit: number }>();

    for (const line of lines) {
      const currentService = byServiceMap.get(line.serviceId) ?? {
        serviceId: line.serviceId,
        serviceType: line.serviceType,
        count: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
      currentService.count += 1;
      currentService.revenue += line.recognizedRevenue;
      currentService.cost += line.supplyCost;
      currentService.profit = currentService.revenue - currentService.cost;
      byServiceMap.set(line.serviceId, currentService);

      const currentDoctor = byDoctorMap.get(line.doctorId) ?? {
        doctorId: line.doctorId,
        count: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
      currentDoctor.count += 1;
      currentDoctor.revenue += line.recognizedRevenue;
      currentDoctor.cost += line.supplyCost;
      currentDoctor.profit = currentDoctor.revenue - currentDoctor.cost;
      byDoctorMap.set(line.doctorId, currentDoctor);
    }

    return {
      byService: Array.from(byServiceMap.values()),
      byDoctor: Array.from(byDoctorMap.values()),
    };
  }

  async createSupplierInvoice(input: {
    invoiceNumber: string;
    series: string;
    invoiceDate: Date;
    supplierId?: number;
    supplierTaxCode: string;
    buyerName?: string;
    buyerTaxCode?: string;
    buyerAddress?: string;
    goodsAmount: number;
    taxAmount: number;
    totalAmount: number;
    attachmentName?: string;
    attachmentUrl?: string;
    documentStatus: string;
    differenceNote?: string;
    stockDocumentIds: number[];
  }, actor: { id: number; role: string }) {
    if (actor.role !== 'ACCOUNTING_STAFF') throw new BadRequestException('Chỉ Kế toán được tạo hóa đơn nhà cung cấp.');
    this.validateMoney(input.goodsAmount, 'Tiền hàng');
    this.validateMoney(input.taxAmount, 'Tiền thuế');
    if (input.totalAmount !== input.goodsAmount + input.taxAmount) {
      throw new BadRequestException('Tổng hóa đơn phải bằng tiền hàng cộng tiền thuế.');
    }
    if (input.invoiceDate.getTime() > Date.now()) throw new BadRequestException('Ngày hóa đơn không được ở tương lai.');

    const duplicate = await this.prisma.supplierInvoice.findUnique({
      where: { invoiceNumber_series_supplierTaxCode: {
        invoiceNumber: input.invoiceNumber, series: input.series, supplierTaxCode: input.supplierTaxCode,
      } },
    });
    if (duplicate) throw new BadRequestException('Hóa đơn đã tồn tại.');
    const documents = await this.prisma.stockDocument.findMany({ where: { id: { in: input.stockDocumentIds } } });
    if (documents.length !== new Set(input.stockDocumentIds).size) throw new BadRequestException('Có phiếu nhập không tồn tại.');
    if (documents.some((document: any) => document.type !== 'IN' || document.status !== 'POSTED')) {
      throw new BadRequestException('Chỉ được liên kết phiếu nhập đã ghi sổ.');
    }
    if (input.supplierId && documents.some((document: any) => document.supplierId !== input.supplierId)) {
      throw new BadRequestException('Hóa đơn và phiếu nhập phải cùng nhà cung cấp.');
    }
    const receiptTotal = documents.reduce((sum: number, document: any) => sum + document.totalAmount, 0);
    if (receiptTotal !== input.totalAmount && !input.differenceNote?.trim()) {
      throw new BadRequestException('Bắt buộc nhập lý do lệch tiền giữa hóa đơn và phiếu nhập.');
    }
    return this.prisma.supplierInvoice.create({ data: {
      invoiceNumber: input.invoiceNumber,
      series: input.series,
      invoiceDate: input.invoiceDate,
      supplierId: input.supplierId,
      supplierTaxCode: input.supplierTaxCode,
      buyerName: input.buyerName,
      buyerTaxCode: input.buyerTaxCode,
      buyerAddress: input.buyerAddress,
      goodsAmount: input.goodsAmount,
      taxAmount: input.taxAmount,
      totalAmount: input.totalAmount,
      attachmentName: input.attachmentName,
      attachmentUrl: input.attachmentUrl,
      documentStatus: input.documentStatus,
      differenceNote: input.differenceNote?.trim(),
      createdById: actor.id,
      links: { create: documents.map((document: any) => ({ stockDocumentId: document.id, linkedAmount: document.totalAmount })) },
    }, include: { links: true } });
  }

  async createRefundRequest(
    input: { originalEntryId: number; amount: number; reason: string },
    actor: { id: number; role: string },
  ) {
    if (actor.role !== 'ACCOUNTING_STAFF') throw new BadRequestException('Chỉ Kế toán được tạo yêu cầu hoàn tiền.');
    this.validateMoney(input.amount);
    if (input.amount === 0) throw new BadRequestException('Số tiền hoàn phải lớn hơn 0.');
    if (!input.reason?.trim()) throw new BadRequestException('Bắt buộc nhập lý do hoàn tiền.');
    const original = await this.prisma.accountingEntry.findUnique({ where: { id: input.originalEntryId } });
    if (!original || original.ledgerView === 'LOSS' || original.status !== 'POSTED') {
      throw new BadRequestException('Khoản thu gốc không hợp lệ để hoàn tiền.');
    }
    if (!original.patientId || original.direction !== 'IN' || original.category === 'REFUND') throw new BadRequestException('Khoản thu gốc không hợp lệ để hoàn tiền.');
    const existingRefunds = await this.prisma.refundRequest.findMany({
      where: { originalEntryId: original.id, status: { in: ['PENDING_APPROVAL', 'APPROVED'] } },
    });
    const reservedRefund = existingRefunds.reduce((sum: number, item: any) => sum + item.amount, 0);
    const allocated = (await this.prisma.patientAdvanceAllocation.findMany({ where: { cashEntryId: original.id, reversedAt: null } }))
      .reduce((sum: number, item: any) => sum + item.amount, 0);
    if (input.amount > original.totalAmount - reservedRefund - allocated) throw new BadRequestException('Số tiền hoàn vượt số dư còn có thể hoàn.');
    return this.prisma.refundRequest.create({ data: {
      originalEntryId: original.id, patientId: original.patientId, amount: input.amount,
      reason: input.reason.trim(), createdById: actor.id,
    } });
  }

  async approveRefund(refundId: number, actor: { id: number; role: string }) {
    if (actor.role !== 'ADMIN') throw new BadRequestException('Chỉ Admin được duyệt hoàn tiền.');
    return this.prisma.$transaction(async (tx: any) => {
      const refund = await tx.refundRequest.findUnique({ where: { id: refundId } });
      if (!refund) throw new NotFoundException('Không tìm thấy yêu cầu hoàn tiền.');
      if (refund.status !== 'PENDING_APPROVAL') throw new BadRequestException('Yêu cầu hoàn tiền đã được xử lý.');
      if (refund.createdById === actor.id) throw new BadRequestException('Người duyệt phải khác người tạo yêu cầu.');
      const original = await tx.accountingEntry.findUnique({ where: { id: refund.originalEntryId } });
      if (!original) throw new NotFoundException('Không tìm thấy khoản thu gốc.');
      const effectiveDate = new Date();
      await this.assertOpenPeriod(tx, effectiveDate);
      const entry = await tx.accountingEntry.create({ data: {
        ledgerView: 'CASH', direction: 'OUT', category: 'REFUND', effectiveDate,
        roomId: original.roomId, patientId: refund.patientId,
        sourceType: 'REFUND_REQUEST', sourceCode: String(refund.id),
        preTaxAmount: refund.amount, taxAmount: 0, totalAmount: refund.amount,
        affectsCash: true, paymentMethod: original.paymentMethod,
        paymentStatus: 'PAID', documentStatus: 'NOT_REQUIRED', reversalOfId: original.id,
        reason: refund.reason, actorId: refund.createdById, approverId: actor.id,
      } });
      return tx.refundRequest.update({ where: { id: refund.id }, data: {
        status: 'APPROVED', refundEntryId: entry.id, approvedById: actor.id, approvedAt: effectiveDate,
      } });
    }, { isolationLevel: 'Serializable' });
  }

  async createReconciliation(input: { businessDate: Date; roomId?: number; countedBalance: number; reason?: string }, actor: { id: number }) {
    this.validateMoney(input.countedBalance, 'Số dư thực tế');
    await this.assertOpenPeriod(this.prisma, input.businessDate);
    const prior = await this.prisma.cashReconciliation.findFirst({
      where: { businessDate: { lt: input.businessDate }, roomId: input.roomId, confirmedAt: { not: null } },
      orderBy: { businessDate: 'desc' },
    });
    const dayStart = new Date(input.businessDate); dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart); dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    const entries = await this.prisma.accountingEntry.findMany({ where: {
      ledgerView: 'CASH', affectsCash: true, paymentMethod: 'CASH', status: 'POSTED',
      effectiveDate: { gte: dayStart, lt: dayEnd }, roomId: input.roomId,
    } });
    const openingBalance = prior?.countedBalance ?? 0;
    const calculatedBalance = openingBalance + entries.reduce((sum: number, entry: any) => sum + (entry.direction === 'IN' ? entry.totalAmount : -entry.totalAmount), 0);
    const differenceAmount = input.countedBalance - calculatedBalance;
    if (differenceAmount !== 0 && !input.reason?.trim()) throw new BadRequestException('Bắt buộc nhập lý do chênh lệch kiểm quỹ.');
    return this.prisma.cashReconciliation.create({ data: {
      businessDate: input.businessDate, roomId: input.roomId, openingBalance, calculatedBalance,
      countedBalance: input.countedBalance, differenceAmount, reason: input.reason?.trim(), recordedById: actor.id,
    } });
  }

  async confirmReconciliation(id: number, actor: { id: number; role: string }) {
    if (actor.role !== 'ACCOUNTING_STAFF') throw new BadRequestException('Chỉ Kế toán được xác nhận kiểm quỹ.');
    const record = await this.prisma.cashReconciliation.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Không tìm thấy biên bản kiểm quỹ.');
    if (record.recordedById === actor.id) throw new BadRequestException('Người xác nhận phải khác người nhập kiểm quỹ.');
    if (record.confirmedById) throw new BadRequestException('Biên bản kiểm quỹ đã được xác nhận.');
    await this.assertOpenPeriod(this.prisma, record.businessDate);
    return this.prisma.cashReconciliation.update({ where: { id }, data: {
      confirmedById: actor.id, confirmedAt: new Date(),
    } });
  }

  async lockPeriod(input: { year: number; month: number; reason: string }, actor: { id: number; role: string }) {
    if (actor.role !== 'ADMIN') throw new BadRequestException('Chỉ Admin được khóa kỳ kế toán.');
    if (input.month < 1 || input.month > 12 || !input.reason?.trim()) throw new BadRequestException('Thông tin khóa kỳ không hợp lệ.');
    return this.prisma.accountingPeriodLock.create({ data: {
      year: input.year, month: input.month, reason: input.reason.trim(), lockedById: actor.id,
    } });
  }

  async confirmTax(
    entryId: number,
    input: { taxRate?: number; taxAmount?: number; reason?: string },
    actor: { id: number },
  ) {
    if ((actor as { role?: string }).role && (actor as { role?: string }).role !== 'ACCOUNTING_STAFF') throw new BadRequestException('Chỉ Kế toán được xác nhận thuế.');
    const entry = await this.prisma.accountingEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new NotFoundException('Không tìm thấy bản ghi kế toán.');
    await this.assertOpenPeriod(this.prisma, entry.effectiveDate);
    if (entry.taxConfirmedAt) throw new BadRequestException('Thuế của bản ghi này đã được xác nhận.');
    const tax = calculateTax({ preTaxAmount: entry.preTaxAmount, taxRate: input.taxRate, taxAmount: input.taxAmount });
    const updated = await this.prisma.accountingEntry.update({ where: { id: entryId }, data: {
      taxRate: tax.taxRate, taxAmount: tax.taxAmount, totalAmount: entry.affectsCash ? entry.totalAmount : tax.totalAmount, taxConfirmedAt: new Date(),
    } });
    await this.prisma.accountingAuditLog.create({ data: {
      entityType: 'ACCOUNTING_ENTRY', entityId: entryId, action: 'CONFIRM_TAX', actorId: actor.id,
      reason: input.reason, beforeJson: JSON.stringify({ taxRate: entry.taxRate, taxAmount: entry.taxAmount, totalAmount: entry.totalAmount }),
      afterJson: JSON.stringify(tax),
    } });
    return updated;
  }

  async reverseExamination(input: { examinationId: number; examinationCode: string; reason: string; actorId: number }) {
    const effectiveDate = new Date();
    return this.prisma.$transaction(async (tx: any) => {
      await this.assertOpenPeriod(tx, effectiveDate);
      const existing = await tx.accountingEvent.findUnique({ where: { sourceType_sourceCode_eventType_idempotencyKey: {
        sourceType: 'DOCTOR_EXAMINATION', sourceCode: input.examinationCode, eventType: 'EXAMINATION_REVERSED', idempotencyKey: `unlock-${input.examinationId}`,
      } } });
      if (existing) return { eventId: existing.id, status: existing.status };
      const original = await tx.accountingEvent.findFirst({
        where: { sourceType: 'DOCTOR_EXAMINATION', sourceCode: input.examinationCode, eventType: { in: ['EXAMINATION_COMPLETED', 'EXAMINATION_CANCELLED'] }, status: 'PROCESSED' },
        include: { performanceLines: true }, orderBy: { createdAt: 'desc' },
      });
      if (!original) return { eventId: 0, status: 'NOTHING_TO_REVERSE' };
      const event = await tx.accountingEvent.create({ data: {
        sourceType: 'DOCTOR_EXAMINATION', sourceCode: input.examinationCode, eventType: 'EXAMINATION_REVERSED',
        idempotencyKey: `unlock-${input.examinationId}`, payloadJson: JSON.stringify(input), status: 'PROCESSING',
      } });
      for (const line of original.performanceLines) await tx.performanceLine.create({ data: {
        eventId: event.id, examinationId: line.examinationId, intakeServiceId: line.intakeServiceId, serviceId: line.serviceId,
        doctorId: line.doctorId, roomId: line.roomId, serviceType: line.serviceType, taxClassification: line.taxClassification,
        taxRate: line.taxRate, taxAmount: -line.taxAmount, recognizedRevenue: -line.recognizedRevenue,
        supplyCost: -line.supplyCost, reversalOfId: line.id, effectiveDate,
      } });
      await tx.patientAdvanceAllocation.updateMany({ where: { examinationId: input.examinationId, reversedAt: null }, data: { reversedAt: effectiveDate } });
      await tx.debt.updateMany({ where: { sourceType: 'EXAMINATION', sourceCode: input.examinationCode, status: { not: 'REVERSED' } }, data: { status: 'REVERSED' } });
      await tx.accountingEvent.update({ where: { id: event.id }, data: { status: 'PROCESSED', processedAt: effectiveDate } });
      return { eventId: event.id, status: 'PROCESSED' };
    }, { isolationLevel: 'Serializable' });
  }

  async getWarehouseReceipts(filters?: { status?: string; search?: string }) {
    const where: any = { type: 'IN' };

    if (filters?.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }

    if (filters?.search?.trim()) {
      const term = filters.search.trim();
      where.OR = [
        { code: { contains: term } },
        { supplier: { name: { contains: term } } },
        { lines: { some: { supply: { name: { contains: term } } } } },
      ];
    }

    const [documents, pendingCount, postedCount, rejectedCount] = await Promise.all([
      this.prisma.stockDocument.findMany({
        where,
        include: {
          supplier: true,
          lines: {
            include: { supply: true },
          },
          auditLogs: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockDocument.count({
        where: { type: 'IN', status: 'PENDING_APPROVAL' },
      }),
      this.prisma.stockDocument.count({
        where: { type: 'IN', status: 'POSTED' },
      }),
      this.prisma.stockDocument.count({
        where: { type: 'IN', status: 'REJECTED' },
      }),
    ]);

    const formattedDocs = documents.map((doc: any) => ({
      ...doc,
      totalAmountInWords: readVietnameseCurrency(doc.totalAmount),
    }));

    return {
      documents: formattedDocs,
      counts: {
        pending: pendingCount,
        posted: postedCount,
        rejected: rejectedCount,
        total: pendingCount + postedCount + rejectedCount,
      },
    };
  }

  async approveWarehouseReceipt(
    id: number,
    actor: { id: number; role: string },
    idempotencyKey?: string,
  ) {
    if (!['ACCOUNTING_STAFF', 'ADMIN'].includes(actor.role)) {
      throw new BadRequestException('Chỉ Kế toán hoặc Quản trị viên mới được duyệt phiếu nhập kho.');
    }

    await this.prisma.$transaction(
      async (tx: any) => {
        const doc = await tx.stockDocument.findUnique({
          where: { id },
          include: {
            lines: {
              include: { supply: true },
            },
            supplier: true,
          },
        });

        if (!doc) throw new NotFoundException('Không tìm thấy chứng từ nhập kho.');
        if (doc.type !== 'IN') throw new BadRequestException('Chứng từ không phải là phiếu nhập kho.');
        if (doc.status === 'POSTED') {
          return doc;
        }
        if (doc.status === 'CANCELLED' || doc.status === 'REJECTED') {
          throw new BadRequestException('Không thể duyệt phiếu nhập kho đã bị hủy hoặc từ chối.');
        }

        for (const line of doc.lines) {
          const unitCost = Number(line.inputUnitPrice) / Number(line.conversionFactor);

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
        }

        await tx.accountingWarehouseEntry.create({
          data: {
            documentId: doc.id,
            eventType: 'PURCHASE_PAYABLE',
            goodsAmount: doc.goodsAmount,
            vatAmount: doc.vatAmount,
            totalAmount: doc.totalAmount,
            payloadJson: JSON.stringify({
              code: doc.code,
              type: doc.type,
              supplierId: doc.supplierId,
              lines: doc.lines.map((l: any) => ({
                supplyId: l.supplyId,
                quantity: Number(l.convertedQuantity),
              })),
            }),
          },
        });

        await tx.warehouseAuditLog.create({
          data: {
            documentId: doc.id,
            action: 'ACCOUNTANT_APPROVE',
            actorId: actor.id,
            changesJson: JSON.stringify({
              approvedBy: actor.id,
              status: 'POSTED',
              totalAmount: doc.totalAmount,
            }),
          },
        });

        return tx.stockDocument.update({
          where: { id },
          data: {
            status: 'POSTED',
            isLocked: true,
            postedAt: new Date(),
            postedById: actor.id,
            idempotencyKey,
            goodsAmount: doc.goodsAmount,
            totalAmount: doc.totalAmount,
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );

    const accountingEntry = await this.prisma.accountingWarehouseEntry.findFirst({
      where: { documentId: id },
      orderBy: { createdAt: 'desc' },
    });
    if (accountingEntry) {
      await this.ingestWarehouseEvent(
        accountingEntry.id,
        idempotencyKey ?? `warehouse-entry-${accountingEntry.id}`,
      );
    }

    const updatedDoc = await this.prisma.stockDocument.findUnique({
      where: { id },
      include: {
        lines: { include: { supply: true } },
        supplier: true,
      },
    });

    return {
      ...updatedDoc,
      totalAmountInWords: updatedDoc ? readVietnameseCurrency(updatedDoc.totalAmount) : '',
    };
  }

  async rejectWarehouseReceipt(
    id: number,
    actor: { id: number; role: string },
    reason: string,
  ) {
    if (!['ACCOUNTING_STAFF', 'ADMIN'].includes(actor.role)) {
      throw new BadRequestException('Chỉ Kế toán hoặc Quản trị viên mới được từ chối phiếu nhập kho.');
    }
    if (!reason?.trim()) {
      throw new BadRequestException('Bắt buộc phải nhập lý do từ chối.');
    }

    const doc = await this.prisma.stockDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Không tìm thấy chứng từ nhập kho.');
    if (doc.type !== 'IN') throw new BadRequestException('Chứng từ không phải là phiếu nhập kho.');
    if (doc.status === 'POSTED') {
      throw new BadRequestException('Chứng từ đã được ghi sổ nhập kho, không thể từ chối.');
    }

    const updated = await this.prisma.stockDocument.update({
      where: { id },
      data: {
        status: 'REJECTED',
        cancelledAt: new Date(),
        reason: doc.reason ? `${doc.reason} | [Kế toán từ chối: ${reason.trim()}]` : `[Kế toán từ chối: ${reason.trim()}]`,
        auditLogs: {
          create: {
            action: 'ACCOUNTANT_REJECT',
            actorId: actor.id,
            changesJson: JSON.stringify({ reason: reason.trim(), rejectedBy: actor.id }),
          },
        },
      },
      include: {
        lines: { include: { supply: true } },
        supplier: true,
      },
    });

    return {
      ...updated,
      totalAmountInWords: readVietnameseCurrency(updated.totalAmount),
    };
  }
}
