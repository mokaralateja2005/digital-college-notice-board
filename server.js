const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config/supabase');
const handleApiRoute = require('./routes/api');
const frontendDirectory = path.join(__dirname, '..', 'frontend');

const publicFiles = new Map([
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/styles.css', 'styles.css'],
  ['/script.js', 'script.js']
]);

function serveStatic(request, response, pathname) {
  const fileName = publicFiles.get(pathname);
  if (!fileName) {
    response.writeHead(404);
    return response.end('Not found');
  }

  const filePath = path.join(frontendDirectory, fileName);
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500);
      return response.end('Not found');
    }

    const contentTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8'
    };
    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath)],
      'X-Content-Type-Options': 'nosniff'
    });
    response.end(request.method === 'HEAD' ? undefined : content);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (pathname.startsWith('/api/')) {
    await handleApiRoute(request, response, pathname);
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    return response.end('Method not allowed');
  }

  serveStatic(request, response, pathname);
});

server.listen(config.port, () => {
  console.log(`Campus Notice Board is listening on port ${config.port}.`);
  if (!config.staffKey) console.warn('Set STAFF_API_KEY to enable staff changes.');
  if (!config.supabaseUrl || !config.serviceRoleKey) {
    console.warn('Set Supabase environment variables to enable the notice database.');
  }
});
