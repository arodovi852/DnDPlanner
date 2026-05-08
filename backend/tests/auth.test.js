/**
 * Integration tests for the authentication and profile endpoints.
 *
 * Covers:
 *   - register / login (with both email and username) / failed login
 *   - /me with and without token
 *   - profile updates including the privacy toggle
 *   - public profile lookup including the private-profile gate
 *   - password change re-issuing tokens
 *   - follow / unfollow / following / followers
 */
const request = require('supertest');
const buildApp = require('../src/app');

const app = buildApp({ enableRateLimit: false });

const credentialsA = {
  username: 'alice_dm',
  email: 'alice@example.com',
  password: 'sup3rs3cret',
};
const credentialsB = {
  username: 'bob_player',
  email: 'bob@example.com',
  password: 'anotherp4ss',
};

async function register(creds) {
  const res = await request(app).post('/api/auth/register').send(creds);
  expect(res.status).toBe(201);
  return res.body.data;
}

async function login(creds) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ identifier: creds.email, password: creds.password });
  expect(res.status).toBe(200);
  return res.body.data;
}

describe('POST /api/auth/register', () => {
  it('creates a user and returns tokens', async () => {
    const data = await register(credentialsA);
    expect(data.user.username).toBe(credentialsA.username);
    expect(data.user.email).toBe(credentialsA.email);
    expect(data.user).not.toHaveProperty('password');
    expect(data.accessToken).toMatch(/\S+\.\S+\.\S+/);
    expect(data.refreshToken).toMatch(/\S+\.\S+\.\S+/);
  });

  it('rejects duplicate emails', async () => {
    await register(credentialsA);
    const res = await request(app).post('/api/auth/register').send(credentialsA);
    expect(res.status).toBe(400);
  });

  it('rejects invalid passwords (too short)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...credentialsA, password: '123' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await register(credentialsA);
  });

  it('logs in with email', async () => {
    const data = await login(credentialsA);
    expect(data.accessToken).toBeDefined();
  });

  it('logs in with username', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: credentialsA.username, password: credentialsA.password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: credentialsA.email, password: 'wrong' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user with a valid token', async () => {
    const { accessToken, user } = await register(credentialsA);
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user._id).toBe(user._id);
  });

  it('rejects missing tokens with 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/auth/me (profile updates)', () => {
  it('updates description and isPrivate', async () => {
    const { accessToken } = await register(credentialsA);
    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ description: 'I love dragons', isPrivate: true });
    expect(res.status).toBe(200);
    expect(res.body.data.user.description).toBe('I love dragons');
    expect(res.body.data.user.isPrivate).toBe(true);
  });
});

describe('PUT /api/auth/change-password', () => {
  it('changes password and returns new tokens', async () => {
    const { accessToken } = await register(credentialsA);
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: credentialsA.password,
        newPassword: 'brandnewp4ss',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();

    // The new password works for login.
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: credentialsA.email, password: 'brandnewp4ss' });
    expect(loginRes.status).toBe(200);
  });

  it('rejects wrong current password', async () => {
    const { accessToken } = await register(credentialsA);
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'wrong', newPassword: 'brandnewp4ss' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/users/:id (public profile)', () => {
  it('returns a public profile when the target is not private', async () => {
    const a = await register(credentialsA);
    const res = await request(app).get(`/api/auth/users/${a.user._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe(credentialsA.username);
  });

  it('hides a private profile from anonymous viewers', async () => {
    const a = await register(credentialsA);
    await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ isPrivate: true });

    const res = await request(app).get(`/api/auth/users/${a.user._id}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PRIVATE_PROFILE');
  });

  it('lets the user view their own private profile', async () => {
    const a = await register(credentialsA);
    await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ isPrivate: true });

    const res = await request(app)
      .get(`/api/auth/users/${a.user._id}`)
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/auth/users/search', () => {
  it('skips private users for unrelated viewers', async () => {
    const a = await register(credentialsA);
    const b = await register(credentialsB);
    await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${b.accessToken}`)
      .send({ isPrivate: true });

    const res = await request(app)
      .get('/api/auth/users/search?q=bob')
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.users).toEqual([]);
  });
});

describe('Follows', () => {
  it('follow + unfollow + lists', async () => {
    const a = await register(credentialsA);
    const b = await register(credentialsB);

    const followRes = await request(app)
      .post(`/api/follows/${b.user._id}`)
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(followRes.status).toBe(201);

    const followingRes = await request(app)
      .get('/api/follows/me/following')
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(followingRes.body.data.users).toHaveLength(1);
    expect(followingRes.body.data.users[0].username).toBe(credentialsB.username);

    const followersRes = await request(app)
      .get('/api/follows/me/followers')
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(followersRes.body.data.users).toHaveLength(1);

    const unfollowRes = await request(app)
      .delete(`/api/follows/${b.user._id}`)
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(unfollowRes.status).toBe(200);

    const after = await request(app)
      .get('/api/follows/me/following')
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(after.body.data.users).toHaveLength(0);
  });

  it('rejects self-follow', async () => {
    const a = await register(credentialsA);
    const res = await request(app)
      .post(`/api/follows/${a.user._id}`)
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(res.status).toBe(400);
  });

  it('is idempotent on duplicate follow', async () => {
    const a = await register(credentialsA);
    const b = await register(credentialsB);
    const first = await request(app)
      .post(`/api/follows/${b.user._id}`)
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(first.status).toBe(201);
    const second = await request(app)
      .post(`/api/follows/${b.user._id}`)
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(second.status).toBe(200);
  });
});
