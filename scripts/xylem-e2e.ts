// End-to-end check: fake Subiekt (SQL Server in Docker) → xylem agent → local site → dev DB.
// The agent lives in its own repo, checked out next to this one (or set XYLEM_DIR).
//
//   docker run -d --name fake-subiekt --platform linux/amd64 -e ACCEPT_EULA=Y \
//     -e 'MSSQL_SA_PASSWORD=Dev-only-Sa-Passw0rd!' -e MSSQL_PID=Express -p 14330:1433 \
//     mcr.microsoft.com/mssql/server:2019-latest
//   (load xylem/dev/fake-subiekt.sql once — see the xylem README)
//   SUBIEKT_SYNC_SECRET_DEVFAKE=dev-secret pnpm dev   (other port: SITE_URL=http://localhost:3100)
//   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/xylem-e2e.ts
//
// Creates its own test products and removes them afterwards.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { prisma } from "@/lib/prisma";

const CODE = "devfake";
const SECRET = "dev-secret";
const RUN = Date.now().toString(36);
const stateDir = mkdtempSync(join(tmpdir(), "xylem-e2e-"));
const xylemDir = resolve(process.env.XYLEM_DIR ?? "../xylem");
const exportDir = join(stateDir, "zamowienia");

function sql(query: string) {
  execFileSync("docker", [
    "exec",
    "fake-subiekt",
    "/opt/mssql-tools18/bin/sqlcmd",
    "-C",
    "-b",
    "-S",
    "localhost",
    "-U",
    "sa",
    "-P",
    "Dev-only-Sa-Passw0rd!",
    "-d",
    "FakeSubiekt",
    "-Q",
    query,
  ]);
}

function agent(...args: string[]) {
  execFileSync("dotnet", ["run", "--project", join(xylemDir, "src"), "--", "--once", ...args], {
    stdio: "inherit",
    env: {
      ...process.env,
      PATH: `${process.env.HOME}/.dotnet:${process.env.PATH}`,
      DOTNET_CLI_TELEMETRY_OPTOUT: "1",
      Sync__SiteUrl: process.env.SITE_URL ?? "http://localhost:3000",
      Sync__DryRun: "false",
      Sync__StateDir: stateDir,
      Sync__Locations__0__Code: CODE,
      Sync__Locations__0__Secret: SECRET,
      Sync__Locations__0__ConnectionString:
        "Server=localhost,14330;Database=FakeSubiekt;User Id=wb_sync;Password=Dev-only-Passw0rd!;TrustServerCertificate=True",
      Sync__Locations__0__MagazynIds__0: "1",
      Sync__Locations__0__MagazynIds__1: "2",
      Sync__Orders__Enabled: "true",
      Sync__Orders__LocationCode: CODE,
      Sync__Orders__ExportDir: exportDir,
    },
  });
}

async function makeVariant(sku: string, ean: string | null) {
  const product = await prisma.product.create({
    data: {
      slug: `e2e-subiekt-${sku.toLowerCase()}`,
      namePl: `E2E Subiekt ${sku}`,
      status: "DRAFT",
      variants: { create: { sku, ean, pricePln: 1000, vatRate: 5, stock: 0 } },
    },
    include: { variants: true },
  });
  return product.variants[0];
}

const stockOf = async (id: string) =>
  (await prisma.productVariant.findUniqueOrThrow({ where: { id } })).stock;

