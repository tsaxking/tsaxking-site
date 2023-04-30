const start = Date.now();
const args = process.argv.slice(2);
console.log('Update args:', args);
console.log('\x1b[41mThis may take a few seconds, please wait...\x1b[0m');

const { DB, APP_DB } = require('../server-functions/databases');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
require('dotenv').config();
const getJSON = (file) => {
    let p;
    if (file.includes('/') || file.includes('\\')) {
        p = file;
    }
    else
        p = path.resolve(__dirname, '../jsons', file + '.json');
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

const updates = [];

async function initDB() {
    console.log('Checking to see if database exists');

    // check if database exists
    if (fs.existsSync(path.resolve(__dirname, '../db/main.db'))) return console.log('Database exists :)');

    console.log('Database does not exist, creating database');

    fs.writeFileSync(path.resolve(__dirname, '../db/main.db'), '');
    const DB = new APP_DB('./main.db');

    await DB.init();
}


const createTable = async([tableName, table]) => {
    const { columns, rows, description } = table;

    console.log(`Checking to see if table ${tableName} exists`);

    const makeTableQuery = `
        CREATE TABLE IF NOT EXISTS ${tableName} (
            rowId INTEGER PRIMARY KEY AUTOINCREMENT,
            ${Object.entries(columns).map(([columnName, { init }]) => `${columnName} ${init}`).join(', ')}
        )
    `;

    await DB.run(makeTableQuery);

    if (!columns) return;
    const columnPromises = Object.entries(columns).map(async ([columnName, { init }]) => {
        const query = `
            SELECT ${columnName}
            FROM ${tableName}
        `;

        try {
            await DB.all(query);
        } catch (e) {
            console.log(`Column ${columnName} does not exist in table ${tableName}, creating column`);
            const query = `
                ALTER TABLE ${tableName}
                ADD COLUMN ${columnName} ${init}
            `;

            await DB.run(query);
        }
    });

    await Promise.all(columnPromises);
    if (!rows) return;

    const rowPromises = rows.map(async(row) => {
        const primaryKey = Object.keys(columns).find(c => columns[c].primaryKey);

        const query = `
            SELECT ${primaryKey}
            FROM ${tableName}
            WHERE ${primaryKey} = ?
        `;

        const result = await DB.get(query, [row[primaryKey]]);

        if (!result) {
            console.log(`Row ${row[primaryKey]} does not exist in table ${table}, creating row`);

            const query = `
                INSERT INTO ${tableName} (
                    ${Object.keys(row).join(', ')}
                ) VALUES (
                    ${Object.keys(row).map(k => '?').join(', ')}
                )
            `;

            await DB.run(query, Object.keys(columns).map(k => {
                const { type } = columns[k];

                if (type === 'json') row[k] = JSON.stringify(row[k]);

                return row[k];
            }));
        } else if (JSON.stringify(result) !== JSON.stringify(row)) {
            console.log(`Row ${row[primaryKey]} does not match in table ${table}, updating row`);

            const deleteQuery = `
                DELETE FROM ${tableName}
                WHERE ${primaryKey} = ?
            `;

            await DB.run(deleteQuery, [row[primaryKey]]);

            const insertQuery = `
                INSERT INTO ${tableName} (
                    ${Object.keys(row).join(',')}
                ) VALUES (
                    ${Object.keys(row).map(() => '?').join(',')}
                );
            `;

            await DB.run(insertQuery, Object.keys(columns).map(k => {
                const { type } = columns[k];

                if (type === 'json') {
                    return JSON.stringify(row[k]);
                } else {
                    return row[k];
                }
            }));
        }
    });

    await Promise.all(rowPromises);
}


async function tableTest() {
    console.log('Checking to see if tables exist');

    const tables = getJSON('tables');

    return await Promise.all(Object.entries(tables).map(createTable));
}



const makeFilesAndFolders = async() => {

    const commonPorts = [
        80,
        443,
        8080
    ];

    const randomPort = () => {
        let port;
        do {
            port = Math.floor(Math.random() * 9000) + 1000;
        } while(commonPorts.includes(port));

        return port;
    }


    const folders = [
        "/uploads",
        "/history",
        "/archive",
        "/db"
    ];

    const port = randomPort();

    const files = [{
        name: "/.env",
        content: `PORT='${port}'\nDOMAIN='http://localhost:${port}'` // random number between 1000 and 9999
    }, {
        name: "/history/manifest.txt",
        content: JSON.stringify({
            lastUpdate: Date.now(),
            updates: []
        }, null, 4)
    }];

    await Promise.all(folders.map(f => {
        const p = path.resolve(__dirname, '..' + f);
        console.log(p);
        if (!fs.existsSync(p)) {
            return fsp.mkdir(p);
        }
    }));

    await files.map(f => {
        const p = path.resolve(__dirname, '..' + f.name);
        if (!fs.existsSync(p)) {
            return fsp.writeFile(p, f.content);
        }
    });
}




async function runUpdates() {
    console.log('Checking for database updates...');

    const manifest = JSON.parse(
        fs.readFileSync(
            path.resolve(__dirname, "../history/manifest.txt"), 'utf8'));

    const {
        lastUpdate,
        updates: _allUpdates
    } = manifest;

    console.log('Last database update:', new Date(lastUpdate).toLocaleString());

    const promises = updates.map(async(u) => {
        const {
            description,
            date,
            test,
            execute
        } = u;

        const foundUpdate = _allUpdates.find(_u => _u.date == date);

        if (foundUpdate) return;

        try {
            if (!await test()) {
                console.log('Running update:', new Date(date).toLocaleString(), '-', description);
                await execute();

                return u;
            }

        } catch (e) {
            console.log('Error running update:', new Date(date).toLocaleString(), '-', description);
            console.log(e);
        }
    });

    await Promise.all(promises);

    const runUpdates = await (await Promise.all(promises)).filter(u => u);

    if (runUpdates.length) {
        console.log('Applied updates:');
        console.log(runUpdates.map(u => '    - ' + u.description).join('\n'));
    } else {
        console.log('Database is up to date :)');
    }

    manifest.lastUpdate = Date.now();
    manifest.updates = manifest.updates.concat(runUpdates);

    fs.writeFileSync(
        path.resolve(__dirname, "../history/manifest.txt"),
        JSON.stringify(manifest, null, 4));
}

async function makeBackup() {
    console.log('Making database backup...');

    const dir = path.resolve(__dirname, './history', `${Date.now()}.txt`);

    fs.copyFileSync(path.resolve(__dirname, './db/main.db'), dir);
}

function setBackupIntervals() {
    console.log('Setting backup intervals...');

    const files = fs.readdirSync(path.resolve(__dirname, '../history'));

    files.forEach(f => {
        if (f == 'manifest.txt') return;

        const p = path.resolve(__dirname, '../history', f);

        const now = new Date();
        const fileDate = new Date(+f.split('.')[0]);
        const diff = now - fileDate;
        const days = Math.floor(7 - diff / (1000 * 60 * 60 * 24));

        daysTimeout(() => {
            fs.rmSync(p);
        }, days);
    });
}




const runFunction = async(fn) => {
    const now = Date.now();
    try {
        await fn()
    } catch (e) {
        console.log('Error running function:', fn.name);
        console.error(e);
        return;
    }
    console.log('Finished running function:', fn.name, 'in', Date.now() - now, 'ms');
}

const serverUpdate = async() => {
    await runFunction(makeFilesAndFolders);
    await runFunction(initDB);
    await runFunction(tableTest);

    const promises = [
        runFunction(runUpdates)
    ];

    if (args.includes('all')) promises.push(runFunction(makeBackup));

    await Promise.all(promises);
    await runFunction(setBackupIntervals);
    return console.log('Finished all update tasks!');
}

if (args.includes('main')) serverUpdate();

module.exports = {
    runFunction
}