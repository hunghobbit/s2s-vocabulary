const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const { createVocabularyStore } = require('./storage');

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(payload));
}

function parseJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on('data', (chunk) => {
      chunks.push(chunk);
    });

    request.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      const rawBody = Buffer.concat(chunks).toString('utf8');

      try {
        resolve(rawBody ? JSON.parse(rawBody) : {});
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });

    request.on('error', reject);
  });
}

function createServer({ host = '127.0.0.1', port = 3000, store = createVocabularyStore() } = {}) {
  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url, `http://${host}:${port}`);

    if (request.method === 'GET' && requestUrl.pathname === '/') {
      try {
        const html = await fs.readFile(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(html);
        return;
      } catch (error) {
        sendJson(response, 500, { error: 'Unable to load the vocabulary CMS page.' });
        return;
      }
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/vocabulary') {
      sendJson(response, 200, store.list());
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/vocabulary') {
      try {
        const payload = await parseJsonBody(request);
        const entry = store.create(payload);
        sendJson(response, 201, entry);
      } catch (error) {
        sendJson(response, 400, { error: error.message || 'Failed to create vocabulary entry.' });
      }
      return;
    }

    const match = requestUrl.pathname.match(/^\/api\/vocabulary\/(.+)$/);
    if (match) {
      const id = match[1];

      if (request.method === 'GET') {
        const entry = store.get(id);
        if (!entry) {
          sendJson(response, 404, { error: 'Vocabulary entry not found.' });
          return;
        }

        sendJson(response, 200, entry);
        return;
      }

      if (request.method === 'PATCH') {
        try {
          const payload = await parseJsonBody(request);
          const updated = store.update(id, payload);
          if (!updated) {
            sendJson(response, 404, { error: 'Vocabulary entry not found.' });
            return;
          }

          sendJson(response, 200, updated);
        } catch (error) {
          sendJson(response, 400, { error: error.message || 'Failed to update vocabulary entry.' });
        }
        return;
      }

      if (request.method === 'DELETE') {
        const deleted = store.delete(id);
        if (!deleted) {
          sendJson(response, 404, { error: 'Vocabulary entry not found.' });
          return;
        }

        response.writeHead(204);
        response.end();
        return;
      }
    }

    sendJson(response, 404, { error: 'Not found.' });
  });

  return {
    server,
    store,
    listen() {
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => resolve(server.address()));
      });
    },
    close() {
      return new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
  };
}

if (require.main === module) {
  const configuredPort = Number(process.env.PORT || 3000);
  const app = createServer({ host: '0.0.0.0', port: configuredPort });
  app.listen()
    .then(() => {
      console.log(`Vocabulary CMS running at http://0.0.0.0:${configuredPort}`);
    })
    .catch((error) => {
      console.error('Failed to start vocabulary CMS.', error);
      process.exitCode = 1;
    });
}

module.exports = {
  createServer,
};
