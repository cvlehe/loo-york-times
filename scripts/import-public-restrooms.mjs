import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import {
  planImport,
  toImportRowInsert,
  toRestroomInsert,
} from "./lib/public-restrooms-import.mjs";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const filePath = resolve(process.argv.find((argument) => argument.endsWith(".csv")) ?? "Public_Restrooms_20260928.csv");
const dryRun = process.argv.includes("--dry-run");
const sourceName = "NYC Public Restrooms";
const csvBuffer = await readFile(filePath);
const plan = planImport(csvBuffer, sourceName);

if (dryRun) {
  console.log(JSON.stringify({
    ...plan.summary,
    quarantinedRows: plan.rows
      .filter((row) => row.outcome === "quarantined")
      .map((row) => ({ sourceRowNumber: row.sourceRowNumber, reason: row.outcomeReason })),
    skippedRows: plan.rows
      .filter((row) => row.outcome === "skipped_duplicate")
      .map((row) => ({ sourceRowNumber: row.sourceRowNumber, reason: row.outcomeReason })),
  }, null, 2));
  process.exit(0);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and server-only SUPABASE_SERVICE_ROLE_KEY are required");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existingBatch, error: existingBatchError } = await supabase
  .from("import_batches")
  .select("id,status,expected_row_count,accepted_row_count,skipped_row_count,quarantined_row_count")
  .eq("source_name", sourceName)
  .eq("source_file_sha256", plan.summary.sourceFileSha256)
  .maybeSingle();

if (existingBatchError) throw existingBatchError;
if (existingBatch?.status === "completed") {
  console.log(JSON.stringify({
    message: "This source snapshot was already imported; no rows were created.",
    importBatchId: existingBatch.id,
    expectedRowCount: existingBatch.expected_row_count,
    acceptedRowCount: existingBatch.accepted_row_count,
    skippedRowCount: existingBatch.skipped_row_count,
    quarantinedRowCount: existingBatch.quarantined_row_count,
  }, null, 2));
  process.exit(0);
}

let importBatchId = existingBatch?.id;
if (!importBatchId) {
  const { data, error } = await supabase
    .from("import_batches")
    .insert({
      source_name: sourceName,
      source_file_name: basename(filePath),
      source_file_sha256: plan.summary.sourceFileSha256,
      status: "processing",
      expected_row_count: plan.summary.expectedRowCount,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  importBatchId = data.id;
} else {
  const { error } = await supabase
    .from("import_batches")
    .update({ status: "processing", failure_reason: null, started_at: new Date().toISOString(), finished_at: null })
    .eq("id", importBatchId);
  if (error) throw error;
}

try {
  const acceptedRows = plan.rows.filter((row) => row.outcome === "accepted");
  for (let index = 0; index < acceptedRows.length; index += 100) {
    const { error } = await supabase
      .from("restrooms")
      .upsert(acceptedRows.slice(index, index + 100).map(toRestroomInsert), { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
  }

  for (let index = 0; index < plan.rows.length; index += 100) {
    const { error } = await supabase
      .from("import_rows")
      .upsert(plan.rows.slice(index, index + 100).map((row) => toImportRowInsert(row, importBatchId)), {
        onConflict: "import_batch_id,source_row_number",
        ignoreDuplicates: true,
      });
    if (error) throw error;
  }

  const { error } = await supabase
    .from("import_batches")
    .update({
      status: "completed",
      accepted_row_count: plan.summary.acceptedRowCount,
      skipped_row_count: plan.summary.skippedRowCount,
      quarantined_row_count: plan.summary.quarantinedRowCount,
      finished_at: new Date().toISOString(),
    })
    .eq("id", importBatchId);
  if (error) throw error;

  console.log(JSON.stringify({ message: "Import completed.", importBatchId, ...plan.summary }, null, 2));
} catch (error) {
  await supabase
    .from("import_batches")
    .update({
      status: "failed",
      failure_reason: error instanceof Error ? error.message : String(error),
      finished_at: new Date().toISOString(),
    })
    .eq("id", importBatchId);
  throw error;
}
