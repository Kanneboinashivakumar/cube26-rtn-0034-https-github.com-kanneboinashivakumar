/**
 * scripts/run-demo-pipeline.js
 *
 * Runs the 3 realistic demo cases through the actual production inspection pipeline.
 * Calls http://localhost:3030/api/inspect.
 * Generates evaluation/results/demo_results.json and evaluation/results/demo_report.md.
 */

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const FIXTURES_DIR = path.join(ROOT_DIR, "demo-data");
const RESULTS_DIR = path.join(ROOT_DIR, "evaluation", "results");

async function main() {
  console.log("=== Running ReturnOps AI Demo Cases Inspection Pipeline ===\n");

  const demoCasesFile = path.join(FIXTURES_DIR, "demo-cases.json");
  if (!fs.existsSync(demoCasesFile)) {
    console.error("demo-cases.json not found at:", demoCasesFile);
    process.exit(1);
  }

  const demoData = JSON.parse(fs.readFileSync(demoCasesFile, "utf-8"));
  const cases = demoData.cases;
  console.log(`Loaded ${cases.length} demo cases.\n`);

  const results = [];

  for (const c of cases) {
    console.log(`------------------------------------------------------------`);
    console.log(`Executing ${c.case_id}: ${c.product} (${c.sku})`);
    console.log(`Scenario: ${c.scenario}`);
    console.log(`Controlled Change: ${c.controlled_change}`);

    // Load the reference images as base64
    const refImages = [];
    const refMimeTypes = [];
    if (c.reference_images && Array.isArray(c.reference_images)) {
      for (const relPath of c.reference_images) {
        const fullPath = path.join(ROOT_DIR, relPath);
        if (fs.existsSync(fullPath)) {
          refImages.push(fs.readFileSync(fullPath).toString("base64"));
          refMimeTypes.push("image/jpeg");
        }
      }
    }

    // Load the 3 return images as base64
    const images = [];
    const mimeTypes = [];

    for (const relPath of c.return_images) {
      const fullPath = path.join(ROOT_DIR, relPath);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Return image file missing: ${fullPath}`);
      }
      const buffer = fs.readFileSync(fullPath);
      images.push(buffer.toString("base64"));
      mimeTypes.push("image/jpeg");
    }

    const payload = {
      order_id: `DEMO-ORD-${c.case_id}`,
      sku: c.sku,
      product_name: c.product,
      expected_components: c.expected_components,
      images,
      image_mime_types: mimeTypes,
      reference_images: refImages.length > 0 ? refImages : undefined,
      reference_image_mime_types: refMimeTypes.length > 0 ? refMimeTypes : undefined,
    };

    console.log(`Sending inspection request (${images.length} return images, ${refImages.length} reference images) to http://localhost:3030/api/inspect...`);
    const startTime = Date.now();

    const response = await fetch("http://localhost:3030/api/inspect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const elapsed = Date.now() - startTime;
    console.log(`Response received in ${elapsed}ms. HTTP status: ${response.status}`);

    const resJson = await response.json();
    if (!response.ok && response.status !== 207) {
      console.error(`Inspection failed for ${c.case_id}:`, resJson);
      results.push({
        case_id: c.case_id,
        sku: c.sku,
        status: "FAILED",
        error: resJson,
        expected: {
          identity: c.expected_identity,
          completeness: c.expected_completeness,
          condition: c.expected_condition,
          disposition: c.expected_disposition,
        },
      });
      continue;
    }

    const record = resJson.record;
    const checks = record.checks || [];

    const identityCheck = checks.find((chk) => chk.check_key === "identity");
    const completenessCheck = checks.find((chk) => chk.check_key === "completeness");
    const conditionCheck = checks.find((chk) => chk.check_key === "condition");

    const matchedRule = record.outcome.rule_trace.find((r) => r.matched);

    const actualResult = {
      case_id: c.case_id,
      sku: c.sku,
      product: c.product,
      record_id: record.record_id,
      status: record.status,
      latency_ms: elapsed,
      expected: {
        identity: c.expected_identity,
        completeness: c.expected_completeness,
        condition: c.expected_condition,
        condition_grade: c.expected_condition_grade,
        disposition: c.expected_disposition,
      },
      actual: {
        identity: {
          verdict: identityCheck?.verdict,
          confidence: identityCheck?.confidence,
          detail: identityCheck?.detail,
          evidence_refs: identityCheck?.evidence_refs,
        },
        completeness: {
          verdict: completenessCheck?.verdict,
          confidence: completenessCheck?.confidence,
          detail: completenessCheck?.detail,
          components: completenessCheck?.components,
          evidence_refs: completenessCheck?.evidence_refs,
        },
        condition: {
          verdict: conditionCheck?.verdict,
          confidence: conditionCheck?.confidence,
          grade: conditionCheck?.grade,
          observed_state: conditionCheck?.observed_state,
          detail: conditionCheck?.detail,
          evidence_refs: conditionCheck?.evidence_refs,
        },
        disposition: record.outcome.disposition,
        matched_rule: matchedRule?.rule_id,
        matched_rule_description: matchedRule?.description,
      },
      agreement: {
        identity: identityCheck?.verdict === c.expected_identity,
        completeness: completenessCheck?.verdict === c.expected_completeness,
        condition: conditionCheck?.verdict === c.expected_condition,
        disposition: record.outcome.disposition === c.expected_disposition,
      },
      raw_observation: record.raw_observation,
    };

    console.log(`Results for ${c.case_id}:`);
    console.log(`  Identity:     Actual=${actualResult.actual.identity.verdict} | Expected=${c.expected_identity} (${actualResult.agreement.identity ? "MATCH" : "DISAGREE"})`);
    console.log(`  Completeness: Actual=${actualResult.actual.completeness.verdict} | Expected=${c.expected_completeness} (${actualResult.agreement.completeness ? "MATCH" : "DISAGREE"})`);
    console.log(`  Condition:    Actual=${actualResult.actual.condition.verdict} (${actualResult.actual.condition.grade || actualResult.actual.condition.observed_state}) | Expected=${c.expected_condition} (${actualResult.agreement.condition ? "MATCH" : "DISAGREE"})`);
    console.log(`  Disposition:  Actual=${actualResult.actual.disposition} (${matchedRule?.rule_id}) | Expected=${c.expected_disposition} (${actualResult.agreement.disposition ? "MATCH" : "DISAGREE"})`);

    results.push(actualResult);

    // Wait 3 seconds between cases to avoid rate limits
    await new Promise((r) => setTimeout(r, 3000));
  }

  // Ensure evaluation/results exists
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  // Write demo_results.json
  const resultsOutput = {
    dataset_type: "synthetic_demo",
    executed_at: new Date().toISOString(),
    total_cases: results.length,
    results,
  };
  fs.writeFileSync(
    path.join(RESULTS_DIR, "demo_results.json"),
    JSON.stringify(resultsOutput, null, 2),
    "utf-8"
  );
  console.log(`\nWrote evaluation/results/demo_results.json`);

  // Write demo_report.md
  let reportMd = `# ReturnOps AI — Realistic Demo Fixtures Execution Report\n\n`;
  reportMd += `**Dataset Type**: \`synthetic_demo\`  \n`;
  reportMd += `**Execution Date**: ${new Date().toISOString()}  \n`;
  reportMd += `**Model**: \`gemini-3.5-flash-lite\` (via \`GEMINI_MODEL\`)  \n`;
  reportMd += `**Pipeline**: Full Production Pipeline (HTTP POST \`/api/inspect\` -> Gemini -> Zod -> Deterministic Rules -> Supabase Persistence)  \n\n`;

  reportMd += `> **CRITICAL DISCLAIMER**: These results reflect a 3-case synthetic demonstration fixture set designed to test visual discrimination without text placards. They are NOT real-customer return data, NOT organizer ground truth, and must NOT be cited as held-out evaluation benchmarks.\n\n`;

  reportMd += `## Summary Table\n\n`;
  reportMd += `| Case ID | Product | Expected (Id / Comp / Cond / Disp) | Actual (Id / Comp / Cond / Disp) | Agreement | Rule Matched | Latency |\n`;
  reportMd += `| :--- | :--- | :--- | :--- | :---: | :--- | :---: |\n`;

  for (const r of results) {
    const exp = `${r.expected.identity}/${r.expected.completeness}/${r.expected.condition}/${r.expected.disposition}`;
    const act = `${r.actual.identity.verdict}/${r.actual.completeness.verdict}/${r.actual.condition.verdict}/${r.actual.disposition}`;
    const allAgree =
      r.agreement.identity &&
      r.agreement.completeness &&
      r.agreement.condition &&
      r.agreement.disposition;
    const agreeStr = allAgree ? "✅ FULL" : "⚠️ PARTIAL";
    reportMd += `| **${r.case_id}** | ${r.product} | \`${exp}\` | \`${act}\` | ${agreeStr} | \`${r.actual.matched_rule || "N/A"}\` | ${r.latency_ms}ms |\n`;
  }

  reportMd += `\n## Case-by-Case Breakdown\n\n`;

  for (const r of results) {
    reportMd += `### ${r.case_id} — ${r.product} (\`${r.sku}\`)\n\n`;
    reportMd += `- **Record ID**: \`${r.record_id}\`\n`;
    reportMd += `- **Latency**: ${r.latency_ms} ms\n`;
    reportMd += `- **Identity Check**: Actual: **${r.actual.identity.verdict}** (conf: ${r.actual.identity.confidence}) vs Expected: **${r.expected.identity}** [${r.agreement.identity ? "AGREE" : "DISAGREE"}]\n`;
    reportMd += `  - *Detail*: ${r.actual.identity.detail}\n`;
    reportMd += `- **Completeness Check**: Actual: **${r.actual.completeness.verdict}** (conf: ${r.actual.completeness.confidence}) vs Expected: **${r.expected.completeness}** [${r.agreement.completeness ? "AGREE" : "DISAGREE"}]\n`;
    reportMd += `  - *Detail*: ${r.actual.completeness.detail}\n`;
    if (r.actual.completeness.components) {
      reportMd += `  - *Observed Components*:\n`;
      for (const comp of r.actual.completeness.components) {
        reportMd += `    - ${comp.name}: \`${comp.observed}\`\n`;
      }
    }
    reportMd += `- **Condition Check**: Actual: **${r.actual.condition.verdict}** (Grade: \`${r.actual.condition.grade || "N/A"}\`, State: \`${r.actual.condition.observed_state}\`, conf: ${r.actual.condition.confidence}) vs Expected: **${r.expected.condition}** (\`${r.expected.condition_grade || "N/A"}\`) [${r.agreement.condition ? "AGREE" : "DISAGREE"}]\n`;
    reportMd += `  - *Detail*: ${r.actual.condition.detail}\n`;
    reportMd += `- **Disposition**: Actual: **\`${r.actual.disposition}\`** vs Expected: **\`${r.expected.disposition}\`** [${r.agreement.disposition ? "AGREE" : "DISAGREE"}]\n`;
    reportMd += `- **Rule Triggered**: \`${r.actual.matched_rule}\` — *${r.actual.matched_rule_description}*\n\n`;
  }

  fs.writeFileSync(path.join(RESULTS_DIR, "demo_report.md"), reportMd, "utf-8");
  console.log(`Wrote evaluation/results/demo_report.md\n`);
  console.log("=== Pipeline Execution Complete ===");
}

main().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});
