import { useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Package,
  Plus,
  Save,
  Syringe,
  Trash2,
} from 'lucide-react'
import { updateSuppliesApi } from '../doctor-api'
import { defaultMedicalSupplies } from '../doctor-data'
import { useDoctor } from '../doctor-context'
import type { MedicalSupplyCatalogItem, SupplyUsageItem } from '../doctor-types'
import { PatientBanner } from '../components/patient-banner'
import { PageTitle, inputClass, labelClass } from '../../reception/reception-ui'

interface SelectedItem {
  intakeServiceId: number
  supplyCode: string
  conversionUnitUsed?: string
  quantityInBaseUnit: number
}

export function SuppliesStep() {
  const { currentExam, suppliesCatalog, dispatch, refreshSupplies } = useDoctor()

  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  const [activeGroup, setActiveGroup] = useState<'THUONG' | 'VO_CAM'>('THUONG')
  const [selectedSupplyCode, setSelectedSupplyCode] = useState<string>('')
  const [useConversionUnit, setUseConversionUnit] = useState<boolean>(false)
  const [inputQuantity, setInputQuantity] = useState<number>(1)
  const [selectedIntakeServiceId, setSelectedIntakeServiceId] = useState<number>(0)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [lastExamId, setLastExamId] = useState<number | null>(null)

  // Synchronize selected items when switching examination
  if (currentExam && currentExam.id !== lastExamId) {
    setLastExamId(currentExam.id)
    setSelectedItems(
      currentExam.supplies.map((s) => ({
        intakeServiceId: s.intakeServiceId,
        supplyCode: s.supplyCode,
        conversionUnitUsed: s.conversionUnitUsed,
        quantityInBaseUnit: s.quantityInBaseUnit,
      })),
    )
  }

  if (!currentExam) {
    return (
      <div>
        <PageTitle
          eyebrow="Bước 2 / Phân hệ Bác sĩ"
          title="Vật tư y tế tiêu hao (VTYT)"
          description="Vui lòng gọi hoặc chọn một bệnh nhân từ danh sách chờ trước khi thực hiện bước này."
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Chưa có ca khám nào đang mở. Vui lòng quay lại Bước 1 để gọi bệnh nhân.
        </div>
      </div>
    )
  }

  const isLocked = currentExam.isLocked || currentExam.status !== 'IN_PROGRESS'

  // Filter catalog items by active group with fallback to default warehouse catalog
  const availableCatalog = suppliesCatalog.length > 0 ? suppliesCatalog : defaultMedicalSupplies
  const groupSupplies = availableCatalog.filter((s) => s.group === activeGroup)
  const activeSupply = availableCatalog.find((s) => s.id === selectedSupplyCode)

  // Dynamic remaining available stock for each supply item
  const getSupplyStockInfo = (supply: MedicalSupplyCatalogItem) => {
    const selectedItem = selectedItems.find((i) => i.supplyCode === supply.id)
    const usedInExam = selectedItem ? selectedItem.quantityInBaseUnit : 0
    const remainingStock = Math.max(0, supply.inStock - usedInExam)
    return {
      usedInExam,
      remainingStock,
      isOutOfStock: remainingStock <= 0,
    }
  }

  const handleAddSupply = () => {
    if (!activeSupply) {
      setErrorMessage('Vui lòng chọn vật tư y tế.')
      return
    }

    if (inputQuantity <= 0) {
      setErrorMessage('Số lượng phải lớn hơn 0.')
      return
    }

    const intakeServiceId = selectedIntakeServiceId || currentExam.intake.services[0]?.intakeServiceId
    if (!intakeServiceId) {
      setErrorMessage('Ca khám chưa có dòng dịch vụ để phân bổ vật tư.')
      return
    }

    // Calculate quantity in base unit
    let qtyInBaseUnit = inputQuantity
    let conversionUnitStr: string | undefined = undefined

    if (useConversionUnit && activeSupply.conversionUnit && activeSupply.conversionRate) {
      qtyInBaseUnit = inputQuantity * activeSupply.conversionRate
      conversionUnitStr = activeSupply.conversionUnit
    }

    if (qtyInBaseUnit > activeSupply.inStock) {
      setErrorMessage(
        `Số lượng yêu cầu (${qtyInBaseUnit} ${activeSupply.baseUnit}) vượt quá tồn kho khả dụng hiện tại (${activeSupply.inStock} ${activeSupply.baseUnit}). Tồn kho không được phép âm!`,
      )
      return
    }

    // Check if already added
    const existingIndex = selectedItems.findIndex((i) => i.supplyCode === activeSupply.id)
    if (existingIndex >= 0) {
      const updated = [...selectedItems]
      updated[existingIndex] = {
        intakeServiceId,
        supplyCode: activeSupply.id,
        conversionUnitUsed: conversionUnitStr,
        quantityInBaseUnit: qtyInBaseUnit,
      }
      setSelectedItems(updated)
    } else {
      setSelectedItems((prev) => [
        ...prev,
        {
          intakeServiceId,
          supplyCode: activeSupply.id,
          conversionUnitUsed: conversionUnitStr,
          quantityInBaseUnit: qtyInBaseUnit,
        },
      ])
    }

    setErrorMessage(null)
    setInputQuantity(1)
  }

  const handleRemoveSupply = (supplyCode: string) => {
    if (isLocked) return
    setSelectedItems((prev) => prev.filter((i) => i.supplyCode !== supplyCode))
  }

  const handleSaveSupplies = async () => {
    if (isLocked) return
    try {
      setSaving(true)
      setErrorMessage(null)
      setSaveSuccess(false)

      const payload: SupplyUsageItem[] = selectedItems.map((item) => ({
        intakeServiceId: item.intakeServiceId,
        supplyCode: item.supplyCode,
        conversionUnitUsed: item.conversionUnitUsed,
        quantityInBaseUnit: item.quantityInBaseUnit,
      }))

      const updatedExam = await updateSuppliesApi(currentExam.id, payload)
      dispatch({ type: 'SET_CURRENT_EXAM', exam: updatedExam })
      await refreshSupplies()
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setErrorMessage(err.message ?? 'Không thể lưu vật tư y tế.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageTitle
        eyebrow="Bước 2 / Phân hệ Bác sĩ"
        title="Vật tư y tế tiêu hao (VTYT)"
        description="Ghi nhận số lượng vật tư tiêu hao thực tế sử dụng cho ca điều trị. Dữ liệu chỉ dùng để quản lý tồn kho và giá vốn nội bộ, không hiển thị giá cho bệnh nhân."
        action={
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isLocked || saving}
              onClick={handleSaveSupplies}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#dedaff] bg-[#f0efff] px-4 py-2.5 text-xs font-semibold text-[#5546e8] shadow-sm transition hover:bg-[#e4e1ff] disabled:opacity-50"
            >
              <Save className="size-4" />
              {saving ? 'Đang lưu...' : 'Lưu danh sách VTYT'}
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_STEP', step: 3 })}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#5546e8] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#483ad3]"
            >
              <span>Tiếp sang Tóm tắt kết quả (Bước 3)</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        }
      />

      <PatientBanner exam={currentExam} />

      {saveSuccess && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <span>Đã lưu và giữ chỗ thành công các vật tư y tế tiêu hao!</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
          <AlertCircle className="size-4 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Side: Supply Catalog Selection */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Package className="size-4 text-[#5546e8]" />
              Chọn vật tư y tế sử dụng
            </h3>

            {/* Group Tabs: Thường / Vô cảm */}
            <div className="flex gap-2 mb-4 border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => {
                  setActiveGroup('THUONG')
                  setSelectedSupplyCode('')
                }}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  activeGroup === 'THUONG'
                    ? 'bg-[#5546e8] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Package className="size-3.5" />
                VTYT thông thường (5 loại mẫu)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveGroup('VO_CAM')
                  setSelectedSupplyCode('')
                }}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  activeGroup === 'VO_CAM'
                    ? 'bg-[#5546e8] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Syringe className="size-3.5" />
                VTYT vô cảm / Gây tê (5 loại mẫu)
              </button>
            </div>

            {/* List of Supplies in Selected Group */}
            {groupSupplies.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
                Không có dữ liệu vật tư y tế trong nhóm này.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {groupSupplies.map((supply) => {
                  const isSelected = selectedSupplyCode === supply.id
                  const { usedInExam, remainingStock, isOutOfStock } = getSupplyStockInfo(supply)
                  return (
                    <div
                      key={supply.id}
                      onClick={() => {
                        if (!isLocked && !isOutOfStock) {
                          setSelectedSupplyCode(supply.id)
                          setUseConversionUnit(false)
                          setInputQuantity(1)
                          setErrorMessage(null)
                        }
                      }}
                      className={`rounded-xl border p-3 transition ${
                        isOutOfStock
                          ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200'
                          : isSelected
                            ? 'border-[#5546e8] bg-[#f0efff]/60 shadow-sm cursor-pointer'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-xs text-slate-900 leading-snug">
                          {supply.name}
                        </p>
                        {isOutOfStock && (
                          <span className="shrink-0 rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                            Hết tồn
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Đơn vị: <strong>{supply.baseUnit}</strong></span>
                        <span className="font-medium text-slate-600">
                          Khả dụng:{' '}
                          <strong className={remainingStock > 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                            {remainingStock}
                          </strong>
                          {' '}/ {supply.inStock} {supply.baseUnit}
                        </span>
                      </div>
                      {usedInExam > 0 && (
                        <p className="mt-1 text-[11px] font-semibold text-[#5546e8]">
                          ✓ Đang chọn: {usedInExam} {supply.baseUnit}
                        </p>
                      )}
                      {supply.conversionUnit && supply.conversionRate && (
                        <p className="mt-1 text-[10px] text-slate-400 font-medium">
                          Quy đổi: 1 {supply.conversionUnit} = {supply.conversionRate} {supply.baseUnit}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Conversion Unit & Quantity Input Form */}
            {activeSupply && (() => {
              const stockInfo = getSupplyStockInfo(activeSupply)
              const rate = useConversionUnit && activeSupply.conversionRate ? activeSupply.conversionRate : 1
              const maxAllowedInput = Math.floor(stockInfo.remainingStock / rate)
              const requestedBase = inputQuantity * rate
              const isOverStock = requestedBase > stockInfo.remainingStock

              return (
                <div className="mt-5 rounded-xl border border-[#dedaff] bg-[#fcfbff] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <p className="text-xs font-bold text-slate-800">
                      Nhập số lượng cho: <span className="text-[#5546e8]">{activeSupply.name}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Tồn khả dụng:{' '}
                      <strong className={stockInfo.remainingStock > 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                        {stockInfo.remainingStock}
                      </strong>{' '}
                      {activeSupply.baseUnit} (Tổng kho: {activeSupply.inStock})
                    </p>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="supply-intake-service" className={labelClass}>Dịch vụ sử dụng vật tư</label>
                    <select
                      id="supply-intake-service"
                      aria-label="Dịch vụ sử dụng vật tư"
                      value={selectedIntakeServiceId || currentExam.intake.services[0]?.intakeServiceId || ''}
                      onChange={(event) => setSelectedIntakeServiceId(Number(event.target.value))}
                      disabled={isLocked}
                      className={inputClass}
                    >
                      {currentExam.intake.services.map((service) => (
                        <option key={service.intakeServiceId} value={service.intakeServiceId}>
                          {service.name} × {service.quantity}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-end">
                    <div>
                      <label className={labelClass}>Đơn vị nhập</label>
                      {activeSupply.conversionUnit ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setUseConversionUnit(false)}
                            className={`flex-1 rounded-xl py-2 px-3 text-xs font-semibold border transition ${
                              !useConversionUnit
                                ? 'border-[#5546e8] bg-white text-[#5546e8] shadow-sm'
                                : 'border-slate-200 bg-slate-50 text-slate-600'
                            }`}
                          >
                            {activeSupply.baseUnit} (Cơ bản)
                          </button>
                          <button
                            type="button"
                            onClick={() => setUseConversionUnit(true)}
                            className={`flex-1 rounded-xl py-2 px-3 text-xs font-semibold border transition ${
                              useConversionUnit
                                ? 'border-[#5546e8] bg-white text-[#5546e8] shadow-sm'
                                : 'border-slate-200 bg-slate-50 text-slate-600'
                            }`}
                          >
                            {activeSupply.conversionUnit} (Quy đổi)
                          </button>
                        </div>
                      ) : (
                        <span className="inline-block py-2 text-xs font-bold text-slate-700">
                          {activeSupply.baseUnit} (Đơn vị duy nhất)
                        </span>
                      )}
                    </div>

                    <div>
                      <label className={labelClass}>
                        Số lượng {useConversionUnit ? activeSupply.conversionUnit : activeSupply.baseUnit}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          max={Math.max(1, maxAllowedInput)}
                          disabled={isLocked || maxAllowedInput <= 0}
                          value={inputQuantity}
                          onChange={(e) => {
                            const val = Math.max(1, Number(e.target.value))
                            setInputQuantity(val)
                            const base = val * rate
                            if (base > stockInfo.remainingStock) {
                              setErrorMessage(
                                `Số lượng yêu cầu (${base} ${activeSupply.baseUnit}) vượt quá tồn khả dụng (${stockInfo.remainingStock} ${activeSupply.baseUnit}). Tồn kho không được phép âm!`,
                              )
                            } else {
                              setErrorMessage(null)
                            }
                          }}
                          className={inputClass + ' text-center font-bold'}
                        />
                        <button
                          type="button"
                          disabled={isLocked || stockInfo.isOutOfStock || maxAllowedInput <= 0 || isOverStock}
                          onClick={handleAddSupply}
                          className="rounded-xl bg-[#5546e8] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#483ad3] transition shrink-0 inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="size-4" />
                          Thêm
                        </button>
                      </div>
                    </div>
                  </div>

                  {useConversionUnit && activeSupply.conversionRate && (
                    <p className="mt-2 text-[11px] text-slate-500">
                      → Tương đương: <strong>{inputQuantity * activeSupply.conversionRate}</strong> {activeSupply.baseUnit} cơ bản sẽ được trừ tồn kho.
                    </p>
                  )}

                  {isOverStock && (
                    <p className="mt-2 text-xs font-bold text-red-600">
                      ⚠ Vượt quá tồn kho khả dụng ({stockInfo.remainingStock} {activeSupply.baseUnit}). Không được để tồn kho âm!
                    </p>
                  )}
                </div>
              )
            })()}
          </div>
        </div>

        {/* Right Side: Added Supplies Table */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <h3 className="font-bold text-slate-900 text-sm">
                  Vật tư đã chọn ({selectedItems.length})
                </h3>
                <span className="text-[11px] text-slate-400">Không hiển thị giá</span>
              </div>

              {selectedItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Chưa chọn vật tư y tế nào cho ca khám này.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedItems.map((item) => {
                    const supply = availableCatalog.find((s) => s.id === item.supplyCode)
                    const service = currentExam.intake.services.find((entry) => entry.intakeServiceId === item.intakeServiceId)
                    const { remainingStock } = supply ? getSupplyStockInfo(supply) : { remainingStock: 0 }
                    return (
                      <div
                        key={item.supplyCode}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {supply?.name ?? item.supplyCode}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Dịch vụ: <strong>{service?.name ?? `#${item.intakeServiceId}`}</strong><br />
                            Số lượng: <strong className="text-[#5546e8]">{item.quantityInBaseUnit}</strong> {supply?.baseUnit ?? 'đơn vị'}
                            {item.conversionUnitUsed && (
                              <span className="text-slate-400 ml-1">
                                (Nhập theo {item.conversionUnitUsed})
                              </span>
                            )}
                            <span className="ml-2 font-medium text-emerald-600">
                              • Còn khả dụng: {remainingStock} {supply?.baseUnit}
                            </span>
                          </p>
                        </div>
                        {!isLocked && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSupply(item.supplyCode)}
                            className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                            title="Xóa vật tư"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 mt-6">
              <button
                type="button"
                disabled={isLocked || saving}
                onClick={handleSaveSupplies}
                className="w-full rounded-xl bg-[#5546e8] py-3 text-xs font-bold text-white shadow-sm hover:bg-[#483ad3] transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Save className="size-4" />
                {saving ? 'Đang lưu...' : 'Lưu danh sách VTYT đã chọn'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
