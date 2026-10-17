const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');
const { AppModule } = require('../apps/api/dist/app.module.js');
const { configureApp } = require('../apps/api/dist/app.setup.js');

async function testApi() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter());
  configureApp(app);
  await app.init();

  const server = app.getHttpServer();
  const request = require('supertest');

  // Login as doctor
  const loginRes = await request(server)
    .post('/api/auth/login')
    .send({ username: 'doctor', password: 'Dental@123' });
  
  console.log('Login status:', loginRes.status);
  const token = loginRes.body.accessToken;
  console.log('User role:', loginRes.body.user);

  // Test rooms
  const roomsRes = await request(server)
    .get('/api/doctor/rooms')
    .set('Authorization', `Bearer ${token}`);
  console.log('Rooms status:', roomsRes.status, 'body:', roomsRes.body);

  // Test supplies
  const suppliesRes = await request(server)
    .get('/api/doctor/supplies')
    .set('Authorization', `Bearer ${token}`);
  console.log('Supplies status:', suppliesRes.status, 'count:', suppliesRes.body.length);
  console.log('Sample supply:', suppliesRes.body[0]);

  // Test current
  const currentRes = await request(server)
    .get('/api/doctor/current')
    .set('Authorization', `Bearer ${token}`);
  console.log('Current status:', currentRes.status, 'body:', currentRes.body);

  // Test queue
  const queueRes = await request(server)
    .get('/api/doctor/queue?roomCode=room-01')
    .set('Authorization', `Bearer ${token}`);
  console.log('Queue status:', queueRes.status, 'count:', queueRes.body.length);

  await app.close();
}

testApi().catch(console.error);
