'use strict';

module.exports = {
    server: {
        port: process.env.PORT || 8889,
        host: "0.0.0.0"
    },
    log: {
        level: "silly",
        http: ':remote-addr [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer"'
    }
};