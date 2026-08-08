import { describe, expect, test } from '@jest/globals';
import { resourceFileName, toLocalFilename } from '../src/utils.js';

describe('toLocalFilename', () => {
    test('removes scheme and replaces non-word characters with dashes', () => {
        expect(toLocalFilename('https://ru.hexlet.io/courses')).toBe('ru-hexlet-io-courses');
    });

    test('handles root path', () => {
        expect(toLocalFilename('http://localhost:8080/')).toBe('localhost-8080-');
    });
});

describe('resourceFileName', () => {
    test('keeps the file extension', () => {
        expect(resourceFileName('https://ru.hexlet.io/assets/application.css')).toBe('ru-hexlet-io-assets-application.css');
    });

    test('adds .html when the path has no extension', () => {
        expect(resourceFileName('https://ru.hexlet.io/assets/professions/nodejs')).toBe('ru-hexlet-io-assets-professions-nodejs.html');
    });
});
