const { ModelSchema, SchemaTypes, DatabaseModel } = require('@app-core/mongoose');
const timestamps = require('./plugins/timestamps');

const modelName = 'creator_cards';

const schemaConfig = {
  _id: { type: SchemaTypes.ULID },
  title: { type: SchemaTypes.String },
  description: { type: SchemaTypes.String },
  slug: { type: SchemaTypes.String, unique: true, index: true },
  creator_reference: { type: SchemaTypes.String },
  links: { type: SchemaTypes.Mixed },
  service_rates: { type: SchemaTypes.Mixed },
  status: { type: SchemaTypes.String },
  access_type: { type: SchemaTypes.String },
  access_code: { type: SchemaTypes.String },
};

const modelSchema = new ModelSchema(schemaConfig, { collection: modelName });
modelSchema.plugin(timestamps);

module.exports = DatabaseModel.model(modelName, modelSchema, { paranoid: true });
