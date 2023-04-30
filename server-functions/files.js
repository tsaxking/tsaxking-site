"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openAllInFolder = exports.openAllInFolderSync = exports.fileStream = exports.formatBytes = exports.deleteUpload = exports.getUpload = exports.uploadMultipleFiles = exports.saveUpload = exports.saveTemplate = exports.saveTemplateSync = exports.getTemplate = exports.getTemplateSync = exports.saveJSON = exports.saveJSONSync = exports.getJSON = exports.getJSONSync = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
const pseudo_build_1 = require("../build/pseudo-build");
const node_html_parser_1 = require("node-html-parser");
const v3_1 = require("node-html-constructor/versions/v3");
const callsite_1 = __importDefault(require("callsite"));
// console.log(build);
/**
 * Description placeholder
 *
 * @type {*}
 */
const env = process.argv[2] || 'dev';
/**
 * Gets a json from the jsons folder
 *
 * @export
 * @param {string} file the file name with no extension (ex '/accounts')
 * @returns {*} false if there is an error, otherwise the json
 *
 * @example
 * ```javascript
 * const accounts = getJSON('/accounts');
 * ```
 *
 *
 */
function getJSONSync(file) {
    let p = file;
    if (!file.includes('.json'))
        file += '.json';
    if (!(file.startsWith('.')))
        p = path.resolve('./jsons', file);
    else {
        const stack = (0, callsite_1.default)(), requester = stack[1].getFileName(), requesterDir = path.dirname(requester);
        p = path.resolve(requesterDir, p);
    }
    p = path.resolve(__dirname, p);
    if (!fs.existsSync(p)) {
        console.error('Error reading JSON file: ' + p, 'file does not exist. Input: ', file);
        return false;
    }
    let content = fs.readFileSync(p, 'utf8');
    // remove all /* */ comments
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    // remove all // comments
    content = content.replace(/\/\/ .*/g, '');
    try {
        return JSON.parse(content);
    }
    catch (e) {
        console.error('Error parsing JSON file: ' + file, e);
        return false;
    }
}
exports.getJSONSync = getJSONSync;
;
/**
 * Gets a json from the jsons folder
 *
 * @export
 * @param {string} file the file name with no extension (ex '/accounts')
 * @returns {Promise<any>} false if there is an error, otherwise the json
 *
 * @example
 * ```javascript
 * const accounts = await getJSON('/accounts');
 * ```
 */
