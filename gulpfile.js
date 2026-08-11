const projectName = "Tracker";

const gulp = require('gulp');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const cleanCSS = require('gulp-clean-css');
// const rename = require('gulp-rename');
const connect = require('gulp-connect');
const htmlmin = require('gulp-htmlmin');
const gulpIf = require('gulp-if');
const yargs = require('yargs');
const git = require('gulp-git');
const replace = require('gulp-replace');
const exec = require('child_process').exec;
// const rsync = require('gulp-rsync');
const del = require('del');
const eslint = require('gulp-eslint-new');
const jsValidate = require('gulp-jsvalidate');
const removeLogging = require('gulp-remove-logging');  // remove console.log

const config = require('./config.local.json');

const argv = yargs.argv;
let isProd = argv.prod; // Use `--prod` flag to enable production mode
let isDebug = argv.debug;  // Use --debug flag to NOT remove console.log
let isShuttingDown = false;

// Paths
const paths = {
    scripts:   ['web/js/**/*.js'],
    styles:    ['web/css/**/*.css'],
    html:      ['web/html/*.html'],

    // bootstrap: {
    //     style: {
    //         src: 'node_modules/bootstrap/dist/css/bootstrap.css',
    //         dest: 'dist/css/'
    //     },
    //     script: {
    //         src: 'node_modules/bootstrap/dist/js/bootstrap.min.js',
    //         dest: 'dist/js/'
    //     }
    // },
    // fontawesome: {
    //     style: {
    //         src: 'node_modules/font-awesome/css/font-awesome.css',
    //         dest: 'dist/font-awesome/css/'
    //     },
    //     fonts: {
    //         src: 'node_modules/font-awesome/fonts/*',
    //         dest: 'dist/font-awesome/fonts/'
    //     }
    // },
    // angular: {
    //     script: {
    //         src: ['node_modules/angular/angular.min.js','node_modules/angular-route/angular-route.min.js','node_modules/angular-cookies/angular-cookies.min.js'],
    //         dest: 'dist/js/'
    //     },
    // },
};

