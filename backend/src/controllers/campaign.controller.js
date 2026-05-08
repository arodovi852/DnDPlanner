const crypto = require('crypto');
const { Campaign } = require('../models');
const { ApiError } = require('../middlewares');

/**
 * Campaign controller.
 *
 * The Campaign document embeds chapters, characters, members, annotations
 * and the events graph + tactical map. Most mutations therefore go
 * through `PUT /api/campaigns/:id` with the full payload — the frontend
 * already keeps a denormalised tree in memory and debounces this write.
 *
 * Sharing and view-only links are token-based: the DM generates an
 * opaque token, the URL is shared, and either:
 *   - `POST /campaigns/by-share-token/:token/join` adds the requester as
 *     a `player`,
 *   - `GET  /campaigns/by-view-token/:token` returns a read-only copy.
 */

const generateToken = () =>
  crypto.randomBytes(16).toString('hex');

// Helper: ensure the requester is owner or DM/co-DM. We use `req.campaign`
// which the access middleware loads.
function assertCanEdit(req) {
  if (!req.campaign.canEdit(req.user.id)) {
    throw new ApiError(403, 'Only the DM or co-DM can edit this campaign');
  }
}

function assertIsOwner(req) {
  if (String(req.campaign.ownerId) !== String(req.user.id)) {
    throw new ApiError(403, 'Only the campaign owner can perform this action');
  }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

const getCampaigns = async (req, res, next) => {
  try {
    // Mine = I'm the owner OR I'm a member.
    const campaigns = await Campaign.find({
      $or: [{ ownerId: req.user.id }, { 'members.userId': req.user.id }],
    }).sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: { campaigns: campaigns.map((c) => c.toFrontendJSON()) },
    });
  } catch (error) {
    next(error);
  }
};

const getCampaign = async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) throw new ApiError(404, 'Campaign not found');
    if (!campaign.hasAccess(req.user.id) && campaign.visibility !== 'public') {
      throw new ApiError(403, 'Access denied');
    }
    res.json({
      success: true,
      data: { campaign: campaign.toFrontendJSON() },
    });
  } catch (error) {
    next(error);
  }
};

