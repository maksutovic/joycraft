import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadArtifact, persistResponses, readProjectFile, writeArtifact } from './model.mjs';
import { renderArtifact } from './render.mjs';
import { startArtifact } from './server.mjs';
import { setArtifactTheme } from './preferences.mjs';

export async function main(argv, root = process.cwd()) {
  const [command, ...args] = argv;
  const flags = command === 'serve' ? ['--brief', '--view', '--theme'] : command === 'build' ? ['--brief', '--view', '--out', '--mode', '--theme'] : command === 'import' ? ['--brief', '--view', '--responses', '--apply'] : command === 'theme' ? ['--set'] : [];
  if (!flags.length) throw new Error('Use serve --brief <path> [--view <path>] [--theme light|dark], build --brief <path> [--view <path>] --out <path> --mode claude|portable [--theme light|dark], import --brief <path> [--view <path>] --responses <path> [--apply], or theme --set light|dark');
  const values = {};
  for (let i = 0; i < args.length; i += 1) {
    const flag = args[i];
    if (!flags.includes(flag) || Object.hasOwn(values, flag)) throw new Error(`Unknown or repeated argument: ${flag}`);
    if (flag === '--apply') values[flag] = true;
    else { if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value for ${flag}`); values[flag] = args[++i]; }
  }
  if (command === 'theme') {
    if (!values['--set']) throw new Error('Theme needs --set light|dark');
    const preferences = await setArtifactTheme(root, values['--set']);
    console.log(JSON.stringify({ path: '.joycraft/preferences.json', theme: preferences.artifacts.theme }, null, 2));
    return preferences;
  }
  if (!values['--brief']) throw new Error('Supply --brief as a path relative to the project root');
  const options = { root, brief: values['--brief'], view: values['--view'], theme: values['--theme'] };
  if (command === 'serve') {
    const server = await startArtifact(options);
    console.log(`Artifact: ${server.url}\nAnswers save directly to ${options.brief}. Stop with Ctrl-C.`);
    return server;
  }
  if (command === 'build') {
    if (!values['--out'] || !['claude', 'portable'].includes(values['--mode'])) throw new Error('Build needs --out <project-relative-path> and --mode claude|portable');
    const { model } = await loadArtifact({ ...options, mode: values['--mode'] });
    const path = await writeArtifact({ root, path: values['--out'], html: await renderArtifact(model) });
    console.log(JSON.stringify({ path, mode: model.mode, source: model.source, instruction: model.mode === 'claude' ? 'Use the available Claude host artifact tools to create or update an HTML artifact from these bytes. This command has not published or uploaded it.' : 'Open the HTML, fill answers, then export responses for import. This file cannot update the brief by itself.' }, null, 2));
    return { path, model };
  }
  if (!values['--responses']) throw new Error('Import needs --responses <project-relative-path>');
  let envelope;
  try { envelope = JSON.parse((await readProjectFile(root, values['--responses'])).toString('utf8')); }
  catch (error) { throw new Error(`Could not read responses: ${error.message}`); }
  const result = await persistResponses({ ...options, envelope, apply: values['--apply'] === true });
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => { console.error(`Artifact stopped: ${error.message}`); process.exitCode = 1; });
}
