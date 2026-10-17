import { useState } from 'react'
import {
  AlertCircle,
  Bell,
  PlayCircle,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react'
import { callNextPatientApi } from '../doctor-api'
import { defaultClinicRooms } from '../doctor-data'
import { useDoctor } from '../doctor-context'
import { EmptyState, PageTitle, inputClass } from '../../reception/reception-ui'

export function QueueStep() {
  const { queue, currentExam, activeRoomCode, rooms, dispatch, refreshQueue } = useDoctor()
  const [search, setSearch] = useState('')
  const [calling, setCalling] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const activeRoom = rooms.find((r) => r.code === activeRoomCode)
  const isExamInProgress = currentExam !== null && currentExam.status === 'IN_PROGRESS'

  const filteredQueue = queue.filter((p) => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    return (
      p.patientName.toLowerCase().includes(q) ||
      p.patientCode.toLowerCase().includes(q) ||
      p.phone.includes(q)
    )
  })

  const handleCallNext = async () => {
    if (isExamInProgress) {
      setActionError(
        'Bác sĩ đang có ca bệnh ở trạng thái Đang khám. Vui lòng Ghi sổ (Hoàn thành hoặc Ngừng khám) trước khi gọi tiếp.',
      )
      return
    }

    try {
      setCalling(true)
      setActionError(null)
      const newExam = await callNextPatientApi(activeRoomCode)
      dispatch({ type: 'SET_CURRENT_EXAM', exam: newExam })
      await refreshQueue()
      dispatch({ type: 'SET_STEP', step: 2 })
    } catch (err: any) {
      setActionError(err.message ?? 'Không thể gọi bệnh nhân tiếp theo.')
    } finally {
      setCalling(false)
    }
  }

  return (
    <div>
      <PageTitle
        eyebrow="Bước 1 / Phân hệ Bác sĩ"
        title="Danh sách chờ tiếp nhận & Điều phối khám"
        description={`Hàng đợi bệnh nhân đã hoàn tất thủ tục bàn giao vào ${activeRoom?.name ?? 'phòng khám'}. Thứ tự được tự động sắp xếp theo Mức ưu tiên và Thời gian tiếp nhận.`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void refreshQueue()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw className="size-3.5 text-slate-400" />
              Làm mới hàng đợi
            </button>
            <button
              type="button"
              disabled={calling || queue.length === 0 || isExamInProgress}
              onClick={handleCallNext}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md transition ${
                isExamInProgress
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-[#5546e8] text-white shadow-[#5546e8]/25 hover:bg-[#483ad3]'
              }`}
              title={
                isExamInProgress
                  ? 'Bác sĩ đang có ca khám chưa hoàn thành'
                  : queue.length === 0
                    ? 'Không có bệnh nhân chờ'
                    : 'Gọi bệnh nhân có thứ tự ưu tiên cao nhất'
              }
            >
              <Bell className="size-4" />
              {calling ? 'Đang gọi...' : 'Gọi STT tiếp theo'}
            </button>
          </div>
        }
      />

      {isExamInProgress && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-blue-600 text-white font-bold text-xs shrink-0">
              <PlayCircle className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-950">
                Bạn đang có ca khám #{currentExam.code} đang diễn ra
              </p>
              <p className="text-xs text-blue-700">
                Bệnh nhân: <strong>{currentExam.patient.fullName}</strong> ({currentExam.patient.code}). Vui lòng tiếp tục các bước khám để ghi sổ.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_STEP', step: 2 })}
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition shrink-0"
          >
            Tiếp tục ca khám này →
          </button>
        </div>
      )}

      {actionError && (
        <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          <AlertCircle className="size-4 shrink-0 text-red-500" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Search & Statistics Bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên bệnh nhân, mã BN, SĐT..."
            className={inputClass + ' pl-10'}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span>Tổng số đang chờ: <strong className="text-slate-800">{filteredQueue.length}</strong></span>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-600">Phòng trực:</span>
            <select
              aria-label="Chọn phòng khám trong hàng đợi"
              value={activeRoomCode}
              onChange={(e) => dispatch({ type: 'SET_ROOM', roomCode: e.target.value })}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-bold text-[#5546e8] shadow-sm outline-none hover:border-[#5546e8] focus:border-[#5546e8] cursor-pointer"
            >
              {(rooms.length > 0 ? rooms : defaultClinicRooms).map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Patient Queue Table */}
      {filteredQueue.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" />}
          title="Không có bệnh nhân chờ"
          description={
            search
              ? 'Không tìm thấy bệnh nhân phù hợp với từ khóa tìm kiếm.'
              : `Hiện tại không có bệnh nhân nào ở trạng thái Chờ khám tại ${activeRoom?.name ?? 'phòng này'}.`
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3.5 text-center">STT</th>
                  <th className="px-4 py-3.5">Mã BN</th>
                  <th className="px-4 py-3.5">Họ và tên</th>
                  <th className="px-4 py-3.5">Năm sinh / Giới</th>
                  <th className="px-4 py-3.5">Mức ưu tiên</th>
                  <th className="px-4 py-3.5">Triệu chứng ban đầu</th>
                  <th className="px-4 py-3.5">Dịch vụ chỉ định</th>
                  <th className="px-4 py-3.5 text-right">Giờ chuyển</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQueue.map((patient) => {
                  const isUrgent = patient.priority === 'Khẩn cấp'
                  const isPriority = patient.priority === 'Ưu tiên'
                  return (
                    <tr
                      key={patient.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-3.5 text-center font-bold text-[#5546e8]">
                        #{patient.stt}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">
                        {patient.patientCode}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-950">
                        {patient.patientName}
                        {patient.note && (
                          <p className="text-[11px] font-normal text-slate-400">
                            Ghi chú: {patient.note}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {patient.dateOfBirth} ({patient.gender})
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            isUrgent
                              ? 'bg-red-50 text-red-600 border border-red-200'
                              : isPriority
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {patient.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate">
                        {patient.symptoms || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {patient.services.map((s) => (
                            <span
                              key={s.code}
                              className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700"
                            >
                              {s.name} × {s.quantity}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right text-xs text-slate-500 whitespace-nowrap">
                        {new Date(patient.transferredAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
