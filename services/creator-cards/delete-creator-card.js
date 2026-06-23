const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const { CreatorCardMessages } = require('@app/messages');
const CreatorCardRepo = require('@app/repository/creator-cards');

const spec = `root {
  slug string
  creator_reference string<length:20>
}`;
const parsedSpec = validator.parse(spec);

function serializeCard(card, { includeAccessCode = false } = {}) {
  const obj = card.toObject ? card.toObject() : { ...card };
  const { _id, access_code: accessCode, ...rest } = obj;
  const result = { id: _id, ...rest };
  if (includeAccessCode) result.access_code = accessCode ?? null;
  return result;
}

async function deleteCreatorCard(serviceData, options = {}) {
  const data = validator.validate(serviceData, parsedSpec);
  let response;

  try {
    const card = await CreatorCardRepo.findOne({ query: { slug: data.slug, deleted: null } });
    if (!card) {
      throwAppError(CreatorCardMessages.CARD_NOT_FOUND, ERROR_CODE.NF01);
    }

    // set deleted timestamp
    await CreatorCardRepo.deleteOne({ query: { slug: data.slug } });

    // Return the card using the original data with the deleted timestamp
    card.deleted = Date.now();
    response = serializeCard(card, { includeAccessCode: true });
  } catch (error) {
    appLogger.errorX(error, 'delete-creator-card-error');
    throw error;
  }

  return response;
}

module.exports = deleteCreatorCard;
