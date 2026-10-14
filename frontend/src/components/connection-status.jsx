import { Tag } from 'antd';

export function ConnectionStatus({ query, successLabel = 'Đã kết nối' }) {
  if (query.isFetching) return <Tag color="processing">Đang kiểm tra</Tag>;
  if (query.isError) return <Tag color="warning">Chưa sẵn sàng</Tag>;
  if (query.isSuccess) return <Tag color="success">{successLabel}</Tag>;
  return <Tag>Chưa kiểm tra</Tag>;
}
