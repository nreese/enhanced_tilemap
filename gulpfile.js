const gulp = require('gulp');
const mocha = require('gulp-mocha');

gulp.task('test', [], function () {
  require('babel-register')({
    presets: ['es2015']
  });
  require('jsdom-global')()
  return gulp.src([
    'public/**/__test__/**/*.js'
  ], { read: false })
  .pipe(mocha({ reporter: 'list' }));
});