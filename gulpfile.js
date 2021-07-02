const { series, parallel, src, dest, watch, task } = require('gulp');
const { readFileSync } = require('fs');
const del = require('del');
const pug = require('gulp-pug');
const sass = require('gulp-sass');
const Fiber = require('fibers');
const bSync = require('browser-sync');
const strip = require('gulp-strip-comments');
const gulpif = require('gulp-if');
const terser = require('gulp-terser');
const concat = require('gulp-concat');
const buffer = require('vinyl-buffer');
const source = require('vinyl-source-stream');
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');
const plumber = require('gulp-plumber');
const postcss = require('gulp-postcss');
const cssnano = require('cssnano');
const babelify = require('babelify');
const cleanCss = require('gulp-clean-css');
const browserify = require('browserify');
const sourcemaps = require('gulp-sourcemaps');
const compression = require('compression');
const autoprefixer = require('autoprefixer');

// Helper functions
const isProd = process.env.NODE_ENV === 'production';

const renderHTML = (glob) => {
  return src(glob)
    .pipe(
      plumber(function (err) {
        console.log(err);
        this.emit('end');
      }),
    )
    .pipe(
      pug({
        pretty: '\t',
      }),
    )
    .pipe(dest('_dist'));
};

const imageChangeTask = (path) => {
  const filePathnameGlob = path.replace(/[/\\]/g, '/');
  const destPathname = filePathnameGlob
    .replace('public', '_dist')
    .replace(filePathnameGlob.split('/')[filePathnameGlob.split('/').length - 1], '');
  console.log(`Copy: '${filePathnameGlob}'   =====>   '${destPathname}'`);
  return src(filePathnameGlob).pipe(dest(destPathname));
};

const imageRemoveTask = (path) => {
  const filePathnameGlob = path.replace(/[/\\]/g, '/');
  const destPathname = filePathnameGlob.replace('public', '_dist');
  console.log(`Deleted: '${destPathname}'`);
  return del(destPathname);
};

// Define gulp tasks

task('clean-dist', () => {
  return del('_dist');
});

task('copy-fonts', () => {
  return new Promise((resolve) => {
    const fonts = JSON.parse(readFileSync('vendors.json')).fonts;
    if (fonts.length > 0) {
      src(fonts, {
        allowEmpty: true,
      }).pipe(dest('_dist/fonts'));
    } else {
      console.log('Không có đường dẫn fonts để copy');
    }
    resolve();
  });
});

task('copy-assets', () => {
  return src('public/**', {
    allowEmpty: true,
  }).pipe(dest('_dist'));
});

task('core-js', () => {
  return new Promise((resolve) => {
    const js = JSON.parse(readFileSync('vendors.json')).js;
    if (js.length > 0) {
      src(js, {
        allowEmpty: true,
      })
        .pipe(concat('core.min.js'))
        .pipe(strip())
        .pipe(uglify())
        .pipe(dest('_dist/js'));
    } else {
      console.log('Không có đường dẫn thư viện js để copy');
    }
    resolve();
  });
});

task('core-css', () => {
  return new Promise((resolve) => {
    const css = JSON.parse(readFileSync('vendors.json')).css;
    if (css.length > 0) {
      src(css, {
        allowEmpty: true,
      })
        .pipe(concat('core.min.css'))
        .pipe(
          cleanCss({
            level: {
              1: {
                all: true,
                normalizeUrls: false,
                specialComments: false,
              },
            },
          }),
        )
        .pipe(dest('_dist/css'));
    } else {
      console.log('Không có đường dẫn thư viện css để copy');
    }
    resolve();
  });
});

