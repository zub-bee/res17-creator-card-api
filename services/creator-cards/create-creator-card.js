const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const { CreatorCardMessages } = require('@app/messages');
const CreatorCardRepo = require('@app/repository/creator-cards');

const spec = `root {
  title string<trim|minLength:3|maxLength:100>
  description? string<trim|maxLength:500>
  slug? string<trim|minLength:5|maxLength:50>
  creator_reference string<length:20>
  links[]? {
    title string<trim|minLength:1|maxLength:100>
    url string<trim|maxLength:200>
  }
  service_rates? {
    currency string(NGN|USD|GBP|GHS)
    rates[] {
      name string<trim|minLength:3|maxLength:100>
      description? string<trim|maxLength:250>
      amount number<min:1>
    }
  }
  status string(draft|published)
  access_type? string(public|private)
  access_code? string<length:6>
}`;

const parsedSpec = validator.parse(spec);

// Get DB doc to response
function serializeCard(card, { includeAccessCode = false } = {}) {
  const obj = card.toObject ? card.toObject() : { ...card };
  const { _id, access_code: accessCode, ...rest } = obj;
  const result = { id: _id, ...rest };
  if (includeAccessCode) result.access_code = accessCode ?? null;
  return result;
}

async function createCreatorCard(serviceData, options = {}) {
  const data = validator.validate(serviceData, parsedSpec);
  let response;

  try {
    // Validate access
    if (data.access_type === 'private' && !data.access_code) {
      throwAppError(CreatorCardMessages.ACCESS_CODE_REQUIRED, ERROR_CODE.AC01);
    }
    if ((data.access_type === 'public' || !data.access_type) && data.access_code) {
      throwAppError(CreatorCardMessages.ACCESS_CODE_NOT_ALLOWED, ERROR_CODE.AC05);
    }

    // Handle slug
    let { slug } = data;
    if (!slug) {
      slug = data.title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-_]/g, '');
    }

    // Check slug uniqueness
    const existing = await CreatorCardRepo.findOne({ query: { slug, deleted: null } });
    if (existing) {
      if (data.slug) {
        throwAppError(CreatorCardMessages.SLUG_TAKEN, ERROR_CODE.SL02);
      } else {
        const suffix = Math.random().toString(36).substring(2, 8);
        slug = `${slug}-${suffix}`;
      }
    }

    // Fix auto-generated slug if it's too short
    if (!data.slug && slug.length < 5) {
      const suffix = Math.random().toString(36).substring(2, 8);
      slug = `${slug}-${suffix}`;
    }

    // Build the card
    const now = Date.now();
    const cardData = {
      title: data.title,
      description: data.description || null,
      slug,
      creator_reference: data.creator_reference,
      links: data.links || [],
      service_rates: data.service_rates || null,
      status: data.status,
      access_type: data.access_type || 'public',
      access_code: data.access_code || null,
    };

    // Save to DB
    const card = await CreatorCardRepo.create(cardData);

    // map _id → id
    response = serializeCard(card, { includeAccessCode: true });
  } catch (error) {
    appLogger.errorX(error, 'create-creator-card-error');
    throw error;
  }

  return response;
}

module.exports = createCreatorCard;
