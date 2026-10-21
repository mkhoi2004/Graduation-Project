import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from 'react'
import {
  fetchCurrentExamining,
  fetchDoctorQueue,
  fetchDoctorRooms,
  fetchSuppliesCatalog,
} from './doctor-api'
import type {
  ClinicRoom,
  ExaminationDetail,
  MedicalSupplyCatalogItem,
  DoctorQueueSummary,
  QueuePatient,
} from './doctor-types'
import { defaultClinicRooms, defaultMedicalSupplies } from './doctor-data'

interface DoctorState {
  rooms: ClinicRoom[]
  activeRoomCode: string
  queue: QueuePatient[]
  queueSummary: DoctorQueueSummary
  currentExam: ExaminationDetail | null
  suppliesCatalog: MedicalSupplyCatalogItem[]
  loading: boolean
  error: string | null
  isCancelModalOpen: boolean
  activeStep: 1 | 2 | 3 | 4
}

type DoctorAction =
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | {
      type: 'INIT_DATA'
      rooms: ClinicRoom[]
      activeRoomCode: string
      queue: QueuePatient[]
      queueSummary: DoctorQueueSummary
      currentExam: ExaminationDetail | null
      suppliesCatalog: MedicalSupplyCatalogItem[]
    }
  | { type: 'SET_QUEUE'; queue: QueuePatient[]; summary: DoctorQueueSummary }
  | { type: 'SET_CURRENT_EXAM'; exam: ExaminationDetail | null }
  | { type: 'SET_CANCEL_MODAL'; open: boolean }
  | { type: 'SET_STEP'; step: 1 | 2 | 3 | 4 }
  | { type: 'SET_SUPPLIES_CATALOG'; catalog: MedicalSupplyCatalogItem[] }

const initialState: DoctorState = {
  rooms: defaultClinicRooms,
  activeRoomCode: 'room-01',
  queue: [],
  queueSummary: { businessDate: '', waitingCount: 0, priorityWaitingCount: 0 },
  currentExam: null,
  suppliesCatalog: defaultMedicalSupplies,
  loading: false,
  error: null,
  isCancelModalOpen: false,
  activeStep: 1,
}

function doctorReducer(state: DoctorState, action: DoctorAction): DoctorState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.loading }
    case 'SET_ERROR':
      return { ...state, error: action.error }
    case 'INIT_DATA':
      return {
        ...state,
        rooms: action.rooms && action.rooms.length > 0 ? action.rooms : (state.rooms.length > 0 ? state.rooms : defaultClinicRooms),
        activeRoomCode: action.activeRoomCode || state.activeRoomCode,
        queue: action.queue,
        queueSummary: action.queueSummary,
        currentExam: action.currentExam,
        suppliesCatalog:
          action.suppliesCatalog && action.suppliesCatalog.length > 0
            ? action.suppliesCatalog
            : (state.suppliesCatalog.length > 0 ? state.suppliesCatalog : defaultMedicalSupplies),
        loading: false,
        error: null,
        activeStep: state.activeStep === 1 && action.currentExam ? 2 : state.activeStep,
      }
    case 'SET_QUEUE':
      return { ...state, queue: action.queue, queueSummary: action.summary, activeRoomCode: action.summary.roomCode || state.activeRoomCode }
    case 'SET_CURRENT_EXAM':
      return {
        ...state,
        currentExam: action.exam,
        activeStep: action.exam ? (state.activeStep === 1 ? 2 : state.activeStep) : 1,
      }
    case 'SET_CANCEL_MODAL':
      return { ...state, isCancelModalOpen: action.open }
    case 'SET_STEP':
      return { ...state, activeStep: action.step }
    case 'SET_SUPPLIES_CATALOG':
      return { ...state, suppliesCatalog: action.catalog }
    default:
      return state
  }
}

interface DoctorContextValue extends DoctorState {
  dispatch: React.Dispatch<DoctorAction>
  refreshAll: () => Promise<void>
  refreshQueue: () => Promise<void>
  refreshSupplies: () => Promise<void>
}

const DoctorContext = createContext<DoctorContextValue | null>(null)

export function DoctorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(doctorReducer, initialState)

  const refreshSupplies = useCallback(async () => {
    try {
      const catalog = await fetchSuppliesCatalog()
      if (catalog && catalog.length > 0) {
        dispatch({ type: 'SET_SUPPLIES_CATALOG', catalog })
      }
    } catch {
      // ignore
    }
  }, [])

  const refreshQueue = useCallback(async () => {
    try {
      const response = await fetchDoctorQueue()
      dispatch({ type: 'SET_QUEUE', queue: response.queue, summary: response.summary })
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', error: err.message ?? 'Lỗi khi làm mới hàng đợi.' })
    }
  }, [])

  const refreshAll = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', loading: true })
    try {
      const [roomsRes, currentExamRes, suppliesRes, queueRes] = await Promise.allSettled([
        fetchDoctorRooms(),
        fetchCurrentExamining(),
        fetchSuppliesCatalog(),
        fetchDoctorQueue(),
      ])

      const rooms =
        roomsRes.status === 'fulfilled' && roomsRes.value.length > 0
          ? roomsRes.value
          : defaultClinicRooms

      const suppliesCatalog =
        suppliesRes.status === 'fulfilled' && suppliesRes.value.length > 0
          ? suppliesRes.value
          : defaultMedicalSupplies

      const currentExam = currentExamRes.status === 'fulfilled' ? currentExamRes.value : null

      const queueResponse = queueRes.status === 'fulfilled'
        ? queueRes.value
        : { queue: [], summary: { businessDate: '', waitingCount: 0, priorityWaitingCount: 0 } }
      const selectedRoom = queueResponse.summary.roomCode || currentExam?.intake.roomCode || rooms[0]?.code || 'room-01'

      dispatch({
        type: 'INIT_DATA',
        rooms,
        activeRoomCode: selectedRoom,
        queue: queueResponse.queue,
        queueSummary: queueResponse.summary,
        currentExam,
        suppliesCatalog,
      })
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', error: err.message ?? 'Lỗi nạp dữ liệu phân hệ Bác sĩ.' })
      dispatch({ type: 'SET_LOADING', loading: false })
    }
  }, [])

  useEffect(() => {
    void refreshAll()
  }, [refreshAll])

  return (
    <DoctorContext.Provider
      value={{
        ...state,
        dispatch,
        refreshAll,
        refreshQueue,
        refreshSupplies,
      }}
    >
      {children}
    </DoctorContext.Provider>
  )
}

export function useDoctor() {
  const context = useContext(DoctorContext)
  if (!context) {
    throw new Error('useDoctor must be used within DoctorProvider')
  }
  return context
}
