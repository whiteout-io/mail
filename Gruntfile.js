module.exports = function(grunt) {
    'use strict';

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
                    base: './src/',
                    keepalive: true,
                    middleware: function(connect, options) {
                        // Return array of whatever middlewares you want
                        return [function(req, res, next) {
                                res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-eval'; connect-src *; object-src 'none'; style-src 'self' 'unsafe-inline'");
                                res.setHeader('X-Content-Security-Policy', "default-src *; script-src 'self' 'unsafe-eval'; options eval-script; object-src 'none'; style-src 'self' 'unsafe-inline'");
                                res.setHeader('X-WebKit-CSP', "default-src 'self'; script-src 'self' 'unsafe-eval'; connect-src *; object-src 'none'; style-src 'self' 'unsafe-inline'");

                                return next();
                            },

                            // Serve static files.
                            connect.static(options.base)];
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
                    run: false
                }
            }
        },

        clean: {
            dist: ['dist']
        },
        sass: {
            dist: {
                files: {
                    'dist/css/all.css': 'src/sass/all.scss'
                }
            }
        },
        autoprefixer: {
            options: {
                browsers: ['last 2 versions']
            },
            dist: {
                files: {
                    'dist/css/all.css': 'dist/css/all.css'
                }
            }
        },
        csso: {
            options: {
                banner: '<%= banner %>'
            },
            dist: {
                files: {
                    'dist/css/all.min.css': 'dist/css/all.css'
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
                tasks: ['copy:app', 'copy:tpl', 'copy:img', 'copy:font']
            }
        },
        copy: {
            npm: {
                expand: true,
                flatten: true,
                src: ['node_modules/crypto-lib/node_modules/node-forge/js/*.js'],
                dest: 'src/lib/'
            },
            npmDev: {
                expand: true,
                flatten: true,
                src: ['node_modules/mocha/mocha.css', 'node_modules/mocha/mocha.js', 'node_modules/chai/chai.js', 'node_modules/sinon/pkg/sinon.js'],
                dest: 'test/new-unit/lib/'
            },
            cryptoLib: {
                expand: true,
                flatten: true,
                src: ['node_modules/crypto-lib/src/*.js'],
                dest: 'src/js/crypto/'
            },
            lib: {
                expand: true,
                flatten: true,
                src: ['src/lib/*'],
                dest: 'dist/lib/'
            },
            js: {
                expand: true,
                flatten: true,
                src: ['src/js/*'],
                dest: 'dist/js/'
            },
            font: {
                expand: true,
                flatten: true,
                src: ['src/font/*'],
                dest: 'dist/font/'
            },
            img: {
                expand: true,
                flatten: true,
                src: ['src/img/*'],
                dest: 'dist/img/'
            },
            tpl: {
                expand: true,
                flatten: true,
                src: ['src/tpl/*'],
                dest: 'dist/tpl/'
            },
            app: {
                expand: true,
                flatten: true,
                src: ['src/*.html', 'src/*.js', 'src/manifest.json'],
                dest: 'dist/'
            }
        }
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

    // Build tasks
    grunt.registerTask('dist-npm', ['copy:npm', 'copy:npmDev', 'copy:cryptoLib']);
    grunt.registerTask('dist-css', ['sass', 'autoprefixer', 'csso']);
    grunt.registerTask('dist-copy', ['copy']);
    grunt.registerTask('dist', ['clean', 'dist-npm', 'dist-css', 'dist-copy']);
    grunt.registerTask('default', ['dist']);

    // Test/Dev tasks
    grunt.registerTask('dev', ['connect:dev']);
    grunt.registerTask('test', ['jshint', 'connect:test', 'mocha', 'qunit']);
    grunt.registerTask('prod', ['connect:prod']);

};