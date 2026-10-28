import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
// Disable CLI telemetry so local commands do not depend on external telemetry access.
const child=spawn(process.execPath,[fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs',import.meta.url)),...process.argv.slice(2)],{stdio:'inherit',windowsHide:true,env:{...process.env,ASTRO_TELEMETRY_DISABLED:'1'}});
child.on('error',error=>{console.error(error);process.exit(1);});
child.on('exit',code=>process.exit(code??1));
