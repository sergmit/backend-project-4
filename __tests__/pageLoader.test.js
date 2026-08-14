import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, jest, test } from '@jest/globals';
import axios from 'axios';
import nock from 'nock';
import { pageLoader } from '../src/pageLoader.js';

const FIXTURE_PATH = path.join(import.meta.dirname, '..', '__fixtures__', 'test.html');
const EXTERNAL_FIXTURE_PATH = path.join(import.meta.dirname, '..', '__fixtures__', 'external-resources.html');

nock.disableNetConnect();

afterEach(() => {
    nock.cleanAll();
    nock.disableNetConnect();
});

const createTempDir = () => fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));

describe('pageLoader', () => {
    test('скачивает страницу и локальные ресурсы, переписывая атрибуты', async () => {
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

    test('пропускает внешние ресурсы и data-ссылки', async () => {
        const html = await fs.readFile(EXTERNAL_FIXTURE_PATH, 'utf-8');

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

    test('отклоняет промис, когда страницу не удаётся скачать', async () => {
        nock('http://localhost')
            .get('/missing')
            .reply(404);

        const outputDir = await createTempDir();

        await expect(pageLoader('http://localhost/missing', outputDir))
            .rejects.toThrow(/Failed to download http:\/\/localhost\/missing: 404/);
    });

    test('отклоняет промис с ENOTFOUND, когда хост не резолвится', async () => {
        const error = new Error('getaddrinfo ENOTFOUND localhost');
        error.code = 'ENOTFOUND';
        const getSpy = jest.spyOn(axios, 'get').mockRejectedValue(error);

        const outputDir = await createTempDir();

        try {
            await expect(pageLoader('http://localhost/page', outputDir))
                .rejects.toThrow(/ENOTFOUND/);
        } finally {
            getSpy.mockRestore();
        }
    });

    test('отклоняет промис, когда выходная директория не существует', async () => {
        const outputDir = path.join(os.tmpdir(), 'no-such-dir-page-loader');

        await expect(pageLoader('http://localhost/page', outputDir))
            .rejects.toThrow(`Output directory does not exist: ${outputDir}`);
    });

    test('отклоняет промис, когда выходной путь — файл, а не директория', async () => {
        const tempDir = await createTempDir();
        const outputDir = path.join(tempDir, 'file');
        await fs.writeFile(outputDir, 'not a directory');

        await expect(pageLoader('http://localhost/page', outputDir))
            .rejects.toThrow(`Output path is not a directory: ${outputDir}`);
    });

    test('использует process.cwd() как выходную директорию по умолчанию', async () => {
        const html = await fs.readFile(EXTERNAL_FIXTURE_PATH, 'utf-8');

        nock('http://localhost')
            .get('/page')
            .reply(200, html, { 'Content-Type': 'text/html' });
        nock('http://localhost')
            .get('/local.css')
            .reply(200, 'body {}', { 'Content-Type': 'text/css' });
        nock('http://localhost')
            .get('/local.js')
            .reply(200, 'const a = 1;', { 'Content-Type': 'application/javascript' });

        const cwd = await createTempDir();
        const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(cwd);

        try {
            const filePath = await pageLoader('http://localhost/page');

            expect(path.basename(filePath)).toBe('localhost-page.html');
            await expect(fs.readFile(filePath, 'utf-8')).resolves.toBeTruthy();
        } finally {
            cwdSpy.mockRestore();
        }
    });

    test('отклоняет промис, когда опция вывода пуста', async () => {
        await expect(pageLoader('http://localhost/page', ''))
            .rejects.toThrow('Output directory does not exist');
    });
});
