import axios from 'axios';
import { addLogger } from 'axios-debug-log';
import { program } from 'commander';
import Listr from 'listr';
import fs from 'node:fs/promises';
import path from 'node:path';
import loadResources from './loadResources.js';
import { getErrorMessage, toLocalFilename } from './utils.js';

addLogger(axios);

export const action = () => {


    program.name('page-loader')
        .description('Downloads a page and its resources')
        .version('0.0.1')
        .argument('<url>')
        .option('-o, --output <dir>', 'output dir', process.cwd())
        .action(async (url, options) => {
            pageLoader(url, options.output)
                .then((filePath) => {
                    console.log(`Page was downloaded as '${filePath}'`);
                })
                .catch((error) => {
                    console.error(error.message);
                    process.exitCode = 1;
                });
        })
        .parse();
};

export const pageLoader = async (url, outputDir = process.cwd()) => {
    let pageUrl;
    try {
        pageUrl = new URL(url);
    } catch {
        throw new Error(`Invalid URL: ${url}`);
    }
    const base = toLocalFilename(url);
    const htmlFileName = `${base}.html`;
    const filesDirName = `${base}_files`;
    const filesDirPath = path.join(outputDir, filesDirName);
    const outputPath = path.join(outputDir, htmlFileName);

    const stat = await fs.stat(outputDir).catch(() => {
        throw new Error(`Output directory does not exist: ${outputDir}`);
    });
    if (!stat.isDirectory()) {
        throw new Error(`Output path is not a directory: ${outputDir}`);
    }

    const tasks = new Listr([
        {
            title: `Downloading page ${url}`,
            task: async (ctx) => {
                return axios.get(url)
                    .then(({data}) => {
                        ctx.html = data;
                    }).catch((error) => {
                        throw new Error(`Failed to download ${url}: ${getErrorMessage(error)}`, { cause: error });
                    });
            },
        },
        {
            title: 'Downloading resources',
            task: (ctx) => fs.mkdir(filesDirPath, { recursive: true })
                .then(() => loadResources(ctx.html, pageUrl, filesDirPath, filesDirName))
                .then((html) => {
                    ctx.html = html;
                }),
        },
        {
            title: 'Writing page',
            task: (ctx) => {
                return fs.writeFile(outputPath, ctx.html);
            },
        },
    ], { renderer: process.env.NODE_ENV === 'test' ? 'silent' : 'default' });

    return tasks.run()
        .then(() => outputPath);
};

export default pageLoader;
