'use strict';

process.chdir(__dirname);

var cluster = require('cluster');
var config = require('config');
var log = require('npmlog');
var os = require('os');

log.level = config.log.level;

// Handle error conditions
process.on('SIGTERM', function() {
    log.warn('exit', 'Exited on SIGTERM');
    process.exit(0);
});

process.on('SIGINT', function() {
    log.warn('exit', 'Exited on SIGINT');
    process.exit(0);
});

process.on('uncaughtException', function(err) {
    log.error('uncaughtException ', err);
    process.exit(1);
});

if (cluster.isMaster) {
    // MASTER process

    cluster.on('fork', function(worker) {
        log.info('cluster', 'Forked worker #%s [pid:%s]', worker.id, worker.process.pid);
    });

    cluster.on('exit', function(worker) {
        log.warn('cluster', 'Worker #%s [pid:%s] died', worker.id, worker.process.pid);
        setTimeout(function() {
            cluster.fork();
        }, 1000);
    });

    // Fork a single worker
    cluster.fork();
    return;
}

//  WORKER process

var express = require('express');
var compression = require('compression');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var net = require('net');

// Setup logger. Stream all http logs to general logger
app.use(require('morgan')(config.log.http, {
    'stream': {
        'write': function(line) {
            if ((line = (line || '').trim())) {
                log.http('express', line);
            }
        }
    }
}));

// Do not advertise Express
app.disable('x-powered-by');

//
// web server config
//

var development = (process.argv[2] === '--dev');

// set HTTP headers
app.use(function(req, res, next) {
    // prevent rendering website in foreign iframe (Clickjacking)
    res.set('X-Frame-Options', 'DENY');
    // HSTS
    res.set('Strict-Transport-Security', 'max-age=16070400; includeSubDomains');
    // CSP
    var iframe = development ? "http://" + req.hostname + ":" + config.server.port : "https://" + req.hostname; // allow iframe to load assets
    var csp = "default-src 'self' " + iframe + "; object-src 'none'; connect-src *; style-src 'self' 'unsafe-inline' " + iframe + "; img-src *";
    res.set('Content-Security-Policy', csp);
    res.set('X-Content-Security-Policy', csp);
    // set Cache-control Header (for AppCache)
    res.set('Cache-control', 'public, max-age=0');
    next();
});
app.use('/service-worker.js', noCache);
app.use('/appcache.manifest', noCache);

function noCache(req, res, next) {
    res.set('Cache-control', 'no-cache');
    next();
}
app.use('/tpl/read-sandbox.html', function(req, res, next) {
    res.set('X-Frame-Options', 'SAMEORIGIN');
    next();
});

// redirect all http traffic to https
app.use(function(req, res, next) {
    if ((!req.secure) && (req.get('X-Forwarded-Proto') !== 'https') && !development) {
        res.redirect('https://' + req.hostname + req.url);
    } else {
        next();
    }
});

// use gzip compression
app.use(compression());

// server static files
app.use(express.static(__dirname + '/dist'));

//
// Socket.io proxy
//

io.on('connection', function(socket) {
    log.info('io', 'New connection [%s] from %s', socket.conn.id, socket.conn.remoteAddress);

    socket.on('open', function(data, fn) {
        if (!development && config.server.outboundPorts.indexOf(data.port) < 0) {
            log.info('io', 'Open request to %s:%s was rejected, closing [%s]', data.host, data.port, socket.conn.id);
            socket.disconnect();
            return;
        }

        log.verbose('io', 'Open request to %s:%s [%s]', data.host, data.port, socket.conn.id);
        var tcp = net.connect(data.port, data.host, function() {
            log.verbose('io', 'Opened tcp connection to %s:%s [%s]', data.host, data.port, socket.conn.id);

            tcp.on('data', function(chunk) {
                log.silly('io', 'Received %s bytes from %s:%s [%s]', chunk.length, data.host, data.port, socket.conn.id);
                socket.emit('data', chunk);
            });

            tcp.on('error', function(err) {
                log.verbose('io', 'Error for %s:%s [%s]: %s', data.host, data.port, socket.conn.id, err.message);
                socket.emit('error', err.message);
            });

            tcp.on('end', function() {
                socket.emit('end');
            });

            tcp.on('close', function() {
                log.verbose('io', 'Closed tcp connection to %s:%s [%s]', data.host, data.port, socket.conn.id);
                socket.emit('close');

                socket.removeAllListeners('data');
                socket.removeAllListeners('end');
            });

            socket.on('data', function(chunk, fn) {
                if (!chunk || !chunk.length) {
                    if (typeof fn === 'function') {
                        fn();
                    }
                    return;
                }
                log.silly('io', 'Sending %s bytes to %s:%s [%s]', chunk.length, data.host, data.port, socket.conn.id);
                tcp.write(chunk, function() {
                    if (typeof fn === 'function') {
                        fn();
                    }
                });
            });

            socket.on('end', function() {
                log.verbose('io', 'Received request to close connection to %s:%s [%s]', data.host, data.port, socket.conn.id);
                tcp.end();
            });

            if (typeof fn === 'function') {
                fn(os.hostname());
            }

            socket.on('disconnect', function() {
                log.verbose('io', 'Closed connection [%s], closing connection to %s:%s ', socket.conn.id, data.host, data.port);
                tcp.end();
                socket.removeAllListeners();
            });
        });
    });
});

//
// start server
//

server.listen(config.server.port);
if (development) {
    console.log(' > starting in development mode');
}
console.log(' > listening on http://localhost:' + config.server.port + '\n');