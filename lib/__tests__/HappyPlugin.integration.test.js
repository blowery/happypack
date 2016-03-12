const HappyPlugin = require('../HappyPlugin');
const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const { assert, createLoader, fixturePath, tempDir, clearCache } = require('../HappyTestUtils');

describe('[Integration] HappyPlugin', function() {
  beforeEach(function() {
    HappyPlugin.resetUID();
  });

  afterEach(function() {
    HappyPlugin.resetUID();
    clearCache();
  });

  it('compiles my files', function(done) {
    const outputDir = tempDir('integration-[guid]');
    const loader = createLoader(s => s + '\n// HAPPY!');

    const compiler = webpack({
      entry: {
        main: [
          fixturePath('integration/index.js')
        ]
      },

      output: {
        filename: '[name].js',
        path: outputDir
      },

      module: {
        loaders: [{
          test: /.js$/,
          loader: path.resolve(__dirname, '../HappyLoader.js')
        }]
      },
      plugins: [
        new HappyPlugin({
          loaders: [loader.path]
        })
      ]
    });

    compiler.run(function(err, rawStats) {
      if (err) { return done(err); }

      const stats = rawStats.toJson();

      if (stats.errors.length > 0) {
        return done(stats.errors);
      }

      assert.match(fs.readFileSync(path.join(outputDir, 'main.js'), 'utf-8'), '// HAPPY');

      done();
    });
  });

  it("resolves my loaders using webpack's loader resolver", function(done) {
    const outputDir = tempDir('integration-[guid]');
    const loader = createLoader(s => s + '\n// HAPPY!');

    const compiler = webpack({
      entry: {
        main: [
          fixturePath('integration/index.js')
        ]
      },

      output: {
        filename: '[name].js',
        path: outputDir
      },

      module: {
        loaders: [{
          test: /.js$/,
          loader: path.resolve(__dirname, '../HappyLoader.js'),
        }]
      },

      resolveLoader: {
        root: path.dirname(loader.path)
      },

      plugins: [
        new HappyPlugin({
          loaders: [loader._name, 'babel']
        })
      ]
    });

    compiler.run(function(err, rawStats) {
      if (err) { return done(err); }

      const stats = rawStats.toJson();

      if (stats.errors.length > 0) {
        return done(stats.errors);
      }

      assert.match(fs.readFileSync(path.join(outputDir, 'main.js'), 'utf-8'), '// HAPPY');

      done();
    });
  });

  it("passes query string to the loader", function(done) {
    const outputDir = tempDir('integration-[guid]');
    const loader = createLoader(function(s) {
      return s + `\n// ${this.query}`
    });

    const compiler = webpack({
      entry: {
        main: [
          fixturePath('integration/index.js')
        ]
      },

      output: {
        filename: '[name].js',
        path: outputDir
      },

      module: {
        loaders: [{
          test: /.js$/,
          loader: path.resolve(__dirname, '../HappyLoader') + '?id=js'
        }]
      },

      resolveLoader: {
        root: path.dirname(loader.path)
      },

      plugins: [
        new HappyPlugin({
          id: 'js',
          loaders: [ loader._name + '?string=HAPPY' ],
        })
      ]
    });

    compiler.run(function(err, rawStats) {
      if (err) { return done(err); }

      const stats = rawStats.toJson();

      if (stats.errors.length > 0) {
        return done(stats.errors);
      }

      assert.match(fs.readFileSync(path.join(outputDir, 'main.js'), 'utf-8'), '// ?string=HAPPY');

      done();
    });
  });

  // TODO pitch loader support
  it.skip('works with multiple plugins', function(done) {
    const outputDir = tempDir('integration-[guid]');

    const compiler = webpack({
      entry: {
        main: fixturePath('integration/index.js'),
        styles: fixturePath('integration/index.less')
      },

      output: {
        filename: '[name].js',
        path: outputDir
      },

      module: {
        loaders: [
          {
            test: /\.js$/,
            loader: path.resolve(__dirname, '../HappyLoader') + '?id=js'
          },
          {
            test: /.less$/,
            loader: path.resolve(__dirname, '../HappyLoader') + '?id=styles'
          }
        ]
      },

      plugins: [
        new HappyPlugin({ id: 'js', loaders: [ 'babel' ] }),
        new HappyPlugin({ id: 'styles', loaders: [ 'style!css!less' ] }),
      ]
    });

    compiler.run(function(err, rawStats) {
      if (err) { return done(err); }

      const stats = rawStats.toJson();

      if (stats.errors.length > 0) {
        return done(stats.errors);
      }

      assert.match(fs.readFileSync(path.join(outputDir, 'main.js'), 'utf-8'), '// HAPPY');
      assert.match(fs.readFileSync(path.join(outputDir, 'styles.js'), 'utf-8'), "background-color: red;");

      done();
    });
  });

  describe('transform-loader', function() {
    it("works with this.resolve() requests", function(done) {
      const outputDir = tempDir('integration-[guid]');

      const compiler = webpack({
        entry: fixturePath('integration/a.coffee'),

        output: {
          path: outputDir
        },

        module: {
          loaders: [{
            test: /.coffee$/,
            loader: path.resolve(__dirname, '../HappyLoader') + '?id=coffee'
          }]
        },

        plugins: [
          new HappyPlugin({
            id: 'coffee',
            loaders: [ 'transform?coffeeify' ],
          })
        ]
      });

      compiler.run(function(err, rawStats) {
        if (err) { return done(err); }

        const stats = rawStats.toJson();

        if (stats.errors.length > 0) {
          return done(stats.errors);
        }

        assert.match(
          fs.readFileSync(path.join(outputDir, 'bundle.js'), 'utf-8'),
          "console.log('Hello World!');"
        );

        done();
      });
    });
  });
});