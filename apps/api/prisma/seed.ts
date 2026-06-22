import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { METRICS, RATING_SCALE_V1 } from '@perf-tracker/shared';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin User';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';

async function main() {
  console.log('Seeding database...');

  // Upsert MetricDefinitions (5 metrics)
  for (const metric of METRICS) {
    await prisma.metricDefinition.upsert({
      where: { key: metric.key as any },
      update: {
        label: metric.label,
        description: metric.description,
        active: true,
      },
      create: {
        key: metric.key as any,
        label: metric.label,
        description: metric.description,
        active: true,
      },
    });
  }
  console.log(`[seed] Upserted ${METRICS.length} MetricDefinitions`);

  // Upsert RatingScale v1
  await prisma.ratingScale.upsert({
    where: { version: RATING_SCALE_V1.version },
    update: {
      definitions: RATING_SCALE_V1 as any,
    },
    create: {
      version: RATING_SCALE_V1.version,
      definitions: RATING_SCALE_V1 as any,
    },
  });
  console.log('[seed] Upserted RatingScale v1');

  // Upsert admin user
  const passwordHash = await argon2.hash(ADMIN_PASSWORD, { type: argon2.argon2id });
  const adminUser = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      displayName: ADMIN_NAME,
      role: 'admin',
      auth_source: 'local',
      isActive: true,
      passwordHash,
    },
    create: {
      email: ADMIN_EMAIL,
      displayName: ADMIN_NAME,
      role: 'admin',
      auth_source: 'local',
      isActive: true,
      passwordHash,
    },
  });
  console.log(`[seed] Upserted admin user: ${adminUser.email}`);

  console.log('[seed] Done. Summary:');
  console.log(`  - ${METRICS.length} MetricDefinitions`);
  console.log('  - 1 RatingScale (v1)');
  console.log(`  - 1 admin user (${ADMIN_EMAIL})`);
}

main()
  .catch((e) => {
    console.error('[seed] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
