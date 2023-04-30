import * as fs from 'fs';
import * as path from 'path';
import { getJSON, getTemplate } from './files';
import { NextFunction, Request, Response } from 'express';

const builder: {
    [key: string]: (req: Request) => string;
} = {
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


module.exports = async (req: Request, res: Response, next: NextFunction) => {
    const { url } = req;
    if (builder[url]) {
        res.send(await builder[url](req));
    } else {
        next();
    }
}