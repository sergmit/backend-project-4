import * as cheerio from 'cheerio';
import path from "path";
import axios from "axios";
import fs from "node:fs/promises";

const clearUrl = (url) => {
    return url.replace(/^[^:]+:\/\//, "").replace(/[^\w]/g, '-');
}

const createImgFilename = (filename, host) => {
    const urlParsed = URL.parse(filename);
    host = urlParsed.host ?? host;
    const fullName = host + urlParsed.pathname;
    const parsedFilename = path.parse(fullName);
    return clearUrl(parsedFilename.dir + '/' + parsedFilename.name) + parsedFilename.ext;
}

export default (html, host, fileDir) => {
    const $ = cheerio.load(html);
    return Promise.all($('img').map((i, el) => {
        let img = $(el).attr('src')
        if (URL.parse(img).host === '') {
            img = host + img;
        }
        const file = createImgFilename(img, host);
        return axios.get(img, {responseType: 'arraybuffer'})
            .then((data) => {

                return (new Blob([data.data])).arrayBuffer()
            }).then(arrayBuffer => {
            const buffer = Buffer.from(arrayBuffer);
            return fs.writeFile(path.join(fileDir, file), buffer);
        }).then(() => {
            $(el).attr('src', path.join(fileDir, file))
        }).catch((e) => {
            console.log('error', e.message);
            return null;
        })
    }))
        .then(() => {
            const html = $.html();
            console.log(html);
            return html;
        })
}