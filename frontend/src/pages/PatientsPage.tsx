import { useEffect, useState } from 'react';
import { Alert, Button, Input, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteDialog } from '../components/DeleteDialog';
import { PatientForm } from '../components/PatientForm';
import { apiError, patientApi } from '../services/api';
import type { Patient, PatientInput } from '../types';

export function PatientsPage({ roles }: { roles: string[] }) {
  const [rows, setRows] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Patient | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Patient | null>(null);
  const canWrite = roles.includes('ADMIN') || roles.includes('RECEPTIONIST');
  const canDelete = roles.includes('ADMIN');

  async function load() {
    setLoading(true); setError('');
    try { setRows(await patientApi.list(search, page)); }
    catch (cause) { setError(apiError(cause).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [search, page]);

  async function save(input: PatientInput) {
    try {
      if (editing && editing !== 'new') await patientApi.update(editing.id, { ...input, version: editing.version });
      else await patientApi.create(input);
      setEditing(null); await load();
    } catch (cause) { throw apiError(cause); }
  }
  async function remove(reason: string) {
    if (!deleting) return;
    try { await patientApi.remove(deleting.id, reason); setDeleting(null); await load(); }
    catch (cause) { throw apiError(cause); }
  }

  const columns: ColumnsType<Patient> = [
    { title: 'Mã', dataIndex: 'id', width: 90 },
    { title: 'Họ tên', dataIndex: 'fullName' },
    { title: 'Ngày/năm sinh', render: (_, row) => row.dateOfBirth ?? row.birthYear ?? '—' },
    { title: 'Liên hệ', dataIndex: 'phone', render: value => value || '—' },
    { title: 'Thao tác', render: (_, row) => <div className="table-actions">{canWrite && <Button size="small" onClick={() => setEditing(row)}>Sửa</Button>}{canDelete && <Button size="small" danger onClick={() => setDeleting(row)}>Xóa</Button>}</div> }
  ];
  return <section className="page">
    <div className="page-heading"><div><Typography.Title level={2}>Bệnh nhân</Typography.Title><Typography.Text type="secondary">Số điện thoại trùng được phép sau xác minh.</Typography.Text></div>{canWrite && <Button type="primary" onClick={() => setEditing('new')}>Thêm bệnh nhân</Button>}</div>
    <div className="toolbar"><Input.Search placeholder="Tìm theo tên hoặc số liên hệ" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} allowClear style={{ maxWidth: 400 }} /></div>
    {error && <Alert type="error" message={error} showIcon />}
    <Table rowKey="id" columns={columns} dataSource={rows} loading={loading} pagination={false} scroll={{ x: 700 }} />
    <div className="pager"><Button disabled={page === 1} onClick={() => setPage(page - 1)}>Trước</Button><span>Trang {page}</span><Button disabled={rows.length < 20} onClick={() => setPage(page + 1)}>Sau</Button></div>
    {editing && <div className="modal-backdrop"><div className="modal-card"><h2>{editing === 'new' ? 'Thêm bệnh nhân' : 'Sửa bệnh nhân'}</h2><PatientForm initial={editing === 'new' ? undefined : editing} onSubmit={save} onCancel={() => setEditing(null)} /></div></div>}
    <DeleteDialog open={deleting !== null} entityName={deleting?.fullName ?? 'bệnh nhân'} onCancel={() => setDeleting(null)} onConfirm={remove} />
  </section>;
}
