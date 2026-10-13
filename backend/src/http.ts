import { ArgumentsHost, BadRequestException, Catch, ConflictException, ExceptionFilter, HttpException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { pageOptions, safeId } from './validation.js';
import type { ArchiveResult } from './archive.js';

export function routeId(value: unknown): number {
  try { return safeId(value); } catch { throw new BadRequestException('ID không hợp lệ.'); }
}
export function paging(page: unknown, size: unknown) {
  try { return pageOptions(page, size); } catch { throw new BadRequestException('Phân trang không hợp lệ.'); }
}
export function ensureValid(errors: Record<string, string[]>): void {
  if (Object.keys(errors).length) throw new BadRequestException({ title: 'Dữ liệu không hợp lệ.', errors });
}
export function deleted(result: ArchiveResult): void {
  if (result === 'notFound') throw new NotFoundException();
  if (result === 'conflict') throw new ConflictException('Chỉ xóa lượt chưa bắt đầu.');
}

export function sqlErrorStatus(error: unknown): number {
  const sqlError = error as { number?: number; precedingErrors?: Array<{ number?: number }>; originalError?: { number?: number } } | null;
  const numbers = [sqlError?.number, sqlError?.originalError?.number,
    ...(sqlError?.precedingErrors ?? []).map(previous => previous.number)];
  if (numbers.includes(229)) return 403;
  if (numbers.some(number => number === 2601 || number === 2627 || number === 547 ||
      (number != null && number >= 51000 && number <= 51999))) return 409;
  return 500;
}

@Catch()
@Injectable()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);
  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (error instanceof HttpException) {
      response.status(error.getStatus()).json(error.getResponse());
      return;
    }
    const status = sqlErrorStatus(error);
    if (status === 403) { response.status(403).json({ title: 'Không có quyền thực hiện.' }); return; }
    if (status === 409) {
      response.status(409).json({ title: 'Xung đột dữ liệu hoặc bản ghi đang được tham chiếu.' });
      return;
    }
    const sqlFailure = error as { number?: number; code?: string; precedingErrors?: Array<{ number?: number }>;
      originalError?: { number?: number; errors?: Array<{ code?: number }> } };
    this.logger.error(`Request failed (${JSON.stringify({ number: sqlFailure?.number, code: sqlFailure?.code,
      preceding: sqlFailure?.precedingErrors?.map(item => item.number),
      original: sqlFailure?.originalError?.number,
      odbc: sqlFailure?.originalError?.errors?.map(item => item.code) })})`,
      error instanceof Error ? error.stack : String(error));
    response.status(500).json({ title: 'Lỗi máy chủ.' });
  }
}
