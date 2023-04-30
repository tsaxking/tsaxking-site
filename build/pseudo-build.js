// this is to be run from server.js, not main.js. So this will be run after everything is built
// this is to be called by server.js

const sass = require('sass');
const ChildProcess = require('child_process');
const fs = require('fs');
const path = require('path');

function getJSONSync(file) {
    let p;
    if (file.includes('/') || file.includes('\\')) {
        p = file;
    }
    else
        p = path.resolve('../jsons', file + '.json');
    p = path.resolve(__dirname, p);
    if (!fs.existsSync(p)) {
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

const runTs = (directory) => {
    const tsConfig = getJSONSync(path.resolve(directory, './tsconfig.json'));

    try {
        ChildProcess.spawnSync('tsc', [], {
            stdio: 'pipe',
            shell: true,
            cwd: directory,
            env: process.env
        });
    } catch (e) {
        console.error(e);
    }

    return path.resolve(__dirname, directory, tsConfig.compilerOptions.outDir || '', tsConfig.compilerOptions.outFile);

}

const mapDirectory = (dir, type, priority = []) => {
    const files = [];

    const readDir = (dir) => {
        const list = fs.readdirSync(dir);

        list.forEach((file) => {
            const filePath = path.join(dir, file);

            const stat = fs.statSync(filePath);

            if (stat && stat.isDirectory()) {
                readDir(filePath);
            } else {
                const ext = path.extname(filePath);
                // console.log(ext, type);
                if (ext !== '.' + type) return;
                const name = path.basename(filePath, ext);

                files.push({
                    path: filePath,
                    name: name,
                    ext,
                    priority: priority.indexOf(name) !== -1 ? priority.indexOf(name) : Infinity
                });
            }
        });
    };

    readDir(dir);

    files.sort((a, b) => a.priority - b.priority);

    return files;
};

module.exports = { 
    build: () => {
        const { ignore, streams } = getJSONSync('../build/build.json');
        return Object.keys(streams).reduce((acc, stream) => {
            const globalFiles = [];
            if (!streams[stream].files) throw new Error(`Build file ${stream} is missing files array!`);
            const smallIgnore = streams[stream].ignore || [];
            if (stream.endsWith('.js')) {
                for (let file of streams[stream].files) {
                    if (file.includes('--ignore-build') || file.startsWith('http')) {
                        globalFiles.push(file.replace('--ignore-build', ''));
                        continue;
                    }

                    if (ignore.includes(file) || smallIgnore.includes(file)) continue;
                    if (file.endsWith('.js')) {
                        globalFiles.push(file);
                        continue;
                    }

                    const ts = file.startsWith('[ts]');

                    if (fs.statSync(path.resolve(__dirname, file.replace('[ts]', ''))).isDirectory()) {

                        if (ts) {
                            const p = runTs(path.resolve(__dirname, file.replace('[ts]', '')));
                            globalFiles.push(p);
                            continue;
                        }

                        const files = mapDirectory(path.resolve(__dirname, file.replace('[ts]', '')), 'js', streams[stream].priority);
                        for (const file of files) {
                            if (ignore.includes(file.name) || smallIgnore.includes(file.name)) continue;
                            globalFiles.push(file.path);
                        }
                    }
                }
            } else {
                for (let file of streams[stream].files) {
                    if (file.includes('--ignore-build') || file.startsWith('http')) {
                        globalFiles.push(file.replace('--ignore-build', ''));
                        continue;
                    }

                    if (ignore.includes(file) || smallIgnore.includes(file)) continue;
                    if (file.endsWith('.css')) {
                        globalFiles.push(file);
                        continue;
                    }

                    const scss = file.endsWith('.scss');

                    if (fs.statSync(path.resolve(__dirname, file)).isDirectory()) {
                        const files = mapDirectory(path.resolve(__dirname, file), 'css', streams[stream].priority);
                        for (const file of files) {
                            if (ignore.includes(file.name) || smallIgnore.includes(file.name)) continue;
                            globalFiles.push(file.path);
                        }
                    } else {
                        if (scss) {
                            const { css } = sass.compile(path.resolve(__dirname, file));
                            fs.writeFileSync(path.resolve(__dirname, file.replace('.scss', '.css')), css);
                            globalFiles.push(path.resolve(__dirname, file.replace('.scss', '.css')));
                            continue;
                        }
                    }

                }
            }

            acc[stream] = globalFiles.map(f => (f.includes('http') ? f : path.relative(__dirname, f)).replace(/\\/g, '/'));
            return acc;
        }, {});
    }
};