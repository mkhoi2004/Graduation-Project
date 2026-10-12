import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Button, Input, Select, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteDialog } from '../components/DeleteDialog';
import { apiError, visitApi } from '../services/api';
import type { Visit } from '../types';

const visitTypes = [{ value: 'STANDARD', label: 'Khám mới' }, { value: 'FOLLOW_UP', label: 'Tái khám' }, { value: 'WARRANTY', label: 'Bảo hành' }];
export function VisitsPage({ roles }: { roles: string[] }) {
  const [rows, setRows] = useState<Visit[]>([]);
  const [patientFilter, setPatientFilter] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Visit | null>(null);
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [branchCode, setBranchCode] = useState('MAIN');
  const [visitType, setVisitType] = useState('STANDARD');
  const canWrite = roles.includes('ADMIN') || roles.includes('RECEPTIONIST');
  const admin = roles.includes('ADMIN');
  async function load() { setLoading(true); setError(''); try { setRows(await visitApi.list(patientFilter, page)); } catch (cause) { setError(apiError(cause).message); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, [patientFilter, page]);
  async function save(event: FormEvent) {
    event.preventDefault();
    const patient = Number(patientId);
    if (!Number.isSafeInteger(patient) || patient <= 0) { setError('Mã bệnh nhân không hợp lệ.'); return; }
    const doctor = doctorId ? Number(doctorId) : null;
    if (doctor !== null && (!Number.isSafeInteger(doctor) || doctor <= 0)) { setError('Mã bác sĩ không hợp lệ.'); return; }
    if (!branchCode.trim()) { setError('Cần mã chi nhánh.'); return; }
    try { await visitApi.create({ patientId: patient, doctorUserId: doctor, branchCode: branchCode.trim(), visitType }); setAdding(false); await load(); }
    catch (cause) { setError(apiError(cause).message); }
  }
  async function remove(reason: string) { if (!deleting) return; try { await visitApi.remove(deleting.id, reason); setDeleting(null); await load(); } catch (cause) { throw apiError(cause); } }
  const columns: ColumnsType<Visit> = [
    { title: 'Mã lượt', dataIndex: 'id' }, { title: 'Mã BN', dataIndex: 'patientId' },
    { title: 'Chi nhánh', dataIndex: 'branchCode' }, { title: 'Loại', dataIndex: 'visitType' },
    { title: 'Trạng thái', dataIndex: 'status', render: value => <Tag>{value}</Tag> },
    { title: 'Tạo lúc', dataIndex: 'createdAt', render: value => new Date(value).toLocaleString('vi-VN') },
    { title: 'Thao tác', render: (_, row) => admin && row.status === 'REGISTERED' ? <Button size="small" danger onClick={() => setDeleting(row)}>Xóa</Button> : null }
  ];
  return <section className="page">
    <div className="page-heading"><Typography.Title level={2}>Lượt khám</Typography.Title>{canWrite && <Button type="primary" onClick={() => setAdding(true)}>Tạo lượt khám</Button>}</div>
    <div className="toolbar"><Input placeholder="Lọc theo mã bệnh nhân" type="number" value={patientFilter} onChange={event => { setPatientFilter(event.target.value); setPage(1); }} style={{ maxWidth: 260 }} /></div>
    {error && <Alert type="error" message={error} showIcon />}
    <Table rowKey="id" columns={columns} dataSource={rows} loading={loading} pagination={false} scroll={{ x: 700 }} />
    <div className="pager"><Button disabled={page === 1} onClick={() => setPage(page - 1)}>Trước</Button><span>Trang {page}</span><Button disabled={rows.length < 20} onClick={() => setPage(page + 1)}>Sau</Button></div>
    {adding && <div className="modal-backdrop"><div className="modal-card"><h2>Tạo lượt khám</h2><form className="stack" onSubmit={save}>
      <label>Mã bệnh nhân <input type="number" value={patientId} onChange={event => setPatientId(event.target.value)} required min={1} /></label>
      <label>Mã bác sĩ (nếu đã phân công) <input type="number" value={doctorId} onChange={event => setDoctorId(event.target.value)} min={1} /></label>
      <label>Chi nhánh <input value={branchCode} onChange={event => setBranchCode(event.target.value)} required maxLength={40} /></label>
      <label>Loại lượt khám <Select value={visitType} onChange={setVisitType} options={visitTypes} /></label>
      <div className="actions"><button type="button" onClick={() => setAdding(false)}>Hủy</button><button type="submit">Lưu</button></div>
    </form></div></div>}
    <DeleteDialog open={deleting !== null} entityName={`lượt khám ${deleting?.id ?? ''}`} onCancel={() => setDeleting(null)} onConfirm={remove} />
  </section>;
}
