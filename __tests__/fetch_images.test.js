import fs from "fs";
import fetch_images from '../src/save_images.js';
import {describe, expect, test} from "@jest/globals";
import path from "path";

describe('fetchImagesFromHtml', () => {
    test('should fetch images from HTML', async () => {
        const html = fs.readFileSync(path.join(import.meta.dirname, '..', '__fixtures__/test.html'), 'utf-8');
        const images = fetch_images(html);
        expect(images[0]).toEqual('/assets/professions/nodejs.png');
    })
})