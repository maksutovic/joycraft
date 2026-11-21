import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadArtifact, persistResponses, readProjectFile, replaceBrief, writeArtifact } from './model.mjs';
import { renderArtifact } from './render.mjs';
import { startArtifact } from './server.mjs';
import { artifactPages, briefQuestionStyle, effectiveQuestionStyle, parseQuestionStyle, projectQuestionStyle, setArtifactColors, setArtifactPages, setArtifactTheme, setQuestionStyle, withBriefQuestionStyle } from './preferences.mjs';

export async function main(argv, root = process.cwd()) {
  const [command, ...args] = argv;
  const flags = command === 'serve' ? ['--brief', '--view', '--doc', '--theme'] : command === 'build' ? ['--brief', '--view', '--doc', '--out', '--mode', '--theme'] : command === 'import' ? ['--brief', '--view', '--responses', '--apply'] : command === 'theme' ? ['--set'] : command === 'pages' ? ['--set'] : command === 'colors' ? ['--set', '--reset'] : command === 'questions' ? ['--brief', '--set', '--clear'] : [];
  if (!flags.length) throw new Error('Use serve [--brief <path> [--view <path>]] [--doc <file.md>]... [--theme light|dark], build [--brief <path> [--view <path>]] [--doc <file.md>]... --out <path> --mode claude|portable [--theme light|dark], import --brief <path> [--view <path>] --responses <path> [--apply], theme --set light|dark, pages [--set claude|local], colors --set <colors.json> | --reset, or questions [--brief <path>] [--set pacing=one-at-a-time|page,surface=chat|artifact | --clear]');
  const values = {};
  // --doc repeats: each Markdown file is one document on the page, in the order given.
  const docs = [];
  for (let i = 0; i < args.length; i += 1) {
    const flag = args[i];
    if (!flags.includes(flag) || Object.hasOwn(values, flag)) throw new Error(`Unknown or repeated argument: ${flag}`);
    if (flag === '--apply' || flag === '--reset' || flag === '--clear') values[flag] = true;
    else {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value for ${flag}`);
      if (flag === '--doc') docs.push(args[++i]);
      else values[flag] = args[++i];
    }
  }
  if (command === 'theme') {
    if (!values['--set']) throw new Error('Theme needs --set light|dark');
    const preferences = await setArtifactTheme(root, values['--set']);
    console.log(JSON.stringify({ path: '.joycraft/preferences.json', theme: preferences.artifacts.theme }, null, 2));
    return preferences;
  }
  if (command === 'pages') {
    // Where a page shows on a Claude host: claude (a published artifact, the default) or local.
    if (values['--set']) await setArtifactPages(root, values['--set']);
    const pages = await artifactPages(root);
    console.log(JSON.stringify(pages, null, 2));
    return pages;
  }
  if (command === 'questions') {
    // With --brief, --set and --clear change only that feature; without it, --set changes the project default.
    const briefPath = values['--brief'];
    if (values['--set'] && values['--clear']) throw new Error('Use --set or --clear, not both');
    if (values['--clear'] && !briefPath) throw new Error('--clear needs --brief: it removes a feature\'s own question style');
    const change = values['--set'] ? parseQuestionStyle(values['--set']) : values['--clear'] ? null : undefined;
    // Read the project default first: a bad stored preference must stop the command before any write.
    const project = await projectQuestionStyle(root);
    let brief;
    if (briefPath) {
      const text = (await readProjectFile(root, briefPath)).toString('utf8');
      brief = briefQuestionStyle(text);
      if (change !== undefined) {
        const updated = withBriefQuestionStyle(text, change);
        // Check the new text before the write: a failed command must leave the brief as it was.
        brief = briefQuestionStyle(updated);
        if (JSON.stringify(brief ?? null) !== JSON.stringify(change === null ? null : { ...(briefQuestionStyle(text) ?? {}), ...change })) throw new Error('Could not write question-style: safely; the brief is unchanged');
        await replaceBrief(root, briefPath, text, updated);
      }
    } else if (change) await setQuestionStyle(root, change);
    const style = effectiveQuestionStyle({ project: change && !briefPath ? await projectQuestionStyle(root) : project, brief });
    console.log(JSON.stringify(style, null, 2));
    return style;
  }
  if (command === 'colors') {
    if (!values['--set'] === !values['--reset']) throw new Error('Colors needs --set <colors.json> or --reset');
    let colors = null;
    if (values['--set']) {
      try { colors = JSON.parse((await readProjectFile(root, values['--set'])).toString('utf8')); }
      catch (error) { throw new Error(`Could not read colors: ${error.message}`); }
    }
    const preferences = await setArtifactColors(root, colors);
    console.log(JSON.stringify({ path: '.joycraft/preferences.json', colors: preferences.artifacts.colors ?? 'kit defaults' }, null, 2));
    return preferences;
  }
  if (!values['--brief'] && !docs.length) throw new Error(command === 'import' ? 'Supply --brief as a path relative to the project root' : 'Supply --brief or --doc as a path relative to the project root');
  const options = { root, brief: values['--brief'], view: values['--view'], theme: values['--theme'], ...(docs.length ? { docs } : {}) };
  // An image that is not a plain project image file shows as text: name it, so the author can correct the path.
  const imagesNotShown = model => (model.documents ?? []).flatMap(document => document.imagesNotShown ?? []);
  if (command === 'serve') {
    const server = await startArtifact(options);
    const notShown = imagesNotShown((await loadArtifact(options)).model);
    console.log(`Artifact: ${server.url}\n${notShown.length ? `Images shown as text (not a PNG, JPEG, WebP or GIF file in the project, or too large): ${notShown.join(', ')}\n` : ''}${options.brief ? `Answers save directly to ${options.brief}.` : 'This page is read-only: it shows the documents as they are now.'} Stop with Ctrl-C.`);
    return server;
  }
  if (command === 'build') {
    if (!values['--out'] || !['claude', 'portable'].includes(values['--mode'])) throw new Error('Build needs --out <project-relative-path> and --mode claude|portable');
    const { model } = await loadArtifact({ ...options, mode: values['--mode'] });
    const path = await writeArtifact({ root, path: values['--out'], html: await renderArtifact(model) });
    console.log(JSON.stringify({ path, mode: model.mode, source: model.source, ...(docs.length ? { documents: docs } : {}), ...(imagesNotShown(model).length ? { imagesNotShown: imagesNotShown(model) } : {}), instruction: model.mode === 'claude' ? 'Use the available Claude host artifact tools to create or update an HTML artifact from these bytes. This command has not published or uploaded it.' : model.source ? 'Open the HTML, fill answers, then export responses for import. This file cannot update the brief by itself.' : 'Open the HTML. It is a read-only copy of the documents as they were at this build.' }, null, 2));
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
