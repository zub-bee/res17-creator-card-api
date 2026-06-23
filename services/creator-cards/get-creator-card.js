const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const { CreatorCardMessages } = require('@app/messages');
const CreatorCardRepo = require('@app/repository/creator-cards');

const spec = `root {
  slug string
  access_code? string
}`;
const parsedSpec = validator.parse(spec);

function serializeCard(card, { includeAccessCode = false } = {}) {
  const obj = card.toObject ? card.toObject() : { ...card };
  const { _id, access_code: accessCode, ...rest } = obj;
  const result = { id: _id, ...rest };
  if (includeAccessCode) result.access_code = accessCode ?? null;
  return result;
}

async function getCreatorCard(serviceData, options = {}) {
  const data = validator.validate(serviceData, parsedSpec);
  let response;

  try {
    // Rule 1: Does card exist and is it not deleted?
    const card = await CreatorCardRepo.findOne({ query: { slug: data.slug, deleted: null } });
    if (!card) {
      throwAppError(CreatorCardMessages.CARD_NOT_FOUND, ERROR_CODE.NF01);
    }

    // Rule 2: Is it a draft?
    if (card.status === 'draft') {
      throwAppError(CreatorCardMessages.CARD_IS_DRAFT, ERROR_CODE.NF02);
    }

    // Rule 3 & 4: Is it private?
    if (card.access_type === 'private') {
      if (!data.access_code) {
        throwAppError(CreatorCardMessages.CARD_IS_PRIVATE, ERROR_CODE.AC03);
      }
      if (data.access_code !== card.access_code) {
        throwAppError(CreatorCardMessages.INVALID_ACCESS_CODE, ERROR_CODE.AC04);
      }
    }

    // access_code is NEVER returned in GET responses
    response = serializeCard(card, { includeAccessCode: false });
  } catch (error) {
    appLogger.errorX(error, 'get-creator-card-error');
    throw error;
  }

  return response;
}

module.exports = getCreatorCard;