global.gitVersion = 'local';
gulp.task('gitInfo', function(cb) {  // cb is callback
    let gitVersion = "";
    git.exec({args: 'describe --tags --always --dirty', quiet: true}, function( err, stdout ) {
        if( err ) {
            console.error( "Error in git describe: ", err);
            return cb(err);
        }
        gitVersion = stdout.trim();
        git.revParse({args: '--abbrev-ref HEAD', quiet: true}, (err, branch) => {
            if( err ) {
                console.error( "Error in git rev-parse: ", err );
                return cb(err);
            }
            if( branch.trim() !== "master" ) {
                branch = branch.trim().replace(/\//g, "_");
                gitVersion += "-" + branch;
            }
            global.gitVersion = gitVersion;
            console.log( "global.gitVersion set to: ", global.gitVersion );
            isDebug = ( argv.debug || branch.trim() !== "master" );
            isProd = ( argv.prod || branch.trim() === "master" );
            cb();
        });
    });
});

// Task: Minify & Bundle JavaScript
gulp.task('scripts', function () {
    return gulp.src(paths.scripts)
        .pipe(gulpIf(isProd, removeLogging({verbose: true})))
        .pipe(gulpIf(!isDebug, removeLogging({verbose: true})))
        .pipe(eslint())
        // .pipe(jsValidate()
        //     .on('error', function( err ) {
        //         console.error("JS Validation Error:", err.message);
        //         this.emit('end'); }))
        .pipe(eslint.format())
        .pipe(eslint.failAfterError())
        .pipe(gulpIf(isProd, concat(`${projectName}.min.js`)))
        .pipe(gulpIf(!isProd, concat(`${projectName}.js`)))
        .pipe(gulp.dest('dist'))
        .pipe(gulpIf(isProd, uglify()))
        .pipe(gulpIf(isProd, gulp.dest('dist')))
        .pipe(connect.reload())
        .on('error', function( err ) {
            console.error("Error:", err.message);
            console.error( err );
            this.emit('end');
        });
});

// Task: Minify CSS
gulp.task('styles', function () {
    return gulp.src(paths.styles)
        .pipe(gulpIf(isProd, concat(`${projectName}.min.css`)))
        .pipe(gulpIf(!isProd, concat(`${projectName}.css`)))
        .pipe(gulp.dest('dist'))
        .pipe(gulpIf(isProd, cleanCSS()))
        .pipe(gulp.dest('dist'))
        .pipe(connect.reload());
});

// Task: Copy HTML Files
gulp.task('html-files', function () {
    return gulp.src(paths.html)
        .pipe(replace('@VERSION@', global.gitVersion))
        .pipe(gulpIf(isProd, replace(`${projectName}.js`, `${projectName}.min.js`)))
        .pipe(gulpIf(isProd, replace(`${projectName}.css`, `${projectName}.min.css`)))
        .pipe(gulpIf(isProd, htmlmin({ collapseWhitespace: true })))  // use the --prod to minify
        .pipe(gulp.dest('dist'))
        .pipe(connect.reload());
});
gulp.task('html', gulp.series('gitInfo', 'html-files'));

// vendor scripts
gulp.task('angular', function() {
    return gulp.src('node_modules/angular/angular.min.js')
        .pipe(gulp.dest('dist/js'));
});
gulp.task('bootstrap', function() {
    return gulp.src('node_modules/bootstrap/dist/js/bootstrap.min.js')
        .pipe(gulp.dest('dist/js'));
});
gulp.task('moment', function() {
    return gulp.src('node_modules/moment/moment.js')
        .pipe(gulp.dest('dist/js'));
});
gulp.task('angular-moment', function() {
    return gulp.src('node_modules/angular-moment/angular-moment.min.js')
        .pipe(gulp.dest('dist/js'));
});
gulp.task('datafile', function() {
    return new Promise(function (resolve, reject) {
        exec(`lua src/Tracker_Export.lua "${config.WoWAccountPath}" json > /tmp/Tracker.json`,
                function (err, stdout, stderr) {
            if (err) {
                console.error(stderr);
                return reject(err);
            }

            gulp.src('/tmp/Tracker.json')
                .pipe(gulp.dest('dist'))
                .on('end', resolve)
                .on('error', reject);
        });
    });
});
gulp.task('vendor', gulp.parallel('angular', 'bootstrap', 'moment', 'angular-moment', 'datafile'));


// Task: Clean the "dist" directory
gulp.task('clean', function () {
    return del(['dist/**', '!dist']); // Deletes all files inside dist, but keeps dist itself
});

// Task: Watch for Changes
gulp.task('watch', function () {
    gulp.watch(paths.scripts, gulp.series('scripts'));
    gulp.watch(paths.styles, gulp.series('styles'));
    gulp.watch(paths.html, gulp.series('html'));
});

// function bootstrap() {
//     gulp.src(paths.bootstrap.style.src)
//         .pipe(cleanCSS())
//         .pipe(gulp.dest(paths.bootstrap.style.dest));
//     return gulp.src(paths.bootstrap.script.src)
//         .pipe(gulp.dest(paths.bootstrap.script.dest));
// }

// function fontawesome() {
//     gulp.src(paths.fontawesome.fonts.src)
//         .pipe(gulp.dest(paths.fontawesome.fonts.dest));
//     return gulp.src(paths.fontawesome.style.src)
//         .pipe(cleanCSS())
//         .pipe(concat('font-awesome.min.css'))
//         .pipe(gulp.dest(paths.fontawesome.style.dest));
// }

// function angular() {
//     return gulp.src(paths.angular.script.src)
//         .pipe(gulp.dest(paths.angular.script.dest));
// }

// Task: Live Reload Server
gulp.task('serve', function () {
    // bootstrap();
    // fontawesome();
    // angular();
    connect.server({
        root: 'dist',
        livereload: true,
        open: false,
        notify: false,
        port: 8080,
        middleware: function () {
            return [
                function(req, res, next) {
                    if (req.url.indexOf('/server') === 0) {
                        console.log(`Proxying to PHP server: ${req.url}`); // Log the proxy action
                        // Proxy PHP requests (for example: /server/index.php)
                        httpProxy
                            .createProxyServer({ target: 'http://localhost:8000' })
                            .web(req, res);
                    } else {
                        next();
                    }
                },
                function (req, res, next) {
                    // 🚀 Disable ALL security policies
                    res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
                    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all CORS
                    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                    res.setHeader('Access-Control-Allow-Headers', '*');
                    // res.setHeader('Content-Security-Policy',
                    //     "default-src 'self' http: https: data: blob: filesystem: http://localhost:8080; " +
                    //     "script-src 'self' 'unsafe-inline' 'unsafe-eval' http: https: http://localhost:8080; " +
                    //     "style-src 'self' 'unsafe-inline' http: https: http://localhost:8080; " +
                    //     "media-src 'self' data: http: https: file: http://localhost:8080; " +
                    //     "img-src 'self' data: http: https: http://localhost:8080;");
                    next();
                },
                function customLogger(req, res, next) {
                    console.log(`Request: ${req.method} ${req.url}`);
                    next();
                },
                function delayResponse(req, res, next) {
                    setTimeout(() => {
                        next();
                    }, 500); // Adds a 500ms delay to simulate latency
                },
                 // Error Handling Middleware
                function errorHandler(err, req, res, next) {
                    if (err) {
                        const errorMsg = `[ERROR] ${new Date().toISOString()} ${req.method} ${req.url} - ${err.message}\n`;
                        console.error(errorMsg);

                        res.statusCode = 500;
                        res.end('Internal Server Error');
                    } else {
                        next();
                    }
                }
            ];
        }
    });
});

// Handle CTRL+C / SIGINT
process.on('SIGINT', () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('\n🛑 Gracefully shutting down servers...');

  try {
    connect.serverClose();
    console.log('🔌 Gulp connect server closed');
  } catch (e) {
    console.warn('Gulp connect was not running');
  }

  try {
    connectPHP.closeServer();
    console.log('🐘 PHP server closed');
  } catch (e) {
    console.warn('PHP server was not running or already closed');
  }

  process.exit();
});

// gulp.task

gulp.task('send', function () {
    return gulp.src(['dist/**/*','dist/.*'])
        .pipe(rsync({
            root: 'dist',
            hostname: 'macmini2',
            destination: '/Users/user/www/tracker',
            exclude: [".DS_Store"],
            recursive: true,
            silent: false,
            compress: true,
            incremental: true,
            clean: true,
            delete: true,
            progress: true,
            checksum: true
        }))
        .on('error', function(err) {
            console.log("Rsync Error:",err);
        });
});

gulp.task('watch-deploy', function () {
    gulp.watch(paths.scripts, gulp.series('scripts','send'));
    gulp.watch(paths.styles, gulp.series('styles','send'));
    gulp.watch(paths.html, gulp.series('html','send'));
})

// Default Task
gulp.task('default', gulp.parallel('scripts', 'styles', 'html')); // , 'server' ));
gulp.task('local', gulp.parallel('vendor', 'scripts', 'styles', 'html', 'watch', 'serve'));
gulp.task('deploy', gulp.series('default', 'send' ));
gulp.task('develop', gulp.series('clean', 'default', 'send', 'watch-deploy' ));
