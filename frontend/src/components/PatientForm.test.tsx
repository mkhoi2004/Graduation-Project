import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PatientForm } from './PatientForm';

describe('PatientForm', () => {
  it('requires a name and birth information before submitting', async () => {
    const onSubmit = vi.fn();
    render(<PatientForm onSubmit={onSubmit} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /lưu/i }));
    expect(await screen.findByText('Cần họ tên.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
