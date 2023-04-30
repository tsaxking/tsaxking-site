const SpamScanner = require('spamscanner');
const { validate } = require('deep-email-validator');




module.exports.detectSpam = (keys, options = {}) => (req, res, next) => {
    const arr = keys.map(key => req.body[key]);

    if (!arr.length) return next();    
    const scanner = new SpamScanner();

    Promise.all(arr.map(value => scanner.scan(value)))
        .then(results => {
            const isSpam = results.some(result => result.is_spam);

            if (isSpam) {
                req.body.__spamResults = results;
                if (options.onspam) return options.onspam(req, res, next);
                if (options.goToNext) next();
                return;
            }

            next();
        })
        .catch(err => {
            console.log(err);
            if (options.onerror) options.onerror(req, res, next);
        })
};

module.exports.emailValidation = (keys, options = {}) => (req, res, next) => {
    const arr = keys.map(key => req.body[key]);

    if (!arr.length) return next();    

    Promise.all(arr.map(value => validate({ email: value })))
        .then((results) => {
            const valid = results.every(result => result.valid);
            if (valid) return next();
            req.body.__emailResults = results;
            if (options.onspam) return options.onspam(req, res, next);
            if (options.goToNext) next();
        })
        .catch(err => {
            if (options.onerror) return options.onerror(req, res, next);
            console.error(err);
            next();
        });
};