window.__ModuleLoader__.load({id:"deepseek-harness-skill-mcp",factory:(require)=>{
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
  group: "\u7528\u6237\u5206\u7EC4\uFF08\u53EF\u9009\uFF09",
  transport: "\u914D\u7F6E\u7C7B\u578B",
  stdio: "stdio",
  http: "HTTP",
  command: "\u547D\u4EE4",
  args: "\u53C2\u6570\uFF08\u6BCF\u884C\u4E00\u4E2A\uFF09",
  cwd: "\u5DE5\u4F5C\u76EE\u5F55\uFF08\u53EF\u9009\uFF09",
  url: "\u670D\u52A1\u5668\u5730\u5740",
  cancel: "\u53D6\u6D88",
  save: "\u6DFB\u52A0",
  create: "\u521B\u5EFA",
  saving: "\u4FDD\u5B58\u4E2D\u2026",
  loading: "\u52A0\u8F7D\u4E2D\u2026",
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
  sourceEmpty: "\u8FD9\u4E2A\u8DEF\u5F84\u4E0B\u8FD8\u6CA1\u6709\u53D1\u73B0 Skill\u3002",
  groupView: "\u5206\u7EC4\u65B9\u5F0F",
  groupByPath: "\u6309\u8DEF\u5F84",
  groupByCustom: "\u6309\u7528\u6237\u5206\u7EC4",
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
  group: "User group (optional)",
  transport: "Type",
  stdio: "stdio",
  http: "HTTP",
  command: "Command",
  args: "Arguments (one per line)",
  cwd: "Working directory (optional)",
  url: "Server URL",
  cancel: "Cancel",
  save: "Add",
  create: "Create",
  saving: "Saving\u2026",
  loading: "Loading\u2026",
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
  sourceEmpty: "No Skills were found in this path.",
  groupView: "Group view",
  groupByPath: "By path",
  groupByCustom: "By user group",
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
var styles_default = ".dsh-ext{color:var(--dsw-alias-label-primary);max-width:840px;padding:4px 0 28px;font:inherit}\n.dsh-ext-heading,.dsh-ext-card>header{display:flex;justify-content:space-between;align-items:center;gap:16px}\n.dsh-ext h2{font-size:22px;letter-spacing:-.4px;margin:0 0 8px}.dsh-ext h3{font-size:15px;margin:0;display:flex;align-items:center;gap:8px}\n.dsh-ext p,.dsh-ext small{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.6}.dsh-ext-heading p{margin:0}\n.dsh-ext button{font:inherit;font-size:13px;cursor:pointer;border:1px solid var(--dsw-alias-border-l4);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:inherit;padding:8px 13px;white-space:nowrap}\n.dsh-ext button:hover{background:var(--dsw-alias-bg-layer-3)}.dsh-ext button:disabled{opacity:.5;cursor:default}\n.dsh-ext :is(button,input,select,textarea):focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px}\n.dsh-ext-card{border:1px solid var(--dsw-alias-border-l4);border-radius:16px;margin-top:20px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}\n.dsh-ext-card>header{padding:18px 20px;border-bottom:1px solid var(--dsw-alias-border-l4)}.dsh-ext-count{font-size:11px;font-weight:400;color:var(--dsw-alias-label-tertiary)}\n.dsh-ext-empty{padding:32px 20px}.dsh-ext-empty strong{font-size:14px;font-weight:500}.dsh-ext-empty p{margin:6px 0 0}\n.dsh-ext ul{list-style:none;padding:0;margin:0}.dsh-ext li{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:16px 20px;border-bottom:1px solid var(--dsw-alias-border-l4)}.dsh-ext li:last-child{border:0}\n.dsh-ext-details{display:flex;flex-direction:column;gap:5px;min-width:0}.dsh-ext-details strong{font-size:14px}.dsh-ext-details code{font-size:12px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}\n.dsh-ext-runtime{display:flex;align-items:center;flex-wrap:wrap;gap:7px;font-size:12px;color:var(--dsw-alias-label-tertiary)}\n.dsh-ext-status{width:7px;height:7px;border-radius:50%;background:#858585;box-shadow:0 0 0 3px color-mix(in srgb,#858585 16%,transparent)}\n.dsh-ext-status-available{background:#38a169;box-shadow:0 0 0 3px color-mix(in srgb,#38a169 18%,transparent)}.dsh-ext-status-waiting{background:#d69e2e;box-shadow:0 0 0 3px color-mix(in srgb,#d69e2e 18%,transparent)}\n.dsh-ext-runtime details{width:100%;margin-top:2px}.dsh-ext-runtime summary{width:max-content;cursor:pointer;color:var(--dsw-alias-label-secondary);user-select:none}.dsh-ext-runtime summary:hover{color:var(--dsw-alias-label-primary)}\n.dsh-ext-runtime .dsh-ext-tools{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.dsh-ext-runtime .dsh-ext-tools li{display:block;border:0;padding:4px 8px;border-radius:6px;background:var(--dsw-alias-bg-layer-3)}\n.dsh-ext-form{padding:20px;border-top:1px solid var(--dsw-alias-border-l4)}.dsh-ext fieldset{border:0;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:16px}.dsh-ext label{display:flex;flex-direction:column;gap:7px;font-size:13px}\n.dsh-ext input,.dsh-ext select,.dsh-ext textarea{box-sizing:border-box;min-width:0;width:100%;font:inherit;color:inherit;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l4);border-radius:8px;padding:10px}.dsh-ext textarea{resize:vertical}\n.dsh-ext-actions{display:flex;justify-content:flex-end;gap:8px;grid-column:1/-1}.dsh-ext fieldset>p{grid-column:1/-1;margin:0}.dsh-ext-notice{padding:12px 16px;border:1px solid var(--dsw-alias-border-l4);border-radius:10px}.dsh-ext-footnote{padding:0 4px}\n.dsh-ext-heading-actions{display:flex;gap:8px;align-items:center}.dsh-visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}\n.dsh-skill-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:20px}.dsh-skill-stats>div{display:flex;flex-direction:column;gap:4px;padding:14px 16px;border:1px solid var(--dsw-alias-border-l4);border-radius:12px;background:var(--dsw-alias-bg-layer-2)}.dsh-skill-stats strong{font-size:20px}.dsh-skill-stats span{font-size:12px;color:var(--dsw-alias-label-tertiary)}\n.dsh-skill-search{margin-top:14px}.dsh-skill-search input{padding-left:13px}.dsh-skill-manager>.dsh-ext-form{margin-top:14px;border:1px solid var(--dsw-alias-border-l4);border-radius:14px;background:var(--dsw-alias-bg-layer-2)}\n.dsh-skill-grouping{display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-top:10px}.dsh-skill-grouping>span{margin-right:4px;font-size:12px;color:var(--dsw-alias-label-tertiary)}.dsh-skill-grouping button{padding:5px 10px}.dsh-skill-grouping button[aria-pressed=true]{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 13%,transparent)}\n.dsh-skill-sources{display:flex;flex-direction:column;gap:14px;margin-top:14px}.dsh-skill-source{border:1px solid var(--dsw-alias-border-l4);border-radius:15px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}.dsh-skill-source>header{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:16px 18px;border-bottom:1px solid var(--dsw-alias-border-l4)}\n.dsh-skill-source-title{display:flex;align-items:flex-start;gap:11px;min-width:0}.dsh-skill-source-title>.dsh-ext-status{margin-top:6px;flex:0 0 auto}.dsh-skill-source-title h3{margin-bottom:5px;overflow-wrap:anywhere}.dsh-skill-source-title small{display:block;font-size:11px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}\n.dsh-skill-group-editor{display:flex;align-items:flex-end;gap:8px;padding:10px 18px;border-bottom:1px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-1)}.dsh-skill-group-editor label{flex:1}.dsh-skill-group-editor input{padding:7px 9px}.dsh-skill-group-editor button{padding:7px 10px}\n.dsh-skill-user-group{border:1px solid var(--dsw-alias-border-l4);border-radius:16px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}.dsh-skill-user-group>header{padding:15px 18px;border-bottom:1px solid var(--dsw-alias-border-l4)}.dsh-skill-user-group>div{display:flex;flex-direction:column;gap:10px;padding:10px}.dsh-skill-source-nested{border-radius:11px;background:var(--dsw-alias-bg-layer-1)}\n.dsh-skill-row{display:block!important;padding:15px 18px!important}.dsh-skill-row-main{min-width:0}.dsh-skill-name{display:flex;align-items:center;gap:9px}.dsh-skill-name strong{font-size:14px}.dsh-skill-row-main>p{margin:6px 0 3px}.dsh-skill-row-main>code{font-size:11px;color:var(--dsw-alias-label-tertiary)}\n.dsh-skill-badge{font-size:11px;padding:2px 7px;border-radius:999px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary)}.dsh-skill-badge-invalid{color:#e98282}.dsh-skill-badge-shadowed{color:#a98af8}.dsh-ext-status-invalid{background:#e05252;box-shadow:0 0 0 3px color-mix(in srgb,#e05252 18%,transparent)}.dsh-ext-status-shadowed{background:#8b5cf6;box-shadow:0 0 0 3px color-mix(in srgb,#8b5cf6 18%,transparent)}.dsh-ext-status-manual{background:#d69e2e;box-shadow:0 0 0 3px color-mix(in srgb,#d69e2e 18%,transparent)}\n.dsh-skill-row details{margin-top:9px}.dsh-skill-row summary{width:max-content;cursor:pointer;font-size:12px;color:var(--dsw-alias-label-secondary)}.dsh-skill-detail{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:12px;padding:14px;border-radius:10px;background:var(--dsw-alias-bg-layer-1)}.dsh-skill-detail>p{grid-column:1/-1;margin:0}.dsh-skill-detail p strong,.dsh-skill-detail>div>strong{display:block;margin-bottom:5px;color:var(--dsw-alias-label-secondary);font-size:12px}\n.dsh-skill-invocation{display:flex;flex-direction:column;gap:7px}.dsh-skill-invocation label,.dsh-skill-create-flags label{display:flex;flex-direction:row;align-items:center;gap:5px}.dsh-ext input[type=checkbox]{width:auto;min-width:auto}.dsh-skill-detail ul,.dsh-skill-detail li{display:block!important;margin:0;padding:0!important;border:0!important}.dsh-skill-resources{display:flex!important;flex-wrap:wrap!important;gap:5px}.dsh-skill-resources li{padding:3px 6px!important;border-radius:5px!important;background:var(--dsw-alias-bg-layer-3)!important}\n.dsh-ext-span{grid-column:1/-1}.dsh-skill-create-flags{display:flex;flex-direction:column;gap:7px;font-size:13px}.dsh-skill-create-flags>span{margin-bottom:1px}.dsh-skill-source>.dsh-ext-notice{margin:12px 18px}.dsh-skill-source>.dsh-ext-empty{padding:18px}\n@media(max-width:600px){.dsh-ext fieldset,.dsh-skill-detail{grid-template-columns:1fr}.dsh-ext-heading{align-items:flex-start;flex-direction:column}.dsh-ext-heading-actions{flex-wrap:wrap}.dsh-ext-card>header{padding:14px}.dsh-ext li{padding:14px}.dsh-skill-stats{grid-template-columns:repeat(2,1fr)}.dsh-skill-grouping{justify-content:flex-start}.dsh-skill-group-editor{align-items:stretch;flex-direction:column}}\n";

// src/client/index.jsx
var import_jsx_runtime = require("react/jsx-runtime");
var inject = ["slots", "locale", "connection"];
var namespace = "settings.extension-manager";
var settingsPollIntervalMs = 3e3;
function apply(ctx) {
  const controller = new ExtensionsController((endpoint, args, signal) => ctx.connection.rpc.call("/extensions", endpoint, args, signal));
  ctx.effect(() => ctx.locale.register(namespace, { zh, en }));
  ctx.effect(() => () => controller.dispose());
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
  const face = { hooks: { manager: controller }, request: (endpoint, args, options) => controller.request(endpoint, args, options) };
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
  const [groupBy, setGroupBy] = (0, import_react.useState)("path");
  const busy = state.loading || state.saving;
  const sources = state.sources ?? [];
  const skills = state.skills ?? [];
  const visible = skills.filter((skill) => {
    const source = sources.find((item) => item.id === skill.sourceId);
    return `${skill.name} ${skill.description} ${source?.location ?? ""} ${source?.group ?? ""}`.toLowerCase().includes(query.toLowerCase());
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy, onClick: () => request("list"), children: t("refresh") })
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
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-skill-grouping", role: "group", "aria-label": t("groupView"), children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("groupView") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", "aria-pressed": groupBy === "path", onClick: () => setGroupBy("path"), children: t("groupByPath") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", "aria-pressed": groupBy === "custom", onClick: () => setGroupBy("custom"), children: t("groupByCustom") })
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
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-skill-sources", children: groupBy === "path" ? sources.map((source) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkillPath, { source, skills, visible, query, t, busy, request }, source.id)) : groupSources(sources.filter((source) => !query || visible.some((skill) => skill.sourceId === source.id))).map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "dsh-skill-user-group", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { children: [
        group.name || t("ungrouped"),
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-ext-count", children: group.sources.reduce((total, source) => total + skills.filter((skill) => skill.sourceId === source.id).length, 0) })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: group.sources.map((source) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkillPath, { source, skills, visible, query, t, busy, request, nested: true }, source.id)) })
    ] }, group.name)) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh-ext-footnote", children: t("skillFootnote") })
  ] });
}
function groupSources(sources) {
  const groups = /* @__PURE__ */ new Map();
  for (const source of sources) {
    const key = source.group || "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(source);
  }
  return [...groups].map(([name, entries]) => ({ name, sources: entries })).sort((a, b) => a.name.localeCompare(b.name));
}
function SkillPath({ source, skills, visible, query, t, busy, request, nested = false }) {
  const rows = visible.filter((skill) => skill.sourceId === source.id);
  if (query && rows.length === 0) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: `dsh-skill-source${nested ? " dsh-skill-source-nested" : ""}`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-skill-source-title", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `dsh-ext-status ${source.enabled ? "dsh-ext-status-available" : ""}`, "aria-hidden": "true" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { children: [
            source.location,
            " ",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsh-ext-count", children: skills.filter((skill) => skill.sourceId === source.id).length })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: source.group ? `${t("customGroup")}: ${source.group}` : t("ungrouped") })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          role: "switch",
          "aria-checked": source.enabled,
          disabled: busy,
          onClick: () => request("enable", { id: source.id, enabled: !source.enabled }),
          children: t(source.enabled ? "disable" : "enable")
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GroupEditor, { source, t, busy, request }),
    source.issue && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh-ext-notice", children: t(`issue_${source.issue}`) }),
    rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-ext-empty", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("sourceEmpty") }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: rows.map((skill) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkillRow, { skill, t, busy, request }, skill.relativePath)) })
  ] });
}
function GroupEditor({ source, t, busy, request }) {
  const [group, setGroup] = (0, import_react.useState)(source.group);
  (0, import_react.useEffect)(() => setGroup(source.group), [source.group]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { className: "dsh-skill-group-editor", onSubmit: (event) => {
    event.preventDefault();
    void request("set-skill-group", { id: source.id, group });
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
      t("customGroup"),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: group, maxLength: 64, disabled: busy, onChange: (event) => setGroup(event.target.value), placeholder: t("groupPlaceholder") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", disabled: busy || group.trim() === source.group, children: t("saveGroup") })
  ] });
}
function McpSection({ t, useManager, request }) {
  const state = useManager((value) => value);
  const [form, setForm] = (0, import_react.useState)(false);
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", disabled: busy || !state.revision, onClick: () => setForm(true), children: t("addMcp") })
      ] }),
      rows.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-ext-empty", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: t("emptyMcp") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("emptyMcpHint") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-ext-details", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: row.id }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: row.location }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(McpRuntime, { row, t })
        ] }),
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
        )
      ] }, row.id)) }),
      form && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AddForm, { kind: "mcp", t, busy, onCancel: () => setForm(false), onSave: async (args) => {
        if (await request("add-mcp", args)) setForm(false);
      } })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsh-ext-footnote", children: t("mcpFootnote") })
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
function SkillRow({ skill, t, busy, request }) {
  const state = !skill.valid ? "invalid" : !skill.sourceEnabled || !skill.modelInvocable && !skill.userInvocable ? "disabled" : skill.shadowed ? "shadowed" : !skill.modelInvocable ? "manual" : "available";
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
      statusLabel && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `dsh-skill-badge dsh-skill-badge-${state}`, children: t(statusLabel) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: skill.description || t("noDescription") }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: skill.relativePath }),
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: t("resources") }),
          skill.resources.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: "dsh-skill-resources", children: skill.resources.map((path) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: path }) }, path)) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("noResources") })
        ] })
      ] })
    ] })
  ] }) });
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
    const args = kind === "skill" ? { directory: data.directory, group: data.group ?? "" } : {
      id: data.id,
      configuration: JSON.stringify(transport === "stdio" ? { transport, command: data.command, args: data.args.split(/\r?\n/).filter(Boolean), cwd: data.cwd } : { transport, url: data.url })
    };
    void onSave(args);
  }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", { disabled: busy, children: [
    kind === "skill" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      field("directory"),
      " ",
      field("group", false)
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
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
