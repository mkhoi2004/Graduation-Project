import { Router } from 'express';

export function createVisitRoutes({ patientVisitController, authMiddlewares }) {
  const router = Router();
  const { authenticate, authorize } = authMiddlewares;

  router.use(authenticate);

  // Appointments
  router.get('/appointments', patientVisitController.getAppointments);
  router.post('/appointments', authorize('ADMIN', 'RECEPTIONIST'), patientVisitController.createAppointment);

  // Visits
  router.get('/', patientVisitController.getVisits);
  router.get('/:id', patientVisitController.getVisitById);
  router.post('/', authorize('ADMIN', 'RECEPTIONIST'), patientVisitController.createVisit);
  router.patch('/:id/status', authorize('ADMIN', 'DOCTOR', 'RECEPTIONIST'), patientVisitController.updateVisitStatus);

  return router;
}