const createCampaign = async (req, res, next) => {
  try {
    const {
      name,
      templateId,
      chapters,
      characters,
      image,
      visibility,
    } = req.body;

    const campaign = await Campaign.create({
      name: (name || '').trim() || 'Untitled Campaign',
      templateId: templateId ?? null,
      ownerId: req.user.id,
      chapters: chapters ?? [],
      characters: characters ?? [],
      image: image ?? null,
      visibility: visibility ?? 'private',
      members: [
        {
          userId: req.user.id,
          role: 'dm',
          joinedAt: new Date(),
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Campaign created',
      data: { campaign: campaign.toFrontendJSON() },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Full-document update.
 *
 * Accepts the same shape that `toFrontendJSON()` produces. We never trust
 * the client's `ownerId`, `_id`, `createdAt`, or `members[].joinedAt`
 * (those are server-managed). Members can only be added/removed/updated
 * by the owner — players cannot demote the DM.
 */
const updateCampaign = async (req, res, next) => {
  try {
    assertCanEdit(req);
    const c = req.campaign;
    const body = req.body || {};

    if (typeof body.name === 'string') c.name = body.name.trim() || c.name;
    if (body.image !== undefined) c.image = body.image;
    if (body.visibility && ['public', 'private'].includes(body.visibility)) {
      c.visibility = body.visibility;
    }
    if (Array.isArray(body.chapters)) c.chapters = body.chapters;
    if (Array.isArray(body.characters)) c.characters = body.characters;
    if (Array.isArray(body.annotations)) c.annotations = body.annotations;
    if (Array.isArray(body.revealedSpoilers)) {
      c.revealedSpoilers = body.revealedSpoilers;
    }

    // Members: only the owner can change membership; keep the existing
    // list otherwise so a player can save other parts of the document.
    if (Array.isArray(body.members) && String(c.ownerId) === String(req.user.id)) {
      // Always preserve owner as DM at minimum.
      const cleaned = body.members.filter((m) => m.userId);
      const ownerInList = cleaned.some(
        (m) => String(m.userId) === String(c.ownerId)
      );
      c.members = ownerInList
        ? cleaned
        : [
            ...cleaned,
            { userId: c.ownerId, role: 'dm', joinedAt: new Date() },
          ];
    }

    await c.save();
    res.json({
      success: true,
      message: 'Campaign updated',
      data: { campaign: c.toFrontendJSON() },
    });
  } catch (error) {
    next(error);
  }
};

const deleteCampaign = async (req, res, next) => {
  try {
    assertIsOwner(req);
    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Sharing tokens
// ---------------------------------------------------------------------------

const generateShareToken = async (req, res, next) => {
  try {
    assertCanEdit(req);
    req.campaign.shareToken = generateToken();
    await req.campaign.save();
    res.json({
      success: true,
      data: { shareToken: req.campaign.shareToken },
    });
  } catch (error) {
    next(error);
  }
};

const revokeShareToken = async (req, res, next) => {
  try {
    assertCanEdit(req);
    req.campaign.shareToken = null;
    await req.campaign.save();
    res.json({ success: true, message: 'Share token revoked' });
  } catch (error) {
    next(error);
  }
};

const generateViewToken = async (req, res, next) => {
  try {
    assertCanEdit(req);
    req.campaign.viewToken = generateToken();
    await req.campaign.save();
    res.json({
      success: true,
      data: { viewToken: req.campaign.viewToken },
    });
  } catch (error) {
    next(error);
  }
};

const revokeViewToken = async (req, res, next) => {
  try {
    assertCanEdit(req);
    req.campaign.viewToken = null;
    await req.campaign.save();
    res.json({ success: true, message: 'View token revoked' });
  } catch (error) {
    next(error);
  }
};

const getByShareToken = async (req, res, next) => {
  try {
    const campaign = await Campaign.findOne({ shareToken: req.params.token });
    if (!campaign) throw new ApiError(404, 'Invitation not found');
    res.json({
      success: true,
      data: { campaign: campaign.toFrontendJSON() },
    });
  } catch (error) {
    next(error);
  }
};

const getByViewToken = async (req, res, next) => {
  try {
    const campaign = await Campaign.findOne({ viewToken: req.params.token });
    if (!campaign) throw new ApiError(404, 'View link not found');
    res.json({
      success: true,
      data: { campaign: campaign.toFrontendJSON() },
    });
  } catch (error) {
    next(error);
  }
};

const acceptInvite = async (req, res, next) => {
  try {
    const campaign = await Campaign.findOne({ shareToken: req.params.token });
    if (!campaign) throw new ApiError(404, 'Invitation not found');

    const alreadyMember = campaign.members.some(
      (m) => String(m.userId) === String(req.user.id)
    );
    if (!alreadyMember) {
      campaign.members.push({
        userId: req.user.id,
        role: 'player',
        joinedAt: new Date(),
      });
      await campaign.save();
    }
    res.json({
      success: true,
      message: alreadyMember ? 'Already a member' : 'Joined campaign',
      data: { campaign: campaign.toFrontendJSON() },
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Public templates and clone
// ---------------------------------------------------------------------------

const getPublicCampaigns = async (req, res, next) => {
  try {
    const campaigns = await Campaign.find({ visibility: 'public' })
      .populate('ownerId', 'username avatar')
      .sort({ updatedAt: -1 })
      .limit(60);
    res.json({
      success: true,
      data: {
        campaigns: campaigns.map((c) => {
          const json = c.toFrontendJSON();
          // Add the resolved owner profile inline so the templates page
          // can render usernames without a second round-trip.
          json.ownerProfile = c.ownerId
            ? {
                id: String(c.ownerId._id ?? c.ownerId),
                username: c.ownerId.username,
                avatar: c.ownerId.avatar,
              }
            : null;
          return json;
        }),
      },
    });
  } catch (error) {
    next(error);
  }
};

const cloneCampaign = async (req, res, next) => {
  try {
    const source = await Campaign.findById(req.params.id);
    if (!source) throw new ApiError(404, 'Campaign not found');
    if (source.visibility !== 'public' && !source.hasAccess(req.user.id)) {
      throw new ApiError(403, 'Access denied');
    }

    const cloneData = source.toObject();
    delete cloneData._id;
    delete cloneData.id;
    delete cloneData.createdAt;
    delete cloneData.updatedAt;
    delete cloneData.shareToken;
    delete cloneData.viewToken;

    const clone = await Campaign.create({
      ...cloneData,
      name: `${source.name} (clone)`,
      ownerId: req.user.id,
      visibility: 'private',
      templateSource: source._id,
      members: [
        { userId: req.user.id, role: 'dm', joinedAt: new Date() },
      ],
      annotations: [],
      revealedSpoilers: [],
    });

    res.status(201).json({
      success: true,
      message: 'Campaign cloned',
      data: { campaign: clone.toFrontendJSON() },
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

const addMember = async (req, res, next) => {
  try {
    assertCanEdit(req);
    const { userId, role = 'player', characterId } = req.body;
    if (!userId) throw new ApiError(400, 'userId is required');

    const exists = req.campaign.members.some(
      (m) => String(m.userId) === String(userId)
    );
    if (!exists) {
      req.campaign.members.push({
        userId,
        role,
        characterId,
        joinedAt: new Date(),
      });
      await req.campaign.save();
    }
    res.json({
      success: true,
      data: { campaign: req.campaign.toFrontendJSON() },
    });
  } catch (error) {
    next(error);
  }
};

const updateMember = async (req, res, next) => {
  try {
    assertIsOwner(req);
    const { role, characterId } = req.body;
    const member = req.campaign.members.find(
      (m) => String(m.userId) === String(req.params.userId)
    );
    if (!member) throw new ApiError(404, 'Member not found');
    // The owner must always remain DM.
    if (
      String(member.userId) === String(req.campaign.ownerId) &&
      role &&
      role !== 'dm'
    ) {
      throw new ApiError(400, 'Owner role cannot be downgraded');
    }
    if (role) member.role = role;
    if (characterId !== undefined) member.characterId = characterId;
    await req.campaign.save();
    res.json({
      success: true,
      data: { campaign: req.campaign.toFrontendJSON() },
    });
  } catch (error) {
    next(error);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const targetId = req.params.userId;
    const isSelf = String(targetId) === String(req.user.id);
    const isOwnerActing = String(req.campaign.ownerId) === String(req.user.id);
    if (!isSelf && !isOwnerActing) {
      throw new ApiError(403, 'Only the owner can remove other members');
    }
    if (String(targetId) === String(req.campaign.ownerId)) {
      throw new ApiError(400, 'The owner cannot leave their own campaign');
    }
    req.campaign.members = req.campaign.members.filter(
      (m) => String(m.userId) !== String(targetId)
    );
    await req.campaign.save();
    res.json({
      success: true,
      data: { campaign: req.campaign.toFrontendJSON() },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  generateShareToken,
  revokeShareToken,
  generateViewToken,
  revokeViewToken,
  getByShareToken,
  getByViewToken,
  acceptInvite,
  getPublicCampaigns,
  cloneCampaign,
  addMember,
  updateMember,
  removeMember,
};
