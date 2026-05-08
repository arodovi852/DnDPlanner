/**
 * Additional integration tests for `/api/campaigns/*` to lift the
 * controller coverage above the smoke-test baseline. Focuses on:
 *   - public listing (includes ownerProfile, hides private campaigns)
 *   - clone of private campaigns (forbidden vs allowed)
 *   - view-token revoke flow
 *   - 404 paths (invalid id, unknown token, unknown campaign)
 *   - delete RBAC (player cannot delete)
 *   - update permissions for chapters/characters but not members (player)
 */
const request = require('supertest');
const buildApp = require('../src/app');

const app = buildApp({ enableRateLimit: false });

const dmCreds = {
  username: 'extra_dm',
  email: 'extra-dm@example.com',
  password: 'dmpassword',
};
const playerCreds = {
  username: 'extra_player',
  email: 'extra-player@example.com',
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

async function createCampaign(token, body) {
  const res = await request(app)
    .post('/api/campaigns')
    .set('Authorization', `Bearer ${token}`)
    .send(body);
  expect(res.status).toBe(201);
  return res.body.data.campaign;
}

describe('GET /api/campaigns/public', () => {
  it('lists only campaigns marked public and embeds ownerProfile', async () => {
    const { dm, player } = await setup();
    await createCampaign(dm.accessToken, { name: 'Hidden', visibility: 'private' });
    await createCampaign(dm.accessToken, { name: 'Visible', visibility: 'public' });

    const res = await request(app)
      .get('/api/campaigns/public')
      .set('Authorization', `Bearer ${player.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.campaigns).toHaveLength(1);
    const c = res.body.data.campaigns[0];
    expect(c.name).toBe('Visible');
    expect(c.ownerProfile).not.toBeNull();
    expect(c.ownerProfile.username).toBe(dmCreds.username);
  });

  it('returns an empty list when there are no public campaigns', async () => {
    const { dm } = await setup();
    await createCampaign(dm.accessToken, { name: 'Private only' });
    const res = await request(app)
      .get('/api/campaigns/public')
      .set('Authorization', `Bearer ${dm.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.campaigns).toEqual([]);
  });
});

describe('POST /api/campaigns/:id/clone', () => {
  it('refuses to clone a private campaign you do not belong to', async () => {
    const { dm, player } = await setup();
    const c = await createCampaign(dm.accessToken, {
      name: 'Secret',
      visibility: 'private',
    });
    const res = await request(app)
      .post(`/api/campaigns/${c.id}/clone`)
      .set('Authorization', `Bearer ${player.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('lets a member clone their own private campaign', async () => {
    const { dm } = await setup();
    const c = await createCampaign(dm.accessToken, {
      name: 'Mine',
      visibility: 'private',
    });
    const res = await request(app)
      .post(`/api/campaigns/${c.id}/clone`)
      .set('Authorization', `Bearer ${dm.accessToken}`);
    expect(res.status).toBe(201);
    expect(res.body.data.campaign.name).toBe('Mine (clone)');
  });

  it('returns 404 for an unknown campaign', async () => {
    const { dm } = await setup();
    const res = await request(app)
      .post('/api/campaigns/507f1f77bcf86cd799439099/clone')
      .set('Authorization', `Bearer ${dm.accessToken}`);
    expect(res.status).toBe(404);
  });
});

describe('View token lifecycle', () => {
  it('revoking the view token blocks subsequent reads', async () => {
    const { dm, player } = await setup();
    const c = await createCampaign(dm.accessToken, { name: 'Watch this' });

    const tok = await request(app)
      .post(`/api/campaigns/${c.id}/view-token`)
      .set('Authorization', `Bearer ${dm.accessToken}`);
    const token = tok.body.data.viewToken;

    const okRead = await request(app)
      .get(`/api/campaigns/by-view-token/${token}`)
      .set('Authorization', `Bearer ${player.accessToken}`);
    expect(okRead.status).toBe(200);

    await request(app)
      .delete(`/api/campaigns/${c.id}/view-token`)
      .set('Authorization', `Bearer ${dm.accessToken}`);

    const blocked = await request(app)
      .get(`/api/campaigns/by-view-token/${token}`)
      .set('Authorization', `Bearer ${player.accessToken}`);
    expect(blocked.status).toBe(404);
  });
});

describe('Access errors', () => {
  it('GET /campaigns/:id with an invalid mongo id returns 400', async () => {
    const { dm } = await setup();
    const res = await request(app)
      .get('/api/campaigns/not-a-mongo-id')
      .set('Authorization', `Bearer ${dm.accessToken}`);
    expect(res.status).toBe(400);
  });

  it('GET /campaigns/:id with an unknown id returns 404', async () => {
    const { dm } = await setup();
    const res = await request(app)
      .get('/api/campaigns/507f1f77bcf86cd799439099')
      .set('Authorization', `Bearer ${dm.accessToken}`);
    expect(res.status).toBe(404);
  });

  it('player cannot delete the campaign', async () => {
    const { dm, player } = await setup();
    const c = await createCampaign(dm.accessToken, { name: 'Cannot drop' });

    // Add the player as a member first.
    await request(app)
      .post(`/api/campaigns/${c.id}/members`)
      .set('Authorization', `Bearer ${dm.accessToken}`)
      .send({ userId: player.user._id, role: 'player' });

    const res = await request(app)
      .delete(`/api/campaigns/${c.id}`)
      .set('Authorization', `Bearer ${player.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('GET share-token / view-token with unknown tokens returns 404', async () => {
    const { dm } = await setup();
    const a = await request(app)
      .get('/api/campaigns/by-share-token/does-not-exist')
      .set('Authorization', `Bearer ${dm.accessToken}`);
    expect(a.status).toBe(404);
    const b = await request(app)
      .get('/api/campaigns/by-view-token/does-not-exist')
      .set('Authorization', `Bearer ${dm.accessToken}`);
    expect(b.status).toBe(404);
  });
});

describe('Update flow', () => {
  it('co-DM can edit chapters and characters but a plain player cannot', async () => {
    const { dm, player } = await setup();
    const c = await createCampaign(dm.accessToken, { name: 'Edit me' });

    // Add the player as co-DM.
    await request(app)
      .post(`/api/campaigns/${c.id}/members`)
      .set('Authorization', `Bearer ${dm.accessToken}`)
      .send({ userId: player.user._id, role: 'co-dm' });

    const ok = await request(app)
      .put(`/api/campaigns/${c.id}`)
      .set('Authorization', `Bearer ${player.accessToken}`)
      .send({
        chapters: [
          {
            id: 'ch-1',
            title: 'Co-DM chapter',
            events: { blocks: [], connections: [] },
            map: { cells: {}, cols: 8, rows: 8 },
          },
        ],
      });
    expect(ok.status).toBe(200);
    expect(ok.body.data.campaign.chapters[0].title).toBe('Co-DM chapter');

    // Demote to player.
    await request(app)
      .put(`/api/campaigns/${c.id}/members/${player.user._id}`)
      .set('Authorization', `Bearer ${dm.accessToken}`)
      .send({ role: 'player' });

    const denied = await request(app)
      .put(`/api/campaigns/${c.id}`)
      .set('Authorization', `Bearer ${player.accessToken}`)
      .send({ name: 'Player cannot rename' });
    expect(denied.status).toBe(403);
  });

  it('preserves the owner as DM even when the body would remove them', async () => {
    const { dm } = await setup();
    const c = await createCampaign(dm.accessToken, { name: 'Owner persists' });

    const res = await request(app)
      .put(`/api/campaigns/${c.id}`)
      .set('Authorization', `Bearer ${dm.accessToken}`)
      .send({ members: [] });

    expect(res.status).toBe(200);
    const owner = res.body.data.campaign.members.find(
      (m) => m.userId === dm.user._id
    );
    expect(owner).toBeDefined();
    expect(owner.role).toBe('dm');
  });
});

describe('Refresh + logout flow', () => {
  it('refresh token issues a new access token', async () => {
    const { dm } = await setup();
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: dm.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toMatch(/\S+\.\S+\.\S+/);
  });

  it('logout invalidates the refresh token', async () => {
    const { dm } = await setup();
    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${dm.accessToken}`);
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: dm.refreshToken });
    expect(res.status).toBe(401);
  });
});
