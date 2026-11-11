#!/usr/bin/env node
// serve: a tiny static file server for trying a 3D page on your own computer.
//
// Why it exists: browsers refuse to load JavaScript modules and model files
// from a page opened by double-clicking it (a file:// address). A web page that
// imports a scene module, or loads a .glb file, needs to be served.
//
// What it does: serves ONE folder, read-only, on 127.0.0.1 (your own computer
// only, not your network). It has no dependencies and sends nothing anywhere.
// It is meant for local testing, not for hosting a site.
//
// Usage:   node serve.mjs <folder> [--port 5173]
// Stop:    press Ctrl+C

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
};

/** Turn a request address into a file inside the root folder, or null if it points outside it. */
export function resolveRequest(root, requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  } catch {
    return null;
  }
  const target = path.resolve(root, `.${pathname}`);
  const relative = path.relative(root, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return target;
}

export function createServer(root) {
  const base = path.resolve(root);
  return http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed');
      return;
    }
    let file = resolveRequest(base, req.url ?? '/');
    if (!file) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    try {
      if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      const body = fs.readFileSync(file);
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  });
}

function main(argv) {
  const portFlag = argv.indexOf('--port');
  const port = portFlag >= 0 ? Number(argv[portFlag + 1]) : 5173;
  const folder = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--port');
  if (!folder || !Number.isInteger(port) || port < 1 || port > 65535 || argv.includes('--help')) {
    console.error('Usage: node serve.mjs <folder> [--port 5173]');
    return 2;
  }
  if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
    console.error(`"${folder}" is not a folder.`);
    return 2;
  }
  const server = createServer(folder);
  server.on('error', (error) => {
    console.error(`Could not start the server: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Serving ${path.resolve(folder)}`);
    console.log(`Open http://127.0.0.1:${port}/  (only this computer can reach it). Press Ctrl+C to stop.`);
  });
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const code = main(process.argv.slice(2));
  if (code !== 0) process.exitCode = code;
}
