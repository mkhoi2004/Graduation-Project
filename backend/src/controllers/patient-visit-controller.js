export function createPatientVisitController({ patientVisitService }) {
  return {
    // PATIENTS
    async getPatients(req, res, next) {
      try {
        const { page, pageSize, search, status } = req.query;
        const result = await patientVisitService.getPatients({
          page: page ? parseInt(page, 10) : 1,
          pageSize: pageSize ? parseInt(pageSize, 10) : 20,
          search,
          status,
        }, req.user);
        res.status(200).json({ status: 'ok', data: result });
      } catch (error) {
        next(error);
      }
    },

    async getPatientById(req, res, next) {
      try {
        const patient = await patientVisitService.getPatientById(req.params.id, req.user);
        res.status(200).json({ status: 'ok', data: patient });
      } catch (error) {
        next(error);
      }
    },

    async createPatient(req, res, next) {
      try {
        const result = await patientVisitService.createPatient(req.body, req.user);
        if (result.warning) {
          return res.status(200).json({ status: 'warning', ...result });
        }
        res.status(201).json({ status: 'ok', data: result });
      } catch (error) {
        next(error);
      }
    },

    async updatePatient(req, res, next) {
      try {
        const patient = await patientVisitService.updatePatient(req.params.id, req.body, req.user);
        res.status(200).json({ status: 'ok', data: patient });
      } catch (error) {
        next(error);
      }
    },

    async deletePatient(req, res, next) {
      try {
        const result = await patientVisitService.softDeletePatient(req.params.id, req.user);
        res.status(200).json({ status: 'ok', data: result });
      } catch (error) {
        next(error);
      }
    },

    // APPOINTMENTS
    async getAppointments(req, res, next) {
      try {
        const { branchId, doctorId, date, status } = req.query;
        const appointments = await patientVisitService.getAppointments({ branchId, doctorId, date, status }, req.user);
        res.status(200).json({ status: 'ok', data: appointments });
      } catch (error) {
        next(error);
      }
    },

    async createAppointment(req, res, next) {
      try {
        const appointment = await patientVisitService.createAppointment(req.body, req.user);
        res.status(201).json({ status: 'ok', data: appointment });
      } catch (error) {
        next(error);
      }
    },

    // VISITS
    async getVisits(req, res, next) {
      try {
        const { branchId, doctorId, status, patientId } = req.query;
        const visits = await patientVisitService.getVisits({ branchId, doctorId, status, patientId }, req.user);
        res.status(200).json({ status: 'ok', data: visits });
      } catch (error) {
        next(error);
      }
    },

    async getVisitById(req, res, next) {
      try {
        const visit = await patientVisitService.getVisitById(req.params.id, req.user);
        res.status(200).json({ status: 'ok', data: visit });
      } catch (error) {
        next(error);
      }
    },

    async createVisit(req, res, next) {
      try {
        const visit = await patientVisitService.createVisit(req.body, req.user);
        res.status(201).json({ status: 'ok', data: visit });
      } catch (error) {
        next(error);
      }
    },

    async updateVisitStatus(req, res, next) {
      try {
        const visit = await patientVisitService.updateVisitStatus(req.params.id, req.body, req.user);
        res.status(200).json({ status: 'ok', data: visit });
      } catch (error) {
        next(error);
      }
    },
  };
}
