import { Op } from 'sequelize';
import Decimal from 'decimal.js';

export class OperationsRepository {
  constructor(sequelize, models) {
    this.sequelize = sequelize;
    this.models = models;
  }

  get Asset() { return this.models.Asset; }
  get SterilizationCycle() { return this.models.SterilizationCycle; }
  get InstrumentPack() { return this.models.InstrumentPack; }
  get PackUsage() { return this.models.PackUsage; }
  get LabOrder() { return this.models.LabOrder; }
  get LabRework() { return this.models.LabRework; }
  get Warranty() { return this.models.Warranty; }
  get Incident() { return this.models.Incident; }

  // --- 1. ASSET MANAGEMENT ---
  async createAsset({ branchId, assetCode, name, assetType, status = 'ACTIVE', calibrationExpiresAt, nextMaintenanceDueAt, responsibleUserId }, user, options = {}) {
    return await this.Asset.create({
      branchId,
      assetCode,
      name,
      assetType,
      status,
      calibrationExpiresAt: calibrationExpiresAt ? new Date(calibrationExpiresAt) : null,
      nextMaintenanceDueAt: nextMaintenanceDueAt ? new Date(nextMaintenanceDueAt) : null,
      responsibleUserId: responsibleUserId || null,
      createdBy: user?.username || 'system',
    }, options);
  }

  async listAssets(query = {}, options = {}) {
    const where = {};
    if (query.status) where.status = query.status;
    if (query.assetType) where.assetType = query.assetType;
    if (query.branchId) where.branchId = query.branchId;
    return await this.Asset.findAll({ where, order: [['CreatedAt', 'DESC']], ...options });
  }

  async getAssetById(assetId, options = {}) {
    return await this.Asset.findByPk(assetId, options);
  }

