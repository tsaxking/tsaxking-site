const fs = require('fs');
const path = require('path');
const UglifyJS = require("uglify-js");
const postcss = require('postcss');
const cssnano = require('cssnano');
const autoprefixer = require('autoprefixer');
const ChildProcess = require('child_process');
const axios = require('axios');
const sass = require('sass');
const { compile: ignoreCompiler } = require('@gerhobbelt/gitignore-parser');


const ignoreList = [];

/**
 * 
 * @param {String[]} ignoreArr 
 * @param {String} file 
 */
const ignoreTest = (ignoreArr, file) => {
    // test if file starts with C:/ or C:\\ or some equivalent
    const topLevelTest = /^[a-zA-Z]:\\/.test(file) || /^[a-zA-Z]:\//.test(file);

    file = path.relative(__dirname, topLevelTest ? file : path.resolve(__dirname, file));
    // console.log('Testing ignore...', file);

    const gitignore = ignoreCompiler(ignoreArr.join('\n'));
    const test = gitignore.denies(file);
    if (test) {
        console.log('Ignored:', file);
        ignoreList.push(file);
    }
    return test;
}


let watchDirs = [];
const watchDir = (dir) => {
    // const watch = (eventType, filename) => {
    //     if (filename && (filename.includes('.js') || filename.includes('.ts')) && !globalWatchIgnore.includes(filename)) {
    //         watchDirs.forEach(fs.unwatchFile);
    //         watchDirs = [];
    //         runBuild();
    //     }
    // };

    // fs.watch(dir, watch);
    // watchDirs.push(dir);
}


const readJSON = (path) => {
    let content = fs.readFileSync(path, 'utf8');

    // remove all /* */ comments
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    // remove every comment after "// "
    content = content.replace(/\/\/ .*/g, '');

    return JSON.parse(content);
}

const build = readJSON(path.resolve(__dirname, './build.json'));
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

const delimiters = {
    js: ";\n",
    css: "\n"
}

const spawnChild = ({ command, args = [], onData = true, onOpen = true, onClose = false }, name) => {
    const child = ChildProcess.spawn(command, args, {
        stdio: 'pipe',
        shell: true,
        cwd: process.cwd(),
        env: process.env
    });
    if (onData) {
        child.stdout.on('data', data => {
            try {
                console.log(name + ':', data.toString().trim('\r'));
            } catch {}
        });
    }
    child.stderr.on('data', data => {
        try {
            console.log(name + ':', data.toString().trim('\r'));
        } catch {}
    });
    if (onClose) {
        child.on('exit', code => {
            try {
                console.log(name + ':', 'exited with code', code);
            } catch {}
        });
    }
    child.log = (...args) => {
        console.log(name + ':', ...args);
    }

    if (onOpen) {
        const funSpawnMessgges = [
            'A wild child has appeared!',
            'Summoning child...',
            'Child has been summoned!',
            'Child has been summoned!',
            'Child has been born!'
        ];

        child.log(funSpawnMessgges[Math.floor(Math.random() * funSpawnMessgges.length)]);
    }

    return child;
}

const runTs = async (directory) => {
    return new Promise((res,rej) => {
        const tsConfig = readJSON(path.resolve(__dirname, directory, './tsconfig.json'));

        const child = ChildProcess.spawn('tsc', [], {
            stdio: 'pipe',
            shell: true,
            cwd: directory,
            env: process.env
        });

        // log data in green
        const log = (data) => {
            console.log('\x1b[32mtsc:\x1b[0m', data.toString().trim('\r'));
        };

        child.stdout.on('data', log);
        child.stderr.on('data', log);
        child.on('close', (code) => {
            console.error(`tsc child process exited with code ${code}`);

            switch (code) {
                // if tsc is not installed
                case 127:
                    return rej('tsc is not installed properly on your machine! Please install it globally with "npm i -g typescript"!', directory);
                // if tsc is installed but there is no tsconfig.json
                default:
                    break;
            }
    
            if (!tsConfig.compilerOptions.outFile) return rej('No outFile defined in tsconfig.json!', directory);
            if (!tsConfig.compilerOptions.outDir) tsConfig.compilerOptions.outDir = './';
            res(path.resolve(__dirname, directory, tsConfig.compilerOptions.outDir, tsConfig.compilerOptions.outFile));

            child.kill();
        });
    });
}

const watching = [];


if (!fs.existsSync(path.resolve(__dirname, './cache'))) {
    fs.mkdirSync(path.resolve(__dirname, './cache'));
}


const getDependency = async (url) => {
    const fileSafeName = url.replace(/[^a-zA-Z0-9]/g, '_');
    if (fs.existsSync(path.resolve(__dirname, './cache', fileSafeName))) {
        return fs.readFileSync(path.resolve(__dirname, './cache', fileSafeName), 'utf8');
    }

    const { data } = await axios.get(url);

    fs.writeFileSync(path.resolve(__dirname, './cache', fileSafeName), data, 'utf8');

    return data;
};





