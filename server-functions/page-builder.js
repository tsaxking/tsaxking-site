"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const builder = {
// put your pages here:
/*
example:
    '/account': async (req: Request) => {
        const { account } = req.session;

        if (account) {
            const template = await getTemplate('account', account); // uses node-html-constructor if you pass in the second parameter
            return template;
        }

        return 'You are not logged in.';
    }
*/
};
module.exports = async (req, res, next) => {
    const { url } = req;
    if (builder[url]) {
        res.send(await builder[url](req));
    }
    else {
        next();
    }
};
