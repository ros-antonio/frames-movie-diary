import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, resetStore } from './testUtils.js';

describe('auth API', () => {
  beforeEach(() => {
    resetStore();
  });

  it('registers and logs in a user', async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Tony Stark',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body).toMatchObject({
      name: 'Tony Stark',
      email: 'tony@example.com',
    });
    expect(registerResponse.body.id).toBeTypeOf('string');

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'TONY@EXAMPLE.COM',
      password: 'password123',
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toMatchObject({
      id: registerResponse.body.id,
      name: 'Tony Stark',
      email: 'tony@example.com',
    });
  });

  it('rejects duplicate registration by email', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Tony',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    const duplicate = await request(app).post('/api/auth/register').send({
      name: 'Anthony',
      email: 'TONY@EXAMPLE.COM',
      password: 'password123',
      confirmPassword: 'password123',
    });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.message).toBe('Email already registered');
  });

  it('rejects invalid login credentials', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Tony',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    const wrongPassword = await request(app).post('/api/auth/login').send({
      email: 'tony@example.com',
      password: 'wrong123',
    });

    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.message).toBe('Invalid email or password');

    const unknownUser = await request(app).post('/api/auth/login').send({
      email: 'missing@example.com',
      password: 'password123',
    });

    expect(unknownUser.status).toBe(401);
    expect(unknownUser.body.message).toBe('Invalid email or password');
  });

  it('rejects invalid registration payload', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'x',
      email: 'invalid-email',
      password: '123',
      confirmPassword: '456',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed');
  });
});

