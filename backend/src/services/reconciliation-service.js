export class ReconciliationService {
  constructor({ reconciliationRepo }) {
    this.reconciliationRepo = reconciliationRepo;
  }

  async createMaintenanceLog(payload, actor) {
    return await this.reconciliationRepo.createMaintenanceLog(payload, actor);
  }

  async listMaintenanceLogs(filters) {
    return await this.reconciliationRepo.listMaintenanceLogs(filters);
  }

  async runDailyReconciliation(payload, actor) {
    return await this.reconciliationRepo.runDailyReconciliation(payload, actor);
  }

  async listReconciliationItems(filters) {
    return await this.reconciliationRepo.listReconciliationItems(filters);
  }

  async resolveReconciliationItem(itemId, payload, actor) {
    return await this.reconciliationRepo.resolveReconciliationItem(itemId, payload, actor);
  }

  async generateDailyReport(params) {
    return await this.reconciliationRepo.generateDailyReport(params);
  }

  async processPostClosingRefund(payload, actor) {
    return await this.reconciliationRepo.processPostClosingRefund(payload, actor);
  }

  async verifySystemIntegrity() {
    return await this.reconciliationRepo.verifySystemIntegrity();
  }
}

export function createReconciliationService({ reconciliationRepo }) {
  return new ReconciliationService({ reconciliationRepo });
}
