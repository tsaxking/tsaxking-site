const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


class APP_DB {
    constructor(filepath) {
        this.path = path.resolve(__dirname, '../db', filepath);
        this.queue = [];
        this.queueRunning = false;
    }

    async init() {
        this.sqlite = await open({
            filename: this.path,
            driver: sqlite3.Database
        }).catch(err => console.error(err));
    }

    async runQueue(queueInfo) {
        this.queue.push(queueInfo);
        if (this.queueRunning) return;
        this.queueRunning = true;

        while (this.queue.length > 0) {
            const {
                query,
                params,
                type,
                resolve,
                reject
            } = this.queue[0];

            try {
                switch (type) {
                    case 'run':
                        await this.sqlite.run(query, params)
                            .catch(e => {
                                // reject(e);
                                throw new Error(e);
                            });
                        break;
                    case 'exec':
                        await this.sqlite.exec(query, params)
                            .catch(e => {
                                // reject(e);
                                throw new Error(e);
                            });
                        break;
                    case 'each':
                        await this.sqlite.each(query, params)
                            .catch(e => {
                                // reject(e);
                                throw new Error(e);
                            });
                }
            } catch (e) {
                if (e.message.includes('SQLITE_BUSY')) {
                    if (this.queue[0].attempts > 5) {
                        console.log('Attempted to run query 5 times, but it was still busy. Skipping query.');
                        reject(e);
                        this.queue.shift();
                        continue;
                    }

                    await sleep(100);

                    this.queue[0].attempts = this.queue[0].attempts ? this.queue[0].attempts + 1 : 1;
                    continue;
                }
                console.error(e);
                console.log('Query: ', query, params);
            }
            resolve();
            this.queue.shift();
        }

        this.queueRunning = false;
    }

    async run(query, params) {
        if (!this.sqlite) await this.init();
        return new Promise((res, rej) => {
            this.runQueue({
                query,
                params,
                type: 'run',
                resolve: res,
                reject: rej
            });
        });
    }

    async exec(query, params) {
        if (!this.sqlite) await this.init();
        return new Promise((res, rej) => {
            this.runQueue({
                query,
                params,
                type: 'exec',
                resolve: res,
                reject: rej
            });
        });
    }

    async each(query, params) {
        if (!this.sqlite) await this.init();
        return new Promise((res, rej) => {
            this.runQueue({
                query,
                params,
                type: 'each',
                resolve: res,
                reject: rej
            });
        });
    }

    async get(query, params) {
        if (!this.sqlite) await this.init();
        return await this.sqlite.get(query, params)
            .catch(e => {
                throw new Error(e);
            });
    }

    async all(query, params) {
        if (!this.sqlite) await this.init();
        return await this.sqlite.all(query, params)
            .catch(e => {
                throw new Error(e);
            });
    }
}

const DB = new APP_DB('./main.db');

module.exports = { DB, APP_DB };