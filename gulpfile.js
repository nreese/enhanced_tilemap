const gulp = require('gulp');
const gulpIf = require('gulp-if');
const _ = require('lodash');
const path = require('path');
const mkdirp = require('mkdirp');
const Rsync = require('rsync');
const Promise = require('bluebird');
const eslint = require('gulp-eslint');
const rimraf = require('rimraf');
const zip = require('gulp-zip');
const fs = require('fs');
const spawn = require('child_process').spawn;
const minimist = require('minimist');
const os = require('os');
const pkg = require('./package.json');
const packageName = pkg.name;

// in their own sub-directory to not interfere with Gradle
const buildDir = path.resolve(__dirname, 'build/gulp');
const fixtureDir = path.resolve(buildDir, 'fixtures');
const targetDir = path.resolve(__dirname, 'target/gulp');
const buildTarget = path.resolve(buildDir, 'kibana', packageName);

const include = [
  'package.json',
  'index.js',
  'public'
];

const knownOptions = {
  string: 'kibanahomepath',
  default: {
    kibanahomepath: '../kibi-internal'
  }
};

const options = minimist(process.argv.slice(2), knownOptions);
const kibanaPluginDir = path.resolve(__dirname, path.join(options.kibanahomepath, 'siren_plugins', packageName));


function syncPluginTo(dest, done) {
  mkdirp(dest, function (err) {
    if (err) return done(err);
    Promise.all(include.map(function (name) {
      const source = path.resolve(__dirname, name);
      return new Promise(function (resolve, reject) {
        const rsync = new Rsync();

        let newSource = '';
        let newDestination = '';

        if (os.platform() === 'win32') {
          newSource = '/cygdrive/' + source.replace(/\\/g, '/');
          newSource = newSource.replace(/:/g, '');
          newDestination = '/cygdrive/' + dest.replace(/\\/g, '/');
          newDestination = newDestination.replace(/:/g, '');
        }

        rsync
          .source(newSource ? newSource : source)
          .destination(newDestination ? newDestination : dest)
          .flags('uavq')
          .recursive(true)
          .set('delete')
          .output(function (data) {
            process.stdout.write(data.toString('utf8'));
          });

        rsync.execute(function (err) {
          if (err) {
            console.log(err);
            return reject(err);
          }
          resolve();
        });
      });
    }))
      .then(function () {
        return new Promise(function (resolve, reject) {
          mkdirp(path.join(buildTarget, 'node_modules'), function (err) {
            if (err) return reject(err);
            resolve();
          });
        });
      })
      .then(function () {
        spawn('npm', ['install', '--production', '--silent'], {
          cwd: dest,
          stdio: 'inherit'
        })
          .on('close', done);
      })
      .catch(done);
  });
}

gulp.task('sync', function (done) {
  syncPluginTo(kibanaPluginDir, done);
});

const eslintOptions = {
  rules: {
    memoryleaks: 1
  },
  rulePaths: [path.resolve(__dirname, options.kibanahomepath, 'scripts', 'eslintrules')],
  fix: true
};

function isFixed(file) {
  // Has ESLint fixed the file contents?
  return file.eslint != null && file.eslint.fixed;
}

gulp.task('lint', function (done) {
  return gulp.src([
    'public/**/*.js',
    '!**/webpackShims/**'
  ]).pipe(eslint(eslintOptions))
    .pipe(eslint.formatEach())
    .pipe(eslint.failOnError());
});

gulp.task('clean', function (done) {
  Promise.each([buildDir, targetDir], function (dir) {
    return new Promise(function (resolve, reject) {
      rimraf(dir, function (err) {
        if (err) return reject(err);
        resolve();
      });
    });
  }).nodeify(done);
});

gulp.task('build', gulp.series('clean', function (done) {
  syncPluginTo(buildTarget, done);
}));

gulp.task('package', gulp.series('build', function (done) {
  return gulp.src([
    path.join(buildDir, '**', '*')
  ])
    .pipe(zip(packageName + '.zip'))
    .pipe(gulp.dest(targetDir));
}));

gulp.task('dev', gulp.series('sync', function (done) {
  gulp.watch([
    'package.json',
    'index.js',
    'public/**/*'
  ], gulp.series('sync', 'lint'));
}));

gulp.task('test', gulp.series('sync', function (done) {
  spawn('grunt', [ 'test:browser', '--grep=Kibi Enhanced Tilemap'], {
    cwd: options.kibanahomepath,
    stdio: 'inherit'
  }).on('close', done);
}));

gulp.task('testdev', gulp.series('sync', function (done) {
  spawn('grunt', ['test:dev', '--browser=Chrome', '--kbnServer.ignoreDevYml'], {
    cwd: options.kibanahomepath,
    stdio: 'inherit'
  }).on('close', done);
}));

gulp.task('coverage', gulp.series('sync', function (done) {
  spawn('grunt', ['test:coverage', '--grep=Kibi Enhanced Tilemap'], {
    cwd: options.kibanahomepath,
    stdio: 'inherit'
  }).on('close', done);
}));

