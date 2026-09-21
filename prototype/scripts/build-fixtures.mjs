import {build} from 'esbuild';
import {projectRoot} from '../src/bridge.mjs';
await build({entryPoints:[`${projectRoot}/prototype/fixtures/framework-src/react-form.jsx`],outfile:`${projectRoot}/prototype/fixtures/react-form-bundle.js`,bundle:true,minify:false,define:{'process.env.NODE_ENV':'"development"'},logLevel:'warning'});
await build({entryPoints:[`${projectRoot}/prototype/fixtures/framework-src/search-form.jsx`],outfile:`${projectRoot}/prototype/fixtures/search-form-bundle.js`,bundle:true,minify:false,define:{'process.env.NODE_ENV':'"development"'},logLevel:'warning'});
await build({entryPoints:[`${projectRoot}/prototype/fixtures/framework-src/delayed-search.jsx`],outfile:`${projectRoot}/prototype/fixtures/delayed-search-bundle.js`,bundle:true,minify:false,define:{'process.env.NODE_ENV':'"development"'},logLevel:'warning'});
await build({entryPoints:[`${projectRoot}/prototype/fixtures/framework-src/country-phone.jsx`],outfile:`${projectRoot}/prototype/fixtures/country-phone-bundle.js`,bundle:true,minify:false,define:{'process.env.NODE_ENV':'"development"'},logLevel:'warning'});

await build({entryPoints:[`${projectRoot}/prototype/fixtures/framework-src/query-catalog.jsx`],outfile:`${projectRoot}/prototype/fixtures/query-catalog-bundle.js`,bundle:true,minify:false,define:{'process.env.NODE_ENV':'"development"'},logLevel:'warning'});
