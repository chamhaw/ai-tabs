/**
 * Webpack plugin to automatically sync version from package.json to manifest.json during build
 */

const fs = require('fs');
const path = require('path');

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
          if (!manifestAsset) return;

          try {
            // Read package.json version
            const packageJson = JSON.parse(
              fs.readFileSync(path.resolve(compiler.context, 'package.json'), 'utf8')
            );
            
            // Parse manifest content
            const manifestJson = JSON.parse(manifestAsset.source());
            
            // Always use package.json version
            manifestJson.version = packageJson.version;
            
            // Update asset
            const newContent = JSON.stringify(manifestJson, null, 2);
            compilation.updateAsset('manifest.json', {
              source: () => newContent,
              size: () => newContent.length
            });
            
            console.log(`📦 Manifest version set to: ${packageJson.version}`);
          } catch (error) {
            console.error('❌ Failed to sync manifest version:', error);
          }
        }
      );
    });
  }
}

module.exports = ManifestVersionSyncPlugin;
