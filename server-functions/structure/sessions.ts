import { Request, Response, NextFunction } from 'express';
import { getClientIp } from 'request-ip';
import { v4 as uuid } from 'uuid';
import Account from './accounts';
import * as fs from 'fs';
import * as path from 'path';
import { parseCookie } from './cookie';

type CustomRequest = Request & { session: Session };
type Socket = {
    emit: (event: string, ...args: any[]) => void;

    handshake: {
        headers: {
            cookie: string;
        }
    }
}

export class Session {
    static middleware(req: CustomRequest, res: Response, next: NextFunction) {
        if (!req.session) {
            req.session = new Session(req, res);
            Session.addSession(req.session);
        }
        next();
    }

    static _sessions: { [key: string]: Session } = {};
    static get sessions() {
        return Session._sessions;
    }
    static addSession(session: Session) {
        Session._sessions[session.id] = session;
    }
    static removeSession(session: Session) {
        delete Session._sessions[session.id];
    }

    static saveSessions() {
        const s: {[key: string]: any} = {};
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
        if (!fs.existsSync(path.resolve(__dirname, './sessions.txt'))) return fs.writeFileSync(path.resolve(__dirname, './sessions.txt'), '{}', 'utf8');

        const s = fs.readFileSync(path.resolve(__dirname, './sessions.txt'), 'utf8');
        const sessions = JSON.parse(s);

        Object.entries(sessions).forEach(([id, session]) => {
            Session.addSession(Session.fromSessObj(session));
        });
    }

    static fromSessObj(s: any) {
        const session = new Session();
        session.ip = s.ip;
        session.id = s.id;
        session.latestActivity = s.latestActivity;
        session.account = s.account;
        return session;
    }

    static addSocket(socket: Socket) {
        const cookie = socket.handshake.headers.cookie;
        if (!cookie) return;
        const { id } = parseCookie(cookie) as { id: string };
        if (!id) return;
        const session = Session.sessions[id];
        if (!session) return;
        session.setSocket(socket);
    }



    ip: string;
    id: string;
    latestActivity: number = Date.now();
    account?: Account;
    socket?: Socket;

    constructor(req?: CustomRequest, res?: Response) {
        if (req) this.ip = getClientIp(req);
        else this.ip = 'unknown';
        this.id = uuid();

        if (res) res.cookie('ssid', this.id, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 365 * 10 // 10 years
        });
    }

    setSocket(socket: Socket) {
        this.socket = socket;
    }

    signIn(account: Account) {
        this.account = account;
    }

    signOut() {
        delete this.account;
    }

    destroy() {
        Session.removeSession(this);
    }
}

Session.loadSessions();

setInterval(Session.saveSessions, 1000 * 10); // save sessions every 10 seconds