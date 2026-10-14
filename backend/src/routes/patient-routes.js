import { Router } from 'express';

export function createPatientRoutes({ patientVisitController, authMiddlewares }) {
  const router = Router();
  const { authenticate, authorize } = authMiddlewares;

  router.use(authenticate);

  router.get('/', patientVisitController.getPatients);
  router.get('/:id', patientVisitController.getPatientById);
  router.post('/', authorize('ADMIN', 'RECEPTIONIST'), patientVisitController.createPatient);
  router.put('/:id', authorize('ADMIN', 'RECEPTIONIST'), patientVisitController.updatePatient);
  router.delete('/:id', authorize('ADMIN'), patientVisitController.deletePatient);

  return router;
}
