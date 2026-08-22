import fs from 'node:fs/promises';
import path from 'node:path';
import axios from 'axios';
import { addLogger } from 'axios-debug-log';
import { program } from 'commander';
import Listr from 'listr';
import loadResources from './loadResources.js';
import { getErrorMessage, toLocalFilename } from './utils.js';

addLogger(axios);

const parseUrl = (value) => {
    try {
        return new URL(value);
    } catch {
        throw new Error(`Invalid URL: ${value}`);
    }
};

export const pageLoader = (url, outputDir = process.cwd()) => {
    const tasks = new Listr([
        {
            title: `Downloading page ${url}`,
            task: (ctx) => {
                ctx.pageUrl = parseUrl(url);
                const base = toLocalFilename(url);
                ctx.filesDirName = `${base}_files`;
                ctx.filesDirPath = path.join(outputDir, ctx.filesDirName);
                ctx.outputPath = path.join(outputDir, `${base}.html`);

                return axios.get(url)
                    .then(({ data }) => {
                        ctx.html = data;
                    })
                    .catch((error) => Promise.reject(
                        new Error(`Failed to download ${url}: ${getErrorMessage(error)}`, { cause: error }),
                    ));
            },
        },
        {
            title: 'Downloading resources',
            task: (ctx) => fs.mkdir(ctx.filesDirPath, { recursive: true })
                .then(() => loadResources(ctx.html, ctx.pageUrl, ctx.filesDirPath, ctx.filesDirName))
                .then((html) => {
                    ctx.html = html;
                }),
        },
        {
            title: 'Writing page',
            task: (ctx) => fs.writeFile(ctx.outputPath, ctx.html),
        },
    ], { renderer: process.env.NODE_ENV === 'test' ? 'silent' : 'default' });

    return fs.stat(outputDir)
        .catch(() => Promise.reject(new Error(`Output directory does not exist: ${outputDir}`)))
        .then((stat) => {
            if (!stat.isDirectory()) {
                return Promise.reject(new Error(`Output path is not a directory: ${outputDir}`));
            }
            return tasks.run()
                .then((ctx) => ctx.outputPath);
        });
};

export const action = () => {
    program.name('page-loader')
        .description('Downloads a page and its resources')
        .version('0.0.1')
        .argument('<url>')
        .option('-o, --output <dir>', 'output dir', process.cwd())
        .action((url, options) => {
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

export default pageLoader;
