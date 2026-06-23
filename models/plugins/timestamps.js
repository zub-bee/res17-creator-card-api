/**
 * Mongoose plugin to add created and updated timestamps as Unix timestamps (numbers)
 * @param {import('mongoose').Schema} schema
 */
function timestampsPlugin(schema) {
  schema.add({
    created: { type: Number },
    updated: { type: Number },
    deleted: { type: Number, default: 0 },
  });

  schema.pre('save', function (next) {
    const now = Date.now();
    this.updated = now;
    if (this.isNew || !this.created) {
      this.created = now;
    }
    next();
  });
}

module.exports = timestampsPlugin;
