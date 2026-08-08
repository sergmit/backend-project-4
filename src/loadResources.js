import * as cheerio from 'cheerio';
import path from 'node:path';
import axios from 'axios';
import fs from 'node:fs/promises';
import { resourceFileName } from './utils.js';

const RESOURCE_TAGS = {
    img: 'src',
    script: 'src',
    link: 'href',
};

const SKIPPED_PREFIXES = ['data:', '#', 'mailto:', 'tel:', 'javascript:'];

const isLocalUrl = (resourceUrl, pageUrl) => resourceUrl.origin === pageUrl.origin;

const downloadResource = (resourceUrl, fileDir, filename) => (
    axios.get(resourceUrl.href, { responseType: 'arraybuffer' })
        .then(({ data }) => fs.writeFile(path.join(fileDir, filename), Buffer.from(data)))
);

export default (html, pageUrl, fileDir, filesDirName) => {
    const $ = cheerio.load(html);
    const tasks = [];

    $('img[src], script[src], link[href]').each((_, el) => {
        const tag = $(el).prop('tagName').toLowerCase();
        const attribute = RESOURCE_TAGS[tag];
        const attrValue = $(el).attr(attribute);

        if (!attrValue || SKIPPED_PREFIXES.some((prefix) => attrValue.startsWith(prefix))) {
            return;
        }

        let resourceUrl;
        try {
            resourceUrl = new URL(attrValue, pageUrl);
        } catch {
            return;
        }

        if (!isLocalUrl(resourceUrl, pageUrl)) {
            return;
        }

        const filename = resourceFileName(resourceUrl);
        tasks.push(
            downloadResource(resourceUrl, fileDir, filename)
                .then(() => {
                    $(el).attr(attribute, `${filesDirName}/${filename}`);
                })
                .catch((error) => {
                    console.log(`Failed to download ${resourceUrl.href}: ${error.message}`);
                }),
        );
    });

    return Promise.all(tasks).then(() => $.html());
};
