const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');
const fs = require('fs');
const ObjectsToCsv = require('objects-to-csv');
const { getClientIp } = require('request-ip');
const { Session } = require('./server-functions/structure/sessions');
const builder = require('./server-functions/page-builder');
const { detectSpam, emailValidation } = require('./server-functions/middleware/spam-detection');

require('dotenv').config();
const { PORT, DOMAIN } = process.env;

const [,, env, ...args] = process.argv;


const app = express();

const server = http.createServer(app);
const io = new Server(server);

io.on('connection', (socket) => {
    console.log('a user connected');
    const s = Session.addSocket(socket);
    if (!s) return;
    // your socket code here

    // ▄▀▀ ▄▀▄ ▄▀▀ █▄▀ ██▀ ▀█▀ ▄▀▀ 
    // ▄█▀ ▀▄▀ ▀▄▄ █ █ █▄▄  █  ▄█▀ 





























    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '50mb' }));
app.use('/static', express.static(path.resolve(__dirname, './static')));
app.use('/uploads', express.static(path.resolve(__dirname, './uploads')));

app.use((req, res, next) => {
    req.io = io;
    req.start = Date.now();
    req.ip = getClientIp(req);
    next();
});

function stripHtml(body) {
    let files;

    if (body.files) {
        files = JSON.parse(JSON.stringify(body.files));
        delete body.files;
    }

    let str = JSON.stringify(body);
    str = str.replace(/<[^<>]+>/g, '');

    obj = JSON.parse(str);
    obj.files = files;

    return obj;
}

// logs body of post request
app.post('/*', (req, res, next) => {
    req.body = stripHtml(req.body);
    next();
});

app.use(Session.middleware);



// production/testing/development middleward


app.use((req, res, next) => {
    switch (env) {
        case 'prod':
            (() => {
                // This code will only run in production


            })();
            break;
        case 'test':
            (() => {
                // this code will only run in testing
                // you could add features like auto-reloading, automatic sign-in, etc.


            })();
            break;
        case 'dev':
            (() => {
                // this code will only run in development
                // you could add features like auto-reloading, automatic sign-in, etc.


            })();
            break;
    }

    next();
});


// spam detection
app.post(detectSpam(['message', 'name', 'email'], {
    onSpam: (req, res, next) => {
        res.json({ error: 'spam' });
    },
    onerror: (req, res, next) => {
        res.json({ error: 'error' });
    }
}));

app.post(emailValidation(['email', 'confirmEmail'], {
    onspam: (req, res, next) => {
        res.json({ error: 'spam' });
    },
    onerror: (req, res, next) => {
        res.json({ error: 'error' });
    }
}));





// █▀▄ ██▀ ▄▀▄ █ █ ██▀ ▄▀▀ ▀█▀ ▄▀▀ 
// █▀▄ █▄▄ ▀▄█ ▀▄█ █▄▄ ▄█▀  █  ▄█▀ 

// this can be used to build pages on the fly and send them to the client
// app.use(builder);







































































let logCache = [];

// sends logs to client every 10 seconds
setInterval(() => {
    if (logCache.length) {
        io.to('logs').emit('request-logs', logCache);
        logCache = [];
    }
}, 1000 * 10);

app.use((req, res, next) => {
    const csvObj = {
        date: Date.now(),
        duration: Date.now() - req.start,
        ip: req.session.ip,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        userAgent: req.headers['user-agent'],
        body: req.method == 'post' ? JSON.stringify((() => {
            let { body } = req;
            body = JSON.parse(JSON.stringify(body));
            delete body.password;
            delete body.confirmPassword;
            delete body.files;
            return body;
        })()) : '',
        params: JSON.stringify(req.params),
        query: JSON.stringify(req.query)
    };

    logCache.push(csvObj);

    new ObjectsToCsv([csvObj]).toDisk('./logs.csv', { append: true });
});



const clearLogs = () => {
    fs.writeFileSync('./logs.csv', '');
    logCache = [];
}

const timeTo12AM = 1000 * 60 * 60 * 24 - Date.now() % (1000 * 60 * 60 * 24);
console.log('Clearing logs in', timeTo12AM / 1000 / 60, 'minutes');
setTimeout(() => {
    clearLogs();
    setInterval(clearLogs, 1000 * 60 * 60 * 24);
}, timeTo12AM);


server.listen(PORT, () => {
    console.log('------------------------------------------------');
    console.log(`Listening on port \x1b[35m${DOMAIN}...\x1b[0m`);
});