task('main-js', () => {
  return browserify({
    basedir: '.',
    entries: ['app/scripts/main.js'],
    debug: true,
    sourceMaps: true,
  })
    .transform(
      babelify.configure({
        presets: ['@babel/preset-env'],
        plugins: [
          '@babel/plugin-proposal-class-properties',
          '@babel/plugin-transform-async-to-generator',
        ],
        extensions: ['.js'],
      }),
    )
    .bundle()
    .pipe(source('main.js'))
    .pipe(buffer())
    .pipe(
      plumber(function (err) {
        console.log(err);
        this.emit('end');
      }),
    )
    .pipe(gulpif(!isProd, sourcemaps.init({ loadMaps: true })))
    .pipe(gulpif(isProd, terser()))
    .pipe(
      rename({
        suffix: '.min',
      }),
    )
    .pipe(gulpif(!isProd, sourcemaps.write('')))
    .pipe(dest('_dist/js'));
});

task('main-css', () => {
  return new Promise((resolve) => {
    src(['app/styles/**.scss', '!app/styles/_*.scss'])
      .pipe(gulpif(!isProd, sourcemaps.init()))
      .pipe(sass({ fiber: Fiber }).on('error', sass.logError))
      .pipe(
        gulpif(
          isProd,
          cleanCss({
            level: {
              1: {
                all: true,
                normalizeUrls: false,
                specialComments: false,
              },
              2: {
                restructureRules: true,
              },
            },
          }),
        ),
      )
      .pipe(postcss([autoprefixer({ cascade: false })]))
      .pipe(gulpif(isProd, postcss([cssnano()])))
      .pipe(rename({ suffix: '.min' }))
      .pipe(gulpif(!isProd, sourcemaps.write('.')))
      .pipe(dest('_dist/css'));
    resolve();
  });
});

task('render', () => {
  return renderHTML('app/**.pug');
});

task('serve', () => {
  bSync.init({
    notify: true,
    server: {
      baseDir: '_dist',
      middleware: [compression()],
    },
    port: 4200,
  });
  watch('app/views/_**/**.pug').on('change', (path) => {
    console.log(`Files changed: '${path}'`);
    console.log('Rendering: All templates');
    return renderHTML('app/**.pug');
  });

  watch(['app/*.pug']).on('change', (path) => {
    console.log(`Files changed: '${path}'`);
    let pageName;
    let glob;
    if (path.indexOf('/') >= 0) {
      pageName = path.split('/')[1];
    } else {
      pageName = path.split('\\')[1];
    }
    if (pageName.indexOf('.pug') >= 0) {
      glob = `app/${pageName}`;
    } else {
      glob = `app/${pageName}.pug`;
    }
    console.log(`Rendering: '${path}'`);
    return renderHTML(glob);
  });

  watch(['app/views/**/**.pug', '!app/views/_**/**.pug']).on('change', (path) => {
    console.log(`Files changed: '${path}'`);
    let pageName;
    let glob;
    if (path.indexOf('/') >= 0) {
      pageName = path.split('/')[2];
    } else {
      pageName = path.split('\\')[2];
    }
    if (pageName.indexOf('.pug') >= 0) {
      glob = `app/${pageName}`;
    } else {
      glob = `app/${pageName}.pug`;
    }
    console.log(`Rendering: '${path}'`);
    return renderHTML(glob);
  });

  watch(['public/**/**.{jpeg,jpg,png,gif,svg,ico,mp4,webp}'], {
    ignorePermissionErrors: true,
    delay: 300,
    events: 'all',
  })
    .on('add', imageChangeTask)
    .on('change', imageChangeTask)
    .on('addDir', imageChangeTask)
    .on('unlink', imageRemoveTask)
    .on('unlinkDir', imageRemoveTask);

  watch(['app/scripts/**/**.js'], series('main-js'));

  watch(
    ['app/styles/**/**.scss'],
    {
      delay: 300,
    },
    series('main-css'),
  );

  watch(['vendors.json', 'vendors/**/**.**'], parallel('core-js', 'core-css', 'copy-fonts'));

  watch(['_dist/**/**.**']).on('change', bSync.reload);
});

exports.dev = series(
  'clean-dist',
  'copy-assets',
  parallel('core-js', 'core-css'),
  parallel('main-js', 'main-css'),
  'render',
  'serve',
);

exports.build = series(
  'clean-dist',
  'copy-assets',
  parallel('core-js', 'core-css'),
  parallel('main-js', 'main-css'),
  'render',
);
