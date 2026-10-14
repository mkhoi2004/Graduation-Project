export function createOperationsController({ operationsService }) {
  // Assets
  async function createAsset(req, res, next) {
    try {
      const data = await operationsService.createAsset(req.body, req.user);
      res.status(201).json({ success: true, message: 'Đăng ký thiết bị thành công.', data });
    } catch (err) { next(err); }
  }

  async function listAssets(req, res, next) {
    try {
      const data = await operationsService.listAssets(req.query, req.user);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  // Sterilization Cycles
  async function createSterilizationCycle(req, res, next) {
    try {
      const data = await operationsService.createSterilizationCycle(req.body, req.user);
      res.status(201).json({ success: true, message: 'Khởi chạy chu trình tiệt trùng thành công.', data });
    } catch (err) { next(err); }
  }

  async function completeSterilizationCycle(req, res, next) {
    try {
      const data = await operationsService.completeSterilizationCycle(req.params.id, req.body, req.user);
      res.json({ success: true, message: 'Hoàn tất đánh giá chu trình tiệt trùng.', data });
    } catch (err) { next(err); }
  }

  async function listSterilizationCycles(req, res, next) {
    try {
      const data = await operationsService.listSterilizationCycles(req.query, req.user);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  // Instrument Packs
  async function createInstrumentPack(req, res, next) {
    try {
      const data = await operationsService.createInstrumentPack(req.body, req.user);
      res.status(201).json({ success: true, message: 'Đóng gói dụng cụ thành công.', data });
    } catch (err) { next(err); }
  }

  async function releaseInstrumentPack(req, res, next) {
    try {
      const data = await operationsService.releaseInstrumentPack(req.params.id, req.body, req.user);
      res.json({ success: true, message: 'Giải phóng kiểm định gói dụng cụ thành công.', data });
    } catch (err) { next(err); }
  }

  async function listInstrumentPacks(req, res, next) {
    try {
      const data = await operationsService.listInstrumentPacks(req.query, req.user);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  // AT-22: Pack Usages
  async function useInstrumentPack(req, res, next) {
    try {
      const data = await operationsService.useInstrumentPack(req.body, req.user);
      res.status(201).json({
        success: true,
        message: data.emergencyOverride
          ? 'Đã áp dụng ngoại lệ cấp cứu ghi nhận diễn biến thủ thuật kèm biên bản sự cố y khoa (AT-22).'
          : 'Ghi nhận sử dụng gói dụng cụ tiệt trùng cho ca khám thành công.',
        data,
      });
    } catch (err) { next(err); }
  }

  // Lab Orders & Reworks
  async function createLabOrder(req, res, next) {
    try {
      const data = await operationsService.createLabOrder(req.body, req.user);
      res.status(201).json({ success: true, message: 'Lập chỉ định gia công Labo thành công.', data });
    } catch (err) { next(err); }
  }

  async function updateLabOrder(req, res, next) {
    try {
      const data = await operationsService.updateLabOrder(req.params.id, req.body, req.user);
      res.json({ success: true, message: 'Cập nhật trạng thái đơn Labo thành công.', data });
    } catch (err) { next(err); }
  }

  async function listLabOrders(req, res, next) {
    try {
      const data = await operationsService.listLabOrders(req.query, req.user);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async function requestLabRework(req, res, next) {
    try {
      const data = await operationsService.requestLabRework(req.params.id, req.body, req.user);
      res.status(201).json({ success: true, message: 'Yêu cầu làm lại sản phẩm Labo thành công (không sửa đè đơn hàng gốc).', data });
    } catch (err) { next(err); }
  }

  async function approveLabRework(req, res, next) {
    try {
      const data = await operationsService.approveLabRework(req.params.id, req.body, req.user);
      res.json({ success: true, message: 'Phê duyệt làm lại Labo và xác nhận chi phí thành công.', data });
    } catch (err) { next(err); }
  }

  // Warranties
  async function createWarranty(req, res, next) {
    try {
      const data = await operationsService.createWarranty(req.body, req.user);
      res.status(201).json({ success: true, message: 'Cấp thẻ bảo hành thành công.', data });
    } catch (err) { next(err); }
  }

  async function claimWarranty(req, res, next) {
    try {
      const data = await operationsService.claimWarranty(req.params.id, req.body, req.user);
      res.json({ success: true, message: 'Xác nhận áp dụng bảo hành thành công.', data });
    } catch (err) { next(err); }
  }

  async function listWarranties(req, res, next) {
    try {
      const data = await operationsService.listWarranties(req.query, req.user);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  // Incidents
  async function listIncidents(req, res, next) {
    try {
      const data = await operationsService.listIncidents(req.query, req.user);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async function resolveIncident(req, res, next) {
    try {
      const data = await operationsService.resolveIncident(req.params.id, req.body, req.user);
      res.json({ success: true, message: 'Phê duyệt kết luận xử lý sự cố thành công.', data });
    } catch (err) { next(err); }
  }

  return {
    createAsset,
    listAssets,
    createSterilizationCycle,
    completeSterilizationCycle,
    listSterilizationCycles,
    createInstrumentPack,
    releaseInstrumentPack,
    listInstrumentPacks,
    useInstrumentPack,
    createLabOrder,
    updateLabOrder,
    listLabOrders,
    requestLabRework,
    approveLabRework,
    createWarranty,
    claimWarranty,
    listWarranties,
    listIncidents,
    resolveIncident,
  };
}
