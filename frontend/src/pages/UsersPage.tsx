import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Button, Select, Table, Tag, Typography } from 'antd';
import { apiError, userApi } from '../services/api';

type UserRow = { id: number; username: string; displayName: string; isActive: boolean };
type Role = { id: number; code: string; name: string };
export function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  async function load() { try { const [users, roleList] = await Promise.all([userApi.list(), userApi.roles()]); setRows(users); setRoles(roleList); } catch (cause) { setError(apiError(cause).message); } }
  useEffect(() => { void load(); }, []);
  async function save(event: FormEvent) {
    event.preventDefault(); setError('');
    if (password.length <= 8 || !/[^\p{L}\p{N}\s]/u.test(password)) {
      setError('Mật khẩu phải có hơn 8 ký tự và ít nhất một ký tự đặc biệt.');
      return;
    }
    try { await userApi.create({ username: username.trim(), displayName: displayName.trim(), password, roles: selectedRoles }); setAdding(false); setPassword(''); await load(); }
    catch (cause) { setError(apiError(cause).message); }
  }
  return <section className="page">
    <div className="page-heading"><Typography.Title level={2}>Người dùng & phân quyền</Typography.Title><Button type="primary" onClick={() => setAdding(true)}>Thêm người dùng</Button></div>
    {error && <Alert type="error" message={error} showIcon />}
    <Table rowKey="id" dataSource={rows} pagination={false} columns={[
      { title: 'Mã', dataIndex: 'id' }, { title: 'Tài khoản', dataIndex: 'username' }, { title: 'Tên hiển thị', dataIndex: 'displayName' },
      { title: 'Trạng thái', dataIndex: 'isActive', render: value => value ? <Tag color="green">Hoạt động</Tag> : <Tag>Đã khóa</Tag> }
    ]} />
    {adding && <div className="modal-backdrop"><div className="modal-card"><h2>Thêm người dùng</h2><form className="stack" onSubmit={save}>
      <label>Tài khoản <input value={username} onChange={event => setUsername(event.target.value)} required minLength={3} maxLength={100} /></label>
      <label>Tên hiển thị <input value={displayName} onChange={event => setDisplayName(event.target.value)} required maxLength={150} /></label>
      <label>Mật khẩu <input type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={9} /></label>
      <label>Vai trò <Select mode="multiple" value={selectedRoles} onChange={setSelectedRoles} options={roles.map(role => ({ value: role.code, label: role.name }))} /></label>
      <div className="actions"><button type="button" onClick={() => setAdding(false)}>Hủy</button><button type="submit">Lưu</button></div>
    </form></div></div>}
  </section>;
}
