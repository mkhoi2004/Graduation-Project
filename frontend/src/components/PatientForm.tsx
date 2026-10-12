import { useState, type FormEvent } from 'react';
import type { Patient, PatientInput } from '../types';

type Props = {
  initial?: Patient;
  onSubmit: (input: PatientInput) => Promise<void> | void;
  onCancel: () => void;
};

export function PatientForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.fullName ?? '');
  const [dob, setDob] = useState(initial?.dateOfBirth ?? '');
  const [birthYear, setBirthYear] = useState(initial?.birthYear?.toString() ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length < 2) { setError('Cần họ tên.'); return; }
    if (!dob && !birthYear) { setError('Cần ngày hoặc năm sinh.'); return; }
    const year = birthYear ? Number(birthYear) : null;
    if (year !== null && (year < 1900 || year > new Date().getFullYear())) { setError('Năm sinh không hợp lệ.'); return; }
    setError('');
    setSaving(true);
    try {
      await onSubmit({ fullName: name.trim(), dateOfBirth: dob || null, birthYear: year,
        phone: phone.trim() || null });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu bệnh nhân.');
    } finally { setSaving(false); }
  }

  return <form className="stack" onSubmit={submit}>
    <label>Họ tên <input value={name} onChange={event => setName(event.target.value)} maxLength={200} /></label>
    <div className="form-grid">
      <label>Ngày sinh <input type="date" value={dob} onChange={event => setDob(event.target.value)} /></label>
      <label>Năm sinh nếu chưa rõ ngày <input type="number" value={birthYear} onChange={event => setBirthYear(event.target.value)} min={1900} max={new Date().getFullYear()} /></label>
    </div>
    <label>Số liên hệ <input value={phone} onChange={event => setPhone(event.target.value)} maxLength={20} /></label>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="actions"><button type="button" onClick={onCancel}>Hủy</button><button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button></div>
  </form>;
}
