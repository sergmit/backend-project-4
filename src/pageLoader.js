import axios from "axios";
import { program } from "commander";
import fs from 'node:fs/promises';
import path from "path";
import save_images from "./save_images.js";

const action = () => {
  program.name('page-loader')
    .description('Page loader utility')
    .version('0.0.1')
    .argument('<url>')
    .option('-o, --output <string>', 'Path output')
    .action(async (url) => {
      console.log(pageLoader(url, program.opts().output))
    })
    program.parse()
}

const clearUrl = (url) => {
    return url.replace(/^[^:]+:\/\//, "").replace(/[^\w]/g, '-');
}

export const pageLoader = (url, output) => {
    const parsedUrl = URL.parse(url);
    const host = parsedUrl.host;
    const base = clearUrl(url);
    const fileName = `${base}.html`;
    const outputPath = path.join(output, fileName);
    const filePath = path.join(output, `${base}_files`);
    fs.access(filePath).then(() => {
        fs.stat(filePath).then((data) => {
            if (data.isDirectory() === false) {
                return fs.mkdir(filePath);
            }
            return true;
        }).catch((e) => {
            console.log(e.message);
            process.exit()
        })
    }).catch(() => {
        return fs.mkdir(filePath);
    })


    axios.get(url).then(({data}) => {
        save_images(data, host, filePath).then(html => {
            fs.writeFile(outputPath, html);
        });
        // const imgFilenames = images.map(item => {
        //     const parsedImg = path.parse(item);
        //     const filename = clearUrl(host + '/' + parsedImg.name) + parsedImg.ext;
        //     return filename;
        // })
        // console.log(imgFilenames);

    });

    return outputPath;
};

export default action;