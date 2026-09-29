import { DocumentDef } from "../documents";

export const SLA: DocumentDef = {
  id: "sla",
  name: "Service Level Agreement",
  description: "Uptime and support terms.",
  parties: ["Provider", "Customer"],
  variables: ["Target Uptime", "Support Channel"],
  body: [
    "# Service Level Agreement",
    "",
    '1. <span class="header_2" id="1">Uptime</span>',
    '    1. <span class="header_3" id="1.1">Target Uptime.</span> <span class="coverpage_link">Provider</span> will meet the <span class="orderform_link">Target Uptime</span>.',
  ].join("\n"),
};
