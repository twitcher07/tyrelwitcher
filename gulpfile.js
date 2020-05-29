// generated on 2020-05-28 using generator-gulp-starter-kit 1.0.1


const $ = require('gulp-load-plugins')({ pattern: ['*'] });

const pkg = require('./package.json');

const gulp                      = require('gulp'),
      fs                        = require('fs'),
      log                       = require('fancy-log'),
      path                      = require('path'),
      autoprefixer              = require('autoprefixer'),
      webpack                   = require('webpack'),
      webpackStream             = require('webpack-stream'),
      purgecss                  = require('@fullhuman/postcss-purgecss'),
      browserSync               = $.browserSync.create(),

      // Paths to source of assets
      src_folder                = pkg.paths.srcFolder,
      src_asset_scss            = path.join(src_folder, '/scss/**/*.scss'),
      src_asset_js              = path.join(src_folder, '/js/**/*.js'),
      src_asset_img             = path.join(src_folder, '/images/**/*.+(png|jpg|jpeg|gif|svg|ico)'),
      src_asset_font            = path.join(src_folder, '/fonts/**/*.{eot,svg,ttf,woff,woff2}'),
      src_asset_html            = path.join(src_folder, '/**/*.html'),
      // Add any other assets that just need to be copied over to dist folder
      src_generic_assets        = [],

      // Paths you want to output assets to
      dist_folder               = pkg.paths.distFolder, // change to whatever root you want it to be.
      dist_css                  = path.join(dist_folder, '/css'),
      dist_js                   = path.join(dist_folder, '/js'),
      dist_img                  = path.join(dist_folder, '/images'),
      dist_font                 = path.join(dist_folder, '/fonts'),
      dist_html                 = path.join(dist_folder, '/**/*.{twig,html}'),

      templates_purgeCSS        = [
                                    path.join(src_folder, '/**/*.{twig,html}')
                                  ];

const isProd = process.env.NODE_ENV === 'production';

//for busting cache in serviceworker through version
function makeid() {
  return Math.random().toString(36).substr(2, 9);
}

const dist_generic_assets = [];

src_generic_assets.forEach((el) => {
  dist_generic_assets.push(el.replace(src_folder, dist_folder));
});

// Clean generated assets
gulp.task('clean', (cb) => {

  const all_dist = [dist_css, dist_js, dist_img, dist_font];

  log(`Deleting Files: ${all_dist}`);

  $.del(all_dist);

  cb();
});

gulp.task('generic-assets', (cb) => {
  if(src_generic_assets.length > 0) {
    gulp.src(src_generic_assets, {
      allowEmpty: true
    })
      .pipe(gulp.dest(dist_folder))
      .pipe(browserSync.stream())
  }
  cb();
});

gulp.task('images', () => {
  return gulp.src(src_asset_img, { since: gulp.lastRun('images') })
    .pipe($.imagemin({
      progressive: true,
      interlaced: true,

      // don't remove IDs from SVGs, they are often used
      // as hooks for embedding and styling
      svgoPlugins: [{cleanupIDs: false}],
      verbose: true
    }))
    .pipe($.size({showFiles: true}))
    .pipe(gulp.dest(dist_img))
    .pipe(browserSync.stream());
});

gulp.task('fonts', () => {
  return gulp.src(src_asset_font, {since: gulp.lastRun('fonts')})
    .pipe($.plumber())
    .pipe(gulp.dest(dist_font))
    .pipe(browserSync.stream());
});

gulp.task('html', () => {
  return gulp.src(src_asset_html, {
      base: src_folder,
      since: gulp.lastRun('html')
    })
    .pipe(gulp.dest(dist_folder));
});

gulp.task('inject-css-js', () => {
  const sources = gulp.src([path.join(dist_css, '**/*.css'), path.join(dist_js, '**/*.js')], {read: false});

  return gulp.src(dist_html)
    .pipe($.inject(sources, {
      ignorePath: dist_folder
    }))
    .pipe(gulp.dest(dist_folder))
    .pipe(browserSync.stream());
});

// Custom PurgeCSS extractor for Tailwind that allows special characters in
// class names.
//
// https://github.com/FullHuman/purgecss#extractor
const tailwindExtractor = (content) => {
  return content.match(/[A-z0-9-:\/]+/g);
}

const postcss_purgecss = purgecss({
  content: templates_purgeCSS,
  extractors: [{
    extractor: tailwindExtractor,
    extensions: ["html", "twig", "css", "js"]
  }],
  whitelist: [
    // whitelist css selectors
    'show', 
  ],
  whitelistPatterns: [
    // whitelist using regex patterns
    /flickity-.*\b/ 
  ]
});

gulp.task('postcss', () => {
  const f = $.filter(['.tmp/css/**/*.css'], {restore: true});

  return gulp.src(['.tmp/css/**/*.*'])
    .pipe(f)
    .pipe($.if(!isProd, $.sourcemaps.init()))
    .pipe($.postcss([
          $.tailwindcss(),
          isProd ? postcss_purgecss : false,
          $.autoprefixer(),
          isProd ? $.postcssClean() : false
        ].filter(Boolean)))
    .pipe($.if(!isProd, $.sourcemaps.write()))
    .pipe(f.restore)
    .pipe($.if(isProd, $.rename({ suffix: '.min' })))
    .pipe($.size({showFiles: true}))
    .pipe(gulp.dest(dist_css))
    .pipe(browserSync.stream());
});

gulp.task('sass', gulp.series(() => {
  return gulp.src(src_asset_scss, { since: gulp.lastRun('sass') })
    .pipe($.if(!isProd, $.sourcemaps.init()))
      .pipe($.plumber())
      .pipe($.dependents())
      .pipe($.sass())
    .pipe($.if(!isProd, $.sourcemaps.write()))
    .pipe(gulp.dest('.tmp/css'))
}, 'postcss'));

