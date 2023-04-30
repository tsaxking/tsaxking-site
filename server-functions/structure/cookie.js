"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCookie = void 0;
const parseCookie = (cookie) => {
    var list = {};
    let _tempCookie;
    do {
        _tempCookie = decodeURI(cookie);
    } while (_tempCookie !== cookie);
    cookie.split(';').forEach((c) => {
        const [key, value] = c.split('='); // Split cookie into key and value
        list[key.trim()] = value; // Add key and value to cookie object
    });
    return list; // Returns cookie object
};
exports.parseCookie = parseCookie;
