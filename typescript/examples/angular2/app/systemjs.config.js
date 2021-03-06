/**
 * System configuration for Angular 2 samples
 * Adjust as necessary for your application needs.
 */
(function(global) {

  // map tells the System loader where to look for things
  var map = {
    'app':                        'app', // 'dist',
    'generated':                  'generated',
    'ajv':                        'node_modules/ajv',
    '@openmicrostep':             'node_modules/@openmicrostep',
    '@angular':                   'node_modules/@angular',
    'angular2-in-memory-web-api': 'node_modules/angular2-in-memory-web-api',
    'immutable':                  'node_modules/immutable',
    'rxjs':                       'node_modules/rxjs'
  };

  // packages tells the System loader how to load when no filename and/or no extension
  var packages = {
    'app':                        { main: 'main.js',  defaultExtension: 'js' },
    'generated':                  { defaultExtension: 'js' },
    'shared':                     { defaultExtension: 'js' },
    'immutable':                  { main: 'dist/immutable.js', defaultExtension: 'js' },
    'rxjs':                       { defaultExtension: 'js' },
    'angular2-in-memory-web-api': { main: 'index.js', defaultExtension: 'js' },
  };

  var ngPackageNames = [
    'common',
    'compiler',
    'core',
    'forms',
    'http',
    'platform-browser',
    'platform-browser-dynamic',
    'router',
    'router-deprecated',
    'upgrade',
  ];

  // Individual files (~300 requests):
  function packIndex(pkgName) {
    packages['@angular/'+pkgName] = { main: 'index.js', defaultExtension: 'js' };
  }

  // Bundled (~40 requests):
  function packUmd(pkgName) {
    packages['@angular/'+pkgName] = { main: '/bundles/' + pkgName + '.umd.js', defaultExtension: 'js' };
  }

  // Most environments should use UMD; some (Karma) need the individual index files
  var setPackageConfig = System.packageWithIndex ? packIndex : packUmd;

  // Add package entries for angular packages
  ngPackageNames.forEach(setPackageConfig);

  // No umd for router yet
  packages['@angular/router'] = { main: 'index.js', defaultExtension: 'js' };
  packages['@openmicrostep/aspects'] = { main: 'typescript/core/src/core.js', defaultExtension: 'js' };
  packages['@openmicrostep/aspects.xhr'] = { main: 'transport.xhr.js', defaultExtension: 'js' };
  packages['@openmicrostep/async'] = { main: 'dist/async.js', defaultExtension: 'js' };
  packages['@openmicrostep/mstools'] = { main: 'dist/mstools.umd.js', defaultExtension: 'js' };
  packages['ajv'] = { main: 'dist/ajv.min.js', defaultExtension: 'js' };
  
  var config = {
    map: map,
    packages: packages
  };

  System.config(config);

})(this);
