import type { TechnologyFinding } from '@repo-analyzer/shared';

interface TechRule {
  name: string;
  category: TechnologyFinding['category'];
  packageMatches?: string[];
  configFiles?: string[];
}

const TECH_CATALOG: TechRule[] = [
  // Frameworks & Runtimes
  { name: 'Express.js', category: 'framework', packageMatches: ['express'] },
  { name: 'Next.js', category: 'framework', packageMatches: ['next'], configFiles: ['next.config.js', 'next.config.mjs', 'next.config.ts'] },
  { name: 'React', category: 'framework', packageMatches: ['react'] },
  { name: 'Vue.js', category: 'framework', packageMatches: ['vue'], configFiles: ['vite.config.js', 'vite.config.ts'] },
  { name: 'Fastify', category: 'framework', packageMatches: ['fastify'] },
  { name: 'NestJS', category: 'framework', packageMatches: ['@nestjs/core'] },
  { name: 'Koa', category: 'framework', packageMatches: ['koa'] },

  // Databases & ORMs
  { name: 'Mongoose', category: 'orm', packageMatches: ['mongoose'] },
  { name: 'Prisma', category: 'orm', packageMatches: ['@prisma/client', 'prisma'], configFiles: ['prisma/schema.prisma'] },
  { name: 'TypeORM', category: 'orm', packageMatches: ['typeorm'] },
  { name: 'Sequelize', category: 'orm', packageMatches: ['sequelize'] },
  { name: 'MongoDB Driver', category: 'database', packageMatches: ['mongodb'] },
  { name: 'PostgreSQL (pg)', category: 'database', packageMatches: ['pg'] },
  { name: 'Redis', category: 'database', packageMatches: ['redis', 'ioredis'] },

  // Build & Tooling
  { name: 'TypeScript', category: 'build_tool', packageMatches: ['typescript'], configFiles: ['tsconfig.json'] },
  { name: 'Tailwind CSS', category: 'styling', packageMatches: ['tailwindcss'], configFiles: ['tailwind.config.js', 'tailwind.config.ts'] },
  { name: 'Docker', category: 'build_tool', configFiles: ['Dockerfile', 'docker-compose.yml', 'compose.yaml'] },
  { name: 'Vite', category: 'build_tool', packageMatches: ['vite'], configFiles: ['vite.config.ts', 'vite.config.js'] },
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
];

export function detectTechnologies(
  files: { path: string; content?: string }[]
): TechnologyFinding[] {
  const findings: TechnologyFinding[] = [];
  const foundNames = new Set<string>();

  // Parse package.json if present
  const packageJsonFile = files.find((f) => f.path.toLowerCase() === 'package.json');
  let dependencies: Record<string, string> = {};
  let devDependencies: Record<string, string> = {};

  if (packageJsonFile && packageJsonFile.content) {
    try {
      const parsed = JSON.parse(packageJsonFile.content);
      dependencies = parsed.dependencies || {};
      devDependencies = parsed.devDependencies || {};
    } catch {
      // Ignored if invalid JSON
    }
  }

  const existingFilePaths = new Set(files.map((f) => f.path.toLowerCase()));

  for (const rule of TECH_CATALOG) {
    if (foundNames.has(rule.name)) continue;

    // Check package manifests
    if (rule.packageMatches) {
      for (const pkg of rule.packageMatches) {
        if (dependencies[pkg]) {
          findings.push({
            name: rule.name,
            category: rule.category,
            version: dependencies[pkg],
            confidence: 'confirmed',
            evidence: `Found dependency "${pkg}": "${dependencies[pkg]}" in package.json`,
          });
          foundNames.add(rule.name);
          break;
        } else if (devDependencies[pkg]) {
          findings.push({
            name: rule.name,
            category: rule.category,
            version: devDependencies[pkg],
            confidence: 'confirmed',
            evidence: `Found devDependency "${pkg}": "${devDependencies[pkg]}" in package.json`,
          });
          foundNames.add(rule.name);
          break;
        }
      }
    }

    if (foundNames.has(rule.name)) continue;

    // Check config files
    if (rule.configFiles) {
      for (const config of rule.configFiles) {
        if (existingFilePaths.has(config.toLowerCase())) {
          findings.push({
            name: rule.name,
            category: rule.category,
            confidence: 'confirmed',
            evidence: `Detected configuration file: ${config}`,
          });
          foundNames.add(rule.name);
          break;
        }
      }
    }
  }

  return findings;
}
