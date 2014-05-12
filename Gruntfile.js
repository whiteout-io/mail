module.exports = function(grunt) {
    'use strict';

    var version = grunt.option('release'),
        zipName = (version) ? version : 'DEV';

    // Project configuration.
    grunt.initConfig({
        connect: {
            dev: {
                options: {
                    port: 8580,
                    base: '.',
                    keepalive: true
                }
            },
            test: {
                options: {
                    port: 8581,
                    base: '.'
                }
            },
            prod: {
                options: {
                    port: process.env.PORT || 8585,
                    base: './dist/',
                    keepalive: true,
                    middleware: function(connect, options) {
                        // Return array of whatever middlewares you want
                        return [
                            function(req, res, next) {
                                res.setHeader('Content-Security-Policy', "default-src 'self'; object-src 'none'; connect-src 'self' https://keys.whiteout.io; img-src 'self' data:;");

                                return next();
                            },

                            // Serve static files.
                            connect.static(options.base)
                        ];
                    }
                }
            }
        },

        jshint: {
            all: ['Gruntfile.js', 'src/*.js', 'src/js/**/*.js', 'test/new-unit/*.js', 'test/unit/*.js', 'test/integration/*.js'],
            options: {
                jshintrc: '.jshintrc'
            }
        },

        qunit: {
            all: {
                options: {
                    timeout: 20000,
                    urls: ['http://localhost:<%= connect.test.options.port %>/test/unit/index.html'
                        /*,
                            'http://localhost:<%= connect.test.options.port %>/test/integration/index.html'*/
                    ]
                }
            }
        },

        mocha: {
            all: {
                options: {
                    urls: ['http://localhost:<%= connect.test.options.port %>/test/new-unit/index.html'],
                    run: false,
                    reporter: 'Spec'
                }
            }
        },

        clean: {
            dist: ['dist', 'src/lib/*.js', 'test/lib', 'test/integration/src']
        },
        sass: {
            dist: {
                files: {
                    'src/css/all.css': 'src/sass/all.scss'
                }
            }
        },
        autoprefixer: {
            options: {
                browsers: ['last 2 versions']
            },
            dist: {
                files: {
                    'src/css/all.css': 'src/css/all.css'
                }
            }
        },
        csso: {
            options: {
                banner: '/*! Copyright © 2013, Whiteout Networks GmbH. All rights reserved.*/\n'
            },
            dist: {
                files: {
                    'dist/css/all.min.css': 'src/css/all.css'
                }
            }
        },
        watch: {
            css: {
                files: ['src/sass/**/*.scss'],
                tasks: ['dist-css']
            },
            js: {
                files: ['src/js/**/*.js'],
                tasks: ['copy:js']
            },
            lib: {
                files: ['src/lib/**/*.js'],
                tasks: ['copy:lib']
            },
            app: {
                files: ['src/*.js', 'src/**/*.html', 'src/**/*.json', 'src/img/**/*', 'src/font/**/*'],
                tasks: ['copy:app', 'copy:ca', 'copy:tpl', 'copy:img', 'copy:font', 'manifest-dev']
            }
        },
        copy: {
            npm: {
                expand: true,
                flatten: true,
                cwd: 'node_modules/',
                src: [
                    'requirejs/require.js',
                    'imap-client/src/*.js',
                    'imap-client/node_modules/browserbox/src/*.js',
                    'imap-client/node_modules/browserbox/node_modules/imap-handler/src/*.js',
                    'imap-client/node_modules/browserbox/node_modules/mimefuncs/src/*.js',
                    'imap-client/node_modules/browserbox/node_modules/tcp-socket/src/*.js',
                    'imap-client/node_modules/browserbox/node_modules/utf7/src/*.js',
                    'mailreader/src/*.js',
                    'mailreader/node_modules/mimeparser/src/*.js',
                    'mailreader/node_modules/mimeparser/node_modules/addressparser/src/*.js',
                    'pgpbuilder/src/*.js',
                    'pgpbuilder/node_modules/mailbuild/src/*.js',
                    'pgpbuilder/node_modules/mailbuild/node_modules/mimetypes/src/*.js',
                    'pgpbuilder/node_modules/mailbuild/node_modules/punycode/punycode.min.js',
                    'pgpmailer/src/*.js',
                    'pgpmailer/node_modules/smtpclient/src/*.js',
                    'pgpmailer/node_modules/smtpclient/node_modules/stringencoding/dist/stringencoding.js'
                ],
                dest: 'src/lib/'
            },
            npmDev: {
                expand: true,
                flatten: true,
                cwd: 'node_modules/',
                src: ['requirejs/require.js', 'mocha/mocha.css', 'mocha/mocha.js', 'chai/chai.js', 'sinon/pkg/sinon.js', 'angularjs/src/ngMock/angular-mocks.js'],
                dest: 'test/lib/'
            },
            cryptoLib: {
                expand: true,
                cwd: 'node_modules/crypto-lib/src/',
                src: ['*.js'],
                dest: 'src/js/crypto/'
            },
            lib: {
                expand: true,
                cwd: 'src/lib/',
                src: ['**'],
                dest: 'dist/lib/'
            },
            js: {
                expand: true,
                cwd: 'src/js/',
                src: ['**'],
                dest: 'dist/js/'
            },
            font: {
                expand: true,
                cwd: 'src/font/',
                src: ['*'],
                dest: 'dist/font/'
            },
            img: {
                expand: true,
                cwd: 'src/img/',
                src: ['*'],
                dest: 'dist/img/'
            },
            tpl: {
                expand: true,
                cwd: 'src/tpl/',
                src: ['*'],
                dest: 'dist/tpl/'
            },
            ca: {
                expand: true,
                cwd: 'src/ca/',
                src: ['*'],
                dest: 'dist/ca/'
            },
            app: {
                expand: true,
                cwd: 'src/',
                src: ['*.html', '*.js', '*.json'],
                dest: 'dist/'
            },
            integration: {
                expand: true,
                cwd: 'src/',
                src: ['**'],
                dest: 'test/integration/src/'
            }
        },

        compress: {
            main: {
                options: {
                    mode: 'zip',
                    archive: 'release/whiteout-mail_' + zipName + '.zip'
                },
                expand: true,
                cwd: 'dist/',
                src: ['**/*'],
                dest: 'release/'
            },
            nodeWebkit: {
                options: {
                    mode: 'zip',
                    archive: 'release/whiteout-mail_' + zipName + '.nw'
                },
                expand: true,
                cwd: 'dist/',
                src: ['**/*'],
                dest: '/'
            }
        },

        nodewebkit: {
            options: {
                version: '0.9.2', // node-webkit version
                build_dir: './release/node-webkit/', // Where the build version of my node-webkit app is saved
                mac: true, // We want to build it for mac
                win: false, // We want to build it for win
                linux32: false, // We don't need linux32
                linux64: false, // We don't need linux64
            },
            src: ['./dist/**/*'] // Your node-webkit app
        },
    });

    // Load the plugin(s)
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-mocha');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-csso');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-autoprefixer');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-node-webkit-builder');

    // Build tasks
    grunt.registerTask('dist-npm', ['copy:npm', 'copy:npmDev', 'copy:cryptoLib']);
    grunt.registerTask('dist-css', ['sass', 'autoprefixer', 'csso']);
    grunt.registerTask('dist-copy', ['copy']);
    grunt.registerTask('dist', ['clean', 'dist-npm', 'dist-css', 'dist-copy']);

    // Test/Dev tasks
    grunt.registerTask('dev', ['connect:dev']);
    grunt.registerTask('test', ['jshint', 'connect:test', 'mocha']);
    grunt.registerTask('prod', ['connect:prod']);

    //
    // Release tasks for Chrome App Release Channels
    //

    grunt.registerTask('manifest-dev', function() {
        patchManifest({
            suffix: ' (DEV)',
            version: '9999.9999.9999.9999'
        });
    });
    grunt.registerTask('manifest-test', function() {
        if (!version) {
            throw new Error('You must specify the version: "--release=1.0"');
        }

        patchManifest({
            suffix: ' (TEST)',
            client_id: '440907777130-bfpgo5fbo4f7hetrg3hn57qolrtubs0u.apps.googleusercontent.com',
            version: version,
            deleteKey: true
        });
    });
    grunt.registerTask('manifest-stable', function() {
        if (!version) {
            throw new Error('You must specify the version: "--release=1.0"');
        }

        patchManifest({
            suffix: ' (Beta)',
            version: version,
            deleteKey: true,
            keyServer: 'https://keys.whiteout.io/'
        });
    });

    function patchManifest(options) {
        var fs = require('fs'),
            path = './dist/manifest.json',
            manifest = require(path);

        if (options.version) {
            manifest.version = options.version;
        }
        if (options.suffix) {
            manifest.name += options.suffix;
        }
        if (options.client_id) {
            manifest.oauth2.client_id = options.client_id;
        }
        if (options.keyServer) {
            var ksIndex = manifest.permissions.indexOf('https://keys-test.whiteout.io/');
            manifest.permissions[ksIndex] = options.keyServer;
        }
        if (options.deleteKey) {
            delete manifest.key;
        }

        fs.writeFileSync(path, JSON.stringify(manifest, null, 2));
    }

    grunt.registerTask('release-dev', ['dist', 'manifest-dev', 'compress']);
    grunt.registerTask('release-test', ['dist', 'manifest-test', 'compress']);
    grunt.registerTask('release-stable', ['dist', 'manifest-stable', 'compress']);
    grunt.registerTask('default', ['release-dev']);

};