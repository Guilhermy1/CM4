'use strict';

/** Adapta um Model do Mongoose a interface unica de repositorio. */
function createMongoRepository(name, Model) {
  const out = (doc) => (doc ? doc.toJSON({ virtuals: true }) : null);

  return {
    name,
    mode: 'mongo',
    async find(filter = {}, { sort, limit, skip = 0 } = {}) {
      let q = Model.find(filter).sort(sort || { createdAt: -1 }).skip(skip);
      if (limit) q = q.limit(limit);
      const docs = await q.exec();
      return docs.map(out);
    },
    async findById(id) {
      try {
        return out(await Model.findById(id).exec());
      } catch {
        return null;
      }
    },
    async findOne(filter = {}, { select } = {}) {
      let q = Model.findOne(filter);
      if (select) q = q.select(select);
      return out(await q.exec());
    },
    async create(data) {
      return out(await Model.create(data));
    },
    async updateById(id, patch) {
      try {
        return out(await Model.findByIdAndUpdate(id, patch, { new: true, runValidators: true }).exec());
      } catch {
        return null;
      }
    },
    async deleteById(id) {
      try {
        return out(await Model.findByIdAndDelete(id).exec());
      } catch {
        return null;
      }
    },
    async count(filter = {}) {
      return Model.countDocuments(filter).exec();
    },
    async all() {
      return (await Model.find({}).exec()).map(out);
    }
  };
}

module.exports = { createMongoRepository };
