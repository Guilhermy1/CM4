'use strict';
const crypto = require('crypto');

const clone = (v) => JSON.parse(JSON.stringify(v));

function matches(doc, filter = {}) {
  return Object.entries(filter).every(([key, cond]) => {
    const value = key.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), doc);
    if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
      if ('$in' in cond) return cond.$in.includes(value);
      if ('$ne' in cond) return value !== cond.$ne;
      if ('$gte' in cond && !(value >= cond.$gte)) return false;
      if ('$lte' in cond && !(value <= cond.$lte)) return false;
      if ('$regex' in cond) return new RegExp(cond.$regex, cond.$options || 'i').test(String(value ?? ''));
      return true;
    }
    return value === cond;
  });
}

function sortDocs(docs, sort) {
  if (!sort) return docs;
  const entries = Object.entries(sort);
  return docs.sort((a, b) => {
    for (const [key, dir] of entries) {
      const av = a[key];
      const bv = b[key];
      if (av === bv) continue;
      return (av > bv ? 1 : -1) * (dir < 0 ? -1 : 1);
    }
    return 0;
  });
}

/**
 * Repositorio em memoria com a mesma interface do repositorio Mongo.
 * Usado quando MONGODB_URI nao esta configurada (modo esboco/demo).
 */
function createMemoryRepository(name, seed = []) {
  const store = new Map();

  const insert = (data) => {
    const _id = data._id || crypto.randomBytes(12).toString('hex');
    const now = new Date().toISOString();
    const doc = { ...clone(data), _id, id: _id, createdAt: data.createdAt || now, updatedAt: now };
    store.set(_id, doc);
    return clone(doc);
  };

  seed.forEach(insert);

  return {
    name,
    mode: 'memory',
    async find(filter = {}, { sort, limit, skip = 0 } = {}) {
      let docs = [...store.values()].filter((d) => matches(d, filter));
      docs = sortDocs(docs, sort || { createdAt: -1 });
      if (skip) docs = docs.slice(skip);
      if (limit) docs = docs.slice(0, limit);
      return clone(docs);
    },
    async findById(id) {
      const doc = store.get(String(id));
      return doc ? clone(doc) : null;
    },
    async findOne(filter = {}) {
      const doc = [...store.values()].find((d) => matches(d, filter));
      return doc ? clone(doc) : null;
    },
    async create(data) {
      return insert(data);
    },
    async updateById(id, patch) {
      const doc = store.get(String(id));
      if (!doc) return null;
      const updated = { ...doc, ...clone(patch), _id: doc._id, id: doc._id, updatedAt: new Date().toISOString() };
      store.set(doc._id, updated);
      return clone(updated);
    },
    async deleteById(id) {
      const doc = store.get(String(id));
      if (!doc) return null;
      store.delete(String(id));
      return clone(doc);
    },
    async count(filter = {}) {
      return [...store.values()].filter((d) => matches(d, filter)).length;
    },
    async all() {
      return clone([...store.values()]);
    }
  };
}

module.exports = { createMemoryRepository };
