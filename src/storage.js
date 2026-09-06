const { randomUUID } = require('crypto');

function normalizeEntry(input = {}) {
  const id = input.id || randomUUID();
  const term = String(input.term || input.word || '').trim();
  const meaning = String(input.meaning || input.definition || '').trim();
  const example = String(input.example || '').trim();
  const category = String(input.category || 'general').trim() || 'general';

  return {
    id: String(id),
    term: term || 'Untitled term',
    meaning: meaning || 'No definition provided.',
    example,
    category,
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || new Date().toISOString(),
  };
}

function createVocabularyStore(initialEntries = []) {
  const entries = (initialEntries || []).map((entry) => normalizeEntry(entry));

  return {
    list() {
      return entries.map((entry) => ({ ...entry }));
    },
    get(id) {
      const entry = entries.find((item) => item.id === String(id));
      return entry ? { ...entry } : null;
    },
    create(payload = {}) {
      const nextEntry = normalizeEntry({
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      entries.push(nextEntry);
      return { ...nextEntry };
    },
    update(id, payload = {}) {
      const index = entries.findIndex((item) => item.id === String(id));
      if (index === -1) {
        return null;
      }

      const updated = normalizeEntry({
        ...entries[index],
        ...payload,
        id: String(id),
        updatedAt: new Date().toISOString(),
      });

      entries[index] = updated;
      return { ...updated };
    },
    delete(id) {
      const index = entries.findIndex((item) => item.id === String(id));
      if (index === -1) {
        return false;
      }

      entries.splice(index, 1);
      return true;
    },
  };
}

module.exports = {
  createVocabularyStore,
  normalizeEntry,
};
