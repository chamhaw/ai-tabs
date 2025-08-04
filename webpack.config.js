const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
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
        use: [{ loader: 'ts-loader', options: { configFile: 'tsconfig.json' } }],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
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
        // Copy scripts
        {
          from: path.resolve(__dirname, 'scripts'),
          to: path.resolve(__dirname, 'dist', 'scripts'),
        },
        // Copy styles
        {
          from: path.resolve(__dirname, 'src', 'styles'),
          to: path.resolve(__dirname, 'dist', 'styles'),
        },
      ],
    }),
  ],
};
