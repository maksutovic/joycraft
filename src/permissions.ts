import type { StackInfo } from './detect.js';

export interface PermissionRules {
  allow: string[];
  deny: string[];
}

export function generatePermissions(stack: StackInfo): PermissionRules {
  // Default deny rules for ALL projects
  const deny: string[] = [
    'Bash(rm -rf *)',
    'Bash(git push --force *)',
    'Bash(git push -f *)',
    'Bash(git reset --hard *)',
    'Edit(//.env*)',
    'Edit(//*.pem)',
    'Edit(//*.key)',
    'Edit(//.git/**)',
  ];

  // Default allow rules
  const allow: string[] = [
    'Bash(git status)',
    'Bash(git diff *)',
    'Bash(git log *)',
    'Bash(git add *)',
    'Bash(git commit *)',
    'Bash(git checkout *)',
    'Bash(git branch *)',
  ];

  // Stack-specific rules
  if (stack.language === 'node') {
    allow.push(`Bash(${stack.packageManager} *)`);
    if (stack.packageManager !== 'npm') deny.push('Bash(npm install *)');
    if (stack.packageManager !== 'yarn') deny.push('Bash(yarn add *)');
    if (stack.packageManager !== 'pnpm') deny.push('Bash(pnpm add *)');
    if (stack.packageManager !== 'bun') deny.push('Bash(bun add *)');
    if (stack.commands.test) allow.push(`Bash(${stack.commands.test})`);
    if (stack.commands.build) allow.push(`Bash(${stack.commands.build})`);
    if (stack.commands.lint) allow.push(`Bash(${stack.commands.lint})`);
    if (stack.commands.typecheck) allow.push(`Bash(${stack.commands.typecheck})`);
  }

  if (stack.language === 'python') {
    allow.push(`Bash(${stack.packageManager} *)`);
    if (stack.commands.test) allow.push(`Bash(${stack.commands.test})`);
    if (stack.commands.lint) allow.push(`Bash(${stack.commands.lint})`);
    if (stack.commands.build) allow.push(`Bash(${stack.commands.build})`);
  }

  if (stack.language === 'rust') {
    allow.push('Bash(cargo *)');
  }

  if (stack.language === 'go') {
    allow.push('Bash(go *)');
  }

  if (stack.language === 'swift') {
    allow.push('Bash(swift *)');
    allow.push('Bash(xcodebuild *)');
  }

  return { allow, deny };
}
