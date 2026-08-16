import { describe, expect, test } from '@jest/globals';
import { resourceFileName, toLocalFilename } from '../src/utils.js';

describe('toLocalFilename', () => {
    test('удаляет схему и заменяет не-буквенные символы на дефисы', () => {
        expect(toLocalFilename('https://ru.hexlet.io/courses')).toBe('ru-hexlet-io-courses');
    });

    test('обрабатывает корневой путь', () => {
        expect(toLocalFilename('http://localhost:8080/')).toBe('localhost-8080-');
    });
});

describe('resourceFileName', () => {
    test('сохраняет расширение файла', () => {
        expect(resourceFileName('https://ru.hexlet.io/assets/application.css'))
            .toBe('ru-hexlet-io-assets-application.css');
    });

    test('добавляет .html, когда в пути нет расширения', () => {
        expect(resourceFileName('https://ru.hexlet.io/assets/professions/nodejs'))
            .toBe('ru-hexlet-io-assets-professions-nodejs.html');
    });
});
