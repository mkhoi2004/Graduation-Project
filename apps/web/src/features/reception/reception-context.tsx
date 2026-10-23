import { createContext, useCallback, useContext, useEffect, useReducer, type ReactNode } from 'react'
import {
  fetchIntakes,
  fetchPatients,
  payCashApi,
  transferIntakeApi,
} from './reception-api'
import { demoReceptionData, type Intake, type Patient } from './reception-data'

export interface ReceptionState {
  patients: Patient[]
  intakes: Intake[]
}

type ReceptionAction =
  | { type: 'SET_STATE'; state: ReceptionState }
  | { type: 'UPSERT_PATIENT'; patient: Patient }
  | { type: 'ADD_INTAKE'; intake: Intake }
  | { type: 'UPDATE_INTAKE'; intake: Intake }
  | { type: 'TRANSFER_INTAKE'; intakeId: string; transferredAt: string }
  | { type: 'LOAD_DEMO_DATA' }
  | { type: 'CLEAR_DATA' }

interface ReceptionContextValue extends ReceptionState {
  dispatch: React.Dispatch<ReceptionAction>
  refreshData: () => Promise<void>
}

export const initialReceptionState: ReceptionState = { patients: [], intakes: [] }
const storageKey = 'dental-erp.reception-workspace'
const ReceptionContext = createContext<ReceptionContextValue | null>(null)

export function receptionReducer(state: ReceptionState, action: ReceptionAction): ReceptionState {
  switch (action.type) {
    case 'SET_STATE':
      return action.state
    case 'UPSERT_PATIENT': {
      const exists = state.patients.some((patient) => patient.id === action.patient.id)
      return {
        ...state,
        patients: exists
          ? state.patients.map((patient) => patient.id === action.patient.id ? action.patient : patient)
          : [...state.patients, action.patient],
      }
    }
    case 'ADD_INTAKE':
      return { ...state, intakes: [...state.intakes, action.intake] }
    case 'UPDATE_INTAKE':
      return { ...state, intakes: state.intakes.map((intake) => {
        if (intake.id !== action.intake.id) return intake
        if (intake.status === 'TRANSFERRED' && (action.intake.status === 'DRAFT' || action.intake.status === 'READY')) return intake
        return action.intake
      }) }
    case 'TRANSFER_INTAKE':
      return {
        ...state,
        intakes: state.intakes.map((intake) => intake.id === action.intakeId && intake.status === 'PAID'
          ? { ...intake, status: 'TRANSFERRED', transferredAt: action.transferredAt }
          : intake),
      }
    case 'LOAD_DEMO_DATA':
      return { patients: demoReceptionData.patients, intakes: demoReceptionData.intakes }
    case 'CLEAR_DATA':
      return { patients: [], intakes: [] }
  }
}

function loadState(): ReceptionState {
  const defaultInitial = import.meta.env.MODE === 'test' ? initialReceptionState : demoReceptionData
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return defaultInitial
    const parsed = JSON.parse(raw) as Partial<ReceptionState>
    if (!Array.isArray(parsed.patients) || !Array.isArray(parsed.intakes)) return defaultInitial
    return { patients: parsed.patients, intakes: parsed.intakes }
  } catch {
    return defaultInitial
  }
}

export function ReceptionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(receptionReducer, undefined, loadState)

  const refreshData = useCallback(async () => {
    try {
      const [patients, intakes] = await Promise.all([fetchPatients(), fetchIntakes()])
      if (patients.length || intakes.length) {
        dispatch({ type: 'SET_STATE', state: { patients, intakes } })
      }
    } catch (error) {
      console.warn('Không thể đồng bộ từ máy chủ tiếp nhận:', error)
    }
  }, [])

  useEffect(() => {
    if (import.meta.env.MODE !== 'test') {
      void refreshData()
    }
  }, [refreshData])

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(state))
  }, [state])

  const enhancedDispatch = useCallback((action: ReceptionAction) => {
    dispatch(action)

    if (import.meta.env.MODE === 'test') return

    // Background sync to SQL Server database
    switch (action.type) {
      case 'UPSERT_PATIENT':
        // PatientsPage awaits createPatientApi / updatePatientApi directly before dispatching this action.
        break
      case 'ADD_INTAKE':
        // NewIntakePage awaits the server response before dispatching this action.
        break
      case 'UPDATE_INTAKE': {
        // ServicesPage awaits the atomic save/STT response before dispatching READY.
        if (action.intake.status === 'PAID' && action.intake.payment?.method === 'CASH') {
          payCashApi(action.intake.id).catch(console.error)
        }
        break
      }
      case 'TRANSFER_INTAKE': {
        transferIntakeApi(action.intakeId).catch(console.error)
        break
      }
    }
  }, [state.patients])

  return (
    <ReceptionContext.Provider value={{ ...state, dispatch: enhancedDispatch, refreshData }}>
      {children}
    </ReceptionContext.Provider>
  )
}

export function useReception() {
  const context = useContext(ReceptionContext)
  if (!context) throw new Error('useReception must be used inside ReceptionProvider')
  return context
}
