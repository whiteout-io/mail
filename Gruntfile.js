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
            }
        },

        jshint: {
            all: ['Gruntfile.js', 'src/*.js', 'src/js/**/*.js', 'test/unit/*.js', 'test/integration/*.js'],
            options: {
                jshintrc: '.jshintrc'
            }
        },

        mocha: {
            all: {
                options: {
                    urls: [
                        'http://localhost:<%= connect.test.options.port %>/test/unit/index.html',
                        'http://localhost:<%= connect.test.options.port %>/test/integration/index.html'
                    ],
                    run: false,
                    reporter: 'Spec',
                    log: false,

                    // phanotmjs is soooo slow
                    timeout: 100000
                }
            }
        },

        clean: {
            dist: ['dist', 'test/lib', 'test/integration/src']
        },

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
                banner: '/*! Copyright © <%= grunt.template.today("yyyy") %>, Whiteout Networks GmbH.*/\n'
            },
            dist: {
                files: {
                    'dist/css/read-sandbox.min.css': 'src/css/read-sandbox.css',
                    'dist/css/all.min.css': 'src/css/all.css'
                }
            }
        },

        watch: {
            css: {
                files: ['src/sass/**/*.scss'],
                tasks: ['dist-css', 'manifest']
            },
            js: {
                files: ['src/js/**/*.js'],
                tasks: ['dist-js', 'copy:integration', 'manifest']
            },
            lib: {
                files: ['src/lib/**/*.js'],
                tasks: ['copy:lib', 'manifest']
            },
            app: {
                files: ['src/*.js', 'src/**/*.html', 'src/**/*.json', 'src/manifest.*', 'src/img/**/*', 'src/font/**/*'],
                tasks: ['copy:app', 'copy:ca', 'copy:tpl', 'copy:img', 'copy:font', 'manifest-dev', 'manifest']
            }
        },

        browserify: {
            all: {
                files: {
                    'dist/js/app.min.js': ['src/js/app.js']
                },
                options: {
                    external: ['node-forge', 'net', 'tls'] // common.js apis not required at build time
                }
            },
            /* TODO:
            tls-worker: {},
            mailreader-worker: {},
            pbkdf2-worker: {},
            unitTest: {},
            unitTest: {},
            integrationTest: {}
            */
        },

        uglify: {
            all: {
                files: {
                    'dist/js/app.min.js': [
                        'src/lib/underscore/underscore-min.js',
                        'node_modules/jquery/dist/jquery.min.js',
                        'src/lib/angular/angular.min.js',
                        'src/lib/angular/angular-route.min.js',
                        'src/lib/angular/angular-animate.min.js',
                        'src/lib/ngtagsinput/ng-tags-input.min.js',
                        'src/lib/fastclick/fastclick.js',
                        'node_modules/ng-infinite-scroll/build/ng-infinite-scroll.min.js',
                        'src/lib/lawnchair/lawnchair-git.js',
                        'src/lib/lawnchair/lawnchair-adapter-webkit-sqlite-git.js',
                        'src/lib/lawnchair/lawnchair-adapter-indexed-db-git.js',
                        'node_modules/dompurify/purify.js',
                        'dist/js/app.min.js'
                    ]
                }
            },
            options: {
                banner: '/*! Copyright © <%= grunt.template.today("yyyy") %>, Whiteout Networks GmbH.*/\n'
            }
        },

        copy: {
            npmDev: {
                expand: true,
                flatten: true,
                cwd: 'node_modules/',
                src: ['requirejs/require.js', 'mocha/mocha.css', 'mocha/mocha.js', 'chai/chai.js', 'sinon/pkg/sinon.js', 'angularjs/src/ngMock/angular-mocks.js', 'browsercrow/src/*.js', 'browsersmtp/src/*.js'],
                dest: 'test/lib/'
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
                src: ['*.html', '*.js', '*.json', 'manifest.*'],
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
            }
        },

        manifest: {
            generate: {
                options: {
                    basePath: 'dist/',
                    timestamp: true,
                    hash: true,
                    cache: ['socket.io/socket.io.js'],
                    exclude: ['appcache.manifest', 'manifest.webapp'],
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
    grunt.loadNpmTasks('grunt-mocha');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-csso');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-autoprefixer');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-manifest');

    // Build tasks
    grunt.registerTask('dist-npm', ['copy:npmDev']);
    grunt.registerTask('dist-css', ['sass', 'autoprefixer', 'csso']);
    grunt.registerTask('dist-js', ['browserify', 'uglify']);
    grunt.registerTask('dist-copy', ['copy']);
    grunt.registerTask('dist', ['clean', 'dist-npm', 'dist-css', 'dist-js', 'dist-copy', 'manifest']);

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