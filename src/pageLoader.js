import axios from 'axios';
import { addLogger } from 'axios-debug-log';
import { program } from 'commander';
import fs from 'node:fs/promises';
import path from 'node:path';
import loadResources from './loadResources.js';
import { toLocalFilename } from './utils.js';

addLogger(axios);

const action = () => {


    program.name('page-loader')
        .description('Downloads a page and its resources')
        .version('0.0.1')
        .argument('<url>')
        .option('-o, --output <dir>', 'output dir', process.cwd())
        .action(async (url, options) => {
            try {
                const filePath = await pageLoader(url, options.output);
                console.log(`Page was downloaded as '${filePath}'`);
            } catch (error) {
                console.error(error.message);
                process.exit(1);
            }
        })
        .parse();
};

export const pageLoader = async (url, outputDir = process.cwd()) => {
    const pageUrl = new URL(url);
    const base = toLocalFilename(url);
    const htmlFileName = `${base}.html`;
    const filesDirName = `${base}_files`;
    const filesDirPath = path.join(outputDir, filesDirName);

    await fs.mkdir(filesDirPath, { recursive: true });

    const { data: html } = await axios.get(url);
    const newHtml = await loadResources(html, pageUrl, filesDirPath, filesDirName);

    const outputPath = path.join(outputDir, htmlFileName);
    await fs.writeFile(outputPath, newHtml);

    return outputPath;
};

export default action;
