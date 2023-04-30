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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Session = void 0;
const request_ip_1 = require("request-ip");
const uuid_1 = require("uuid");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const cookie_1 = require("./cookie");
class Session {
    static middleware(req, res, next) {
        if (!req.session) {
            req.session = new Session(req, res);
            Session.addSession(req.session);
        }
        next();
    }
    static _sessions = {};
    static get sessions() {
        return Session._sessions;
    }
    static addSession(session) {
        Session._sessions[session.id] = session;
    }
    static removeSession(session) {
        delete Session._sessions[session.id];
    }
    static saveSessions() {
        const s = {};
        Object.entries(Session.sessions).forEach(([id, session]) => {
            // customize what you want to save
            s[id] = {
                ip: session.ip,
                id: session.id,
                latestActivity: session.latestActivity,
                account: session.account
            };
        });
        fs.writeFile(path.resolve(__dirname, './sessions.txt'), JSON.stringify(s, null, 4), err => {
            if (err) {
                console.error(err);
                console.log(Session.sessions);
            }
        });
    }
    static loadSessions() {
        if (!fs.existsSync(path.resolve(__dirname, './sessions.txt')))
            return fs.writeFileSync(path.resolve(__dirname, './sessions.txt'), '{}', 'utf8');
        const s = fs.readFileSync(path.resolve(__dirname, './sessions.txt'), 'utf8');
        const sessions = JSON.parse(s);
        Object.entries(sessions).forEach(([id, session]) => {
            Session.addSession(Session.fromSessObj(session));
        });
    }
    static fromSessObj(s) {
        const session = new Session();
        session.ip = s.ip;
        session.id = s.id;
        session.latestActivity = s.latestActivity;
        session.account = s.account;
        return session;
    }
    static addSocket(socket) {
        const cookie = socket.handshake.headers.cookie;
        if (!cookie)
            return;
        const { id } = (0, cookie_1.parseCookie)(cookie);
        if (!id)
            return;
        const session = Session.sessions[id];
        if (!session)
            return;
        session.setSocket(socket);
    }
    ip;
    id;
    latestActivity = Date.now();
    account;
    socket;
    constructor(req, res) {
        if (req)
            this.ip = (0, request_ip_1.getClientIp)(req);
        else
            this.ip = 'unknown';
        this.id = (0, uuid_1.v4)();
        if (res)
            res.cookie('ssid', this.id, {
                httpOnly: true,
                maxAge: 1000 * 60 * 60 * 24 * 365 * 10 // 10 years
            });
    }
    setSocket(socket) {
        this.socket = socket;
    }
    signIn(account) {
        this.account = account;
    }
    signOut() {
        delete this.account;
    }
    destroy() {
        Session.removeSession(this);
    }
}
exports.Session = Session;
Session.loadSessions();
setInterval(Session.saveSessions, 1000 * 10); // save sessions every 10 seconds
