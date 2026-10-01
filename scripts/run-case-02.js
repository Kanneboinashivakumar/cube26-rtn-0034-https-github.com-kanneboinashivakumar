/**
 * scripts/run-case-02.js
 *
 * Runs ONLY CASE-02 through the live inspection pipeline.
 * Updates CASE-02 in evaluation/results/demo_results.json and demo_report.md.
 */

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DEMO_CASES_JSON = path.join(ROOT_DIR, "demo-data", "demo-cases.json");
const RESULTS_JSON = path.join(ROOT_DIR, "evaluation", "results", "demo_results.json");
const REPORT_MD = path.join(ROOT_DIR, "evaluation", "results", "demo_report.md");

async function main() {
  console.log("=== Running CASE-02 Pipeline Inspection ===\n");

  const demoData = JSON.parse(fs.readFileSync(DEMO_CASES_JSON, "utf-8"));
  const caseData = demoData.cases.find(c => c.sku === "WH-1001" || c.case_id === "RTN-002" || c.case_id === "CASE-02");
  if (!caseData) {
    throw new Error("WH-1001 / RTN-002 case not found in demo-cases.json");
  }
  console.log(`Case: ${caseData.case_id} — ${caseData.product}`);
  console.log(`Scenario: ${caseData.scenario}`);

  const refImages = [];
  const refMimeTypes = [];
  if (caseData.reference_images && Array.isArray(caseData.reference_images)) {
    for (const relPath of caseData.reference_images) {
      const fullPath = path.join(ROOT_DIR, relPath);
      if (fs.existsSync(fullPath)) {
        refImages.push(fs.readFileSync(fullPath).toString("base64"));
        refMimeTypes.push("image/jpeg");
      }
    }
  }

  const images = [];
  const mimeTypes = [];

  for (const relPath of caseData.return_images) {
    const fullPath = path.join(ROOT_DIR, relPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Image file missing: ${fullPath}`);
    }
    const buf = fs.readFileSync(fullPath);
    images.push(buf.toString("base64"));
    mimeTypes.push("image/jpeg");
  }

  const payload = {
    order_id: `DEMO-ORD-${caseData.case_id}`,
    sku: caseData.sku,
    product_name: caseData.product,
    expected_components: caseData.expected_components,
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
    console.error("Inspection error:", resJson);
    process.exit(1);
  }

  const record = resJson.record;
  const checks = record.checks || [];

  const identityCheck = checks.find((chk) => chk.check_key === "identity");
  const completenessCheck = checks.find((chk) => chk.check_key === "completeness");
  const conditionCheck = checks.find((chk) => chk.check_key === "condition");

  const matchedRule = record.outcome.rule_trace.find((r) => r.matched);

  console.log("\n==================================================");
  console.log("ACTUAL INSPECTION RESULTS FOR CASE-02");
  console.log("==================================================");
  console.log(`Record ID:   ${record.record_id}`);
  console.log(`Latency:     ${elapsed} ms`);
  console.log(`Identity:    ${identityCheck?.verdict} (conf: ${identityCheck?.confidence})`);
  console.log(`  Detail:    ${identityCheck?.detail}`);
  console.log(`Completeness:${completenessCheck?.verdict} (conf: ${completenessCheck?.confidence})`);
  console.log(`  Detail:    ${completenessCheck?.detail}`);
  if (completenessCheck?.components) {
    console.log("  Components observed:");
    for (const c of completenessCheck.components) {
      console.log(`    - ${c.name}: ${c.observed}`);
    }
  }
  console.log(`Condition:   ${conditionCheck?.verdict} (conf: ${conditionCheck?.confidence})`);
  console.log(`  Grade:     ${conditionCheck?.grade}`);
  console.log(`  State:     ${conditionCheck?.observed_state}`);
  console.log(`  Detail:    ${conditionCheck?.detail}`);
  console.log(`Disposition: ${record.outcome.disposition}`);
  console.log(`Rule:        ${matchedRule?.rule_id} — ${matchedRule?.description}`);
  console.log("==================================================\n");

  const updatedResult = {
    case_id: caseData.case_id,
    sku: caseData.sku,
    product: caseData.product,
    record_id: record.record_id,
    status: record.status,
    latency_ms: elapsed,
    expected: {
      identity: caseData.expected_identity,
      completeness: caseData.expected_completeness,
      condition: caseData.expected_condition,
      condition_grade: caseData.expected_condition_grade,
      disposition: caseData.expected_disposition,
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
      identity: identityCheck?.verdict === caseData.expected_identity,
      completeness: completenessCheck?.verdict === caseData.expected_completeness,
      condition: conditionCheck?.verdict === caseData.expected_condition,
      disposition: record.outcome.disposition === caseData.expected_disposition,
    },
    raw_observation: record.raw_observation,
  };

  // Update demo_results.json if it exists
  if (fs.existsSync(RESULTS_JSON)) {
    const allResults = JSON.parse(fs.readFileSync(RESULTS_JSON, "utf-8"));
    const idx = allResults.results.findIndex((r) => r.case_id === "CASE-02");
    if (idx >= 0) {
      allResults.results[idx] = updatedResult;
      allResults.executed_at = new Date().toISOString();
      fs.writeFileSync(RESULTS_JSON, JSON.stringify(allResults, null, 2), "utf-8");
      console.log("Updated CASE-02 in evaluation/results/demo_results.json");
    }
  }

  // Update demo_report.md
  if (fs.existsSync(REPORT_MD)) {
    const allResults = JSON.parse(fs.readFileSync(RESULTS_JSON, "utf-8")).results;
    let reportMd = `# ReturnOps AI — Realistic Demo Fixtures Execution Report\n\n`;
    reportMd += `**Dataset Type**: \`synthetic_demo\`  \n`;
    reportMd += `**Execution Date**: ${new Date().toISOString()}  \n`;
    reportMd += `**Model**: \`gemini-3.5-flash-lite\` (via \`GEMINI_MODEL\`)  \n`;
    reportMd += `**Pipeline**: Full Production Pipeline (HTTP POST \`/api/inspect\` -> Gemini -> Zod -> Deterministic Rules -> Supabase Persistence)  \n\n`;
    reportMd += `> **CRITICAL DISCLAIMER**: These results reflect a 3-case synthetic demonstration fixture set designed to test visual discrimination without text placards. They are NOT real-customer return data, NOT organizer ground truth, and must NOT be cited as held-out evaluation benchmarks.\n\n`;
    reportMd += `## Summary Table\n\n`;
    reportMd += `| Case ID | Product | Expected (Id / Comp / Cond / Disp) | Actual (Id / Comp / Cond / Disp) | Agreement | Rule Matched | Latency |\n`;
    reportMd += `| :--- | :--- | :--- | :--- | :---: | :--- | :---: |\n`;

    for (const r of allResults) {
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

    for (const r of allResults) {
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

    fs.writeFileSync(REPORT_MD, reportMd, "utf-8");
    console.log("Updated evaluation/results/demo_report.md");
  }
}

main().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
