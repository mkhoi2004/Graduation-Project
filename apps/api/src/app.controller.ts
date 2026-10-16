import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Kiểm tra trạng thái dịch vụ' })
  @ApiOkResponse({
    description: 'API đang hoạt động',
    schema: {
      example: { service: 'dental-erp-api', status: 'ok' },
    },
  })
  getHealth(): { service: string; status: string } {
    return this.appService.getHealth();
  }
}
