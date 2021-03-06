'use strict';

var fs = require('fs'),
    path = require('path');

/* jshint node:true */
/* jshint browser:false */

var StringReplacePlugin = require('string-replace-webpack-plugin');

module.exports = function(grunt) {
    require('time-grunt')(grunt);
    require('load-grunt-tasks')(grunt);
    grunt.loadTasks('grunt/tasks');

    var webpack = require('webpack');
    var pkg = require('./package.json');
    var dt = new Date().toISOString().replace(/T.*/, '');
    var minElectronVersionForUpdate = '1.0.1';
    var zipCommentPlaceholder = 'zip_comment_placeholder_that_will_be_replaced_with_hash';
    var electronVersion = pkg.devDependencies['electron-prebuilt'].replace(/^\D/, '');

    while (zipCommentPlaceholder.length < 512) {
        zipCommentPlaceholder += '.';
    }

    function replaceFont(css) {
        css.walkAtRules('font-face', function (rule) {
            var fontFamily = rule.nodes.filter(function(n) { return n.prop === 'font-family'; })[0];
            if (!fontFamily) {
                throw 'Bad font rule: ' + rule.toString();
            }
            var value = fontFamily.value.replace(/["']/g, '');
            var fontFiles = {
                FontAwesome: 'fontawesome-webfont.woff'
            };
            var fontFile = fontFiles[value];
            if (!fontFile) {
                throw 'Unsupported font ' + value + ': ' + rule.toString();
            }
            var data = fs.readFileSync('tmp/fonts/' + fontFile, 'base64');
            var src = 'url(data:application/font-woff;charset=utf-8;base64,{data}) format(\'woff\')'
                .replace('{data}', data);
            //var src = 'url(\'../fonts/fontawesome-webfont.woff\') format(\'woff\')';
            rule.nodes = rule.nodes.filter(function(n) { return n.prop !== 'src'; });
            rule.append({ prop: 'src', value: src });
        });
    }

    grunt.initConfig({
        gitinfo: {
            branch: {
                current: {
                    SHA: 'Current HEAD SHA',
                    shortSHA: 'Current HEAD short SHA',
                    name: 'Current branch name',
                    lastCommitTime: 'Last commit time'
                }
            }
        },
        'bower-install-simple': {
            install: {
            }
        },
        clean: {
            dist: ['dist', 'tmp'],
            'desktop_dist': ['dist/desktop'],
            'desktop_tmp': ['tmp/desktop']
        },
        copy: {
            html: {
                src: 'app/index.html',
                dest: 'tmp/index.html',
                nonull: true
            },
            favicon: {
                src: 'app/favicon.png',
                dest: 'tmp/favicon.png',
                nonull: true
            },
            touchicon: {
                src: 'app/touchicon.png',
                dest: 'tmp/touchicon.png',
                nonull: true
            },
            fonts: {
                src: 'bower_components/font-awesome/fonts/fontawesome-webfont.*',
                dest: 'tmp/fonts/',
                nonull: true,
                expand: true,
                flatten: true
            },
            'desktop_app_content': {
                cwd: 'electron/',
                src: '**',
                dest: 'tmp/desktop/app/',
                expand: true,
                nonull: true
            },
            'desktop_windows_helper': {
                src: 'helper/win32/KeeWebHelper.exe',
                dest: 'tmp/desktop/app/',
                nonull: true
            },
            'desktop_osx': {
                src: 'tmp/desktop/mac/KeeWeb-' + pkg.version + '.dmg',
                dest: 'dist/desktop/KeeWeb.mac.dmg',
                nonull: true
            },
            'desktop_win': {
                src: 'tmp/desktop/win-ia32/KeeWeb Setup ' + pkg.version + '-ia32.exe',
                dest: 'dist/desktop/KeeWeb.win32.exe',
                nonull: true
            },
            'desktop_linux_x64': {
                src: 'tmp/desktop/KeeWeb.linux.x64.zip',
                dest: 'dist/desktop/KeeWeb.linux.x64.zip',
                nonull: true
            },
            'desktop_linux_ia32': {
                src: 'tmp/desktop/KeeWeb.linux.ia32.zip',
                dest: 'dist/desktop/KeeWeb.linux.ia32.zip',
                nonull: true
            },
            'desktop_linux_deb_x64': {
                src: 'tmp/desktop/keeweb-desktop_*_amd64.deb',
                dest: 'dist/desktop/KeeWeb.linux.x64.deb',
                nonull: true
            }
        },
        jshint: {
            options: {
                jshintrc: true
            },
            all: ['app/scripts/**/*.js']
        },
        sass: {
            options: {
                sourceMap: false,
                includePaths: ['./bower_components']
            },
            dist: {
                files: {
                    'tmp/css/main.css': 'app/styles/main.scss'
                }
            }
        },
        postcss: {
            options: {
                processors: [
                    replaceFont,
                    require('cssnano')({discardComments: {removeAll: true}})
                ]
            },
            dist: {
                src: 'tmp/css/main.css',
                dest: 'tmp/css/main.css'
            }
        },
        inline: {
            app: {
                src: 'tmp/index.html',
                dest: 'tmp/app.html'
            }
        },
        htmlmin: {
            options: {
                removeComments: true,
                collapseWhitespace: true
            },
            app: {
                files: {
                    'dist/index.html': 'tmp/app.html'
                }
            }
        },
        'string-replace': {
            manifest: {
                options: {
                    replacements: [
                        { pattern: '# YYYY-MM-DD:v0.0.0', replacement: '# ' + dt + ':v' + pkg.version },
                        { pattern: '# updmin:v0.0.0', replacement: '# updmin:v' + minElectronVersionForUpdate }
                    ]
                },
                files: { 'dist/manifest.appcache': 'app/manifest.appcache' }
            },
            'manifest_html': {
                options: { replacements: [{ pattern: '<html', replacement: '<html manifest="manifest.appcache"' }] },
                files: { 'dist/index.html': 'dist/index.html' }
            },
            'desktop_html': {
                options: { replacements: [{ pattern: ' manifest="manifest.appcache"', replacement: '' }] },
                files: { 'tmp/desktop/app/index.html': 'dist/index.html' }
            }
        },
        webpack: {
            js: {
                entry: {
                    app: 'app',
                    vendor: ['jquery', 'underscore', 'backbone', 'kdbxweb', 'baron', 'dropbox', 'pikaday', 'filesaver', 'qrcode']
                },
                output: {
                    path: 'tmp/js',
                    filename: 'app.js'
                },
                stats: {
                    colors: false,
                    modules: true,
                    reasons: true
                },
                progress: false,
                failOnError: true,
                resolve: {
                    root: [path.join(__dirname, 'app/scripts'), path.join(__dirname, 'bower_components')],
                    alias: {
                        backbone: 'backbone/backbone-min.js',
                        underscore: 'underscore/underscore-min.js',
                        _: 'underscore/underscore-min.js',
                        jquery: 'jquery/dist/jquery.min.js',
                        hbs: 'handlebars/runtime.js',
                        kdbxweb: 'kdbxweb/dist/kdbxweb.js',
                        dropbox: 'dropbox/lib/dropbox.min.js',
                        baron: 'baron/baron.min.js',
                        pikaday: 'pikaday/pikaday.js',
                        filesaver: 'FileSaver.js/FileSaver.min.js',
                        qrcode: 'jsqrcode/dist/qrcode.min.js',
                        templates: path.join(__dirname, 'app/templates')
                    }
                },
                module: {
                    loaders: [
                        { test: /\.hbs$/, loader: StringReplacePlugin.replace('handlebars-loader', { replacements: [{
                            pattern: /\r?\n\s*/g,
                            replacement: function() { return '\n'; }
                        }]})},
                        { test: /runtime\-info\.js$/, loader: StringReplacePlugin.replace({ replacements: [
                            { pattern: /@@VERSION/g, replacement: function() { return pkg.version; } },
                            { pattern: /@@DATE/g, replacement: function() { return dt; } },
                            { pattern: /@@COMMIT/g, replacement: function() { return grunt.config.get('gitinfo.local.branch.current.shortSHA'); } }
                        ]})},
                        { test: /baron(\.min)?\.js$/, loader: 'exports?baron; delete window.baron;' },
                        { test: /pikadat\.js$/, loader: 'uglify' },
                        { test: /handlebars/, loader: 'strip-sourcemap-loader' }
                    ]
                },
                plugins: [
                    new webpack.optimize.CommonsChunkPlugin('vendor', 'vendor.js'),
                    new webpack.BannerPlugin('keeweb v' + pkg.version + ', (c) 2015 ' + pkg.author.name +
                        ', opensource.org/licenses/' + pkg.license),
                    new webpack.optimize.OccurenceOrderPlugin(),
                    new webpack.ProvidePlugin({ _: 'underscore', $: 'jquery' }),
                    new webpack.IgnorePlugin(/^(moment)$/),
                    new StringReplacePlugin()
                ],
                node: {
                    console: false,
                    process: false,
                    Buffer: false,
                    __filename: false,
                    __dirname: false
                },
                externals: {
                    xmldom: 'null'
                }
            }
        },
        uglify: {
            options: {
                preserveComments: false
            },
            app: {
                files: { 'tmp/js/app.js': ['tmp/js/app.js'] }
            },
            vendor: {
                options: {
                    mangle: false,
                    compress: false
                },
                files: { 'tmp/js/vendor.js': ['tmp/js/vendor.js'] }
            }
        },
        watch: {
            options: {
                interrupt: true,
                debounceDelay: 500
            },
            scripts: {
                files: ['app/scripts/**/*.js', 'app/templates/**/*.hbs'],
                tasks: ['webpack']
            },
            styles: {
                files: 'app/styles/**/*.scss',
                tasks: ['sass']
            },
            indexhtml: {
                files: 'app/index.html',
                tasks: ['copy:html']
            }
        },
        electron: {
            options: {
                name: 'KeeWeb',
                dir: 'tmp/desktop/app',
                out: 'tmp/desktop',
                version: electronVersion,
                overwrite: true,
                'app-version': pkg.version,
                'build-version': '<%= gitinfo.local.branch.current.shortSHA %>'
            },
            linux64: {
                options: {
                    platform: 'linux',
                    arch: 'x64',
                    icon: 'graphics/app.ico'
                }
            },
            linux32: {
                options: {
                    platform: 'linux',
                    arch: 'ia32',
                    icon: 'graphics/app.ico'
                }
            }
        },
        'electron-builder': {
            options: {
                publish: 'never',
                dist: false,
                projectDir: __dirname,
                appDir: 'tmp/desktop/app',
                sign: false
            },
            osx: {
                options: {
                    platforms: ['osx'],
                    arch: 'x64'
                }
            },
            win: {
                options: {
                    platform: ['win32'],
                    arch: 'ia32'
                }
            }
            // linux64: {
            //     options: {
            //         platform: ['linux'],
            //         arch: 'x64'
            //     }
            // },
            // linux32: {
            //     options: {
            //         platform: ['linux'],
            //         arch: 'ia32'
            //     }
            // }
        },
        compress: {
            linux64: {
                options: { archive: 'tmp/desktop/KeeWeb.linux.x64.zip' },
                files: [{ cwd: 'tmp/desktop/KeeWeb-linux-x64', src: '**', expand: true }]
            },
            linux32: {
                options: { archive: 'tmp/desktop/KeeWeb.linux.ia32.zip' },
                files: [{ cwd: 'tmp/desktop/KeeWeb-linux-ia32', src: '**', expand: true }]
            },
            'desktop_update': {
                options: { archive: 'dist/desktop/UpdateDesktop.zip', comment: zipCommentPlaceholder },
                files: [{ cwd: 'tmp/desktop/app', src: '**', expand: true }]
            }
        },
        deb: {
            linux64: {
                options: {
                    tmpPath: 'tmp/desktop/',
                    package: {
                        name: 'keeweb-desktop',
                        version: pkg.version,
                        description: pkg.description,
                        author: pkg.author,
                        homepage: pkg.homepage,
                        rev: function() { return grunt.config.get('gitinfo.local.branch.current.shortSHA'); }
                    },
                    info: {
                        arch: 'amd64',
                        targetDir: 'tmp/desktop',
                        appName: 'KeeWeb',
                        scripts: {
                            postinst: 'package/deb/scripts/postinst'
                        }
                    }
                },
                files: [
                    {
                        cwd: 'package/deb/usr',
                        src: '**',
                        dest: '/usr',
                        expand: true,
                        nonull: true
                    },
                    {
                        cwd: 'tmp/desktop/KeeWeb-linux-x64/',
                        src: '**',
                        dest: '/opt/keeweb-desktop',
                        expand: true,
                        nonull: true
                    },
                    {
                        src: 'graphics/128x128.png',
                        dest: '/usr/share/icons/hicolor/128x128/apps/keeweb.png',
                        nonull: true
                    }]
            }
        },
        'sign-archive': {
            'desktop_update': {
                options: {
                    file: 'dist/desktop/UpdateDesktop.zip',
                    signature: zipCommentPlaceholder,
                    privateKey: 'keys/private-key.pem'
                }
            }
        },
        'validate-desktop-update': {
            desktop: {
                options: {
                    file: 'dist/desktop/UpdateDesktop.zip',
                    expected: ['main.js', 'app.js', 'index.html', 'package.json', 'node_modules/node-stream-zip/node_stream_zip.js'],
                    publicKey: 'app/resources/public-key.pem'
                }
            }
        },
        'sign-html': {
            'app': {
                options: {
                    file: 'dist/index.html',
                    privateKey: 'keys/private-key.pem'
                }
            }
        },
        'sign-exe': {
            'win-installer': {
                options: {
                    file: 'tmp/desktop/win-ia32/KeeWeb Setup ' + pkg.version + '-ia32.exe',
                    spc: 'keys/code-sign-win32.spc',
                    pvk: 'keys/code-sign-win32.pvk',
                    algo: 'sha1',
                    name: 'KeeWeb Setup',
                    url: pkg.homepage
                }
            }
        }
    });

    grunt.registerTask('default', [
        'gitinfo',
        'bower-install-simple',
        'clean',
        'jshint',
        'copy:html',
        'copy:favicon',
        'copy:touchicon',
        'copy:fonts',
        'webpack',
        'uglify',
        'sass',
        'postcss',
        'inline',
        'htmlmin',
        'string-replace:manifest_html',
        'string-replace:manifest',
        'sign-html'
    ]);

    grunt.registerTask('desktop', [
        'default',
        'gitinfo',
        'clean:desktop_tmp',
        'clean:desktop_dist',
        'copy:desktop_app_content',
        'string-replace:desktop_html',
        'compress:desktop_update',
        'sign-archive:desktop_update',
        'validate-desktop-update',
        'electron',
        'electron-builder:osx',
        'copy:desktop_windows_helper',
        'electron-builder:win',
        'compress:linux64',
        'compress:linux32',
        'deb:linux64',
        'sign-exe:win-installer',
        'copy:desktop_osx',
        'copy:desktop_win',
        'copy:desktop_linux_x64',
        'copy:desktop_linux_ia32',
        'copy:desktop_linux_deb_x64',
        'clean:desktop_tmp'
    ]);
};
