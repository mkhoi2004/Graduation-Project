import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Button, Input, Switch, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteDialog } from '../components/DeleteDialog';
import { apiError, serviceApi } from '../services/api';
import type { Service } from '../types';

export function ServicesPage({ roles }: { roles: string[] }) {
  const [rows, setRows] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Service | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const admin = roles.includes('ADMIN');
  async function load() { setLoading(true); setError(''); try { setRows(await serviceApi.list(search, page)); } catch (cause) { setError(apiError(cause).message); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, [search, page]);
  async function save(event: FormEvent) {
    event.preventDefault();
    try { await serviceApi.create({ code: code.trim(), name: name.trim(), requiresConsent: consent }); setAdding(false); setCode(''); setName(''); setConsent(false); await load(); }
    catch (cause) { setError(apiError(cause).message); }
  }
  async function remove(reason: string) {
    if (!deleting) return;
    try { await serviceApi.remove(deleting.id, reason); setDeleting(null); await load(); }
    catch (cause) { throw apiError(cause); }
  }
  const columns: ColumnsType<Service> = [
    { title: 'Mã', dataIndex: 'code' }, { title: 'Dịch vụ', dataIndex: 'name' },
    { title: 'Đồng thuận', dataIndex: 'requiresConsent', render: value => value ? <Tag color="gold">Bắt buộc</Tag> : 'Theo chỉ định' },
    { title: 'Trạng thái', dataIndex: 'isActive', render: value => value ? <Tag color="green">Đang dùng</Tag> : <Tag>Ngừng dùng</Tag> },
    { title: 'Thao tác', render: (_, row) => admin ? <Button size="small" danger onClick={() => setDeleting(row)}>Xóa</Button> : null }
  ];
  return <section className="page">
    <div className="page-heading"><Typography.Title level={2}>Danh mục dịch vụ</Typography.Title>{admin && <Button type="primary" onClick={() => setAdding(true)}>Thêm dịch vụ</Button>}</div>
    <div className="toolbar"><Input.Search value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} allowClear placeholder="Tìm mã hoặc tên" style={{ maxWidth: 380 }} /></div>
    {error && <Alert type="error" message={error} showIcon />}
    <Table rowKey="id" columns={columns} dataSource={rows} loading={loading} pagination={false} />
    <div className="pager"><Button disabled={page === 1} onClick={() => setPage(page - 1)}>Trước</Button><span>Trang {page}</span><Button disabled={rows.length < 20} onClick={() => setPage(page + 1)}>Sau</Button></div>
    {adding && <div className="modal-backdrop"><div className="modal-card"><h2>Thêm dịch vụ</h2><form className="stack" onSubmit={save}>
      <label>Mã dịch vụ <input value={code} onChange={event => setCode(event.target.value)} required maxLength={40} /></label>
      <label>Tên dịch vụ <input value={name} onChange={event => setName(event.target.value)} required maxLength={200} /></label>
      <label className="inline-label">Yêu cầu đồng thuận <Switch checked={consent} onChange={setConsent} /></label>
      <div className="actions"><button type="button" onClick={() => setAdding(false)}>Hủy</button><button type="submit">Lưu</button></div>
    </form></div></div>}
    <DeleteDialog open={deleting !== null} entityName={deleting?.name ?? 'dịch vụ'} onCancel={() => setDeleting(null)} onConfirm={remove} />
  </section>;
}