function getJSON(file) {
    return new Promise((res, rej) => {
        let p = file;
        if (!file.includes('.json'))
            file += '.json';
        if (!(file.startsWith('.')))
            p = path.resolve('./jsons', file);
        else {
            const stack = (0, callsite_1.default)(), requester = stack[1].getFileName(), requesterDir = path.dirname(requester);
            p = path.resolve(requesterDir, p);
        }
        p = path.resolve(__dirname, p);
        if (!fs.existsSync(p)) {
            console.error('Error reading JSON file: ' + p, 'file does not exist. Input: ', file);
            return false;
        }
        fs.readFile(p, 'utf8', (err, content) => {
            if (err) {
                console.error('Error reading JSON file: ' + file, err);
                return rej(err);
            }
            // remove all /* */ comments
            content = content.replace(/\/\*[\s\S]*?\*\//g, '');
            // remove all // comments
            content = content.replace(/\/\/ .*/g, '');
            try {
                res(JSON.parse(content));
            }
            catch (e) {
                console.error('Error parsing JSON file: ' + file, e);
                res(false);
            }
        });
    });
}
exports.getJSON = getJSON;
/**
 * Saves a json to the jsons folder
 *
 * @export
 * @param {string} file the file name with no extension (ex '/accounts')
 * @param {*} data the data to save
 * @returns {boolean} whether the file was saved successfully
 * If the file is not saved successfully, it will log the error and return false
 *
 *
 */
function saveJSONSync(file, data) {
    let p = file;
    if (!file.includes('.json'))
        file += '.json';
    if (!(file.startsWith('.')))
        p = path.resolve('./jsons', file);
    else {
        const stack = (0, callsite_1.default)(), requester = stack[1].getFileName(), requesterDir = path.dirname(requester);
        p = path.resolve(requesterDir, p);
    }
    p = path.resolve(__dirname, p);
    try {
        JSON.stringify(data);
    }
    catch (e) {
        console.error('Error stringifying JSON file: ' + file, e);
        return false;
    }
    fs.writeFileSync(p, JSON.stringify(data, null, 4), 'utf8');
    return true;
}
exports.saveJSONSync = saveJSONSync;
/**
 * Saves a json to the jsons folder
 *
 * @export
 * @param {string} file the file name with no extension (ex '/accounts')
 * @param {*} data the data to save
 * @returns {Promise<boolean>} whether the file was saved successfully
 * If the file is not saved successfully, it will log the error and return false
 *
 *
 */
function saveJSON(file, data) {
    return new Promise((res, rej) => {
        let p = file;
        if (!file.includes('.json'))
            file += '.json';
        if (!(file.startsWith('.')))
            p = path.resolve('./jsons', file);
        else {
            const stack = (0, callsite_1.default)(), requester = stack[1].getFileName(), requesterDir = path.dirname(requester);
            p = path.resolve(requesterDir, p);
        }
        p = path.resolve(__dirname, p);
        try {
            JSON.stringify(data);
        }
        catch (e) {
            console.error('Error stringifying JSON file: ' + file, e);
            return res(false);
        }
        fs.writeFile(p, JSON.stringify(data, null, 4), 'utf8', err => {
            if (err)
                return rej(err);
            res(true);
        });
    });
}
exports.saveJSON = saveJSON;
/**
 * Builds for development only (Caches)
 *
 * @type {*}
 */
let builds = (0, pseudo_build_1.build)();
const buildJSON = getJSONSync('../build/build.json');
!buildJSON.buildDir.endsWith('/') && (buildJSON.buildDir += '/'); // make sure it ends with a slash 
/**
 * Parses the html and adds the builds
 *
 * @param {string} template
 * @returns {*}
 */
const runBuilds = (template) => {
    const root = (0, node_html_parser_1.parse)(template);
    const insertBefore = (parent, child, before) => {
        parent.childNodes.splice(parent.childNodes.indexOf(before), 0, child);
    };
    switch (env) {
        case 'prod': // production (combine and minify)
            root.querySelectorAll('.developer').forEach(d => d.remove());
            root.querySelectorAll('script').forEach(s => {
                if (!s.attributes.src)
                    return;
                const stream = buildJSON.streams[s.attributes.src];
                if (!stream)
                    return;
                const ext = path.extname(s.attributes.src);
                const name = path.basename(s.attributes.src, ext);
                s.setAttribute('src', `${buildJSON.buildDir}${buildJSON.minify ? name + '.min' + ext : name + ext}`);
                stream.files.forEach(f => {
                    // console.log(f);
                    // find --ignore-build
                    const regex = /--ignore-build\s*/g;
                    if (!regex.test(f))
                        return;
                    // console.log('Includes ignore build', f);
                    f = f.replace('--ignore-build', '').trim();
                    const script = (0, node_html_parser_1.parse)(`<script src="${f.replace('[ts]', '')}"></script>`);
                    // console.log(script.innerHTML);
                    insertBefore(s.parentNode, script, s);
                });
            });
            root.querySelectorAll('link').forEach(l => {
                if (!l.attributes.href)
                    return;
                const stream = buildJSON.streams[l.attributes.href];
                if (!stream)
                    return;
                const ext = path.extname(l.attributes.href);
                const name = path.basename(l.attributes.href, ext);
                l.setAttribute('href', `${buildJSON.buildDir}${buildJSON.minify ? name + '.min' + ext : name + ext}`);
                stream.files.forEach(f => {
                    // console.log(f);
                    // find --ignore-build
                    const regex = /--ignore-build\s*/g;
                    if (!regex.test(f))
                        return;
                    // console.log('Includes ignore build', f);
                    f = f.replace('--ignore-build', '').trim();
                    const link = (0, node_html_parser_1.parse)(`<link rel="stylesheet" href="${f}">`);
                    // console.log(link.innerHTML);
                    insertBefore(l.parentNode, link, l);
                });
            });
            break;
        case 'test': // testing (combine but do not minify)
            root.querySelectorAll('.developer').forEach(d => d.remove());
            root.querySelectorAll('script').forEach(s => {
                if (!s.attributes.src)
                    return;
                const stream = buildJSON.streams[s.attributes.src];
                if (!stream)
                    return;
                s.setAttribute('src', `${buildJSON.buildDir}${s.attributes.src}`);
                stream.files.forEach(f => {
                    // console.log(f);
                    // find --ignore-build
                    const regex = /--ignore-build\s*/g;
                    if (!regex.test(f))
                        return;
                    // console.log('Includes ignore build', f);
                    f = f.replace('--ignore-build', '').trim();
                    const script = (0, node_html_parser_1.parse)(`<script src="${f.replace('[ts]', '')}"></script>`);
                    // console.log(script.innerHTML);
                    insertBefore(s.parentNode, script, s);
                });
            });
            root.querySelectorAll('link').forEach(l => {
                if (!l.attributes.href)
                    return;
                const stream = buildJSON.streams[l.attributes.href];
                if (!stream)
                    return;
                l.setAttribute('href', `${buildJSON.buildDir}${l.attributes.href}`);
                stream.files.forEach(f => {
                    // console.log(f);
                    // find --ignore-build
                    const regex = /--ignore-build\s*/g;
                    if (!regex.test(f))
                        return;
                    // console.log('Includes ignore build', f);
                    f = f.replace('--ignore-build', '').trim();
                    const link = (0, node_html_parser_1.parse)(`<link rel="stylesheet" href="${f}">`);
                    // console.log(link.innerHTML);
                    insertBefore(l.parentNode, link, l);
                });
            });
            break;
        case 'dev': // development (do not combine files)
            Object.keys(builds).forEach(script => {
                if (script.endsWith('.js')) {
                    const scriptTag = root.querySelector(`script[src="${script}"]`);
                    if (!scriptTag)
                        return;
                    builds[script].forEach(build => {
                        const newScript = (0, node_html_parser_1.parse)(`<script src="${build.replace('\\', '')}"></script>`);
                        insertBefore(scriptTag.parentNode, newScript, scriptTag);
                    });
                    scriptTag.remove();
                }
                else if (script.endsWith('.css')) {
                    const linkTag = root.querySelector(`link[href="${script}"]`);
                    if (!linkTag)
                        return;
                    builds[script].forEach(build => {
                        const newLink = (0, node_html_parser_1.parse)(`<link rel="stylesheet" href="${build.replace('\\', '')}">`);
                        insertBefore(linkTag.parentNode, newLink, linkTag);
                    });
                    linkTag.remove();
                }
            });
    }
    return root.toString();
};
const templates = new Map();
/**
 * Gets an html template from the templates folder
 *
 * @export
 * @param {string} file the file name with no extension (ex '/index')
 * @returns {string|boolean} false if there is an error, otherwise the html
 */
function getTemplateSync(file, options) {
    if (templates.has(file)) {
        return templates.get(file);
    }
    let p = file;
    if (!file.includes('.html'))
        file += '.html';
    if (!(file.startsWith('.')))
        p = path.resolve('./templates', file);
    else {
        const stack = (0, callsite_1.default)(), requester = stack[1].getFileName(), requesterDir = path.dirname(requester);
        p = path.resolve(requesterDir, p);
    }
    p = path.resolve(__dirname, p);
    if (!fs.existsSync(p)) {
        console.error(`Template ${p} does not exist. Input:`, file);
        return false;
    }
    let data = fs.readFileSync(p, 'utf8');
    data = runBuilds(data);
    templates.set(file, data);
    return options ? (0, v3_1.render)(data, options) : data;
}
exports.getTemplateSync = getTemplateSync;
;
/**
 * Gets an html template from the templates folder
 *
 * @export
 * @param {string} file the file name with no extension (ex '/index')
 * @returns {Promise<string|boolean>} false if there is an error, otherwise the html
 */
function getTemplate(file, options) {
    return new Promise((res, rej) => {
        if (templates.has(file)) {
            return res(templates.get(file));
        }
        let p = file;
        if (!file.includes('.html'))
            file += '.html';
        if (!(file.startsWith('.')))
            p = path.resolve('./templates', file);
        else {
            const stack = (0, callsite_1.default)(), requester = stack[1].getFileName(), requesterDir = path.dirname(requester);
            p = path.resolve(requesterDir, p);
        }
        p = path.resolve(__dirname, p);
        if (!fs.existsSync(p)) {
            console.error(`Template ${p} does not exist. Input:`, file);
            return false;
        }
        fs.readFile(p, 'utf8', (err, data) => {
            if (err)
                return rej(err);
            data = runBuilds(data);
            templates.set(file, data);
            res(options ? (0, v3_1.render)(data, options) : data);
        });
    });
}
exports.getTemplate = getTemplate;
/**
 * Saves an html template to the templates folder
 *
 * @export
 * @param {string} file the file name with no extension (ex '/index')
 * @param {string} data the data to save
 * @returns {boolean} whether the file was saved successfully
 */
function saveTemplateSync(file, data) {
    let p = file;
    if (!file.includes('.html'))
        file += '.html';
    if (!(file.startsWith('.')))
        p = path.resolve('./templates', file);
    else {
        const stack = (0, callsite_1.default)(), requester = stack[1].getFileName(), requesterDir = path.dirname(requester);
        p = path.resolve(requesterDir, p);
    }
    p = path.resolve(__dirname, p);
    fs.writeFileSync(p, data, 'utf8');
    return true;
}
exports.saveTemplateSync = saveTemplateSync;
/**
 * Saves an html template to the templates folder
 *
 * @export
 * @param {string} file the file name with no extension (ex '/index')
 * @param {string} data the data to save
 * @returns {Promise<boolean>} whether the file was saved successfully
 */
function saveTemplate(file, data) {
    return new Promise((res, rej) => {
        let p = file;
        if (!file.includes('.html'))
            file += '.html';
        if (!(file.startsWith('.')))
            p = path.resolve('./templates', file);
        else {
            const stack = (0, callsite_1.default)(), requester = stack[1].getFileName(), requesterDir = path.dirname(requester);
            p = path.resolve(requesterDir, p);
        }
        p = path.resolve(__dirname, p);
        fs.writeFile(p, data, 'utf8', err => {
            if (err)
                return rej(err);
            res(true);
        });
    });
}
exports.saveTemplate = saveTemplate;
/**
 * Saves a file to the uploads folder
 *
 * @export
 * @param {*} data the data to save
 * @param {string} filename the filename to save it as
 * @returns {Promise<void>}
 */
function saveUpload(data, filename) {
    return new Promise((res, rej) => {
        data = Buffer.from(data, 'binary');
        fs.writeFile(path.resolve(__dirname, '../uploads', filename), data, err => {
            if (err)
                rej(err);
            else
                res();
        });
    });
}
exports.saveUpload = saveUpload;
/**
 * Description placeholder
 *
 * @export
 * @param {File[]} files
 * @returns {Promise<void>}
 */
function uploadMultipleFiles(files) {
    return new Promise((resolve, reject) => {
        const promises = [];
        files.forEach(file => {
            promises.push(saveUpload(file.data, file.filename + file.ext));
        });
        Promise.all(promises).then(() => resolve()).catch(err => reject(err));
    });
}
exports.uploadMultipleFiles = uploadMultipleFiles;
/**
 * Description placeholder
 *
 * @export
 * @param {string} filename
 * @returns {*}
 */
function getUpload(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(path.resolve(__dirname, '../uploads', filename), (err, data) => {
            if (err)
                reject(err);
            else
                resolve(data);
        });
    });
}
exports.getUpload = getUpload;
/**
 * Description placeholder
 *
 * @export
 * @param {string} filename
 * @returns {Promise<void>}
 */