  // --- 2. STERILIZATION CYCLES (AT-22: Asset Qualification Check) ---
  async createSterilizationCycle({ assetId, cycleNo, startedAt = new Date() }, user, options = {}) {
    const runInTx = async (transaction) => {
      const txOpt = { transaction, ...options };

      const asset = await this.Asset.findByPk(assetId, txOpt);
      if (!asset) {
        throw new Error('ASSET_NOT_FOUND');
      }

      const now = new Date();

      // AT-22: Thiết bị không đủ điều kiện (Out of service, maintenance hoặc quá hạn hiệu chuẩn)
      if (asset.status !== 'ACTIVE') {
        // Tự động tạo Incident cảnh báo an toàn thiết bị (lưu vĩnh viễn không bị rollback)
        await this.Incident.create({
          incidentType: 'UNQUALIFIED_EQUIPMENT_USAGE_ATTEMPT',
          objectType: 'Assets',
          objectId: asset.assetId,
          severity: 'HIGH',
          description: `Cố tình kích hoạt chu trình tiệt trùng trên thiết bị ${asset.name} (${asset.assetCode}) đang ở trạng thái không khả dụng (${asset.status}).`,
          ownerId: user?.userId,
          status: 'OPEN',
          createdBy: user?.username || 'system',
        });

        const err = new Error(`ASSET_NOT_QUALIFIED_STATUS_${asset.status}`);
        err.statusCode = 400;
        throw err;
      }

      if (asset.calibrationExpiresAt && new Date(asset.calibrationExpiresAt) < now) {
        await this.Incident.create({
          incidentType: 'CALIBRATION_EXPIRED_USAGE_ATTEMPT',
          objectType: 'Assets',
          objectId: asset.assetId,
          severity: 'HIGH',
          description: `Thiết bị tiệt trùng ${asset.name} (${asset.assetCode}) đã quá hạn hiệu chuẩn (${asset.calibrationExpiresAt}) nhưng vẫn được chọn để chạy chu trình.`,
          ownerId: user?.userId,
          status: 'OPEN',
          createdBy: user?.username || 'system',
        });

        const err = new Error('ASSET_CALIBRATION_EXPIRED');
        err.statusCode = 400;
        throw err;
      }

      const finalCycleNo = cycleNo || `CYCLE-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      return await this.SterilizationCycle.create({
        assetId,
        cycleNo: finalCycleNo,
        startedAt,
        status: 'STARTED',
        createdBy: user?.username || 'system',
      }, txOpt);
    };

    if (options.transaction) return await runInTx(options.transaction);
    return await this.sequelize.transaction(runInTx);
  }

  async completeSterilizationCycle(sterilizationCycleId, { completedAt = new Date(), indicatorResult, checkedBy }, user, options = {}) {
    const runInTx = async (transaction) => {
      const txOpt = { transaction, ...options };

      const cycle = await this.SterilizationCycle.findByPk(sterilizationCycleId, {
        include: [{ model: this.InstrumentPack, as: 'packs' }],
        ...txOpt,
      });

      if (!cycle) {
        throw new Error('STERILIZATION_CYCLE_NOT_FOUND');
      }

      let newStatus = 'COMPLETED';
      if (indicatorResult === 'PASS') {
        newStatus = 'PASSED';
      } else if (indicatorResult === 'FAIL' || indicatorResult === 'INCONCLUSIVE') {
        newStatus = 'FAILED';
      }

      await cycle.update({
        completedAt,
        indicatorResult,
        status: newStatus,
        checkedBy: checkedBy || user?.userId || null,
      }, txOpt);

      // AT-22: Nếu chỉ thị tiệt trùng FAIL -> Toàn bộ gói dụng cụ bị cách ly khẩn cấp
      if (newStatus === 'FAILED') {
        if (cycle.packs && cycle.packs.length > 0) {
          for (const pack of cycle.packs) {
            await pack.update({ status: 'QUARANTINED' }, txOpt);
          }
        }

        await this.Incident.create({
          incidentType: 'STERILIZATION_CYCLE_FAILED',
          objectType: 'SterilizationCycles',
          objectId: cycle.sterilizationCycleId,
          severity: 'HIGH',
          description: `Chu trình tiệt trùng ${cycle.cycleNo} có kết quả chỉ thị ${indicatorResult}. Toàn bộ ${cycle.packs?.length || 0} gói dụng cụ đã bị cách ly (QUARANTINED).`,
          ownerId: user?.userId,
          status: 'OPEN',
          createdBy: user?.username || 'system',
        }, txOpt);
      }

      return cycle;
    };

    if (options.transaction) return await runInTx(options.transaction);
    return await this.sequelize.transaction(runInTx);
  }

  async listSterilizationCycles(query = {}, options = {}) {
    const where = {};
    if (query.status) where.status = query.status;
    if (query.assetId) where.assetId = query.assetId;
    return await this.SterilizationCycle.findAll({
      where,
      include: [
        { model: this.Asset, as: 'asset' },
        { model: this.InstrumentPack, as: 'packs' },
      ],
      order: [['StartedAt', 'DESC']],
      ...options,
    });
  }

  // --- 3. INSTRUMENT PACKS & RELEASE ---
  async createInstrumentPack({ sterilizationCycleId, packCode, packType }, user, options = {}) {
    const code = packCode || `PACK-${packType || 'GENERAL'}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    return await this.InstrumentPack.create({
      sterilizationCycleId,
      packCode: code,
      packType: packType || 'GENERAL_KIT',
      status: 'PENDING_RELEASE',
      createdBy: user?.username || 'system',
    }, options);
  }

  async releaseInstrumentPack(instrumentPackId, { sterileFrom = new Date(), expiresAt, releasedBy }, user, options = {}) {
    const runInTx = async (transaction) => {
      const txOpt = { transaction, ...options };

      const pack = await this.InstrumentPack.findByPk(instrumentPackId, {
        include: [{ model: this.SterilizationCycle, as: 'cycle' }],
        ...txOpt,
      });

      if (!pack) {
        throw new Error('INSTRUMENT_PACK_NOT_FOUND');
      }

      if (!pack.cycle || pack.cycle.status !== 'PASSED') {
        const err = new Error('CANNOT_RELEASE_PACK_CYCLE_NOT_PASSED');
        err.statusCode = 400;
        throw err;
      }

      const fromDate = new Date(sterileFrom);
      // Mặc định hạn tiệt trùng 30 ngày nếu không chỉ định
      const expDate = expiresAt ? new Date(expiresAt) : new Date(fromDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      if (expDate <= fromDate) {
        throw new Error('EXPIRES_AT_MUST_BE_AFTER_STERILE_FROM');
      }

      await pack.update({
        sterileFrom: fromDate,
        expiresAt: expDate,
        status: 'RELEASED',
        releasedBy: releasedBy || user?.userId || null,
      }, txOpt);

      return pack;
    };

    if (options.transaction) return await runInTx(options.transaction);
    return await this.sequelize.transaction(runInTx);
  }

  async listInstrumentPacks(query = {}, options = {}) {
    const where = {};
    if (query.status) where.status = query.status;
    if (query.packType) where.packType = query.packType;
    return await this.InstrumentPack.findAll({
      where,
      include: [{ model: this.SterilizationCycle, as: 'cycle' }],
      order: [['CreatedAt', 'DESC']],
      ...options,
    });
  }

  // --- 4. USE INSTRUMENT PACK (TIÊU CHÍ NGHIỆM THU AT-22) ---
  async useInstrumentPack({ instrumentPackId, visitId, patientId, isEmergency = false, emergencyReason }, user, options = {}) {
    const runInTx = async (transaction) => {
      const txOpt = { transaction, ...options };

      const pack = await this.InstrumentPack.findByPk(instrumentPackId, {
        include: [{ model: this.SterilizationCycle, as: 'cycle' }],
        ...txOpt,
      });

      if (!pack) {
        throw new Error('INSTRUMENT_PACK_NOT_FOUND');
      }

      const now = new Date();

      // Kiểm tra 1: Gói đã từng được sử dụng chưa
      if (pack.status === 'USED') {
        const err = new Error('PACK_ALREADY_USED');
        err.statusCode = 409;
        throw err;
      }

      // Kiểm tra 2: Gói đã quá hạn tiệt trùng (Expired)
      const isExpired = pack.expiresAt && new Date(pack.expiresAt) < now;
      if (isExpired || pack.status === 'EXPIRED') {
        if (pack.status !== 'EXPIRED') {
          // Lưu vĩnh viễn trạng thái EXPIRED không bị rollback
          await this.InstrumentPack.update(
            { status: 'EXPIRED' },
            { where: { instrumentPackId: pack.instrumentPackId } }
          );
        }

        // Tự động tạo Incident theo yêu cầu AT-22 (lưu vĩnh viễn không bị rollback)
        const incident = await this.Incident.create({
          incidentType: 'EXPIRED_STERILE_PACK_USAGE_ATTEMPT',
          visitId: visitId || null,
          objectType: 'InstrumentPacks',
          objectId: pack.instrumentPackId,
          severity: 'HIGH',
          description: `Phát hiện gói dụng cụ ${pack.packCode} đã hết hạn tiệt trùng (${pack.expiresAt}) bị chọn sử dụng trong ca khám bệnh nhân ${patientId}.`,
          ownerId: user?.userId,
          status: 'OPEN',
          createdBy: user?.username || 'system',
        });

        // Ngoại lệ cấp cứu (AT-22: cấp cứu vẫn ghi được diễn biến)
        if (isEmergency) {
          if (!emergencyReason) {
            throw new Error('EMERGENCY_REASON_REQUIRED');
          }
          await this.Incident.create({
            incidentType: 'EMERGENCY_OVERRIDE',
            visitId,
            objectType: 'InstrumentPacks',
            objectId: pack.instrumentPackId,
            severity: 'CRITICAL',
            description: `[NGOẠI LỆ CẤP CỨU]: Bác sĩ thực hiện can thiệp cấp cứu khẩn cấp ghi nhận diễn biến thủ thuật với gói quá hạn. Lý do: ${emergencyReason}. Cần Hội đồng chuyên môn hậu kiểm.`,
            ownerId: user?.userId,
            status: 'OPEN',
            createdBy: user?.username || 'system',
          }, txOpt);

          // Cho phép ghi nhận usage trong cấp cứu
          const usage = await this.PackUsage.create({
            instrumentPackId: pack.instrumentPackId,
            visitId,
            patientId,
            usedAt: now,
            usedBy: user?.userId,
          }, txOpt);

          await pack.update({ status: 'USED' }, txOpt);

          return {
            usage,
            pack,
            emergencyOverride: true,
            incidentId: incident.incidentId,
          };
        }

        // Không phải cấp cứu -> CHẶN NGAY LẬP TỨC VỚI 400
        const err = new Error('PACK_EXPIRED_CANNOT_USE');
        err.statusCode = 400;
        err.incidentId = incident.incidentId;
        throw err;
      }

      // Kiểm tra 3: Gói bị hỏng hoặc cách ly
      if (pack.status === 'DAMAGED' || pack.status === 'QUARANTINED') {
        await this.Incident.create({
          incidentType: 'DEFECTIVE_PACK_USAGE_ATTEMPT',
          visitId: visitId || null,
          objectType: 'InstrumentPacks',
          objectId: pack.instrumentPackId,
          severity: 'HIGH',
          description: `Cố tình chọn gói dụng cụ đang bị cách ly hoặc hỏng (${pack.packCode}, status: ${pack.status}) trong ca khám.`,
          ownerId: user?.userId,
          status: 'OPEN',
          createdBy: user?.username || 'system',
        }, txOpt);

        const err = new Error(`PACK_STATUS_INVALID_${pack.status}`);
        err.statusCode = 400;
        throw err;
      }

      // Kiểm tra 4: Gói chưa được release
      if (pack.status !== 'RELEASED') {
        const err = new Error('PACK_NOT_RELEASED');
        err.statusCode = 400;
        throw err;
      }

      // Sử dụng bình thường khi mọi điều kiện an toàn đều thỏa mãn
      const usage = await this.PackUsage.create({
        instrumentPackId: pack.instrumentPackId,
        visitId,
        patientId,
        usedAt: now,
        usedBy: user?.userId,
      }, txOpt);

      await pack.update({ status: 'USED' }, txOpt);

      return {
        usage,
        pack,
        emergencyOverride: false,
      };
    };

    if (options.transaction) return await runInTx(options.transaction);
    return await this.sequelize.transaction(runInTx);
  }

  // --- 5. LAB ORDERS & LAB REWORKS ---
  async createLabOrder({ visitId, doctorId, supplierId, specimen, instructions, dueAt, cost = 0 }, user, options = {}) {
    return await this.LabOrder.create({
      visitId,
      doctorId: doctorId || user?.userId,
      supplierId: supplierId || null,
      specimen: specimen || null,
      instructions,
      dueAt: new Date(dueAt),
      status: 'ORDERED',
      cost: new Decimal(cost).toFixed(2),
      createdBy: user?.username || 'system',
    }, options);
  }

  async updateLabOrder(labOrderId, { status, qcResult, cost }, user, options = {}) {
    const order = await this.LabOrder.findByPk(labOrderId, options);
    if (!order) throw new Error('LAB_ORDER_NOT_FOUND');

    const updateData = {};
    if (status) updateData.status = status;
    if (qcResult) updateData.qcResult = qcResult;
    if (cost !== undefined) updateData.cost = new Decimal(cost).toFixed(2);

    await order.update(updateData, options);
    return order;
  }

  async listLabOrders(query = {}, options = {}) {
    const where = {};
    if (query.status) where.status = query.status;
    if (query.visitId) where.visitId = query.visitId;
    if (query.doctorId) where.doctorId = query.doctorId;
    return await this.LabOrder.findAll({
      where,
      include: [
        { model: this.LabRework, as: 'reworks' },
      ],
      order: [['CreatedAt', 'DESC']],
      ...options,
    });
  }

  async requestLabRework(labOrderId, { reason, costBearer = 'CLINIC', cost = 0 }, user, options = {}) {
    const runInTx = async (transaction) => {
      const txOpt = { transaction, ...options };

      const order = await this.LabOrder.findByPk(labOrderId, {
        include: [{ model: this.LabRework, as: 'reworks' }],
        ...txOpt,
      });

      if (!order) throw new Error('LAB_ORDER_NOT_FOUND');

      const reworkCount = order.reworks?.length || 0;
      const reworkNo = reworkCount + 1;

      const rework = await this.LabRework.create({
        labOrderId,
        reworkNo,
        reason,
        costBearer,
        cost: new Decimal(cost).toFixed(2),
        status: 'REQUESTED',
        createdBy: user?.username || 'system',
      }, txOpt);

      await order.update({ status: 'QC_PENDING', qcResult: 'FAIL' }, txOpt);

      return rework;
    };

    if (options.transaction) return await runInTx(options.transaction);
    return await this.sequelize.transaction(runInTx);
  }

  async approveLabRework(labReworkId, { status = 'APPROVED' }, user, options = {}) {
    const rework = await this.LabRework.findByPk(labReworkId, options);
    if (!rework) throw new Error('LAB_REWORK_NOT_FOUND');

    await rework.update({
      status,
      approvedBy: user?.userId,
    }, options);

    return rework;
  }

  // --- 6. WARRANTIES ---
  async createWarranty({ serviceLineId, patientId, startsAt = new Date(), expiresAt, termsJson }, user, options = {}) {
    const terms = typeof termsJson === 'object' ? JSON.stringify(termsJson) : (termsJson || JSON.stringify({ coverage: '100% replacement for fractures within 5 years' }));
    return await this.Warranty.create({
      serviceLineId,
      patientId,
      startsAt,
      expiresAt,
      termsJson: terms,
      status: 'ACTIVE',
      createdBy: user?.username || 'system',
    }, options);
  }

  async claimWarranty(warrantyId, { claimReason }, user, options = {}) {
    const warranty = await this.Warranty.findByPk(warrantyId, options);
    if (!warranty) throw new Error('WARRANTY_NOT_FOUND');

    const now = new Date().toISOString().split('T')[0];
    if (warranty.expiresAt < now) {
      await warranty.update({ status: 'EXPIRED' }, options);
      const err = new Error('WARRANTY_EXPIRED');
      err.statusCode = 400;
      throw err;
    }

    if (warranty.status !== 'ACTIVE') {
      const err = new Error(`WARRANTY_NOT_ACTIVE_STATUS_${warranty.status}`);
      err.statusCode = 400;
      throw err;
    }

    await warranty.update({ status: 'CLAIMED' }, options);
    return warranty;
  }

  async listWarranties(query = {}, options = {}) {
    const where = {};
    if (query.status) where.status = query.status;
    if (query.patientId) where.patientId = query.patientId;
    return await this.Warranty.findAll({ where, order: [['CreatedAt', 'DESC']], ...options });
  }

  // --- 7. INCIDENTS ---
  async createIncident(incidentData, user, options = {}) {
    return await this.Incident.create({
      ...incidentData,
      ownerId: incidentData.ownerId || user?.userId,
      createdBy: user?.username || 'system',
    }, options);
  }

  async listIncidents(query = {}, options = {}) {
    const where = {};
    if (query.status) where.status = query.status;
    if (query.severity) where.severity = query.severity;
    if (query.incidentType) where.incidentType = query.incidentType;
    return await this.Incident.findAll({ where, order: [['CreatedAt', 'DESC']], ...options });
  }

  async resolveIncident(incidentId, { resolution, status = 'RESOLVED' }, user, options = {}) {
    const incident = await this.Incident.findByPk(incidentId, options);
    if (!incident) throw new Error('INCIDENT_NOT_FOUND');

    await incident.update({
      resolution,
      status,
    }, options);

    return incident;
  }
}
