'use strict';

var port = process.env.PORT || 8889;

module.exports = {
    server: {
        port: port,
        inboundOrigins: (process.env.INBOUND_ORIGINS || ('localhost:' + port)).split(',').map(function(host) {
            return host.trim();
        }),
        outboundPorts: (process.env.OUTBOUND_PORTS || '143,465,587,993').split(',').map(function(i) {
            return parseInt(i, 10);
        })
    },
    log: {
        level: "silly",
        http: ':remote-addr [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer"'
    }
};