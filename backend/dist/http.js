var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ApiExceptionFilter_1;
import { BadRequestException, Catch, ConflictException, HttpException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { pageOptions, safeId } from './validation.js';
export function routeId(value) {
    try {
        return safeId(value);
    }
    catch {
        throw new BadRequestException('ID không hợp lệ.');
    }
}
export function paging(page, size) {
    try {
        return pageOptions(page, size);
    }
    catch {
        throw new BadRequestException('Phân trang không hợp lệ.');
    }
}
export function ensureValid(errors) {
    if (Object.keys(errors).length)
        throw new BadRequestException({ title: 'Dữ liệu không hợp lệ.', errors });
}
export function deleted(result) {
    if (result === 'notFound')
        throw new NotFoundException();
    if (result === 'conflict')
        throw new ConflictException('Chỉ xóa lượt chưa bắt đầu.');
}
export function sqlErrorStatus(error) {
    const sqlError = error;
    const numbers = [sqlError?.number, sqlError?.originalError?.number,
        ...(sqlError?.precedingErrors ?? []).map(previous => previous.number)];
    if (numbers.includes(229))
        return 403;
    if (numbers.some(number => number === 2601 || number === 2627 || number === 547 ||
        (number != null && number >= 51000 && number <= 51999)))
        return 409;
    return 500;
}
let ApiExceptionFilter = ApiExceptionFilter_1 = class ApiExceptionFilter {
    logger = new Logger(ApiExceptionFilter_1.name);
    catch(error, host) {
        const response = host.switchToHttp().getResponse();
        if (error instanceof HttpException) {
            response.status(error.getStatus()).json(error.getResponse());
            return;
        }
        const status = sqlErrorStatus(error);
        if (status === 403) {
            response.status(403).json({ title: 'Không có quyền thực hiện.' });
            return;
        }
        if (status === 409) {
            response.status(409).json({ title: 'Xung đột dữ liệu hoặc bản ghi đang được tham chiếu.' });
            return;
        }
        const sqlFailure = error;
        this.logger.error(`Request failed (${JSON.stringify({ number: sqlFailure?.number, code: sqlFailure?.code,
            preceding: sqlFailure?.precedingErrors?.map(item => item.number),
            original: sqlFailure?.originalError?.number,
            odbc: sqlFailure?.originalError?.errors?.map(item => item.code) })})`, error instanceof Error ? error.stack : String(error));
        response.status(500).json({ title: 'Lỗi máy chủ.' });
    }
};
ApiExceptionFilter = ApiExceptionFilter_1 = __decorate([
    Catch(),
    Injectable()
], ApiExceptionFilter);
export { ApiExceptionFilter };
