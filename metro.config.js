const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 3D models are bundled as assets.
config.resolver.assetExts.push('glb', 'gltf');

module.exports = config;
