/**
 * Deploy Skills plugin for OpenCode
 *
 * Injects deployment skills into the system prompt.
 * Skills are discovered via OpenCode's native skill tool.
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const extractAndStripFrontmatter = (content) => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, content };

  const frontmatterStr = match[1];
  const body = match[2];
  const frontmatter = {};

  for (const line of frontmatterStr.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
      frontmatter[key] = value;
    }
  }

  return { frontmatter, content: body };
};

const getAllSkills = (skillsDir) => {
  const skills = [];
  
  if (!fs.existsSync(skillsDir)) return skills;
  
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        const fullContent = fs.readFileSync(skillPath, 'utf8');
        const { frontmatter, content } = extractAndStripFrontmatter(fullContent);
        skills.push({
          name: frontmatter.name || entry.name,
          description: frontmatter.description || '',
          content,
          path: skillPath
        });
      }
    }
  }
  
  return skills;
};

export const DeploySkillsPlugin = async ({ client, directory }) => {
  const skillsDir = path.resolve(__dirname, '../../skills');
  const homeDir = os.homedir();
  const envConfigDir = process.env.OPENCODE_CONFIG_DIR;
  const globalConfigDir = envConfigDir || path.join(homeDir, '.config/opencode');
  
  const pluginDir = path.resolve(__dirname, '../');
  const projectRoot = path.resolve(pluginDir, '../..');
  const isProjectScoped = !pluginDir.startsWith(globalConfigDir);
  
  const configDir = isProjectScoped ? projectRoot : globalConfigDir;
  
  const skills = getAllSkills(skillsDir);
  
  const getBootstrapContent = () => {
    if (skills.length === 0) return null;
    
    const skillsList = skills.map(s => 
      `- **${s.name}**: ${s.description}`
    ).join('\n');
    
    const installGlobal = `- For Claude Code: Use \`/plugin marketplace add AayushMS/deploy-skills\` → \`/plugin install deploy-skills@deploy-skills\`
- For OpenCode (global): Clone to \`~/.config/opencode/plugins/deploy-skills/`
- For OpenCode (project): Copy \`.opencode\` folder to your project root`;
    
    const installProject = `- For Claude Code: Use \`/plugin marketplace add AayushMS/deploy-skills\` → \`/plugin install deploy-skills@deploy-skills\`
- For OpenCode: Copy \`.opencode\` folder to your project root`;
    
    return `<EXTREMELY_IMPORTANT>
You have access to deploy-skills plugin for deployment tasks.

**Available Skills:**
${skillsList}

**Skills location:**
Deploy skills are in \`${configDir}/plugins/deploy-skills/skills/\` (${isProjectScoped ? 'project-scoped' : 'global'})
Use OpenCode's native \`skill\` tool to load and use these deployment skills.

**Installation:**
${isProjectScoped ? installProject : installGlobal}

</EXTREMELY_IMPORTANT>`;
  };

  return {
    'experimental.chat.system.transform': async (_input, output) => {
      const bootstrap = getBootstrapContent();
      if (bootstrap) {
        (output.system ||= []).push(bootstrap);
      }
    }
  };
};
