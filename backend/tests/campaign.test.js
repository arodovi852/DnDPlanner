/**
 * Integration tests for `/api/campaigns/*`.
 *
 * Covers CRUD, sharing tokens, view tokens, clone, members and the
 * RBAC guards (DM/co-DM/owner). Auth helpers are duplicated from the
 * auth tests (one cred set for the DM, one for a player).
 */
const request = require('supertest');
const buildApp = require('../src/app');

const app = buildApp({ enableRateLimit: false });

const dmCreds = {
  username: 'dm_user',
  email: 'dm@example.com',
  password: 'dmpassword',
};
const playerCreds = {
  username: 'player_user',
  email: 'player@example.com',
  password: 'playerpassword',
};

async function register(creds) {
  const res = await request(app).post('/api/auth/register').send(creds);
  expect(res.status).toBe(201);
  return res.body.data;
}

async function setup() {
  const dm = await register(dmCreds);
  const player = await register(playerCreds);
  return { dm, player };
}

describe('POST /api/campaigns', () => {
  it('creates a campaign with the current user as DM', async () => {
    const { dm } = await setup();
    const res = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${dm.accessToken}`)
      .send({ name: 'My first campaign' });

    expect(res.status).toBe(201);
    const c = res.body.data.campaign;
    expect(c.name).toBe('My first campaign');
    expect(c.ownerId).toBe(dm.user._id);
    expect(c.members).toHaveLength(1);
    expect(c.members[0].role).toBe('dm');
  });

  it('rejects empty names', async () => {
    const { dm } = await setup();
    const res = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${dm.accessToken}`)
      .send({ name: '' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/campaigns', () => {
  it('lists only campaigns I own or belong to', async () => {
    const { dm, player } = await setup();
    await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${dm.accessToken}`)
      .send({ name: 'DM-only' });

    const res = await request(app)
      .get('/api/campaigns')
      .set('Authorization', `Bearer ${player.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.campaigns).toHaveLength(0);
  });
});

describe('PUT /api/campaigns/:id', () => {
  it('lets the DM update name and chapters', async () => {
    const { dm } = await setup();
    const created = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${dm.accessToken}`)
      .send({ name: 'Original' });
    const id = created.body.data.campaign.id;

    const res = await request(app)
      .put(`/api/campaigns/${id}`)
      .set('Authorization', `Bearer ${dm.accessToken}`)
      .send({
        name: 'Renamed',
        chapters: [
          {
            id: 'ch-1',
            title: 'First',
            events: { blocks: [], connections: [] },
            map: { cells: {}, cols: 10, rows: 10 },
          },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.data.campaign.name).toBe('Renamed');
    expect(res.body.data.campaign.chapters).toHaveLength(1);
    expect(res.body.data.campaign.chapters[0].title).toBe('First');
  });

  it('rejects updates from non-members', async () => {
    const { dm, player } = await setup();
    const created = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${dm.accessToken}`)
      .send({ name: 'Locked' });
    const id = created.body.data.campaign.id;

    const res = await request(app)
      .put(`/api/campaigns/${id}`)
      .set('Authorization', `Bearer ${player.accessToken}`)
      .send({ name: 'Hijack' });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/campaigns/:id', () => {
  it('lets the owner delete', async () => {
    const { dm } = await setup();
    const created = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${dm.accessToken}`)
      .send({ name: 'Disposable' });
    const id = created.body.data.campaign.id;
    const res = await request(app)
      .delete(`/api/campaigns/${id}`)
      .set('Authorization', `Bearer ${dm.accessToken}`);
    expect(res.status).toBe(200);
  });
});

describe('Sharing tokens (share + view)', () => {
  it('generates a share token and lets a player join via it', async () => {
    const { dm, player } = await setup();
    const created = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${dm.accessToken}`)
      .send({ name: 'Shared' });
    const id = created.body.data.campaign.id;

    const tokenRes = await request(app)
      .post(`/api/campaigns/${id}/share-token`)
      .set('Authorization', `Bearer ${dm.accessToken}`);
    expect(tokenRes.status).toBe(200);
    const token = tokenRes.body.data.shareToken;

    const join = await request(app)
      .post(`/api/campaigns/by-share-token/${token}/join`)
      .set('Authorization', `Bearer ${player.accessToken}`);
    expect(join.status).toBe(200);
    expect(join.body.data.campaign.members).toHaveLength(2);
    expect(
      join.body.data.campaign.members.some((m) => m.role === 'player')
    ).toBe(true);
  });

  it('view token returns a read-only payload to anyone with the token', async () => {
    const { dm, player } = await setup();
    const created = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${dm.accessToken}`)
      .send({ name: 'Viewable' });
    const id = created.body.data.campaign.id;

    const tokenRes = await request(app)
      .post(`/api/campaigns/${id}/view-token`)
      .set('Authorization', `Bearer ${dm.accessToken}`);
    const token = tokenRes.body.data.viewToken;

    const view = await request(app)
      .get(`/api/campaigns/by-view-token/${token}`)
      .set('Authorization', `Bearer ${player.accessToken}`);
    expect(view.status).toBe(200);
    expect(view.body.data.campaign.name).toBe('Viewable');
  });

  it('revoking a share token invalidates further joins', async () => {
    const { dm, player } = await setup();
    const created = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${dm.accessToken}`)
      .send({ name: 'Revoke me' });
    const id = created.body.data.campaign.id;

    const t1 = await request(app)
      .post(`/api/campaigns/${id}/share-token`)
      .set('Authorization', `Bearer ${dm.accessToken}`);
    const token = t1.body.data.shareToken;

    await request(app)
      .delete(`/api/campaigns/${id}/share-token`)
      .set('Authorization', `Bearer ${dm.accessToken}`);

    const join = await request(app)
      .post(`/api/campaigns/by-share-token/${token}/join`)
      .set('Authorization', `Bearer ${player.accessToken}`);
    expect(join.status).toBe(404);
  });
});

describe('POST /api/campaigns/:id/clone', () => {
  it('clones a public campaign as the requester', async () => {
    const { dm, player } = await setup();
    const created = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${dm.accessToken}`)
      .send({ name: 'Public template', visibility: 'public' });
    const id = created.body.data.campaign.id;

    const clone = await request(app)
      .post(`/api/campaigns/${id}/clone`)
      .set('Authorization', `Bearer ${player.accessToken}`);
    expect(clone.status).toBe(201);
    expect(clone.body.data.campaign.ownerId).toBe(player.user._id);
    expect(clone.body.data.campaign.name).toBe('Public template (clone)');
    expect(clone.body.data.campaign.members).toHaveLength(1);
    expect(clone.body.data.campaign.members[0].role).toBe('dm');
  });
});

describe('Members', () => {
  it('owner can add and remove members; players cannot', async () => {
    const { dm, player } = await setup();
    const created = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${dm.accessToken}`)
      .send({ name: 'Crew' });
    const id = created.body.data.campaign.id;

    const add = await request(app)
      .post(`/api/campaigns/${id}/members`)
      .set('Authorization', `Bearer ${dm.accessToken}`)
      .send({ userId: player.user._id, role: 'player' });
    expect(add.status).toBe(200);
    expect(add.body.data.campaign.members).toHaveLength(2);

    // Player tries to add another member → forbidden (not DM/co-DM).
    const wannabeId = '507f1f77bcf86cd799439011';
    const fail = await request(app)
      .post(`/api/campaigns/${id}/members`)
      .set('Authorization', `Bearer ${player.accessToken}`)
      .send({ userId: wannabeId, role: 'player' });
    expect(fail.status).toBe(403);

    // Player can remove themselves.
    const leave = await request(app)
      .delete(`/api/campaigns/${id}/members/${player.user._id}`)
      .set('Authorization', `Bearer ${player.accessToken}`);
    expect(leave.status).toBe(200);
  });

  it('owner cannot be downgraded from DM', async () => {
    const { dm } = await setup();
    const created = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${dm.accessToken}`)
      .send({ name: 'Owner stays DM' });
    const id = created.body.data.campaign.id;

    const res = await request(app)
      .put(`/api/campaigns/${id}/members/${dm.user._id}`)
      .set('Authorization', `Bearer ${dm.accessToken}`)
      .send({ role: 'player' });
    expect(res.status).toBe(400);
  });
});