// Lint JavaScript
gulp.task('lint', () => {
  return gulp.src(src_asset_js, { since: gulp.lastRun('lint') })
    .pipe($.eslint())
    .pipe($.eslint.format())
    .pipe($.if(!browserSync.active, $.eslint.failAfterError()))
});

gulp.task('js', gulp.series('lint', () => {
  return gulp.src(src_asset_js, { since: gulp.lastRun('js') })
    .pipe($.plumber())
    .pipe(webpackStream({
      mode: isProd ? 'production' : 'development',
      output: {
        filename: isProd ? '[name].min.js' : '[name].js'
      },
      devtool: isProd ? false : 'cheap-source-map',
      module: {
        rules: [
          { 
            test: /\.js$/, 
            exclude: /(node_modules|bower_components)/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: ['@babel/preset-env']
              }
            }
          }        ]
      }
    }, webpack ))
    .pipe(gulp.dest(dist_js))
    .pipe(browserSync.stream());
}));

// service worker compile and copy
gulp.task('service-worker', function () {
  return gulp.src(path.join(src_folder, 'sw.js'))
    .pipe($.replace(/@@pwa-version@@/gm, 'version-' + makeid()))
    .pipe($.if(isProd, $.replace(/styles\.css/g, 'styles.min.css')))
    .pipe($.if(isProd, $.replace(/main\.js/g, 'main.min.js')))
    .pipe(gulp.dest(dist_folder))
});


// Generate the icons. This task takes a few seconds to complete.
// You should run it at least once to create the icons. Then,
// you should run it whenever RealFaviconGenerator updates its
// package (see the check-for-favicon-update task below).

// File where the favicon markups are stored
const favicon = path.join(src_folder, 'favicon260x260.png');
const FAVICON_DATA_FILE = path.join(__dirname, 'faviconData.json');
const theme_color = '#ffffff';
const favicon_bg = '#da532c';

gulp.task('generate-favicon', function(done) {
  $.realFavicon.generateFavicon({
    masterPicture: favicon,
    dest: dist_folder,
    iconsPath: '/',
    design: {
      ios: {
        pictureAspect: 'noChange',
        assets: {
          ios6AndPriorIcons: false,
          ios7AndLaterIcons: false,
          precomposedIcons: false,
          declareOnlyDefaultIcon: true
        }
      },
      desktopBrowser: {
        design: 'raw'
      },
      windows: {
        pictureAspect: 'noChange',
        backgroundColor: favicon_bg,
        onConflict: 'override',
        assets: {
          windows80Ie10Tile: false,
          windows10Ie11EdgeTiles: {
            small: false,
            medium: true,
            big: false,
            rectangle: false
          }
        }
      },
      androidChrome: {
        pictureAspect: 'noChange',
        themeColor: theme_color,
        manifest: {
          name: 'tyrelwitcher',
          startUrl: '/',
          display: 'standalone',
          orientation: 'notSet',
          onConflict: 'override',
          declared: true
        },
        assets: {
          legacyIcon: false,
          lowResolutionIcons: false
        }
      }
    },
    settings: {
      scalingAlgorithm: 'Mitchell',
      errorOnImageTooSmall: false,
      readmeFile: false,
      htmlCodeFile: true,
      usePathAsIs: false
    },
    markupFile: FAVICON_DATA_FILE
  }, function() {
    // Patch the original manifest
    done();
  });
});

// Inject the favicon markups in your HTML pages. You should run
// this task whenever you modify a page. You can keep this task
// as is or refactor your existing HTML pipeline.
gulp.task('inject-favicon-markups', function() {
  return gulp.src(dist_html)
    .pipe($.realFavicon.injectFaviconMarkups(JSON.parse(fs.readFileSync(FAVICON_DATA_FILE)).favicon.html_code))
    .pipe(gulp.dest(dist_folder));
});

// Check for updates on RealFaviconGenerator (think: Apple has just
// released a new Touch icon along with the latest version of iOS).
// Run this task from time to time. Ideally, make it part of your
// continuous integration system.
gulp.task('check-for-favicon-update', function(done) {
  var currentVersion = JSON.parse(fs.readFileSync(FAVICON_DATA_FILE)).version;
  $.realFavicon.checkForUpdates(currentVersion, function(err) {
    if (err) {
      throw err;
    }
  });

  done();
});

gulp.task('browser-sync', () => {
  return browserSync.init({
    server: {
      baseDir: [ dist_folder ]
    },
    port: 3000
  });
});

gulp.task('watch', () => {
  
  const watchVendor = [];

  gulp.watch(src_asset_html, gulp.series('html', 'sass', 'inject-css-js')).on('change', browserSync.reload);
  gulp.watch(src_asset_scss, gulp.series('sass')).on('change', browserSync.reload);
  gulp.watch(src_asset_js, gulp.series('js')).on('change', browserSync.reload);
  gulp.watch(src_asset_img, gulp.series('images')).on('change', browserSync.reload);
  gulp.watch(src_asset_font, gulp.series('fonts')).on('change', browserSync.reload);
});

gulp.task('build', gulp.series('clean', gulp.parallel('generic-assets', 'html', 'service-worker', 'images', 'fonts', 'sass', 'js', 'generate-favicon'), 'inject-css-js'));

gulp.task('serve', gulp.series('clean', gulp.parallel('generic-assets', 'html', 'images', 'fonts', 'sass', 'js'), 'inject-css-js', gulp.parallel('browser-sync', 'watch')));

gulp.task('default', gulp.series('build'));
