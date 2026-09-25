import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function audit() {
  const products = await prisma.product.findMany({
    where: {
      brand: { slug: { in: ["dr-jacobs", "omni-biotic"] } },
    },
    include: {
      images: { select: { url: true } },
    },
    orderBy: [{ brand: { slug: "asc" } }, { namePl: "asc" }],
  });

  interface Issue {
    slug: string;
    name: string;
    issues: string[];
  }

  const issues: Issue[] = [];

  for (const p of products) {
    const productIssues: string[] = [];

    // Check shortDesc
    if (!p.shortDescPl || p.shortDescPl.length < 20) {
      productIssues.push("shortDesc missing/too short");
    } else if (p.shortDescPl.length > 150) {
      productIssues.push(`shortDesc too long (${p.shortDescPl.length} chars)`);
    }

    // Check description
    if (!p.descriptionPl || p.descriptionPl.length < 100) {
      productIssues.push("desc missing/too short");
    } else if (!p.descriptionPl.includes("<h3>")) {
      productIssues.push("desc has no sections");
    }

    // Check benefits
    if (!p.benefitsPl || (Array.isArray(p.benefitsPl) && p.benefitsPl.length === 0)) {
      productIssues.push("benefits empty");
    } else if (Array.isArray(p.benefitsPl) && p.benefitsPl.length < 3) {
      productIssues.push(`benefits too few (${(p.benefitsPl as string[]).length})`);
    }

    // Check images
    const uniqueUrls = new Set(p.images.map((img) => img.url));
    if (uniqueUrls.size < p.images.length) {
      productIssues.push(
        `${p.images.length} images, ${uniqueUrls.size} unique (${p.images.length - uniqueUrls.size} duplicates)`,
      );
    } else if (p.images.length > 5) {
      productIssues.push(`${p.images.length} images (too many)`);
    }

    if (productIssues.length > 0) {
      issues.push({
        slug: p.slug,
        name: p.namePl,
        issues: productIssues,
      });
    }
  }

  console.log(`\n📊 AUDIT: ${products.length} total\n`);
  console.log(`❌ Issues found: ${issues.length}\n`);

  // Group by issue type
  const issueTypes: Record<string, number> = {};
  for (const item of issues) {
    for (const issue of item.issues) {
      const key = issue.split("(")[0].trim();
      issueTypes[key] = (issueTypes[key] || 0) + 1;
    }
  }

  console.log("Issue breakdown:");
  Object.entries(issueTypes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

  console.log(`\n\nProblem products (top 30):`);
  issues.slice(0, 30).forEach((item) => {
    console.log(`\n${item.name} (${item.slug})`);
    item.issues.forEach((i) => {
      console.log(`  ❌ ${i}`);
    });
  });

  await prisma.$disconnect();
}

audit().catch(console.error);
