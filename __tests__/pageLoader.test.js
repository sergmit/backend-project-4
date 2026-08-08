import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from '@jest/globals';
import { pageLoader } from '../src/pageLoader.js';

const FIXTURE_PATH = path.join(import.meta.dirname, '..', '__fixtures__', 'test.html');

const createServer = (handlers) => new Promise((resolve) => {
    const server = http.createServer((req, res) => {
        const handler = handlers[req.url];
        if (!handler) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        handler(res);
    });
    server.listen(0, 'localhost', () => resolve(server));
});

const cleanups = [];

afterEach(async () => {
    while (cleanups.length > 0) {
        const cleanup = cleanups.pop();
        await cleanup();
    }
});

describe('pageLoader', () => {
    test('downloads the page and its local resources, rewriting attributes', async () => {
        const fixture = await fs.readFile(FIXTURE_PATH, 'utf-8');
        const server = await createServer({
            '/courses': (res) => {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(fixture);
            },
            '/assets/application.css': (res) => {
                res.writeHead(200, { 'Content-Type': 'text/css' });
                res.end('body { color: red; }');
            },
            '/assets/professions/nodejs.png': (res) => {
                res.writeHead(200, { 'Content-Type': 'image/png' });
                res.end(Buffer.from('fake-png'));
            },
            '/assets/application.js': (res) => {
                res.writeHead(200, { 'Content-Type': 'application/javascript' });
                res.end('console.log("hello");');
            },
        });
        const port = server.address().port;
        const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
        cleanups.push(() => server.close());
        cleanups.push(() => fs.rm(outputDir, { recursive: true, force: true }));

        const base = `localhost-${port}-courses`;
        const resourceBase = `localhost-${port}`;
        const filePath = await pageLoader(`http://localhost:${port}/courses`, outputDir);

        expect(path.basename(filePath)).toBe(`${base}.html`);

        const html = await fs.readFile(filePath, 'utf-8');
        expect(html).toContain(`src="${base}_files/${resourceBase}-assets-professions-nodejs.png"`);
        expect(html).toContain(`href="${base}_files/${resourceBase}-assets-application.css"`);
        expect(html).toContain(`src="${base}_files/${resourceBase}-assets-application.js"`);

        const resourceNames = [
            `${resourceBase}-assets-professions-nodejs.png`,
            `${resourceBase}-assets-application.css`,
            `${resourceBase}-assets-application.js`,
        ];
        for (const name of resourceNames) {
            const content = await fs.readFile(path.join(outputDir, `${base}_files`, name), 'utf-8');
            expect(content).toBeTruthy();
        }
    });

    test('skips external resources and data urls', async () => {
        const html = `<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="/local.css">
  </head>
  <body>
    <img src="data:image/png;base64,AAAA" alt="inline" />
    <script src="https://example.com/external.js"></script>
    <script src="/local.js"></script>
  </body>
</html>`;
        const server = await createServer({
            '/page': (res) => {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(html);
            },
            '/local.css': (res) => {
                res.writeHead(200, { 'Content-Type': 'text/css' });
                res.end('body {}');
            },
            '/local.js': (res) => {
                res.writeHead(200, { 'Content-Type': 'application/javascript' });
                res.end('const a = 1;');
            },
        });
        const port = server.address().port;
        const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
        cleanups.push(() => server.close());
        cleanups.push(() => fs.rm(outputDir, { recursive: true, force: true }));

        const base = `localhost-${port}-page`;
        const resourceBase = `localhost-${port}`;
        const filePath = await pageLoader(`http://localhost:${port}/page`, outputDir);

        const result = await fs.readFile(filePath, 'utf-8');
        expect(result).toContain('src="data:image/png;base64,AAAA"');
        expect(result).toContain('src="https://example.com/external.js"');
        expect(result).toContain(`href="${base}_files/${resourceBase}-local.css"`);
        expect(result).toContain(`src="${base}_files/${resourceBase}-local.js"`);
    });

    test('rejects when the page cannot be downloaded', async () => {
        const server = await createServer({});
        const port = server.address().port;
        const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
        cleanups.push(() => server.close());
        cleanups.push(() => fs.rm(outputDir, { recursive: true, force: true }));

        await expect(pageLoader(`http://localhost:${port}/missing`, outputDir)).rejects.toThrow();
    });
});
