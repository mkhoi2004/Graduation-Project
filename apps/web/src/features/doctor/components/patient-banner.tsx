import { Calendar, Phone, Stethoscope, Clock } from 'lucide-react'
import type { ExaminationDetail } from '../doctor-types'

export function PatientBanner({ exam }: { exam: ExaminationDetail }) {
  const isPriority = exam.intake.priority === 'Ưu tiên'

  return (
    <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid size-12 place-items-center rounded-2xl bg-[#f0efff] text-[#5546e8] shrink-0 font-bold text-lg">
            {exam.patient.fullName.charAt(0)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-lg font-bold text-slate-900">{exam.patient.fullName}</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                {exam.patient.code}
              </span>
              <span className="rounded-full bg-[#f0efff] px-2.5 py-0.5 text-xs font-semibold text-[#5546e8]">
                {exam.code}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isPriority
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                Ưu tiên: {exam.intake.priority}
              </span>
              {exam.intake.priorityReason ? <span className="text-xs text-amber-800">{exam.intake.priorityReason}</span> : null}
              {exam.isLocked && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  🔒 Hồ sơ đã khóa (Chỉ đọc)
                </span>
              )}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-slate-400" />
                Ngày sinh: {exam.patient.dateOfBirth} ({exam.patient.gender})
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="size-3.5 text-slate-400" />
                SĐT: {exam.patient.phone}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-slate-400" />
                Bắt đầu khám: {new Date(exam.startedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="flex items-center gap-1.5 text-[#5546e8] font-medium">
                Phòng: {exam.intake.roomName}
              </span>
            </div>

            {exam.intake.symptoms && (
              <p className="mt-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-700">Triệu chứng ban đầu:</span> {exam.intake.symptoms}
              </p>
            )}
          </div>
        </div>

        {exam.intake.services.length > 0 && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 lg:max-w-xs shrink-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Stethoscope className="size-3 text-[#5546e8]" />
              Dịch vụ tiếp nhận đã lập
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {exam.intake.services.map((s) => (
                <span
                  key={s.code}
                  className="rounded-lg bg-white border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700"
                >
                  {s.name} × {s.quantity}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
