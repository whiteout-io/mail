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
            }
        },
        copy: {
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
            js: {
                expand: true,
                flatten: true,
                src: ['src/js/*'],
                dest: 'dist/js/'
            },
            tpl: {
                expand: true,
                flatten: true,
                src: ['src/tpl/*'],
                dest: 'dist/tpl/'
            },
            lib: {
                expand: true,
                flatten: true,
                src: ['src/lib/*'],
                dest: 'dist/lib/'
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

    // Default task(s).
    grunt.registerTask('dev', ['connect:dev']);
    grunt.registerTask('test', ['jshint', 'connect:test', 'mocha', 'qunit']);
    grunt.registerTask('prod', ['connect:prod']);

    grunt.registerTask('dist-css', ['sass', 'autoprefixer', 'csso']);
    grunt.registerTask('dist-font', ['copy']);
    grunt.registerTask('dist', ['clean', 'dist-css', 'dist-font']);
    grunt.registerTask('default', ['dist']);

};