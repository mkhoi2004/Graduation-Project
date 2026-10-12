import { useEffect, useState } from 'react';

type Props = { open: boolean; entityName: string; onCancel: () => void; onConfirm: (reason: string) => Promise<void> | void };

export function DeleteDialog({ open, entityName, onCancel, onConfirm }: Props) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setReason(''); setError(''); } }, [open]);
  if (!open) return null;
  async function confirm() {
    if (!reason.trim()) { setError('Cần lý do xóa.'); return; }
    setError(''); setBusy(true);
    try { await onConfirm(reason.trim()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể xóa.'); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop" role="presentation">
    <div className="modal-card" role="dialog" aria-modal="true" aria-label={`Xóa ${entityName}`}>
      <h2>Xóa {entityName}?</h2>
      <p>Bản ghi sẽ được lưu vào bảng _Deleted. Bản ghi đang được tham chiếu sẽ bị chặn xóa.</p>
      <label>Lý do xóa <textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={500} /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions"><button type="button" onClick={onCancel}>Hủy</button><button type="button" disabled={busy} onClick={confirm}>Xác nhận xóa</button></div>
    </div>
  </div>;
}
