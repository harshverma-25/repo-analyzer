import type { TechnologyFinding } from '@repo-analyzer/shared';
import path from 'path';

interface TechRule {
  name: string;
  category: TechnologyFinding['category'];
  packageMatches?: string[];
  configFiles?: string[];
}

const TECH_CATALOG: TechRule[] = [
  // Frameworks & Runtimes (JS / TS)
  { name: 'Node.js', category: 'runtime', configFiles: ['package.json'] },
  { name: 'Express.js', category: 'framework', packageMatches: ['express'] },
  { name: 'Next.js', category: 'framework', packageMatches: ['next'], configFiles: ['next.config.js', 'next.config.mjs', 'next.config.ts'] },
  { name: 'React', category: 'framework', packageMatches: ['react'] },
  { name: 'Vue.js', category: 'framework', packageMatches: ['vue'], configFiles: ['vite.config.js', 'vite.config.ts'] },
  { name: 'Fastify', category: 'framework', packageMatches: ['fastify'] },
  { name: 'NestJS', category: 'framework', packageMatches: ['@nestjs/core'] },
  { name: 'Koa', category: 'framework', packageMatches: ['koa'] },

  // Databases & ORMs
  { name: 'Mongoose', category: 'orm', packageMatches: ['mongoose'] },
  { name: 'Prisma', category: 'orm', packageMatches: ['@prisma/client', 'prisma'], configFiles: ['prisma/schema.prisma', 'schema.prisma'] },
  { name: 'TypeORM', category: 'orm', packageMatches: ['typeorm'] },
  { name: 'Sequelize', category: 'orm', packageMatches: ['sequelize'] },
  { name: 'MongoDB Driver', category: 'database', packageMatches: ['mongodb'] },
  { name: 'PostgreSQL (pg)', category: 'database', packageMatches: ['pg'] },
  { name: 'Redis', category: 'database', packageMatches: ['redis', 'ioredis'] },

  // Build & Tooling
  { name: 'TypeScript', category: 'build_tool', packageMatches: ['typescript'], configFiles: ['tsconfig.json'] },
  { name: 'Tailwind CSS', category: 'styling', packageMatches: ['tailwindcss'], configFiles: ['tailwind.config.js', 'tailwind.config.ts'] },
  { name: 'Docker', category: 'build_tool', configFiles: ['Dockerfile', 'docker-compose.yml', 'compose.yaml', 'docker-compose.yaml'] },
  { name: 'Vite', category: 'build_tool', packageMatches: ['vite'], configFiles: ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'] },
  { name: 'Webpack', category: 'build_tool', packageMatches: ['webpack'], configFiles: ['webpack.config.js'] },
  { name: 'Turbo', category: 'build_tool', packageMatches: ['turbo'], configFiles: ['turbo.json'] },

  // Validation & Utilities
  { name: 'Zod', category: 'utility', packageMatches: ['zod'] },
  { name: 'Joi', category: 'utility', packageMatches: ['joi'] },
  { name: 'Axios', category: 'utility', packageMatches: ['axios'] },

  // Testing
  { name: 'Jest', category: 'testing', packageMatches: ['jest'], configFiles: ['jest.config.js', 'jest.config.ts'] },
  { name: 'Vitest', category: 'testing', packageMatches: ['vitest'], configFiles: ['vitest.config.ts'] },
  { name: 'Supertest', category: 'testing', packageMatches: ['supertest'] },

  // Backend & Systems (Multi-Language)
  { name: 'Python', category: 'runtime', configFiles: ['requirements.txt', 'pyproject.toml', 'Pipfile', 'setup.py'] },
  { name: 'Django', category: 'framework', configFiles: ['manage.py'] },
  { name: 'Go', category: 'runtime', configFiles: ['go.mod'] },
  { name: 'Rust', category: 'runtime', configFiles: ['Cargo.toml'] },
  { name: 'Java', category: 'runtime', configFiles: ['pom.xml', 'build.gradle', 'build.gradle.kts'] },
];

function hasMatchingConfigFile(filePaths: string[], targetConfig: string): string | null {
  const targetLower = targetConfig.toLowerCase();
  for (const p of filePaths) {
    const norm = p.replace(/\\/g, '/').toLowerCase();
    if (norm === targetLower || norm.endsWith('/' + targetLower)) {
      return p;
    }
  }
  return null;
}

export function detectTechnologies(
  files: { path: string; content?: string }[]
): TechnologyFinding[] {
  const findings: TechnologyFinding[] = [];
  const foundNames = new Set<string>();

  // Collect and parse all package.json manifests (monorepos, subpackages, client/server)
  const packageJsonFiles = files.filter((f) => {
    const base = path.basename(f.path).toLowerCase();
    return base === 'package.json';
  });

  interface DiscoveredPackage {
    manifestPath: string;
    packageName: string;
    packageVersion: string;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  }

  const manifests: DiscoveredPackage[] = [];
  for (const pkgFile of packageJsonFiles) {
    if (!pkgFile.content) continue;
    try {
      const parsed = JSON.parse(pkgFile.content);
      manifests.push({
        manifestPath: pkgFile.path,
        packageName: (parsed.name || '').toLowerCase(),
        packageVersion: parsed.version || '',
        dependencies: parsed.dependencies || {},
        devDependencies: parsed.devDependencies || {},
      });
    } catch {
      // Ignored if invalid JSON
    }
  }

  const allFilePaths = files.map((f) => f.path);

  for (const rule of TECH_CATALOG) {
    if (foundNames.has(rule.name)) continue;

    // Check across all package manifests discovered
    if (rule.packageMatches) {
      for (const manifest of manifests) {
        let matched = false;
        for (const pkg of rule.packageMatches) {
          const pkgLower = pkg.toLowerCase();
          if (manifest.packageName === pkgLower) {
            findings.push({
              name: rule.name,
              category: rule.category,
              version: manifest.packageVersion,
              confidence: 'confirmed',
              evidence: `Repository package "${manifest.packageName}" defined in ${manifest.manifestPath}`,
            });
            foundNames.add(rule.name);
            matched = true;
            break;
          } else if (manifest.dependencies[pkg]) {
            findings.push({
              name: rule.name,
              category: rule.category,
              version: manifest.dependencies[pkg],
              confidence: 'confirmed',
              evidence: `Found dependency "${pkg}": "${manifest.dependencies[pkg]}" in ${manifest.manifestPath}`,
            });
            foundNames.add(rule.name);
            matched = true;
            break;
          } else if (manifest.devDependencies[pkg]) {
            findings.push({
              name: rule.name,
              category: rule.category,
              version: manifest.devDependencies[pkg],
              confidence: 'confirmed',
              evidence: `Found devDependency "${pkg}": "${manifest.devDependencies[pkg]}" in ${manifest.manifestPath}`,
            });
            foundNames.add(rule.name);
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
    }

    if (foundNames.has(rule.name)) continue;

    // Check config files anywhere in tree
    if (rule.configFiles) {
      for (const config of rule.configFiles) {
        const matchedPath = hasMatchingConfigFile(allFilePaths, config);
        if (matchedPath) {
          findings.push({
            name: rule.name,
            category: rule.category,
            confidence: 'confirmed',
            evidence: `Detected configuration file: ${matchedPath}`,
          });
          foundNames.add(rule.name);
          break;
        }
      }
    }
  }

  return findings;
}
