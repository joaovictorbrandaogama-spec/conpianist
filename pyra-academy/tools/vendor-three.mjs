// Gera public/vendor/three.bundle.min.js: uma cópia local e enxuta do Three.js com só o que o jogo usa.
// O jogo NÃO precisa disso para rodar (o arquivo gerado já está no repositório); use apenas para atualizar o Three.js:
//   npm install --no-save three esbuild
//   node tools/vendor-three.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.env.VENDOR_FROM || path.join(here, '..');
const require = createRequire(path.join(root, 'package.json'));
const esbuild = require('esbuild');

const CORE = [
  'ACESFilmicToneMapping', 'AdditiveBlending', 'BackSide', 'BoxGeometry', 'BufferAttribute', 'BufferGeometry', 'CanvasTexture', 'CapsuleGeometry',
  'CircleGeometry', 'Color', 'ConeGeometry', 'CylinderGeometry', 'DataTexture', 'DirectionalLight', 'DoubleSide', 'Euler', 'ExtrudeGeometry',
  'Float32BufferAttribute', 'Fog', 'FogExp2', 'FrontSide', 'Group', 'HemisphereLight', 'LatheGeometry', 'MathUtils', 'Matrix4', 'Mesh',
  'MeshBasicMaterial', 'MeshStandardMaterial', 'MeshToonMaterial', 'NearestFilter', 'PCFShadowMap', 'PerspectiveCamera', 'PlaneGeometry',
  'PointLight', 'Points', 'PointsMaterial', 'QuadraticBezierCurve3', 'Quaternion', 'Raycaster', 'RedFormat', 'RepeatWrapping', 'SRGBColorSpace',
  'Scene', 'ShaderMaterial', 'Shape', 'SphereGeometry', 'SpotLight', 'Sprite', 'SpriteMaterial', 'TorusGeometry', 'TubeGeometry', 'Vector2',
  'Vector3', 'WebGLRenderer', 'REVISION',
];
const entry = `
export { ${CORE.join(', ')} } from 'three';
export { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
export { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
export { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
export { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
export * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
`;

const outfile = path.join(here, '..', 'public', 'vendor', 'three.bundle.min.js');
await esbuild.build({
  stdin: { contents: entry, resolveDir: root, loader: 'js' },
  bundle: true, format: 'esm', minify: true, treeShaking: true, legalComments: 'inline', outfile,
});
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'node_modules', 'three', 'package.json'), 'utf8'));
console.log(`three ${version} -> ${path.relative(process.cwd(), outfile)} (${(fs.statSync(outfile).size / 1024).toFixed(0)} KB)`);
