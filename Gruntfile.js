module.exports = function(grunt) {
    'use strict';

    require('time-grunt')(grunt);

    var version = grunt.option('release'),
        zipName = (version) ? version : 'DEV';

    var browserifyOpt = {
        exclude: ['openpgp', 'node-forge', 'net', 'tls', 'crypto'], // node apis not required at build time
        ignore: ['buffer'], // node apis to be stubbed for runtime
        browserifyOptions: {
            debug: true
        }
    };

    // Project configuration.
    grunt.initConfig({

        // General

        clean: {
            dist: ['dist', 'compile', 'test/lib', 'test/integration/src']
        },

        copy: {
            npmDev: {
                expand: true,
                flatten: true,
                cwd: './',
                src: [
                    'node_modules/mocha/mocha.css',
                    'node_modules/mocha/mocha.js',
                    'node_modules/chai/chai.js',
                    'node_modules/sinon/pkg/sinon.js',
                    'node_modules/browsercrow/src/*.js',
                    'node_modules/browsersmtp/src/*.js',
                    'src/lib/openpgp/openpgp.js',
                    'src/lib/openpgp/openpgp.worker.js',
                    'src/lib/forge/forge.min.js',
                    'dist/js/pbkdf2-worker.min.js'
                ],
                dest: 'test/lib/'
            },
            lib: {
                expand: true,
                flatten: true,
                cwd: 'src/lib/',
                src: ['openpgp/openpgp.js', 'openpgp/openpgp.worker.js', 'forge/forge.min.js'],
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
            app: {
                expand: true,
                cwd: 'src/',
                src: ['*.js', '*.json', 'manifest.*'],
                dest: 'dist/'
            }
        },

        // Stylesheets

        sass: {
            dist: {
                files: {
                    'src/css/read-sandbox.css': 'src/sass/read-sandbox.scss',
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
                    'src/css/read-sandbox.css': 'src/css/read-sandbox.css',
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
                    'dist/css/read-sandbox.min.css': 'src/css/read-sandbox.css',
                    'dist/css/all.min.css': 'src/css/all.css'
                }
            }
        },

        // JavaScript

        jshint: {
            all: ['Gruntfile.js', 'src/*.js', 'src/js/**/*.js', 'test/unit/*-test.js', 'test/integration/*-test.js'],
            options: {
                jshintrc: '.jshintrc'
            }
        },

        browserify: {
            app: {
                files: {
                    'dist/js/app.browserified.js': ['src/js/app.js']
                },
                options: browserifyOpt
            },
            pbkdf2Worker: {
                files: {
                    'dist/js/pbkdf2-worker.browserified.js': ['src/js/crypto/pbkdf2-worker.js']
                },
                options: browserifyOpt
            },
            mailreaderWorker: {
                files: {
                    'dist/js/mailreader-parser-worker.browserified.js': ['node_modules/mailreader/src/mailreader-parser-worker-browserify.js']
                },
                options: browserifyOpt
            },
            tlsWorker: {
                files: {
                    'dist/js/tcp-socket-tls-worker.browserified.js': ['node_modules/tcp-socket/src/tcp-socket-tls-worker.js']
                },
                options: browserifyOpt
            },
            unitTest: {
                files: {
                    'test/unit/index.browserified.js': [
                        'test/unit/oauth-test.js',
                        'test/unit/auth-test.js',
                        'test/unit/email-dao-test.js',
                        'test/unit/app-controller-test.js',
                        'test/unit/pgp-test.js',
                        'test/unit/crypto-test.js',
                        'test/unit/backbutton-handler-test.js',
                        'test/unit/rest-dao-test.js',
                        'test/unit/admin-dao-test.js',
                        'test/unit/publickey-dao-test.js',
                        'test/unit/privatekey-dao-test.js',
                        'test/unit/lawnchair-dao-test.js',
                        'test/unit/keychain-dao-test.js',
                        'test/unit/devicestorage-dao-test.js',
                        'test/unit/dialog-ctrl-test.js',
                        'test/unit/add-account-ctrl-test.js',
                        'test/unit/account-ctrl-test.js',
                        'test/unit/set-passphrase-ctrl-test.js',
                        'test/unit/contacts-ctrl-test.js',
                        'test/unit/login-existing-ctrl-test.js',
                        'test/unit/login-initial-ctrl-test.js',
                        'test/unit/login-new-device-ctrl-test.js',
                        'test/unit/login-privatekey-download-ctrl-test.js',
                        'test/unit/login-set-credentials-ctrl-test.js',
                        'test/unit/privatekey-upload-ctrl-test.js',
                        'test/unit/login-ctrl-test.js',
                        'test/unit/read-ctrl-test.js',
                        'test/unit/navigation-ctrl-test.js',
                        'test/unit/mail-list-ctrl-test.js',
                        'test/unit/write-ctrl-test.js',
                        'test/unit/outbox-bo-test.js',
                        'test/unit/invitation-dao-test.js',
                        'test/unit/update-handler-test.js',
                        'test/unit/connection-doctor-test.js',
                        'test/main.js'
                    ]
                },
                options: browserifyOpt
            },
            integrationTest: {
                files: {
                    'test/integration/index.browserified.js': [
                        'test/integration/email-dao-test.js',
                        'test/main.js'
                    ]
                },
                options: browserifyOpt
            }
        },

        exorcise: {
            app: {
                files: {
                    'dist/js/app.browserified.js.map': ['dist/js/app.browserified.js'],
                }
            },
            unitTest: {
                files: {
                    'test/unit/index.browserified.js.map': ['test/unit/index.browserified.js'],
                }
            },
            integrationTest: {
                files: {
                    'test/integration/index.browserified.js.map': ['test/integration/index.browserified.js'],
                }
            }
        },

        uglify: {
            app: {
                files: {
                    'dist/js/app.min.js': [
                        'src/lib/underscore/underscore-min.js',
                        'node_modules/jquery/dist/jquery.min.js',
                        'src/lib/angular/angular.min.js',
                        'src/lib/angular/angular-route.min.js',
                        'src/lib/angular/angular-animate.min.js',
                        'src/lib/ngtagsinput/ng-tags-input.min.js',
                        'node_modules/ng-infinite-scroll/build/ng-infinite-scroll.min.js',
                        'src/lib/fastclick/fastclick.js',
                        'src/lib/lawnchair/lawnchair-git.js',
                        'src/lib/lawnchair/lawnchair-adapter-webkit-sqlite-git.js',
                        'src/lib/lawnchair/lawnchair-adapter-indexed-db-git.js',
                        'dist/js/app.browserified.js'
                    ]
                },
                options: {
                    mangle: false,
                    sourceMap: true,
                    sourceMapIn: 'dist/js/app.browserified.js.map',
                    sourceMapIncludeSources: true,
                    sourceMapName: 'dist/js/app.min.js.map'
                }
            },
            readSandbox: {
                files: {
                    'dist/js/read-sandbox.min.js': [
                        'node_modules/dompurify/purify.js',
                        'src/js/controller/read-sandbox.js'
                    ]
                },
                options: {
                    sourceMap: true,
                    sourceMapName: 'dist/js/read-sandbox.min.js.map'
                }
            },
            pbkdf2Worker: {
                files: {
                    'dist/js/pbkdf2-worker.min.js': ['dist/js/pbkdf2-worker.browserified.js']
                }
            },
            mailreaderWorker: {
                files: {
                    'dist/js/mailreader-parser-worker.min.js': ['dist/js/mailreader-parser-worker.browserified.js']
                },
                options: {
                    sourceMap: true,
                    sourceMapName: 'dist/js/mailreader-parser-worker.min.js.map'
                }
            },
            tlsWorker: {
                files: {
                    'dist/js/tcp-socket-tls-worker.min.js': ['dist/js/tcp-socket-tls-worker.browserified.js']
                },
                options: {
                    sourceMap: true,
                    sourceMapName: 'dist/js/tcp-socket-tls-worker.min.js.map'
                }
            },
            unitTest: {
                files: {
                    'test/unit/index.js': [
                        'src/lib/underscore/underscore-min.js',
                        'node_modules/jquery/dist/jquery.min.js',
                        'src/lib/angular/angular.min.js',
                        'src/lib/angular/angular-route.min.js',
                        'src/lib/angular/angular-animate.min.js',
                        'node_modules/angularjs/src/ngMock/angular-mocks.js',
                        'src/lib/lawnchair/lawnchair-git.js',
                        'src/lib/lawnchair/lawnchair-adapter-webkit-sqlite-git.js',
                        'src/lib/lawnchair/lawnchair-adapter-indexed-db-git.js',
                        'test/unit/index.browserified.js'
                    ]
                },
                options: {
                    mangle: false,
                    sourceMap: true,
                    sourceMapIn: 'test/unit/index.browserified.js.map',
                    sourceMapIncludeSources: true,
                    sourceMapName: 'test/unit/index.js.map'
                }
            },
            integrationTest: {
                files: {
                    'test/integration/index.js': [
                        'src/lib/underscore/underscore-min.js',
                        'src/lib/lawnchair/lawnchair-git.js',
                        'src/lib/lawnchair/lawnchair-adapter-webkit-sqlite-git.js',
                        'src/lib/lawnchair/lawnchair-adapter-indexed-db-git.js',
                        'test/integration/index.browserified.js'
                    ]
                },
                options: {
                    mangle: false,
                    sourceMap: true,
                    sourceMapIn: 'test/integration/index.browserified.js.map',
                    sourceMapIncludeSources: true,
                    sourceMapName: 'test/integration/index.js.map'
                }
            },
            options: {
                banner: '/*! Copyright © <%= grunt.template.today("yyyy") %>, Whiteout Networks GmbH.*/\n'
            }
        },

        mocha_phantomjs: {
            all: {
                options: {
                    urls: [
                        'http://localhost:<%= connect.test.options.port %>/test/unit/index.html',
                        'http://localhost:<%= connect.test.options.port %>/test/integration/index.html'
                    ]
                }
            }
        },

        // Assets

        svgmin: {
            options: {
                plugins: [{
                    removeViewBox: false
                }, {
                    removeUselessStrokeAndFill: false
                }]
            },
            icons: {
                files: [{
                    expand: true,
                    src: ['img/icons/*.svg'],
                    cwd: 'src/',
                    dest: 'compile/'
                }]
            }
        },
        svgstore: {
            options: {
                prefix: 'icon-',
                svg: {
                    viewBox: '0 0 100 100',
                    xmlns: 'http://www.w3.org/2000/svg'
                },
                cleanup: ['fill', 'stroke']
            },
            icons: {
                files: {
                    'src/img/icons/all.svg': ['compile/img/icons/*.svg'],
                }
            }
        },
        'string-replace': {
            index: {
                files: {
                    'dist/index.html': 'src/index.html'
                },
                options: {
                    replacements: [{
                        pattern: /<!-- @import (.*?) -->/ig,
                        replacement: function(match, p1) {
                            return grunt.file.read('src/' + p1);
                        }
                    }]
                }
            }
        },

        // Development

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
            }
        },

        // Utilities

        watch: {
            css: {
                files: ['src/sass/**/*.scss'],
                tasks: ['dist-css']
            },
            js: {
                files: ['src/js/**/*.js'],
                tasks: ['copy:js', 'copy:integration']
            },
            icons: {
                files: ['src/index.html', 'src/img/icons/*.svg', '!src/img/icons/all.svg'],
                tasks: ['svgmin', 'svgstore', 'string-replace']
            },
            lib: {
                files: ['src/lib/**/*.js'],
                tasks: ['copy:lib']
            },
            app: {
                files: ['src/*.js', 'src/**/*.html', 'src/**/*.json', 'src/manifest.*', 'src/img/**/*', 'src/font/**/*'],
                tasks: ['copy:app', 'copy:ca', 'copy:tpl', 'copy:img', 'copy:font', 'manifest-dev']
            }
        },

        // Deployment

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
            }
        },

        manifest: {
            generate: {
                options: {
                    basePath: 'dist/',
                    timestamp: true,
                    hash: true,
                    cache: ['socket.io/socket.io.js'],
                    exclude: [
                        'appcache.manifest',
                        'manifest.webapp',
                        'js/app.min.js.map',
                        'js/app.browserified.js',
                        'js/app.browserified.js.map',
                        'js/crypto/pbkdf2-worker.browserified.js',
                        'js/pbkdf2-worker.browserified.js',
                        'js/read-sandbox.min.js.map',
                        'js/mailreader-parser-worker.browserified.js',
                        'js/mailreader-parser-worker.min.js.map',
                        'js/tcp-socket-tls-worker.browserified.js',
                        'js/tcp-socket-tls-worker.min.js.map'
                    ],
                    master: ['index.html']
                },
                src: ['**/*.*'],
                dest: 'dist/appcache.manifest'
            }
        }

    });

    // Load the plugin(s)
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-csso');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-autoprefixer');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-manifest');
    grunt.loadNpmTasks('grunt-mocha-phantomjs');
    grunt.loadNpmTasks('grunt-exorcise');
    grunt.loadNpmTasks('grunt-string-replace');
    grunt.loadNpmTasks('grunt-svgmin');
    grunt.loadNpmTasks('grunt-svgstore');

    // Build tasks
    grunt.registerTask('dist-css', ['sass', 'autoprefixer', 'csso']);
    grunt.registerTask('dist-js', ['browserify', 'exorcise', 'uglify']);
    grunt.registerTask('dist-copy', ['copy']);
    grunt.registerTask('dist-assets', ['svgmin', 'svgstore', 'string-replace']);
    grunt.registerTask('dist', ['clean', 'dist-css', 'dist-js', 'dist-assets', 'dist-copy', 'manifest']);

    // Test/Dev tasks
    grunt.registerTask('dev', ['connect:dev']);
    grunt.registerTask('test', ['jshint', 'connect:test', 'mocha_phantomjs']);
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
            version: version,
            deleteKey: true,
            keyServer: 'https://keys.whiteout.io/',
            keychainServer: 'https://keychain.whiteout.io/'
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
        if (options.keychainServer) {
            var kcsIndex = manifest.permissions.indexOf('https://keychain-test.whiteout.io/');
            manifest.permissions[kcsIndex] = options.keychainServer;
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