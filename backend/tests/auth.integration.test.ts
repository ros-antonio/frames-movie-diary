import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, resetStore } from './testUtils.js';
import { prisma } from '../src/repositories/prismaClient.js';

describe('auth API', () => {
  beforeEach(async () => {
    await resetStore();
  });

  it('registers and logs in a user', async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Tony Stark',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.user).toMatchObject({
      name: 'Tony Stark',
      email: 'tony@example.com',
      role: 'USER',
    });
    expect(registerResponse.body.user.id).toBeTypeOf('string');
    expect(registerResponse.body.token).toBeTypeOf('string');
    expect(registerResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('frames_auth=')]),
    );

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'TONY@EXAMPLE.COM',
      password: 'password123',
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.user).toMatchObject({
      id: registerResponse.body.user.id,
      name: 'Tony Stark',
      email: 'tony@example.com',
      role: 'USER',
    });
    expect(loginResponse.body.token).toBeTypeOf('string');
    expect(loginResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('frames_auth=')]),
    );
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

  it('rejects login when stored hash is malformed', async () => {
    const register = await request(app).post('/api/auth/register').send({
      name: 'Tony',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    const userId = register.body.user.id as string;
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: 'abcd' },
    });

    const response = await request(app).post('/api/auth/login').send({
      email: 'tony@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid email or password');
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

  it('clears the auth cookie on logout', async () => {
    const response = await request(app).post('/api/auth/logout').send();

    expect(response.status).toBe(204);
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('frames_auth=;')]),
    );
  });

  it('returns the authenticated session user from the auth cookie', async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Tony Stark',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    const sessionResponse = await request(app)
      .get('/api/auth/session')
      .set('Cookie', registerResponse.headers['set-cookie']);

    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.body).toEqual({
      user: expect.objectContaining({
        id: registerResponse.body.user.id,
        name: 'Tony Stark',
        email: 'tony@example.com',
        role: 'USER',
      }),
    });
  });

  it('rejects unauthenticated session lookup', async () => {
    const response = await request(app).get('/api/auth/session');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Authentication required: Missing or invalid token');
  });
});

