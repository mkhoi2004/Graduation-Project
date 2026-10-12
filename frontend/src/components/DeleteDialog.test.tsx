import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeleteDialog } from './DeleteDialog';

describe('DeleteDialog', () => {
  it('does not delete without a reason', async () => {
    const onConfirm = vi.fn();
    render(<DeleteDialog open entityName="bệnh nhân" onCancel={() => {}} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: /xác nhận xóa/i }));
    expect(await screen.findByText(/cần lý do/i)).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
