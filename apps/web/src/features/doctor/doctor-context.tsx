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
  QueuePatient,
} from './doctor-types'
import { defaultClinicRooms, defaultMedicalSupplies } from './doctor-data'

interface DoctorState {
  rooms: ClinicRoom[]
  activeRoomCode: string
  queue: QueuePatient[]
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
      currentExam: ExaminationDetail | null
      suppliesCatalog: MedicalSupplyCatalogItem[]
    }
  | { type: 'SET_ROOM'; roomCode: string }
  | { type: 'SET_QUEUE'; queue: QueuePatient[] }
  | { type: 'SET_CURRENT_EXAM'; exam: ExaminationDetail | null }
  | { type: 'SET_CANCEL_MODAL'; open: boolean }
  | { type: 'SET_STEP'; step: 1 | 2 | 3 | 4 }
  | { type: 'SET_SUPPLIES_CATALOG'; catalog: MedicalSupplyCatalogItem[] }

const STORAGE_ROOM_KEY = 'dental_erp_doctor_room_code'

const initialState: DoctorState = {
  rooms: defaultClinicRooms,
  activeRoomCode: localStorage.getItem(STORAGE_ROOM_KEY) ?? 'room-01',
  queue: [],
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
        currentExam: action.currentExam,
        suppliesCatalog:
          action.suppliesCatalog && action.suppliesCatalog.length > 0
            ? action.suppliesCatalog
            : (state.suppliesCatalog.length > 0 ? state.suppliesCatalog : defaultMedicalSupplies),
        loading: false,
        error: null,
        activeStep: state.activeStep === 1 && action.currentExam ? 2 : state.activeStep,
      }
    case 'SET_ROOM':
      localStorage.setItem(STORAGE_ROOM_KEY, action.roomCode)
      return { ...state, activeRoomCode: action.roomCode }
    case 'SET_QUEUE':
      return { ...state, queue: action.queue }
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
      const queue = await fetchDoctorQueue(state.activeRoomCode)
      dispatch({ type: 'SET_QUEUE', queue })
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', error: err.message ?? 'Lỗi khi làm mới hàng đợi.' })
    }
  }, [state.activeRoomCode])

  const refreshAll = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', loading: true })
    try {
      const [roomsRes, currentExamRes, suppliesRes] = await Promise.allSettled([
        fetchDoctorRooms(),
        fetchCurrentExamining(),
        fetchSuppliesCatalog(),
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

      const savedRoom = localStorage.getItem(STORAGE_ROOM_KEY)
      const selectedRoom =
        savedRoom && rooms.some((r) => r.code === savedRoom)
          ? savedRoom
          : rooms[0]?.code ?? 'room-01'

      let queue: QueuePatient[] = []
      try {
        queue = await fetchDoctorQueue(selectedRoom)
      } catch {
        queue = []
      }

      dispatch({
        type: 'INIT_DATA',
        rooms,
        activeRoomCode: selectedRoom,
        queue,
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

  useEffect(() => {
    if (state.activeRoomCode) {
      void refreshQueue()
    }
  }, [state.activeRoomCode, refreshQueue])

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
