import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configureOpenApi(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Dental ERP API')
    .setDescription(
      'REST API cho hệ thống quản trị phòng khám nha khoa. API được nhóm theo tag để đồng bộ thành module trong APIdog.',
    )
    .setVersion('1.0.0')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, documentFactory, {
    useGlobalPrefix: true,
    jsonDocumentUrl: 'openapi.json',
    customSiteTitle: 'Dental ERP API Docs',
    explorer: true,
  });
}
