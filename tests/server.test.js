const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../src/server');
const { createVocabularyStore } = require('../src/storage');

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  return { response, payload };
}

test('lists vocabulary entries from the API', async () => {
  const store = createVocabularyStore([
    { id: 'word-1', term: 'resilient', meaning: 'able to recover quickly', category: 'general' },
    { id: 'word-2', term: 'lucid', meaning: 'clear and easy to understand', category: 'academic' },
  ]);

  const app = createServer({ host: '127.0.0.1', port: 0, store });
  await app.listen();

  try {
    const { response, payload } = await requestJson(`http://127.0.0.1:${app.server.address().port}/api/vocabulary`);
    assert.equal(response.status, 200);
    assert.equal(payload.length, 2);
    assert.equal(payload[0].term, 'resilient');
  } finally {
    await app.close();
  }
});

test('creates and updates a vocabulary entry', async () => {
  const store = createVocabularyStore();
  const app = createServer({ host: '127.0.0.1', port: 0, store });
  await app.listen();

  try {
    const created = await requestJson(`http://127.0.0.1:${app.server.address().port}/api/vocabulary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ term: 'ephemeral', meaning: 'lasting for a very short time', category: 'academic' }),
    });

    assert.equal(created.response.status, 201);
    assert.equal(created.payload.term, 'ephemeral');

    const id = created.payload.id;
    const updated = await requestJson(`http://127.0.0.1:${app.server.address().port}/api/vocabulary/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meaning: 'lasting for only a short time', example: 'The memories were ephemeral.' }),
    });

    assert.equal(updated.response.status, 200);
    assert.equal(updated.payload.meaning, 'lasting for only a short time');
    assert.equal(updated.payload.example, 'The memories were ephemeral.');
  } finally {
    await app.close();
  }
});

test('deletes a vocabulary entry', async () => {
  const store = createVocabularyStore([
    { id: 'word-3', term: 'meticulous', meaning: 'showing great attention to detail' },
  ]);

  const app = createServer({ host: '127.0.0.1', port: 0, store });
  await app.listen();

  try {
    const { response } = await requestJson(`http://127.0.0.1:${app.server.address().port}/api/vocabulary/word-3`, {
      method: 'DELETE',
    });

    assert.equal(response.status, 204);
    assert.equal(store.get('word-3'), null);
  } finally {
    await app.close();
  }
});
