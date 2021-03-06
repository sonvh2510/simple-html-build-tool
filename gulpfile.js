const { series, parallel, src, dest, watch, task } = require('gulp');
const { readFileSync } = require('fs');
const del = require('del');
const pug = require('gulp-pug');
const sass = require('gulp-sass')(require('sass'));
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

const imageChangeTask = (path) => {
  console.log(path);
  const pathSplited = path.split(/\/|\\/);
  const fileGlob = pathSplited.join('/');
  const destPathname = fileGlob
    .replace('public', 'build')
    .replace(pathSplited[pathSplited.length - 1], '');
  console.log(`Copy: '${fileGlob}'   =====>   '${destPathname}'`);
  return src(fileGlob).pipe(dest(destPathname));
};

const imageRemoveTask = (path) => {
  console.log(path);
  const pathSplited = path.split(/\/|\\/);
  const fileGlob = pathSplited.join('/');
  const destPathname = fileGlob.replace('public', 'build');
  console.log(`Deleted: '${destPathname}'`);
  return del(destPathname);
};

// Define gulp tasks
task('clean-dist', () => del('build'));

task('copy-fonts', () => {
  return new Promise((resolve) => {
    const { fonts } = JSON.parse(readFileSync('vendors.json'));
    if (fonts.length > 0) {
      src(fonts, {
        allowEmpty: true,
      }).pipe(dest('build/fonts'));
    } else {
      console.log('Không có đường dẫn fonts để copy');
    }
    resolve();
  });
});

task('copy-assets', () => {
  return src('public/**', {
    allowEmpty: true,
  }).pipe(dest('build'));
});

task('core-js', () => {
  return new Promise((resolve) => {
    const { js } = JSON.parse(readFileSync('vendors.json'));
    if (js.length > 0) {
      src(js, {
        allowEmpty: true,
      })
        .pipe(concat('core.min.js'))
        .pipe(strip())
        .pipe(uglify())
        .pipe(dest('build/js'));
    } else {
      console.log('Không có đường dẫn thư viện js để copy');
    }
    resolve();
  });
});

task('core-css', () => {
  return new Promise((resolve) => {
    const { css } = JSON.parse(readFileSync('vendors.json'));
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
          })
        )
        .pipe(dest('build/css'));
    } else {
      console.log('Không có đường dẫn thư viện css để copy');
    }
    resolve();
  });
});

task('main-js', () => {
  return browserify({
    basedir: '.',
    entries: ['src/scripts/main.js'],
    debug: true,
    sourceMaps: true,
  })
    .transform(
      babelify.configure({
        extensions: ['.js'],
      })
    )
    .bundle()
    .pipe(source('main.js'))
    .pipe(buffer())
    .pipe(
      plumber(function (err) {
        console.log(err);
        this.emit('end');
      })
    )
    .pipe(gulpif(!isProd, sourcemaps.init({ loadMaps: true })))
    .pipe(gulpif(isProd, terser()))
    .pipe(
      rename({
        suffix: '.min',
      })
    )
    .pipe(gulpif(!isProd, sourcemaps.write('')))
    .pipe(dest('build/js'));
});

task('main-css', () => {
  return new Promise((resolve) => {
    src(['src/styles/**.scss', '!src/styles/_*.scss'])
      .pipe(gulpif(!isProd, sourcemaps.init()))
      .pipe(sass({ outputStyle: 'compressed' }).on('error', sass.logError))
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
          })
        )
      )
      .pipe(postcss([autoprefixer({ cascade: false })]))
      .pipe(gulpif(isProd, postcss([cssnano()])))
      .pipe(rename({ suffix: '.min' }))
      .pipe(gulpif(!isProd, sourcemaps.write('.')))
      .pipe(dest('build/css'));
    resolve();
  });
});

task('render', () => {
  return new Promise((resolve) => {
    src('src/pages/**.pug')
      .pipe(
        plumber(function (err) {
          console.log(err);
          this.emit('end');
        })
      )
      .pipe(
        pug({
          pretty: true,
        })
      )
      .pipe(dest('build'));
    resolve();
  });
});

task('serve', () => {
  const browser = bSync.init({
    notify: false,
    server: {
      baseDir: 'build',
      middleware: [compression()],
    },
    port: 8080,
    // watch: true,
  });

  watch('src/**/**.pug', series('render'));

  watch(['public/**/**.{jpeg,jpg,png,gif,svg,ico,mp4,webp,json}'], {
    ignorePermissionErrors: true,
    events: 'all',
  })
    .on('add', imageChangeTask)
    .on('change', imageChangeTask)
    .on('addDir', imageChangeTask)
    .on('unlink', imageRemoveTask)
    .on('unlinkDir', imageRemoveTask);

  watch(['src/scripts/**/*.js'], series('main-js'));

  watch(['src/styles/**/*.scss'], series('main-css'));

  watch(['vendors.json', 'vendors/**/*.{js,css}'], parallel('core-js', 'core-css', 'copy-fonts'));

  watch(['public', 'build/**/**.**']).on('change', () => browser.reload());
});

exports.dev = series(
  'clean-dist',
  'copy-assets',
  parallel('core-js', 'core-css'),
  parallel('main-js', 'main-css'),
  'render',
  'serve'
);

exports.build = series(
  'clean-dist',
  'copy-assets',
  parallel('core-js', 'core-css'),
  parallel('main-js', 'main-css'),
  'render'
);
