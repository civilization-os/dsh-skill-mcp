window.__ModuleLoader__.load({id:"@civilization/deepseek-harness-skill-mcp",factory:(require)=>{
var module={exports:{}};var exports=module.exports;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.jsx
var index_exports = {};
__export(index_exports, {
  McpSection: () => McpSection,
  SkillSection: () => SkillSection,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react = require("react");

// src/client/controller.js
var skillCatalogMutations = /* @__PURE__ */ new Set([
  "add-skill",
  "update-skill-source",
  "create-skill",
  "update-skill",
  "delete-skill",
  "set-skill-invocation"
]);
function refreshesSlashCatalog(endpoint, options = {}) {
  return options.refreshSlashCatalog === true || skillCatalogMutations.has(endpoint);
}
var ExtensionsController = class {
  state = { extensions: [], sources: [], skills: [], revision: "", loading: false, saving: false, error: "", saved: false };
  listeners = /* @__PURE__ */ new Set();
  lifetime = new AbortController();
  generation = 0;
  silentPending = false;
  constructor(call) {
    this.call = call;
  }
  getSnapshot = () => this.state;
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  publish(patch) {
    if (this.lifetime.signal.aborted) return;
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
  async request(endpoint, args = {}, options = {}) {
    if (this.state.saving || this.lifetime.signal.aborted) return false;
    const silent = endpoint === "list" && options.silent === true;
    if (silent && (this.state.loading || this.silentPending)) return false;
    if (silent) this.silentPending = true;
    const generation = ++this.generation;
    const saving = endpoint !== "list";
    if (!silent) this.publish({ loading: !saving, saving, error: "", saved: false });
    try {
      const result = await this.call(endpoint, { ...args, revision: this.state.revision }, this.lifetime.signal);
      if (this.lifetime.signal.aborted || generation !== this.generation) return false;
      if (!result.ok) {
        if (!silent) this.publish({ error: result.error.code === "extensions/conflict" ? "conflict" : "failed", loading: false, saving: false });
        return false;
      }
      this.publish(silent ? result.value : { ...result.value, loading: false, saving: false, saved: saving });
      return true;
    } catch {
      if (!silent && generation === this.generation) this.publish({ error: "failed", loading: false, saving: false });
      return false;
    } finally {
      if (silent) this.silentPending = false;
    }
  }
  dispose() {
    this.lifetime.abort();
    this.listeners.clear();
  }
};

// src/client/locales.js
var zh = {
  navSkill: "Skill \u7BA1\u7406",
  navMcp: "MCP \u7BA1\u7406",
  skillIntro: "\u914D\u7F6E\u4E00\u4E2A\u6216\u591A\u4E2A Skill \u8DEF\u5F84\uFF1B\u6BCF\u4E2A\u8DEF\u5F84\u4E0B\u53EF\u4EE5\u5305\u542B\u591A\u4E2A\u6280\u80FD\u3002",
  mcpIntro: "\u7BA1\u7406\u5916\u90E8\u5DE5\u5177\u670D\u52A1\u5668\uFF0C\u8BA9\u5B83\u4EEC\u5728\u5F53\u524D\u914D\u7F6E\u4E2D\u53EF\u7528\u3002",
  skills: "Skill \u8DEF\u5F84",
  mcp: "MCP \u670D\u52A1\u5668",
  refresh: "\u5237\u65B0",
  add: "\u6DFB\u52A0\u8DEF\u5F84",
  addMcp: "\u6DFB\u52A0\u670D\u52A1\u5668",
  newSkill: "\u65B0\u5EFA Skill",
  emptySkills: "\u8FD8\u6CA1\u6709\u914D\u7F6E Skill \u8DEF\u5F84",
  emptySkillsHint: "\u6307\u5B9A\u4E00\u4E2A\u672C\u5730 skills \u76EE\u5F55\uFF0C\u76EE\u5F55\u4E0B\u7684\u5404\u4E2A\u5B50\u76EE\u5F55\u5C31\u662F\u6280\u80FD\u3002",
  emptyMcp: "\u8FD8\u6CA1\u6709\u6DFB\u52A0 MCP \u670D\u52A1\u5668",
  emptyMcpHint: "\u901A\u8FC7\u672C\u5730\u547D\u4EE4\u6216 HTTP \u5730\u5740\u8FDE\u63A5\u5916\u90E8\u5DE5\u5177\u3002",
  id: "\u6807\u8BC6",
  directory: "Skill \u8DEF\u5F84",
  transport: "\u914D\u7F6E\u7C7B\u578B",
  stdio: "stdio",
  http: "HTTP",
  command: "\u547D\u4EE4",
  args: "\u53C2\u6570\uFF08\u6BCF\u884C\u4E00\u4E2A\uFF09",
  cwd: "\u5DE5\u4F5C\u76EE\u5F55\uFF08\u53EF\u9009\uFF09",
  url: "\u670D\u52A1\u5668\u5730\u5740",
  cancel: "\u53D6\u6D88",
  save: "\u6DFB\u52A0",
  saveChanges: "\u4FDD\u5B58\u4FEE\u6539",
  create: "\u521B\u5EFA",
  edit: "\u7F16\u8F91",
  delete: "\u5220\u9664",
  confirmDelete: "\u786E\u8BA4\u5220\u9664",
  deleting: "\u5220\u9664\u4E2D\u2026",
  saving: "\u4FDD\u5B58\u4E2D\u2026",
  loading: "\u52A0\u8F7D\u4E2D\u2026",
  deleteExtensionTitle: "\u79FB\u9664 Skill \u6765\u6E90",
  deleteMcpTitle: "\u5220\u9664 MCP \u670D\u52A1\u5668",
  deleteSkillTitle: "\u6C38\u4E45\u5220\u9664 Skill",
  deleteExtensionConfirm: "\u5C06\u4ECE\u5F53\u524D\u914D\u7F6E\u4E2D\u79FB\u9664\u201C{name}\u201D\uFF0C\u76EE\u5F55\u4E2D\u7684 Skill \u6587\u4EF6\u4F1A\u4FDD\u7559\u3002",
  deleteMcpConfirm: "\u5C06\u5220\u9664 MCP \u670D\u52A1\u5668\u201C{name}\u201D\u53CA\u5176\u8FDE\u63A5\u914D\u7F6E\u3002",
  deleteSkillConfirm: "\u5C06\u6C38\u4E45\u5220\u9664\u201C{name}\u201D\u53CA\u5176\u76EE\u5F55\u5185\u7684\u8D44\u6E90\u6587\u4EF6\u3002\u6B64\u64CD\u4F5C\u65E0\u6CD5\u64A4\u9500\u3002",
  enabled: "\u914D\u7F6E\u5DF2\u542F\u7528",
  disabled: "\u5DF2\u7981\u7528",
  enable: "\u542F\u7528",
  disable: "\u7981\u7528",
  saved: "\u66F4\u6539\u5DF2\u4FDD\u5B58\u3002",
  failed: "\u64CD\u4F5C\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u8F93\u5165\u3001\u8FDE\u63A5\u6216\u670D\u52A1\u7AEF\u65E5\u5FD7\u540E\u91CD\u8BD5\u3002",
  conflict: "\u914D\u7F6E\u5DF2\u88AB\u4FEE\u6539\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u8BD5\u3002\u672A\u63D0\u4EA4\u7684\u8868\u5355\u5185\u5BB9\u5DF2\u4FDD\u7559\u3002",
  skillFootnote: "\u65B0\u8DEF\u5F84\u9ED8\u8BA4\u7981\u7528\u3002\u542F\u7528\u540E\uFF0CSkill provider \u4F1A\u626B\u63CF\u8BE5\u8DEF\u5F84\u4E0B\u7684\u6240\u6709\u6280\u80FD\u3002\u914D\u7F6E\u53D8\u66F4\u4F1A\u81EA\u52A8\u751F\u6548\u3002",
  mcpFootnote: "\u65B0\u670D\u52A1\u5668\u9ED8\u8BA4\u7981\u7528\u3002\u542F\u7528\u540E\u4F1A\u6267\u884C\u6240\u586B\u547D\u4EE4\u6216\u8FDE\u63A5\u6240\u586B\u5730\u5740\u3002\u914D\u7F6E\u53D8\u66F4\u4F1A\u81EA\u52A8\u751F\u6548\u3002",
  secret: "\u8BF7\u52FF\u586B\u5199\u5BC6\u94A5\u6216\u5E26\u4EE4\u724C\u7684\u5730\u5740\u3002\u6B64\u7248\u672C\u6682\u4E0D\u652F\u6301\u8BA4\u8BC1\u53C2\u6570\u3002",
  tools: "\u5DE5\u5177\u5217\u8868",
  status_available: "\u5DE5\u5177\u53EF\u7528",
  status_waiting: "\u7B49\u5F85\u53D1\u73B0\u5DE5\u5177",
  status_disabled: "\u5DF2\u7981\u7528",
  skillHint: "\u542F\u7528\u540E\u7531 Skill provider \u626B\u63CF\uFF1B\u6BCF\u4E2A\u914D\u7F6E\u9879\u5BF9\u5E94\u4E00\u4E2A\u5305\u542B\u591A\u4E2A\u6280\u80FD\u7684\u76EE\u5F55\u3002",
  stat_all: "\u5168\u90E8\u6280\u80FD",
  stat_automatic: "\u6A21\u578B\u53EF\u7528",
  stat_manual: "\u4EC5\u624B\u52A8",
  stat_invalid: "\u914D\u7F6E\u5F02\u5E38",
  search: "\u641C\u7D22",
  searchPlaceholder: "\u641C\u7D22\u540D\u79F0\u3001\u63CF\u8FF0\u3001\u8DEF\u5F84\u6216\u5206\u7EC4\u2026",
  skillSources: "\u6765\u6E90\u8DEF\u5F84",
  skillLibrary: "\u6280\u80FD\u5217\u8868",
  showingCount: "\u663E\u793A {visible} / {all}",
  filterSource: "\u6765\u6E90",
  filterAllSources: "\u5168\u90E8\u6765\u6E90",
  filterGroup: "\u5206\u7EC4",
  filterAllGroups: "\u5168\u90E8\u5206\u7EC4",
  filterStatus: "\u72B6\u6001",
  filterAllStatuses: "\u5168\u90E8\u72B6\u6001",
  noFilterResults: "\u6CA1\u6709\u5339\u914D\u7684 Skill",
  noFilterResultsHint: "\u5C1D\u8BD5\u8C03\u6574\u641C\u7D22\u8BCD\u6216\u7B5B\u9009\u6761\u4EF6\u3002",
  customGroup: "\u7528\u6237\u5206\u7EC4",
  ungrouped: "\u672A\u5206\u7EC4",
  groupPlaceholder: "\u4F8B\u5982\uFF1A\u5DE5\u4F5C\u3001\u4E2A\u4EBA\u3001\u5F00\u53D1",
  saveGroup: "\u4FDD\u5B58\u5206\u7EC4",
  noDescription: "\u6CA1\u6709\u53EF\u7528\u7684\u63CF\u8FF0",
  details: "\u67E5\u770B\u8BE6\u60C5",
  whenToUse: "\u9002\u7528\u573A\u666F",
  diagnostics: "\u683C\u5F0F\u8BCA\u65AD",
  invocation: "\u8C03\u7528\u6743\u9650",
  modelInvocable: "\u5141\u8BB8\u6A21\u578B\u81EA\u52A8\u9009\u62E9",
  userInvocable: "\u5141\u8BB8\u7528\u6237\u901A\u8FC7 /name \u8C03\u7528",
  invocation_both: "\u81EA\u52A8 + \u624B\u52A8",
  invocation_modelOnly: "\u4EC5\u6A21\u578B",
  invocation_manualOnly: "\u4EC5\u624B\u52A8",
  invocation_none: "\u5B8C\u5168\u7981\u7528",
  format_bundle: "\u76EE\u5F55",
  format_flat: "\u5355\u6587\u4EF6",
  skillStatusInvalid: "\u683C\u5F0F\u5F02\u5E38",
  skillStatusSourceDisabled: "\u6765\u6E90\u5DF2\u7981\u7528",
  skillStatusShadowed: "\u88AB\u540C\u540D\u8986\u76D6",
  resources: "\u8D44\u6E90\u6587\u4EF6",
  noResources: "\u6CA1\u6709\u9644\u52A0\u8D44\u6E90",
  source: "\u4FDD\u5B58\u6765\u6E90",
  skillName: "Skill \u540D\u79F0",
  description: "\u63CF\u8FF0",
  instructions: "Skill \u6307\u4EE4\u6B63\u6587",
  structure: "\u76EE\u5F55\u7ED3\u6784",
  structureMinimal: "\u4EC5 SKILL.md",
  structureStandard: "\u6807\u51C6\u76EE\u5F55\uFF08scripts / references / assets\uFF09",
  "issue_missing-frontmatter": "\u7F3A\u5C11 YAML frontmatter",
  "issue_invalid-yaml": "YAML \u683C\u5F0F\u9519\u8BEF",
  "issue_invalid-frontmatter": "frontmatter \u5FC5\u987B\u662F\u5BF9\u8C61",
  "issue_invalid-name": "name \u5FC5\u987B\u4F7F\u7528 kebab-case",
  "issue_missing-description": "\u7F3A\u5C11 description",
  "issue_invalid-invocation": "\u8C03\u7528\u6743\u9650\u5B57\u6BB5\u4E0D\u662F\u6709\u6548\u5E03\u5C14\u503C",
  issue_unreadable: "\u6587\u4EF6\u65E0\u6CD5\u8BFB\u53D6",
  "issue_source-unreadable": "Skill \u8DEF\u5F84\u65E0\u6CD5\u8BFB\u53D6"
};
var en = {
  navSkill: "Skills",
  navMcp: "MCP",
  skillIntro: "Configure one or more Skill paths; each path can contain multiple skills.",
  mcpIntro: "Manage external tool servers for this configuration.",
  skills: "Skill paths",
  mcp: "MCP servers",
  refresh: "Refresh",
  add: "Add path",
  addMcp: "Add server",
  newSkill: "New Skill",
  emptySkills: "No Skill paths configured",
  emptySkillsHint: "Choose a local skills directory whose children contain the individual skills.",
  emptyMcp: "No MCP servers yet",
  emptyMcpHint: "Connect external tools with a local command or HTTP endpoint.",
  id: "Identifier",
  directory: "Skill path",
  transport: "Type",
  stdio: "stdio",
  http: "HTTP",
  command: "Command",
  args: "Arguments (one per line)",
  cwd: "Working directory (optional)",
  url: "Server URL",
  cancel: "Cancel",
  save: "Add",
  saveChanges: "Save changes",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  confirmDelete: "Delete",
  deleting: "Deleting\u2026",
  saving: "Saving\u2026",
  loading: "Loading\u2026",
  deleteExtensionTitle: "Remove Skill source",
  deleteMcpTitle: "Delete MCP server",
  deleteSkillTitle: "Permanently delete Skill",
  deleteExtensionConfirm: "Remove \u201C{name}\u201D from this configuration. Skill files in the directory will be kept.",
  deleteMcpConfirm: "Delete MCP server \u201C{name}\u201D and its connection configuration.",
  deleteSkillConfirm: "Permanently delete \u201C{name}\u201D and the resource files in its directory. This cannot be undone.",
  enabled: "Configured enabled",
  disabled: "Disabled",
  enable: "Enable",
  disable: "Disable",
  saved: "Changes saved.",
  failed: "Operation failed. Check input, connection or server logs and retry.",
  conflict: "Configuration changed. Refresh and retry; your draft has been retained.",
  skillFootnote: "New paths are disabled. Once enabled, the Skill provider scans every skill below them.",
  mcpFootnote: "New servers are disabled. Enabling one runs its command or connects to its endpoint; changes apply automatically.",
  secret: "Do not enter secrets or token-bearing URLs. Authentication fields are not supported yet.",
  tools: "Tools",
  status_available: "Tools available",
  status_waiting: "Waiting for tools",
  status_disabled: "Disabled",
  skillHint: "The Skill provider scans enabled paths; every configured path contains multiple skills.",
  stat_all: "All skills",
  stat_automatic: "Model enabled",
  stat_manual: "Manual only",
  stat_invalid: "Invalid",
  search: "Search",
  searchPlaceholder: "Search name, description, path or group\u2026",
  skillSources: "Source paths",
  skillLibrary: "Skill library",
  showingCount: "Showing {visible} / {all}",
  filterSource: "Source",
  filterAllSources: "All sources",
  filterGroup: "Group",
  filterAllGroups: "All groups",
  filterStatus: "Status",
  filterAllStatuses: "All statuses",
  noFilterResults: "No matching Skills",
  noFilterResultsHint: "Try another search or filter.",
  customGroup: "User group",
  ungrouped: "Ungrouped",
  groupPlaceholder: "For example: Work, Personal, Development",
  saveGroup: "Save group",
  noDescription: "No usable description",
  details: "View details",
  whenToUse: "When to use",
  diagnostics: "Diagnostics",
  invocation: "Invocation",
  modelInvocable: "Allow model selection",
  userInvocable: "Allow user /name invocation",
  invocation_both: "Model + user",
  invocation_modelOnly: "Model only",
  invocation_manualOnly: "Manual only",
  invocation_none: "Fully disabled",
  format_bundle: "Bundle",
  format_flat: "Flat file",
  skillStatusInvalid: "Invalid",
  skillStatusSourceDisabled: "Source disabled",
  skillStatusShadowed: "Shadowed",
  resources: "Resource files",
  noResources: "No additional resources",
  source: "Source",
  skillName: "Skill name",
  description: "Description",
  instructions: "Skill instructions",
  structure: "Structure",
  structureMinimal: "SKILL.md only",
  structureStandard: "Standard folders (scripts / references / assets)",
  "issue_missing-frontmatter": "Missing YAML frontmatter",
  "issue_invalid-yaml": "Invalid YAML",
  "issue_invalid-frontmatter": "Frontmatter must be an object",
  "issue_invalid-name": "name must use kebab-case",
  "issue_missing-description": "Missing description",
  "issue_invalid-invocation": "Invocation field is not a valid boolean",
  issue_unreadable: "File cannot be read",
  "issue_source-unreadable": "Skill path cannot be read"
};

// src/client/styles.css
var styles_default = ".dsh-ext{color:var(--dsw-alias-label-primary);max-width:840px;padding:4px 0 28px;font:inherit}\n.dsh-ext-heading,.dsh-ext-card>header{display:flex;justify-content:space-between;align-items:center;gap:16px}\n.dsh-ext h2{font-size:22px;letter-spacing:-.4px;margin:0 0 8px}.dsh-ext h3{font-size:15px;margin:0;display:flex;align-items:center;gap:8px}\n.dsh-ext p,.dsh-ext small{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.6}.dsh-ext-heading p{margin:0}\n.dsh-ext button{font:inherit;font-size:13px;cursor:pointer;border:1px solid var(--dsw-alias-border-l4);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:inherit;padding:8px 13px;white-space:nowrap}\n.dsh-ext button:hover{background:var(--dsw-alias-bg-layer-3)}.dsh-ext button:disabled{opacity:.5;cursor:default}\n.dsh-ext :is(button,input,select,textarea):focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px}\n.dsh-ext-card{border:1px solid var(--dsw-alias-border-l4);border-radius:16px;margin-top:20px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}\n.dsh-ext-card>header{padding:18px 20px;border-bottom:1px solid var(--dsw-alias-border-l4)}.dsh-ext-count{font-size:11px;font-weight:400;color:var(--dsw-alias-label-tertiary)}\n.dsh-ext-empty{padding:32px 20px}.dsh-ext-empty strong{font-size:14px;font-weight:500}.dsh-ext-empty p{margin:6px 0 0}\n.dsh-ext ul{list-style:none;padding:0;margin:0}.dsh-ext li{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:16px 20px;border-bottom:1px solid var(--dsw-alias-border-l4)}.dsh-ext li:last-child{border:0}\n.dsh-ext-details{display:flex;flex-direction:column;gap:5px;min-width:0}.dsh-ext-details strong{font-size:14px}.dsh-ext-details code{font-size:12px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}\n.dsh-ext-runtime{display:flex;align-items:center;flex-wrap:wrap;gap:7px;font-size:12px;color:var(--dsw-alias-label-tertiary)}\n.dsh-ext-status{width:7px;height:7px;border-radius:50%;background:#858585;box-shadow:0 0 0 3px color-mix(in srgb,#858585 16%,transparent)}\n.dsh-ext-status-available{background:#38a169;box-shadow:0 0 0 3px color-mix(in srgb,#38a169 18%,transparent)}.dsh-ext-status-waiting{background:#d69e2e;box-shadow:0 0 0 3px color-mix(in srgb,#d69e2e 18%,transparent)}\n.dsh-ext-runtime details{width:100%;margin-top:2px}.dsh-ext-runtime summary{width:max-content;cursor:pointer;color:var(--dsw-alias-label-secondary);user-select:none}.dsh-ext-runtime summary:hover{color:var(--dsw-alias-label-primary)}\n.dsh-ext-runtime .dsh-ext-tools{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.dsh-ext-runtime .dsh-ext-tools li{display:block;border:0;padding:4px 8px;border-radius:6px;background:var(--dsw-alias-bg-layer-3)}\n.dsh-ext-form{padding:20px;border-top:1px solid var(--dsw-alias-border-l4)}.dsh-ext fieldset{border:0;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:16px}.dsh-ext label{display:flex;flex-direction:column;gap:7px;font-size:13px}\n.dsh-ext input,.dsh-ext select,.dsh-ext textarea{box-sizing:border-box;min-width:0;width:100%;font:inherit;color:inherit;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l4);border-radius:8px;padding:10px}.dsh-ext textarea{resize:vertical}\n.dsh-ext-actions{display:flex;justify-content:flex-end;gap:8px;grid-column:1/-1}.dsh-ext fieldset>p{grid-column:1/-1;margin:0}.dsh-ext-notice{padding:12px 16px;border:1px solid var(--dsw-alias-border-l4);border-radius:10px}.dsh-ext-footnote{padding:0 4px}\n.dsh-ext-row-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:flex-end}.dsh-ext .dsh-ext-danger{color:#e98282}.dsh-ext-inline-form{width:100%;padding:14px 0 2px;border:0}.dsh-skill-edit-form{margin-top:12px;padding:14px;border-radius:10px;background:var(--dsw-alias-bg-layer-1)}\n.dsh-confirm{box-sizing:border-box;width:min(430px,calc(100vw - 32px));padding:22px;border:1px solid var(--dsw-alias-border-l4);border-radius:16px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 20px 60px rgba(0,0,0,.28);font:inherit}.dsh-confirm::backdrop{background:rgba(10,12,16,.48);backdrop-filter:blur(3px)}\n.dsh-confirm-icon{display:grid;place-items:center;width:34px;height:34px;margin-bottom:16px;border-radius:10px;background:color-mix(in srgb,#e05252 14%,transparent);color:#e98282;font-size:19px;font-weight:700}.dsh-confirm-copy h3{margin:0;font-size:16px}.dsh-confirm-copy p{margin:8px 0 0;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.65}.dsh-confirm-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:22px}.dsh-confirm button{font:inherit;font-size:13px;cursor:pointer;border:1px solid var(--dsw-alias-border-l4);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:inherit;padding:8px 14px}.dsh-confirm button:hover{background:var(--dsw-alias-bg-layer-3)}.dsh-confirm button:disabled{opacity:.5;cursor:default}.dsh-confirm button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px}.dsh-confirm .dsh-confirm-delete{border-color:color-mix(in srgb,#e05252 45%,var(--dsw-alias-border-l4));background:#b83232;color:#fff}.dsh-confirm .dsh-confirm-delete:hover{background:#c63b3b}\n.dsh-ext-heading-actions{display:flex;gap:8px;align-items:center}.dsh-visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}\n.dsh-skill-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:20px}.dsh-skill-stats>div{display:flex;flex-direction:column;gap:4px;padding:14px 16px;border:1px solid var(--dsw-alias-border-l4);border-radius:12px;background:var(--dsw-alias-bg-layer-2)}.dsh-skill-stats strong{font-size:20px}.dsh-skill-stats span{font-size:12px;color:var(--dsw-alias-label-tertiary)}\n.dsh-skill-search{margin-top:14px}.dsh-skill-search input{padding-left:13px}.dsh-skill-manager>.dsh-ext-form{margin-top:14px;border:1px solid var(--dsw-alias-border-l4);border-radius:14px;background:var(--dsw-alias-bg-layer-2)}\n.dsh-skill-filters{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px}.dsh-skill-filters label{gap:5px;font-size:11px;color:var(--dsw-alias-label-tertiary)}.dsh-skill-filters select{padding:8px 10px;color:var(--dsw-alias-label-primary)}\n.dsh-skill-source-manager{margin-top:14px}.dsh-skill-source-manager>summary{cursor:pointer;padding:14px 18px;font-size:14px;font-weight:600;user-select:none}.dsh-skill-source-manager[open]>summary{border-bottom:1px solid var(--dsw-alias-border-l4)}\n.dsh-skill-source-manager li{padding:11px 18px;flex-wrap:wrap}.dsh-skill-source-title{display:flex;align-items:flex-start;gap:11px;min-width:0}.dsh-skill-source-title>.dsh-ext-status{margin-top:6px;flex:0 0 auto}.dsh-skill-source-title>div{display:flex;min-width:0;flex-direction:column;gap:3px}.dsh-skill-source-title code{font-size:11px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}.dsh-skill-source-title small{font-size:11px;color:#e98282}\n.dsh-skill-library{margin-top:14px}.dsh-skill-group-editor{display:flex;align-items:flex-end;gap:8px}.dsh-skill-group-editor label{flex:1}.dsh-skill-group-editor input{padding:7px 9px}.dsh-skill-group-editor button{padding:7px 10px}\n.dsh-skill-row{display:block!important;padding:15px 18px!important}.dsh-skill-row-main{min-width:0}.dsh-skill-name{display:flex;align-items:center;gap:9px}.dsh-skill-name strong{font-size:14px}.dsh-skill-row-main>p{margin:6px 0 3px}.dsh-skill-row-main>code{font-size:11px;color:var(--dsw-alias-label-tertiary)}\n.dsh-skill-badge{font-size:11px;padding:2px 7px;border-radius:999px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary)}.dsh-skill-badge-group{color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}.dsh-skill-badge-invalid{color:#e98282}.dsh-skill-badge-shadowed{color:#a98af8}.dsh-ext-status-invalid{background:#e05252;box-shadow:0 0 0 3px color-mix(in srgb,#e05252 18%,transparent)}.dsh-ext-status-shadowed{background:#8b5cf6;box-shadow:0 0 0 3px color-mix(in srgb,#8b5cf6 18%,transparent)}.dsh-ext-status-manual{background:#d69e2e;box-shadow:0 0 0 3px color-mix(in srgb,#d69e2e 18%,transparent)}\n.dsh-skill-row details{margin-top:9px}.dsh-skill-row summary{width:max-content;cursor:pointer;font-size:12px;color:var(--dsw-alias-label-secondary)}.dsh-skill-detail{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:12px;padding:14px;border-radius:10px;background:var(--dsw-alias-bg-layer-1)}.dsh-skill-detail>p{grid-column:1/-1;margin:0}.dsh-skill-detail p strong,.dsh-skill-detail>div>strong{display:block;margin-bottom:5px;color:var(--dsw-alias-label-secondary);font-size:12px}\n.dsh-skill-invocation{display:flex;flex-direction:column;gap:7px}.dsh-skill-invocation label,.dsh-skill-create-flags label{display:flex;flex-direction:row;align-items:center;gap:5px}.dsh-ext input[type=checkbox]{width:auto;min-width:auto}.dsh-skill-detail ul,.dsh-skill-detail li{display:block!important;margin:0;padding:0!important;border:0!important}.dsh-skill-resources{display:flex!important;flex-wrap:wrap!important;gap:5px}.dsh-skill-resources li{padding:3px 6px!important;border-radius:5px!important;background:var(--dsw-alias-bg-layer-3)!important}\n.dsh-ext-span{grid-column:1/-1}.dsh-skill-create-flags{display:flex;flex-direction:column;gap:7px;font-size:13px}.dsh-skill-create-flags>span{margin-bottom:1px}.dsh-skill-source>.dsh-ext-notice{margin:12px 18px}.dsh-skill-source>.dsh-ext-empty{padding:18px}\n@media(max-width:600px){.dsh-ext fieldset,.dsh-skill-detail,.dsh-skill-filters{grid-template-columns:1fr}.dsh-ext-heading{align-items:flex-start;flex-direction:column}.dsh-ext-heading-actions{flex-wrap:wrap}.dsh-ext-card>header{padding:14px}.dsh-ext li{padding:14px}.dsh-skill-stats{grid-template-columns:repeat(2,1fr)}.dsh-skill-group-editor{align-items:stretch;flex-direction:column}}\n";

// src/client/index.jsx
var import_jsx_runtime = require("react/jsx-runtime");
var inject = ["slots", "locale", "connection"];
var namespace = "settings.extension-manager";
var settingsPollIntervalMs = 3e3;
function apply(ctx) {
  const controller = new ExtensionsController((endpoint, args, signal) => ctx.connection.rpc.call("/extensions", endpoint, args, signal));
  let catalogTimer;
  const refreshSlashCatalog = () => {
    window.clearTimeout(catalogTimer);
    catalogTimer = window.setTimeout(() => ctx.emit("connection/reset"), 350);
  };
  ctx.effect(() => ctx.locale.register(namespace, { zh, en }));
  ctx.effect(() => () => {
    window.clearTimeout(catalogTimer);
    controller.dispose();
  });
  ctx.effect(() => {
    const style = document.createElement("style");
    style.textContent = styles_default;
    document.head.append(style);
    return () => style.remove();
  });
  ctx.on("connection/reset", () => {
    void controller.request("list");
  });
  const t = ctx.locale.bind(namespace);
  const request = async (endpoint, args, options) => {
    const ok = await controller.request(endpoint, args, options);
    if (ok && refreshesSlashCatalog(endpoint, options)) refreshSlashCatalog();
    return ok;
  };
  const face = { hooks: { manager: controller }, request };
  const section = (id, kind) => ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id,
    order: kind === "skill" ? 16 : 17,
    label: () => t(kind === "skill" ? "navSkill" : "navMcp"),
    locale: namespace,
    inject: () => face
  }, kind === "skill" ? SkillSection : McpSection));
  section("skill-manager", "skill");
  section("mcp-manager", "mcp");
}
function SkillSection({ t, useManager, request }) {
  const state = useManager((value) => value);
  const [form, setForm] = (0, import_react.useState)("");
  const [query, setQuery] = (0, import_react.useState)("");
  const [sourceFilter, setSourceFilter] = (0, import_react.useState)("all");
  const [groupFilter, setGroupFilter] = (0, import_react.useState)("all");
  const [statusFilter, setStatusFilter] = (0, import_react.useState)("all");
  const busy = state.loading || state.saving;
  const sources = state.sources ?? [];
  const skills = state.skills ?? [];
  const groups = [...new Set(skills.map((skill) => skill.group).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const visible = skills.filter((skill) => {
    const source = sources.find((item) => item.id === skill.sourceId);
    const matchesQuery = `${skill.name} ${skill.description} ${source?.location ?? ""} ${skill.group ?? ""}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (sourceFilter === "all" || skill.sourceId === sourceFilter) && (groupFilter === "all" || (groupFilter === "ungrouped" ? !skill.group : skill.group === groupFilter)) && (statusFilter === "all" || skillState(skill) === statusFilter);
  });
  const counts = {
    all: skills.length,
    automatic: skills.filter((skill) => skill.valid && skill.modelInvocable && skill.sourceEnabled && !skill.shadowed).length,
    manual: skills.filter((skill) => skill.valid && !skill.modelInvocable && skill.userInvocable && skill.sourceEnabled).length,
    invalid: skills.filter((skill) => !skill.valid).length
  };
  useLiveRefresh(request);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "dsh-ext dsh-skill-manager", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "dsh-ext-heading", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: t("navSkill") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("skillIntro") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-ext-heading-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy || !state.revision, onClick: () => setForm("source"), children: t("add") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy || sources.length === 0, onClick: () => setForm("skill"), children: t("newSkill") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy, onClick: () => request("list", {}, { refreshSlashCatalog: true }), children: t("refresh") })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageState, { state, t }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-skill-stats", children: Object.entries(counts).map(([key, value]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: value }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t(`stat_${key}`) })
    ] }, key)) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dsh-skill-search", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-visually-hidden", children: t("search") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "search", value: query, onChange: (event) => setQuery(event.target.value), placeholder: t("searchPlaceholder") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-skill-filters", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        t("filterSource"),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: sourceFilter, onChange: (event) => setSourceFilter(event.target.value), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "all", children: t("filterAllSources") }),
          sources.map((source) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: source.id, children: source.id }, source.id))
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        t("filterGroup"),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: groupFilter, onChange: (event) => setGroupFilter(event.target.value), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "all", children: t("filterAllGroups") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "ungrouped", children: t("ungrouped") }),
          groups.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: group, children: group }, group))
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        t("filterStatus"),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: statusFilter, onChange: (event) => setStatusFilter(event.target.value), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "all", children: t("filterAllStatuses") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "available", children: t("stat_automatic") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "manual", children: t("stat_manual") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "disabled", children: t("disabled") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "invalid", children: t("stat_invalid") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "shadowed", children: t("skillStatusShadowed") })
        ] })
      ] })
    ] }),
    form === "source" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AddForm, { kind: "skill", t, busy, onCancel: () => setForm(""), onSave: async (args) => {
      if (await request("add-skill", args)) setForm("");
    } }),
    form === "skill" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewSkillForm, { sources, t, busy, onCancel: () => setForm(""), onSave: async (args) => {
      if (await request("create-skill", args)) setForm("");
    } }),
    sources.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-ext-card dsh-ext-empty", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: t("emptySkills") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("emptySkillsHint") })
    ] }),
    sources.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkillSources, { sources, skills, t, busy, request }),
    sources.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "dsh-ext-card dsh-skill-library", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { children: [
        t("skillLibrary"),
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-ext-count", children: t("showingCount").replace("{visible}", visible.length).replace("{all}", skills.length) })
      ] }) }),
      visible.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-ext-empty", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: t("noFilterResults") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("noFilterResultsHint") })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: visible.map((skill) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        SkillRow,
        {
          skill,
          source: sources.find((item) => item.id === skill.sourceId),
          groups,
          t,
          busy,
          request
        },
        `${skill.sourceId}:${skill.relativePath}`
      )) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh-ext-footnote", children: t("skillFootnote") })
  ] });
}
function SkillSources({ sources, skills, t, busy, request }) {
  const [editing, setEditing] = (0, import_react.useState)("");
  const [confirming, setConfirming] = (0, import_react.useState)("");
  const target = sources.find((source) => source.id === confirming);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { className: "dsh-ext-card dsh-skill-source-manager", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", { children: [
        t("skillSources"),
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-ext-count", children: sources.length })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: sources.map((source) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-skill-source-title", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `dsh-ext-status ${source.enabled ? "dsh-ext-status-available" : ""}`, "aria-hidden": "true" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
              source.id,
              " ",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-ext-count", children: skills.filter((skill) => skill.sourceId === source.id).length })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: source.location }),
            source.issue && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: t(`issue_${source.issue}`) })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-ext-row-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy, onClick: () => setEditing(editing === source.id ? "" : source.id), children: t("edit") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              role: "switch",
              "aria-checked": source.enabled,
              disabled: busy,
              onClick: () => request("enable", { id: source.id, enabled: !source.enabled }, { refreshSlashCatalog: true }),
              children: t(source.enabled ? "disable" : "enable")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "dsh-ext-danger", type: "button", disabled: busy, onClick: () => setConfirming(source.id), children: t("delete") })
        ] }),
        editing === source.id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkillSourceForm, { source, t, busy, onCancel: () => setEditing(""), onSave: async (args) => {
          if (await request("update-skill-source", args)) setEditing("");
        } })
      ] }, source.id)) })
    ] }),
    target && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ConfirmDialog,
      {
        title: t("deleteExtensionTitle"),
        message: t("deleteExtensionConfirm").replace("{name}", target.id),
        t,
        busy,
        onCancel: () => setConfirming(""),
        onConfirm: async () => {
          if (await request("delete-extension", { id: target.id }, { refreshSlashCatalog: true })) {
            setEditing("");
            setConfirming("");
          }
        }
      }
    )
  ] });
}
function McpSection({ t, useManager, request }) {
  const state = useManager((value) => value);
  const [form, setForm] = (0, import_react.useState)("");
  const [confirming, setConfirming] = (0, import_react.useState)("");
  const busy = state.loading || state.saving;
  const rows = state.extensions.filter((row) => row.kind === "mcp");
  useLiveRefresh(request);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "dsh-ext", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "dsh-ext-heading", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: t("navMcp") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("mcpIntro") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy, onClick: () => request("list"), children: t("refresh") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageState, { state, t }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "dsh-ext-card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { children: [
          t("mcp"),
          " ",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-ext-count", children: rows.length })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy || !state.revision, onClick: () => setForm("new"), children: t("addMcp") })
      ] }),
      rows.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-ext-empty", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: t("emptyMcp") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("emptyMcpHint") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-ext-details", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: row.id }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: row.location }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(McpRuntime, { row, t }),
          form === row.id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(McpForm, { row, t, busy, onCancel: () => setForm(""), onSave: async (args) => {
            if (await request("update-mcp", args)) setForm("");
          } })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-ext-row-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy, onClick: () => setForm(form === row.id ? "" : row.id), children: t("edit") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              role: "switch",
              "aria-checked": row.enabled,
              "aria-label": `${t(row.enabled ? "disable" : "enable")} ${row.id}`,
              disabled: busy,
              onClick: () => request("enable", { id: row.id, enabled: !row.enabled }),
              children: t(row.enabled ? "disable" : "enable")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "dsh-ext-danger", type: "button", disabled: busy, onClick: () => setConfirming(row.id), children: t("delete") })
        ] })
      ] }, row.id)) }),
      form === "new" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(McpForm, { t, busy, onCancel: () => setForm(""), onSave: async (args) => {
        if (await request("add-mcp", args)) setForm("");
      } })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh-ext-footnote", children: t("mcpFootnote") }),
    confirming && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ConfirmDialog,
      {
        title: t("deleteMcpTitle"),
        message: t("deleteMcpConfirm").replace("{name}", confirming),
        t,
        busy,
        onCancel: () => setConfirming(""),
        onConfirm: async () => {
          if (await request("delete-extension", { id: confirming })) {
            setForm("");
            setConfirming("");
          }
        }
      }
    )
  ] });
}
function useLiveRefresh(request) {
  (0, import_react.useEffect)(() => {
    void request("list");
    let timer;
    const poll = () => {
      if (document.visibilityState === "visible") void request("list", {}, { silent: true });
      timer = window.setTimeout(poll, settingsPollIntervalMs);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void request("list", {}, { silent: true });
    };
    timer = window.setTimeout(poll, settingsPollIntervalMs);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [request]);
}
function PageState({ state, t }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    state.loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "status", children: t("loading") }),
    state.error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh-ext-notice", role: "alert", children: t(state.error) }),
    state.saved && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh-ext-notice", role: "status", children: t("saved") })
  ] });
}
function skillState(skill) {
  return !skill.valid ? "invalid" : !skill.sourceEnabled || !skill.modelInvocable && !skill.userInvocable ? "disabled" : skill.shadowed ? "shadowed" : !skill.modelInvocable ? "manual" : "available";
}
function SkillRow({ skill, source, groups, t, busy, request }) {
  const [editing, setEditing] = (0, import_react.useState)(false);
  const [confirming, setConfirming] = (0, import_react.useState)(false);
  const state = skillState(skill);
  const invocation = skill.modelInvocable && skill.userInvocable ? "both" : skill.modelInvocable ? "modelOnly" : skill.userInvocable ? "manualOnly" : "none";
  const statusLabel = !skill.valid ? "skillStatusInvalid" : !skill.sourceEnabled ? "skillStatusSourceDisabled" : skill.shadowed ? "skillStatusShadowed" : "";
  const update = (patch) => request("set-skill-invocation", {
    sourceId: skill.sourceId,
    relativePath: skill.relativePath,
    skillRevision: skill.revision,
    modelInvocable: skill.modelInvocable,
    userInvocable: skill.userInvocable,
    ...patch
  });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { className: "dsh-skill-row", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-skill-row-main", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-skill-name", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `dsh-ext-status dsh-ext-status-${state}`, "aria-hidden": "true" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: skill.name }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-skill-badge", children: t(`format_${skill.format}`) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-skill-badge", children: t(`invocation_${invocation}`) }),
      skill.group && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-skill-badge dsh-skill-badge-group", children: skill.group }),
      statusLabel && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `dsh-skill-badge dsh-skill-badge-${state}`, children: t(statusLabel) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: skill.description || t("noDescription") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("code", { children: [
      source?.id,
      " \xB7 ",
      skill.relativePath
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: t("details") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-skill-detail", children: [
        skill.whenToUse && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: t("whenToUse") }),
          skill.whenToUse
        ] }),
        skill.issues.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: t("diagnostics") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: skill.issues.map((issue) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: t(`issue_${issue}`) }, issue)) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-skill-invocation", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: t("invocation") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: skill.modelInvocable, disabled: busy || !skill.valid, onChange: (event) => update({ modelInvocable: event.target.checked }) }),
            " ",
            t("modelInvocable")
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: skill.userInvocable, disabled: busy || !skill.valid, onChange: (event) => update({ userInvocable: event.target.checked }) }),
            " ",
            t("userInvocable")
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkillGroupEditor, { skill, groups, t, busy, request }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: t("resources") }),
          skill.resources.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: "dsh-skill-resources", children: skill.resources.map((path) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: path }) }, path)) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("noResources") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-ext-row-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy || !skill.valid, onClick: () => setEditing(!editing), children: t("edit") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "dsh-ext-danger", type: "button", disabled: busy || !skill.valid, onClick: () => setConfirming(true), children: t("delete") })
        ] })
      ] })
    ] }),
    editing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkillEditForm, { skill, t, busy, onCancel: () => setEditing(false), onSave: async (args) => {
      if (await request("update-skill", args)) setEditing(false);
    } }),
    confirming && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ConfirmDialog,
      {
        title: t("deleteSkillTitle"),
        message: t("deleteSkillConfirm").replace("{name}", skill.name),
        t,
        busy,
        onCancel: () => setConfirming(false),
        onConfirm: async () => {
          await request("delete-skill", {
            sourceId: skill.sourceId,
            relativePath: skill.relativePath,
            skillRevision: skill.revision
          });
        }
      }
    )
  ] }) });
}
function ConfirmDialog({ title, message, t, busy, onConfirm, onCancel }) {
  const dialog = (0, import_react.useRef)(null);
  const cancel = (0, import_react.useRef)(null);
  const titleId = (0, import_react.useId)();
  const messageId = (0, import_react.useId)();
  (0, import_react.useEffect)(() => {
    dialog.current.showModal();
    cancel.current.focus();
    return () => {
      if (dialog.current?.open) dialog.current.close();
    };
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "dialog",
    {
      ref: dialog,
      className: "dsh-confirm",
      "aria-labelledby": titleId,
      "aria-describedby": messageId,
      onCancel: (event) => {
        event.preventDefault();
        if (!busy) onCancel();
      },
      onMouseDown: (event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-confirm-icon", "aria-hidden": "true", children: "!" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-confirm-copy", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { id: titleId, children: title }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { id: messageId, children: message })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-confirm-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { ref: cancel, type: "button", disabled: busy, onClick: onCancel, children: t("cancel") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "dsh-confirm-delete", type: "button", disabled: busy, onClick: () => void onConfirm(), children: t(busy ? "deleting" : "confirmDelete") })
        ] })
      ]
    }
  );
}
function SkillEditForm({ skill, t, busy, onSave, onCancel }) {
  const prefix = (0, import_react.useId)();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("form", { className: "dsh-skill-edit-form", onSubmit: (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void onSave({
      sourceId: skill.sourceId,
      relativePath: skill.relativePath,
      skillRevision: skill.revision,
      description: data.get("description"),
      whenToUse: data.get("whenToUse"),
      content: data.get("content"),
      modelInvocable: data.has("modelInvocable"),
      userInvocable: data.has("userInvocable")
    });
  }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", { disabled: busy, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dsh-ext-span", htmlFor: `${prefix}-description`, children: [
      t("description"),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { id: `${prefix}-description`, name: "description", rows: 3, required: true, defaultValue: skill.description })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dsh-ext-span", htmlFor: `${prefix}-whenToUse`, children: [
      t("whenToUse"),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { id: `${prefix}-whenToUse`, name: "whenToUse", rows: 2, defaultValue: skill.whenToUse })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dsh-ext-span", htmlFor: `${prefix}-content`, children: [
      t("instructions"),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { id: `${prefix}-content`, name: "content", rows: 10, defaultValue: skill.content })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-skill-create-flags", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("invocation") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", name: "modelInvocable", defaultChecked: skill.modelInvocable }),
        " ",
        t("modelInvocable")
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", name: "userInvocable", defaultChecked: skill.userInvocable }),
        " ",
        t("userInvocable")
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-ext-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: onCancel, children: t("cancel") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", children: t(busy ? "saving" : "saveChanges") })
    ] })
  ] }) });
}
function SkillGroupEditor({ skill, groups, t, busy, request }) {
  const currentGroup = skill.group ?? "";
  const [group, setGroup] = (0, import_react.useState)(currentGroup);
  const suggestions = (0, import_react.useId)();
  (0, import_react.useEffect)(() => setGroup(currentGroup), [currentGroup]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { className: "dsh-skill-group-editor", onSubmit: (event) => {
    event.preventDefault();
    void request("set-skill-group", { sourceId: skill.sourceId, relativePath: skill.relativePath, skillRevision: skill.revision, group });
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
      t("customGroup"),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          list: suggestions,
          value: group,
          maxLength: 64,
          disabled: busy || !skill.valid,
          onChange: (event) => setGroup(event.target.value),
          placeholder: t("groupPlaceholder")
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("datalist", { id: suggestions, children: groups.map((name) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: name }, name)) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", disabled: busy || !skill.valid || group.trim() === currentGroup, children: t("saveGroup") })
  ] });
}
function McpRuntime({ row, t }) {
  const tools = row.tools ?? [];
  const state = !row.enabled ? "disabled" : tools.length ? "available" : "waiting";
  const prefix = `mcp__${row.id}__`;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-ext-runtime", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `dsh-ext-status dsh-ext-status-${state}`, "aria-hidden": "true" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-ext-status-label", children: t(`status_${state}`) }),
    tools.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", { children: [
        t("tools"),
        " \xB7 ",
        tools.length
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: "dsh-ext-tools", children: tools.map((name) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { title: name, children: name.startsWith(prefix) ? name.slice(prefix.length) : name }) }, name)) })
    ] })
  ] });
}
function NewSkillForm({ sources, t, busy, onSave, onCancel }) {
  const prefix = (0, import_react.useId)();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("form", { className: "dsh-ext-form dsh-skill-create", onSubmit: (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void onSave({
      sourceId: data.get("sourceId"),
      name: data.get("name"),
      description: data.get("description"),
      whenToUse: data.get("whenToUse"),
      modelInvocable: data.has("modelInvocable"),
      userInvocable: data.has("userInvocable"),
      structure: data.get("structure")
    });
  }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", { disabled: busy, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { htmlFor: `${prefix}-sourceId`, children: [
      t("source"),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { id: `${prefix}-sourceId`, name: "sourceId", children: sources.map((source) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: source.id, children: source.id }, source.id)) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { htmlFor: `${prefix}-name`, children: [
      t("skillName"),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { id: `${prefix}-name`, name: "name", required: true, pattern: "[a-z0-9]+(?:-[a-z0-9]+)*", autoComplete: "off" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dsh-ext-span", htmlFor: `${prefix}-description`, children: [
      t("description"),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { id: `${prefix}-description`, name: "description", rows: 3, required: true })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dsh-ext-span", htmlFor: `${prefix}-whenToUse`, children: [
      t("whenToUse"),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { id: `${prefix}-whenToUse`, name: "whenToUse", rows: 2 })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { htmlFor: `${prefix}-structure`, children: [
      t("structure"),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { id: `${prefix}-structure`, name: "structure", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "minimal", children: t("structureMinimal") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "standard", children: t("structureStandard") })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-skill-create-flags", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("invocation") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", name: "modelInvocable", defaultChecked: true }),
        " ",
        t("modelInvocable")
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", name: "userInvocable", defaultChecked: true }),
        " ",
        t("userInvocable")
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-ext-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: onCancel, children: t("cancel") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", children: t(busy ? "saving" : "create") })
    ] })
  ] }) });
}
function SkillSourceForm({ source, t, busy, onSave, onCancel }) {
  const prefix = (0, import_react.useId)();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("form", { className: "dsh-ext-inline-form", onSubmit: (event) => {
    event.preventDefault();
    void onSave({ id: source.id, directory: new FormData(event.currentTarget).get("directory") });
  }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", { disabled: busy, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dsh-ext-span", htmlFor: `${prefix}-directory`, children: [
      t("directory"),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { id: `${prefix}-directory`, name: "directory", required: true, autoComplete: "off", defaultValue: source.location })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-ext-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: onCancel, children: t("cancel") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", children: t(busy ? "saving" : "saveChanges") })
    ] })
  ] }) });
}
function McpForm({ row, t, busy, onSave, onCancel }) {
  const prefix = (0, import_react.useId)();
  const initial = row?.configuration ?? { transport: "stdio", command: "", args: [], cwd: "" };
  const [transport, setTransport] = (0, import_react.useState)(initial.transport);
  const field = (name, required = true, multiline = false, value = "") => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { htmlFor: `${prefix}-${name}`, children: [
    t(name),
    multiline ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { id: `${prefix}-${name}`, name, rows: 3, defaultValue: value }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { id: `${prefix}-${name}`, name, required, autoComplete: "off", defaultValue: value, ...name === "id" ? { pattern: "[A-Za-z0-9_\\-]{1,32}", maxLength: 32 } : {} })
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("form", { className: row ? "dsh-ext-inline-form" : "dsh-ext-form", onSubmit: (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const configuration = JSON.stringify(transport === "stdio" ? { transport, command: data.command, args: data.args.split(/\r?\n/).filter(Boolean), cwd: data.cwd } : { transport, url: data.url });
    void onSave({ id: row?.id ?? data.id, configuration });
  }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", { disabled: busy, children: [
    !row && field("id"),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { htmlFor: `${prefix}-transport`, children: [
      t("transport"),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { id: `${prefix}-transport`, value: transport, onChange: (event) => setTransport(event.target.value), children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "stdio", children: t("stdio") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "streamable-http", children: t("http") })
      ] })
    ] }),
    transport === "stdio" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      field("command", true, false, initial.command),
      field("args", false, true, (initial.args ?? []).join("\n")),
      field("cwd", false, false, initial.cwd)
    ] }) : field("url", true, false, initial.url),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("secret") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-ext-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: onCancel, children: t("cancel") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", children: t(busy ? "saving" : row ? "saveChanges" : "save") })
    ] })
  ] }) });
}
function AddForm({ kind, t, busy, onSave, onCancel }) {
  const prefix = (0, import_react.useId)();
  const [transport, setTransport] = (0, import_react.useState)("stdio");
  const field = (name, required = true, multiline = false) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { htmlFor: `${prefix}-${name}`, children: [
    t(name),
    multiline ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { id: `${prefix}-${name}`, name, rows: 3 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { id: `${prefix}-${name}`, name, required, autoComplete: "off", ...name === "id" ? { pattern: "[A-Za-z0-9_\\-]{1,32}", maxLength: 32 } : {} })
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("form", { className: "dsh-ext-form", onSubmit: (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const args = kind === "skill" ? { directory: data.directory } : {
      id: data.id,
      configuration: JSON.stringify(transport === "stdio" ? { transport, command: data.command, args: data.args.split(/\r?\n/).filter(Boolean), cwd: data.cwd } : { transport, url: data.url })
    };
    void onSave(args);
  }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", { disabled: busy, children: [
    kind === "skill" ? field("directory") : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      field("id"),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { htmlFor: `${prefix}-transport`, children: [
        t("transport"),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { id: `${prefix}-transport`, value: transport, onChange: (event) => setTransport(event.target.value), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "stdio", children: t("stdio") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "streamable-http", children: t("http") })
        ] })
      ] }),
      transport === "stdio" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        field("command"),
        field("args", false, true),
        field("cwd", false)
      ] }) : field("url"),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("secret") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-ext-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: onCancel, children: t("cancel") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", children: t(busy ? "saving" : "save") })
    ] })
  ] }) });
}

return module.exports;}});
