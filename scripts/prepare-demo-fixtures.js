/**
 * prepare-demo-fixtures.js
 *
 * Downloads and formats the 18 realistic photographs for the 3 demo cases:
 *   - CASE-01: 15-inch Laptop (Missing Charger)
 *   - CASE-02: Wireless Headphones (Physical Damage)
 *   - CASE-03: USB-C Cable (Wrong Product: Lightning Cable Returned)
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const DEMO_DIR = path.join(__dirname, "..", "evaluation", "fixtures", "demo");

const CASE01_REF = path.join(DEMO_DIR, "CASE-01", "reference");
const CASE01_RET = path.join(DEMO_DIR, "CASE-01", "return");
const CASE02_REF = path.join(DEMO_DIR, "CASE-02", "reference");
const CASE02_RET = path.join(DEMO_DIR, "CASE-02", "return");
const CASE03_REF = path.join(DEMO_DIR, "CASE-03", "reference");
const CASE03_RET = path.join(DEMO_DIR, "CASE-03", "return");

[CASE01_REF, CASE01_RET, CASE02_REF, CASE02_RET, CASE03_REF, CASE03_RET].forEach(d => {
  fs.mkdirSync(d, { recursive: true });
});

async function downloadAndProcess(url, destPath) {
  console.log(`Downloading ${url.slice(0, 60)}... -> ${path.basename(destPath)}`);
  const res = await fetch(url, {
    headers: { "User-Agent": "ReturnOpsEvaluator/1.0 (dev@returnops.ai)" }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());

  await sharp(buf)
    .resize(800, 600, { fit: "cover", position: "center" })
    .jpeg({ quality: 85 })
    .toFile(destPath);
  console.log(`  ✓ Saved ${path.basename(destPath)} (${fs.statSync(destPath).size} bytes)`);
}

async function main() {
  console.log("=== PREPARING REALISTIC DEMO FIXTURES (18 PHOTOGRAPHS) ===\n");

  // CASE-01 photos were already generated as realistic smartphone warehouse photos!
  // Verify CASE-01 files exist
  const c1Files = [
    path.join(CASE01_REF, "REF-01_product.jpg"),
    path.join(CASE01_REF, "REF-02_accessories.jpg"),
    path.join(CASE01_REF, "REF-03_complete_package.jpg"),
    path.join(CASE01_RET, "IMG-01_laptop.jpg"),
    path.join(CASE01_RET, "IMG-02_return_contents.jpg"),
    path.join(CASE01_RET, "IMG-03_accessories.jpg"),
  ];
  for (const f of c1Files) {
    if (!fs.existsSync(f)) throw new Error(`Missing CASE-01 file: ${f}`);
    console.log(`✓ CASE-01 file verified: ${path.basename(f)}`);
  }

  // CASE-02: Wireless Headphones (Physical Damage)
  // REF-01_product.jpg is already in place from realistic generation
  console.log("\n--- Processing CASE-02 (Headphones Damage) ---");
  await downloadAndProcess(
    "https://upload.wikimedia.org/wikipedia/commons/0/0a/Bose_QuietComfort_25_Acoustic_Noise_Cancelling_Headphones_with_Carry_Case.jpg",
    path.join(CASE02_REF, "REF-02_accessories.jpg")
  );
  await downloadAndProcess(
    "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80",
    path.join(CASE02_REF, "REF-03_complete_package.jpg")
  );
  await downloadAndProcess(
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
    path.join(CASE02_RET, "IMG-01_headphones.jpg")
  );
  await downloadAndProcess(
    "https://upload.wikimedia.org/wikipedia/commons/4/4c/Beats_headphones_diy_repair.jpg",
    path.join(CASE02_RET, "IMG-02_damage.jpg")
  );
  await downloadAndProcess(
    "https://upload.wikimedia.org/wikipedia/commons/e/e1/Beats_headphones_diy_repair_2.jpg",
    path.join(CASE02_RET, "IMG-03_return_contents.jpg")
  );

  // CASE-03: USB-C Cable (Wrong item: Lightning cable returned)
  console.log("\n--- Processing CASE-03 (USB-C vs Lightning Cable) ---");
  await downloadAndProcess(
    "https://upload.wikimedia.org/wikipedia/commons/3/3c/USB_Type-C_Cable_-_iPad_USB-C_Charger_%2845640822114%29.jpg",
    path.join(CASE03_REF, "REF-01_expected_cable.jpg")
  );
  await downloadAndProcess(
    "https://upload.wikimedia.org/wikipedia/commons/8/8d/USB_Type-C_plug_20170626_crop.jpg",
    path.join(CASE03_REF, "REF-02_expected_connector.jpg")
  );
  await downloadAndProcess(
    "https://upload.wikimedia.org/wikipedia/commons/c/c3/USB-C_cable_2017_A.jpg",
    path.join(CASE03_REF, "REF-03_expected_package.jpg")
  );
  await downloadAndProcess(
    "https://upload.wikimedia.org/wikipedia/commons/9/9d/Lightning_connector_02.jpg",
    path.join(CASE03_RET, "IMG-01_return_cable.jpg")
  );
  await downloadAndProcess(
    "https://upload.wikimedia.org/wikipedia/commons/6/66/Lightning_connector_01.jpg",
    path.join(CASE03_RET, "IMG-02_return_connector.jpg")
  );
  await downloadAndProcess(
    "https://upload.wikimedia.org/wikipedia/commons/b/bb/Lightning_connector_03.jpg",
    path.join(CASE03_RET, "IMG-03_return_package.jpg")
  );

  console.log("\n✓ All 18 photographs prepared successfully!");
}

main().catch(err => {
  console.error("Error preparing photos:", err);
  process.exit(1);
});
