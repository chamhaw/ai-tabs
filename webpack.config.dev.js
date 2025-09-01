const path = require('path');
const fs = require('fs');
const CopyWebpackPlugin = require('copy-webpack-plugin');

// Inline Manifest Version Sync Plugin
class ManifestVersionSyncPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap('ManifestVersionSyncPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'ManifestVersionSyncPlugin',
          stage: compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        (assets) => {
          const manifestAsset = assets['manifest.json'];
          if (!manifestAsset) {
            console.log('📦 Manifest file not found, skipping version sync');
            return;
          }

          try {
            // Read package.json
            const packageJsonPath = path.resolve(compiler.context, 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            // Parse current manifest
            const manifestJson = JSON.parse(manifestAsset.source());
            
            // Update version
            const oldVersion = manifestJson.version;
            manifestJson.version = packageJson.version;
            
            // Create new content
            const newContent = JSON.stringify(manifestJson, null, 2);
            
            // Update the asset
            compilation.updateAsset('manifest.json', {
              source: () => newContent,
              size: () => newContent.length
            });
            
            console.log(`📦 Manifest version synced: ${oldVersion} → ${packageJson.version}`);
          } catch (error) {
            console.error('❌ Failed to sync manifest version:', error.message);
          }
        }
      );
    });
  }
}

module.exports = {
  mode: 'development',
  devtool: 'cheap-module-source-map',
  entry: {
    popup: path.resolve(__dirname, 'src', 'index.tsx'),
    options: path.resolve(__dirname, 'src', 'options-index.tsx'),
    background: path.resolve(__dirname, 'src', 'background.ts'),
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{ 
          loader: 'ts-loader', 
          options: { 
            configFile: 'tsconfig.json',
            transpileOnly: true // Faster development builds
          } 
        }],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: [
          {
            loader: 'style-loader',
            options: {
              insert: function(element) {
                // Custom insertion for CSP compatibility
                var parent = document.head || document.getElementsByTagName('head')[0];
                parent.appendChild(element);
              },
            },
          },
          'css-loader'
        ],
      },
    ],
  },
  plugins: [
    new ManifestVersionSyncPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        // Copy manifest.json
        {
          from: path.resolve(__dirname, 'src', 'manifest.json'),
          to: path.resolve(__dirname, 'dist'),
        },
        // Copy HTML files
        {
          from: path.resolve(__dirname, 'src', 'popup.html'),
          to: path.resolve(__dirname, 'dist'),
        },
        {
          from: path.resolve(__dirname, 'src', 'options.html'),
          to: path.resolve(__dirname, 'dist'),
        },


        // Copy icons
        {
          from: path.resolve(__dirname, 'src', 'icons'),
          to: path.resolve(__dirname, 'dist', 'icons'),
        },
        // Copy locales
        {
          from: path.resolve(__dirname, 'src', '_locales'),
          to: path.resolve(__dirname, 'dist', '_locales'),
        },

        // Copy styles (for direct linking, CSP-safe)
        {
          from: path.resolve(__dirname, 'src', 'styles'),
          to: path.resolve(__dirname, 'dist', 'styles'),
        },
      ],
    }),
  ],
  optimization: {
    minimize: false, // No minification in dev mode
  },
  stats: {
    errorDetails: true,
    warnings: true,
  },
};


