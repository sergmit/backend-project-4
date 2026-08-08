import path from 'path';

export const toLocalFilename = (url) => {
    const { host, pathname } = new URL(url);
    return `${host}${pathname}`.replace(/[^\w]/g, '-');
};

export const resourceFileName = (resourceUrl) => {
    const { host, pathname } = new URL(resourceUrl);
    const { dir, name, ext } = path.posix.parse(pathname);
    const cleanName = `${host}${path.posix.join(dir, name)}`.replace(/[^\w]/g, '-');
    return ext ? `${cleanName}${ext}` : `${cleanName}.html`;
};