function deleteUpload(filename) {
    return new Promise((resolve, reject) => {
        fs.unlink(path.resolve(__dirname, '../uploads', filename), err => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
}
exports.deleteUpload = deleteUpload;
/**
 * Description placeholder
 *
 * @export
 * @param {number} bytes
 * @param {number} [decimals=2]
 * @returns {{ string: string, type: string }}
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0)
        return {
            string: '0 Bytes',
            type: 'Bytes'
        };
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return {
        string: parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i],
        type: sizes[i]
    };
}
exports.formatBytes = formatBytes;
/**
 * Description placeholder
 *
 * @param {FileStreamOptions} opts
 * @returns {(req: any, res: any, next: any) => unknown}
 */
const fileStream = (opts) => {
    return async (req, res, next) => {
        let { maxFileSize, extensions } = opts;
        maxFileSize = maxFileSize || 1000000;
        const generateFileId = () => {
            return (0, uuid_1.v4)() + '-' + Date.now();
        };
        let fileId = generateFileId();
        let { headers: { 'x-content-type': contentType, 'x-file-name': fileName, 'x-file-size': fileSize, 'x-file-type': fileType, 'x-file-ext': fileExt } } = req;
        if (maxFileSize && +fileSize > maxFileSize) {
            console.log('File size is too large', formatBytes(+fileSize), formatBytes(maxFileSize));
            return res.json({
                error: 'File size too large'
            });
        }
        if (extensions && !extensions.includes(fileExt)) {
            console.log('File type is not allowed', fileExt, extensions);
        }
        if (!fileExt.startsWith('.'))
            fileExt = '.' + fileExt;
        // never overwrite files
        while (fs.existsSync(path.resolve(__dirname, '../uploads', fileId + fileExt))) {
            fileId = generateFileId();
        }
        const file = fs.createWriteStream(path.resolve(__dirname, '../uploads', fileId + fileExt));
        let total = 0;
        req.on('data', (chunk) => {
            file.write(chunk);
            total += chunk.length;
            console.log('Uploaded', formatBytes(total), formatBytes(+fileSize), `(${Math.round(total / +fileSize * 100)}% )`);
        });
        req.on('end', () => {
            file.end();
            req.file = {
                id: fileId,
                name: fileName,
                size: fileSize,
                type: fileType,
                ext: fileExt,
                contentType
            };
            next();
        });
        req.on('error', (err) => {
            console.log(err);
            res.json({
                error: 'Error uploading file: ' + fileName
            });
        });
    };
};
exports.fileStream = fileStream;
/**
 * Description placeholder
 *
 * @export
 * @param {string} dir
 * @param {FileCb} cb
 * @param {FileOpts} [options={}]
 */
function openAllInFolderSync(dir, cb, options) {
    if (!dir)
        throw new Error('No directory specified');
    if (!cb)
        throw new Error('No callback function specified');
    if (!fs.existsSync(dir))
        return;
    if (!fs.lstatSync(dir).isDirectory())
        return;
    const files = fs.readdirSync(dir);
    files.sort((a, b) => {
        // put directories first
        const aIsDir = fs.lstatSync(path.resolve(dir, a)).isDirectory();
        const bIsDir = fs.lstatSync(path.resolve(dir, b)).isDirectory();
        return aIsDir ? 1 : bIsDir ? -1 : 0;
    });
    if (!options)
        options = {};
    if (options.sort) {
        files.sort((a, b) => {
            if (fs.lstatSync(path.resolve(dir, a)).isDirectory() || fs.lstatSync(path.resolve(dir, b)).isDirectory())
                return 0;
            return options?.sort ? options.sort(path.resolve(dir, a), path.resolve(dir, b)) : 0 || 0;
        });
    }
    files.forEach(file => {
        const filePath = path.resolve(dir, file);
        if (fs.lstatSync(filePath).isDirectory())
            openAllInFolderSync(filePath, cb, options);
        else
            cb(filePath);
    });
}
exports.openAllInFolderSync = openAllInFolderSync;
/**
 * Description placeholder
 *
 * @export
 * @param {string} dir
 * @param {FileCb} cb
 * @param {FileOpts} [options={}]
 * @returns {Promise<void>}
 */
function openAllInFolder(dir, cb, options = {}) {
    if (!dir)
        throw new Error('No directory specified');
    if (!cb)
        throw new Error('No callback function specified');
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(dir))
            return resolve();
        if (!fs.lstatSync(dir).isDirectory())
            return resolve();
        fs.readdir(dir, (err, files) => {
            if (err)
                return reject(err);
            files.forEach(file => {
                const filePath = path.resolve(dir, file);
                if (fs.lstatSync(filePath).isDirectory())
                    openAllInFolder(filePath, cb);
                else
                    cb(filePath);
            });
        });
    });
}
exports.openAllInFolder = openAllInFolder;
