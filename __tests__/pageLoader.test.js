import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from '@jest/globals';
import nock from 'nock';
import { pageLoader } from '../src/pageLoader.js';

const FIXTURE_PATH = path.join(import.meta.dirname, '..', '__fixtures__', 'test.html');

nock.disableNetConnect();

afterEach(() => {
    nock.cleanAll();
});

const createTempDir = () => fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));

describe('pageLoader', () => {
    test('downloads the page and its local resources, rewriting attributes', async () => {
        const fixture = await fs.readFile(FIXTURE_PATH, 'utf-8');

        nock('http://localhost')
            .get('/courses')
            .reply(200, fixture, { 'Content-Type': 'text/html' });
        nock('http://localhost')
            .get('/assets/application.css')
            .reply(200, 'body { color: red; }', { 'Content-Type': 'text/css' });
        nock('http://localhost')
            .get('/assets/professions/nodejs.png')
            .reply(200, Buffer.from('fake-png'), { 'Content-Type': 'image/png' });
        nock('http://localhost')
            .get('/assets/application.js')
            .reply(200, 'console.log("hello");', { 'Content-Type': 'application/javascript' });

        const outputDir = await createTempDir();

        const base = 'localhost-courses';
        const resourceBase = 'localhost';
        const filePath = await pageLoader('http://localhost/courses', outputDir);

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
        nock('http://localhost')
            .get('/page')
            .reply(200, html, { 'Content-Type': 'text/html' });
        nock('http://localhost')
            .get('/local.css')
            .reply(200, 'body {}', { 'Content-Type': 'text/css' });
        nock('http://localhost')
            .get('/local.js')
            .reply(200, 'const a = 1;', { 'Content-Type': 'application/javascript' });

        const outputDir = await createTempDir();

        const base = 'localhost-page';
        const resourceBase = 'localhost';
        const filePath = await pageLoader('http://localhost/page', outputDir);

        const result = await fs.readFile(filePath, 'utf-8');
        expect(result).toContain('src="data:image/png;base64,AAAA"');
        expect(result).toContain('src="https://example.com/external.js"');
        expect(result).toContain(`href="${base}_files/${resourceBase}-local.css"`);
        expect(result).toContain(`src="${base}_files/${resourceBase}-local.js"`);
    });

    test('rejects when the page cannot be downloaded', async () => {
        nock('http://localhost')
            .get('/missing')
            .reply(404);

        const outputDir = await createTempDir();

        await expect(pageLoader('http://localhost/missing', outputDir)).rejects.toThrow();
    });
});
