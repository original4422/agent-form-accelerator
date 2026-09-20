import {build} from 'esbuild';
import {projectRoot} from '../src/bridge.mjs';
await build({entryPoints:[`${projectRoot}/prototype/fixtures/framework-src/react-form.jsx`],outfile:`${projectRoot}/prototype/fixtures/react-form-bundle.js`,bundle:true,minify:false,define:{'process.env.NODE_ENV':'"development"'},logLevel:'warning'});