function expect(label: string, actual: number, expected: number) {
  const ok = actual === expected;
  console.log(`${ok ? "✓" : "✗"} ${label}: ${actual}${ok ? "" : ` (expected ${expected})`}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  const ean = `29${Date.now()}`.slice(0, 13);
  const a = await makeVariant(`E2E-A-${RUN}`, ean);
  const b = await makeVariant(`E2E-B-${RUN}`, null);
  const c = await makeVariant(`E2E-C-${RUN}`, null);

  try {
    sql(`DELETE FROM tw_Stan; DELETE FROM tw__Towar;
      INSERT INTO tw__Towar (tw_Id, tw_Symbol, tw_Nazwa, tw_PodstKodKresk) VALUES
        (1, 'SUB-A', 'A by EAN', '${ean}'),
        (2, '${b.sku}', 'B by symbol', ''),
        (3, '${c.sku}', 'C', ''),
        (4, 'UNKNOWN-${RUN}', 'not on the site', '');
      INSERT INTO tw_Stan (st_TowId, st_MagId, st_Stan, st_StanRez) VALUES
        (1, 1, 5, 1), (1, 2, 2, 0),   -- A: 4 + 2 = 6 available
        (2, 1, 3.5, 0),               -- B: 3.5 kg → 3
        (3, 1, 2, 0), (4, 1, 9, 0);`);

    agent("--full");
    // one location, safety stock 1
    expect("A matched by EAN, both magazyny, minus reservation", await stockOf(a.id), 5);
    expect("B matched by symbol, decimal floored", await stockOf(b.id), 2);
    expect("C", await stockOf(c.id), 1);

    sql(`UPDATE tw_Stan SET st_Stan = 3 WHERE st_TowId = 1 AND st_MagId = 1;
      UPDATE tw__Towar SET tw_Zablokowany = 1 WHERE tw_Id = 3;`);
    agent();
    expect("A after a sale in the shop (delta)", await stockOf(a.id), 3);
    expect("C blocked in Subiekt → 0", await stockOf(c.id), 0);

    // Orders: web order → .epp once → staff load it → agent finds it → marked entered
    const orderNumber = `TZ-2099-${String(Date.now() % 100000).padStart(5, "0")}`;
    await prisma.order.create({
      data: {
        orderNumber,
        status: "PAID",
        paymentStatus: "CAPTURED",
        paymentMethod: "BANK_TRANSFER",
        customerEmail: "e2e@example.com",
        customerName: "Zofia Żółć",
        shippingMethod: "INPOST_KURIER",
        shippingCostPln: 1499,
        shipFirstName: "Zofia",
        shipLastName: "Żółć",
        subtotalPln: 2000,
        shippingPln: 1499,
        taxPln: 0,
        totalPln: 3499,
        items: {
          create: {
            variantId: a.id,
            productName: "E2E A",
            sku: a.sku,
            quantity: 2,
            unitPricePln: 1000,
            vatRate: 5,
            totalPln: 2000,
          },
        },
      },
    });
    const file = join(exportDir, `${orderNumber}.epp`);
    agent();
    const epp = existsSync(file) ? new TextDecoder("windows-1250").decode(readFileSync(file)) : "";
    expect("order written as .epp", Number(existsSync(file)), 1);
    expect("line uses the Subiekt symbol (via EAN)", Number(epp.includes('"SUB-A"')), 1);
    expect("polish letters in CP1250", Number(epp.includes("Zofia Żółć")), 1);

    rmSync(file);
    agent();
    expect("not written twice", Number(existsSync(file)), 0);

    sql(`INSERT INTO dok__Dokument (dok_Typ, dok_NrPelny, dok_Uwagi)
      VALUES (15, 'ZK 1/2026', 'Zamówienie internetowe ${orderNumber} | Przelew tradycyjny');`);
    agent();
    const entered = await prisma.order.findUniqueOrThrow({ where: { orderNumber } });
    expect("found in Subiekt → marked entered", Number(entered.subiektEnteredAt !== null), 1);

    const runs = await prisma.syncRun.findMany({
      where: { location: { code: CODE } },
      orderBy: { createdAt: "asc" },
    });
    console.log(
      runs.map(
        (r) =>
          `${r.mode}: received ${r.received}, unmatched ${r.unmatched}, changed ${r.changedVariants}`,
      ),
    );
  } finally {
    // TZ-2099-… is never a real order number
    await prisma.order.deleteMany({ where: { orderNumber: { startsWith: "TZ-2099-" } } });
    await prisma.stockLocation.deleteMany({ where: { code: CODE } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: "e2e-subiekt-" } } });
    rmSync(stateDir, { recursive: true, force: true });
    await prisma.$disconnect();
  }
}

void main();