const runBuild = async() => {
    const build = readJSON(path.resolve(__dirname, './build.json'));
    console.log('Starting build...');


    const child = ChildProcess.spawn('tsc', [], {
        stdio: 'pipe',
        shell: true,
        cwd: path.resolve(__dirname, '../server-functions'),
        env: process.env
    });

    child.on('error', console.error);
    child.stdout.on('data', console.log);
    child.stderr.on('data', console.error);


    if (!watching.includes(path.resolve(__dirname, '../server-functions'))) {
        watchDir(path.resolve(__dirname, '../server-functions'), watchDir);
        watching.push(path.resolve(__dirname, '../server-functions'));
    }

    const { ignore: globalIgnore, minify, streams, buildDir, ignoreHttp } = build;

    if (!streams) {
        console.error('No streams defined! Aborting build...');

        console.log('Build failed!', 'Be sure to add a property "streams" to your build.json file.');
        console.log("Example:");
        console.log(JSON.stringify({
            ...build,
            streams: {
                "stream.js": {
                    priority: ['index.js', 'main.js', '(any other files you want to be loaded first in order)'],
                    ignore: ['test.js', '(any other files you want to ignore)'],
                    files: [
                        "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js // will load this file from the internet",
                        "../static/js/main.js // will only load this file if it exists",
                        "[ts]../static/js/submodule // this will run tsc in this directory. tsconfig.json is required and must have an outFile property!",
                        "../static/js/subfolder // this will load all files in this folder, prioritized by subdirectories and then alphabetically"
                    ]
                }
            }
        }));

        return;
    }

    const fileStreams = Object.keys(streams).reduce((acc, cur) => {
        acc[cur] = fs.createWriteStream(path.resolve(__dirname, buildDir, cur));
        return acc;
    }, {});


    if (!fs.existsSync(path.resolve(__dirname, buildDir))) {
        fs.mkdirSync(path.resolve(__dirname, buildDir));
    }

    for (const [name, file] of Object.entries(streams)) {
        const type = path.extname(name).slice(1);
        const { priority, ignore, files } = file;

        const fileStream = fileStreams[name];


        if (files) {
            for (let f of files) {
                if (f.includes('--ignore-build')) continue;
                if (ignoreHttp && f.startsWith('http')) continue;

                if (ignore && ignoreTest(ignore, f.replace('[ts]', ''))) continue;
                if (globalIgnore && ignoreTest(globalIgnore, f.replace('[ts]', ''))) continue;
                if (f.includes('http')) {
                    const data = await getDependency(f);
                    fileStream.write(data);
                    fileStream.write(delimiters[type]);
                    continue;
                }
                const ts = f.startsWith('[ts]');

                if (fs.statSync(path.resolve(__dirname, f.replace('[ts]', ''))).isDirectory()) {
                    // format: [ts]../path/to/dir
                    if (ts) {
                        const p = await runTs(path.resolve(__dirname, f.replace('[ts]', '')));

                        if (globalIgnore && ignoreTest(globalIgnore, p)) continue;
                        if (ignore && ignoreTest(ignore, p)) continue;

                        if (p.includes('--ignore-build')) return;

                        const content = fs.readFileSync(p);
                        fileStream.write(content);
                        fileStream.write(delimiters[type]);

                        continue;
                    }

                    const files = mapDirectory(path.resolve(__dirname, f.replace('[ts]', '')), type, priority);
                    
                    for (const f of files) {
                        if (ignore && ignoreTest(ignore, f.path.replace('[ts]', ''))) continue;
                        if (globalIgnore && ignoreTest(globalIgnore, f.path.replace('[ts]', ''))) continue;

                        if (f.path.includes('--ignore-build')) return;

                        const content = fs.readFileSync(path.resolve(__dirname, f.path.replace('[ts]', '')));
                        fileStream.write(content);
                        fileStream.write('\n');
                    }
                } else {
                    if (f.endsWith('.scss')) {
                        const { css } = sass.compile(path.resolve(__dirname, f.replace('[ts]'), ''), {
                            outputStyle: 'compressed'
                        });
                        f = f.replace('.scss', '.css');

                        if (globalIgnore && ignoreTest(globalIgnore, f.replace('[ts]', ''))) continue;
                        if (ignore && ignoreTest(ignore, f.replace('[ts]', ''))) continue;

                        if (f.includes('--ignore-build')) return;

                        fileStream.write(css);
                        fileStream.write(delimiters[type]);
                        continue;
                    }


                    if (fs.existsSync(path.resolve(__dirname, f.replace('[ts]', '')))) {
                        const content = fs.readFileSync(path.resolve(__dirname, f.replace('[ts]', '')));
                        fileStream.write(content);
                        fileStream.write(delimiters[type]);
                    } else {
                        console.error(`File ${f.replace('[ts]', '')} does not exist!`);
                    }
                }
            }
        }
    }

    if (minify) {
        Object.keys(build.streams).forEach((stream) => {
            const streamPath = path.resolve(__dirname, buildDir, stream);

            let content = fs.readFileSync(streamPath, 'utf8');
            const ext = path.extname(streamPath);

            stream = stream.replace(ext, '.min' + ext);
            console.log('Minifying', stream, '...');

            switch (ext) {
                case '.js':
                    content = UglifyJS.minify(content, {
                        compress: {
                            drop_console: true
                        }
                    }).code;
                    fs.writeFileSync(path.resolve(__dirname, buildDir, stream), content);
                    break;
                case '.css':
                    postcss([autoprefixer, cssnano])
                        .process(content, { from: undefined })
                        .then((result) => {
                            content = result.css;
                            fs.writeFileSync(path.resolve(__dirname, buildDir, stream), content);
                        });
                    break;
            }
        });
    }

    if (ignoreList.length) fs.writeFileSync(path.resolve(__dirname, './ignore-list.txt'), ignoreList.join('\n'));
    else if (fs.existsSync(path.resolve(__dirname, './ignore-list.txt'))) {
        fs.unlinkSync(path.resolve(__dirname, './ignore-list.txt'));
    }

    console.log('Build complete!');
};

runBuild();

process.stdin.on('data', (data) => {
    data = data.toString().trim().replace('\r', '');
    const [command, ...args] = data.split(' ');
    switch (command) {
        case 'rebuild':
            runBuild();
            break;
    }
});


// fs.watch(path.resolve(__dirname), runBuild);
// fs.watch(path.resolve(__dirname, './build.json'), runBuild);