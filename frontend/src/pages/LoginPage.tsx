import { useState, type FormEvent } from 'react';
import { Alert, Button, Card, Input, Typography } from 'antd';
import { apiError, authApi } from '../services/api';
import type { Session } from '../App';

export function LoginPage({ onLogin }: { onLogin: (session: Session, token: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setLoading(true);
    try { const result = await authApi.login(username, password); onLogin({ username: result.username, roles: result.roles }, result.token); }
    catch (cause) { setError(apiError(cause).message); }
    finally { setLoading(false); }
  }
  return <div className="login-screen"><Card className="login-card">
    <Typography.Title level={2}>Quản lý nha khoa</Typography.Title>
    <Typography.Paragraph type="secondary">Đăng nhập để tiếp tục</Typography.Paragraph>
    <form className="stack" onSubmit={submit}>
      <label>Tài khoản <Input value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" required /></label>
      <label>Mật khẩu <Input.Password value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required /></label>
      {error && <Alert type="error" message={error} showIcon />}
      <Button type="primary" htmlType="submit" loading={loading} block>Đăng nhập</Button>
    </form>
  </Card></div>;
}
