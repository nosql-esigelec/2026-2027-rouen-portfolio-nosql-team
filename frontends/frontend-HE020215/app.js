"use strict";

// Les informations personnelles et les relations restent fournies par l'API.
const config = window.PORTFOLIO_CONFIG;
const $ = (selector) => document.querySelector(selector);
const esc = (value = "") => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const slugPath = encodeURIComponent(config.candidatSlug);
const state = {
  profile: null, competence: "", domain: "", page: 1, projectRequest: 0,
  dialogRequest: 0, projects: new Map(), graph: null, stats: new Map(),
  flowProject: null, flowFocus: null, flowTouched: false, visibleEdges: [],
};
const domainLabels = {
  "analyse-de-donnees": "Analyse de données", "machine-learning": "Machine learning",
  "business-intelligence": "Business intelligence", "big-data": "Big Data",
  "bases-de-donnees": "Bases de données", "developpement": "Développement",
  "outils": "Outils", "langues": "Langues", "soft-skills": "Savoir-être",
};
const prettyDomain = (slug) => domainLabels[slug] || String(slug || "Data").replaceAll("-", " ");
const skillName = (slug) => state.profile?.competences.find((skill) => skill.slug === slug)?.nom || slug;
const tags = (items) => `<div class="tag-list">${items.map((item) => `<span class="tag">${esc(item)}</span>`).join("")}</div>`;

async function api(path) {
  let response;
  try {
    response = await fetch(`${config.apiBase}${path}`, {
      signal: AbortSignal.timeout(20000), headers: { Accept: "application/json" },
    });
  } catch { throw new Error("La connexion est momentanément indisponible."); }
  if (!response.ok) throw new Error(response.status === 404 ? "Ce contenu n’est pas encore disponible." : "Le contenu est momentanément indisponible.");
  try { return adaptResponse(await response.json()); }
  catch { throw new Error("Le contenu n’a pas pu être chargé."); }
}

// Adapter le contrat de l'équipe sans modifier ses modèles ni ses routes.
function adaptResponse(data) {
  if (data.candidat_slug && "prenom" in data) {
    const presentation = data.candidat_slug === config.candidatSlug ? config.presentation || {} : {};
    return {
      ...data, slug: data.candidat_slug, description: data.bio || "",
      contact: presentation.contact || {},
      liens: { ...data.liens, linkdIn: data.liens?.linkedin },
      experiences: (data.experiences || []).map((item) => ({ ...item, date_debut: item.debut, date_fin: item.fin })),
      formations: (data.formations || []).map((item) => ({ ...item, etablissement: item.ecole, date_debut: item.debut, date_fin: item.fin })),
      competences: (data.competences || []).map((item) => ({
        ...item, slug: item.skill_slug,
        type: item.domaine_slug === "langues" ? "linguistique" : item.domaine_slug === "soft-skills" ? "transversale" : "technique",
        niveau: presentation.languageLevels?.[item.skill_slug] || (item.niveau == null ? null : `${item.niveau}/5`),
      })),
    };
  }
  if (Array.isArray(data.projets)) return { ...data, projets: data.projets.map((project) => ({ ...project, slug: project.projet_slug })) };
  if (data.projet_slug) return { ...data, slug: data.projet_slug };
  return data;
}

function safeURL(value) {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : ""; }
  catch { return ""; }
}

function dateLabel(value) {
  if (!value) return "Aujourd’hui";
  if (/^\d{4}$/.test(value)) return value;
  const match = /^(\d{4})-(\d{2})/.exec(value);
  return match ? new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(+match[1], +match[2] - 1, 1))) : value;
}
const dateRange = (item) => `${dateLabel(item.date_debut)} – ${dateLabel(item.date_fin)}`;
function brief(text, max = 150) {
  const value = String(text || "").trim();
  return value.length > max ? value.slice(0, max).replace(/\s+\S*$/, "") + "…" : value;
}
function errorPanel(message, retry) {
  return `<div class="inline-error" role="alert">${esc(message)}${retry ? `<button type="button" data-retry="${retry}">Réessayer</button>` : ""}</div>`;
}

function renderProfile(profile) {
  state.profile = profile;
  document.title = `${profile.prenom} ${profile.nom} · Portfolio Data`;
  $("#hero-name").innerHTML = `${esc(profile.prenom)} <span>${esc(profile.nom)}</span>`;
  $("#hero-role").textContent = profile.titre;
  $("#hero-intro").textContent = brief(profile.description.split(",")[0], 150) + ".";
  $("#footer-name").textContent = `${profile.prenom} ${profile.nom}`;
  const education = [...profile.formations].sort((a, b) => b.date_debut.localeCompare(a.date_debut))[0];
  $("#hero-facts").innerHTML = education ? `<span>${esc(education.etablissement)}</span>` : "";

  const timeline = [
    ...profile.experiences.map((entry) => ({ ...entry, kind: "experience" })),
    ...profile.formations.map((entry) => ({ ...entry, kind: "education" })),
  ].sort((a, b) => b.date_debut.localeCompare(a.date_debut));
  const renderEntry = (item) => {
    const isEducation = item.kind === "education";
    const lines = String(item.description || "").split(/\n+/).filter(Boolean);
    const summary = brief(lines[0], 150);
    const extra = lines[0]?.length > 150 ? lines : lines.slice(1);
    const type = isEducation ? "Formation" : /engagement/i.test(item.entreprise) ? "Engagement étudiant" : "Expérience professionnelle";
    return `<div class="timeline-entry"><article class="timeline-card ${isEducation ? "education" : ""}"><div class="entry-top"><span class="entry-type">${type}</span><span class="date-label">${esc(dateRange(item))}</span></div><h3>${esc(isEducation ? item.diplome : item.poste)}</h3><p class="company">${esc(isEducation ? item.etablissement : item.entreprise)}</p>${summary ? `<p class="entry-description">${esc(summary)}</p>` : ""}${!isEducation ? tags((item.competences || []).map(skillName)) : ""}${extra.length ? `<details class="entry-details"><summary>Plus de détails</summary><ul>${extra.map((line) => `<li>${esc(line)}</li>`).join("")}</ul></details>` : ""}</article></div>`;
  };
  $("#timeline").innerHTML = [
    { label: "Expérience & engagement", kind: "experience" },
    { label: "Formation", kind: "education" },
  ].map(({ label, kind }) => `<div class="parcours-column"><h3 class="column-label">${label}</h3>${timeline.filter((item) => item.kind === kind).map(renderEntry).join("") || '<p class="muted">Le parcours sera bientôt disponible.</p>'}</div>`).join("");

  const grouped = new Map();
  profile.competences.forEach((skill) => {
    const key = skill.type === "linguistique" ? "langues" : skill.type === "transversale" ? "soft-skills" : skill.domaine_slug || "outils";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(`${skill.nom}${skill.niveau ? ` · ${skill.niveau}` : ""}`);
  });
  $("#skill-count").textContent = `(${profile.competences.length})`;
  $("#skill-groups").innerHTML = [...grouped].map(([key, names]) => `<div class="skill-group"><h3>${esc(prettyDomain(key))}</h3>${tags(names)}</div>`).join("");
  $("#skill-filter").innerHTML = '<option value="">Toutes les compétences</option>' + profile.competences.filter((skill) => skill.type === "technique").sort((a, b) => a.nom.localeCompare(b.nom, "fr")).map((skill) => `<option value="${esc(skill.slug)}">${esc(skill.nom)}</option>`).join("");

  const email = profile.contact?.email, phone = profile.contact?.telephone;
  const socials = [["GitHub", profile.liens.github], ["LinkedIn", profile.liens.linkdIn]].filter(([, url]) => safeURL(url));
  $("#contact-links").innerHTML = `${email ? `<a class="contact-email" href="mailto:${esc(encodeURIComponent(email))}">${esc(email)}</a>` : ""}${phone ? `<a class="contact-phone" href="tel:${esc(phone.replace(/[^\d+]/g, ""))}">${esc(phone)}</a>` : ""}${socials.length ? `<div class="contact-socials">${socials.map(([name, url]) => `<a href="${esc(safeURL(url))}" target="_blank" rel="noopener noreferrer">${name}</a>`).join("")}</div>` : ""}`;
  renderTerminal();
}

function projectDomain(project) {
  return ["business-intelligence", "big-data", "machine-learning", "analyse-de-donnees"].find((slug) => project.domaine_slugs.includes(slug)) || project.domaine_slugs[0] || "";
}
function projectCard(project) {
  return `<article class="project-card"><div class="window-bar" aria-hidden="true"><span>PROJECT_FILE</span><span class="window-controls"><i></i><i></i><i></i></span></div>${projectVisual(project)}<div class="project-body"><p class="project-category">${esc(prettyDomain(projectDomain(project)))}</p><h3>${esc(project.titre)}</h3><p class="project-description">${esc(brief(project.description, 145))}</p>${tags(project.technologies.slice(0, 4))}<div class="project-bottom"><span>${esc(dateLabel(project.date_debut))}</span><button class="project-open" data-open-project="${esc(project.slug)}">Voir le projet</button></div></div></article>`;
}

// Schémas originaux décoratifs : aucune capture ni mesure de résultat inventée.
function projectVisual(project) {
  const domain = projectDomain(project);
  const illustration = domain === "business-intelligence"
    ? '<rect x="57" y="29" width="246" height="144" rx="7" fill="#fff0bd"/><path d="M57 54h246M76 72h52v79H76z" fill="none"/><path d="M151 143v-37h27v37m15 0V87h27v56m15 0V69h27v74" fill="#ff5096"/><path d="M143 151h135"/>'
    : domain === "big-data"
      ? '<g fill="#fff0bd"><ellipse cx="78" cy="80" rx="31" ry="13"/><path d="M47 80v52c0 18 62 18 62 0V80"/><ellipse cx="78" cy="132" rx="31" ry="13"/><rect x="153" y="81" width="61" height="61" rx="7"/><rect x="261" y="81" width="61" height="61" rx="7"/></g><path d="M114 111h34m72 0h35"/><path d="m168 112 10-12 11 23 12-14m75 10h32m-32-13h23" fill="none"/>'
      : '<g fill="#fff0bd"><rect x="33" y="79" width="67" height="67" rx="9"/><rect x="143" y="66" width="75" height="93" rx="9"/><rect x="263" y="79" width="66" height="67" rx="9"/></g><path d="M106 112h31m87 0h33M49 102h34m-34 12h24m-24 12h30M164 92l-9 17 15 18m27-35 9 17-15 18" fill="none"/><circle cx="295" cy="112" r="14" fill="#6de0cb"/>';
  return `<div class="project-art-stage"><div class="project-visual" data-visual="${domain === "business-intelligence" ? "bi" : domain === "big-data" ? "big-data" : "ml"}"><svg viewBox="0 0 360 200" fill="none" stroke="#292841" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${illustration}</svg><span class="art-caption">Schéma illustratif</span></div></div>`;
}

async function loadProjects({ initial = false } = {}) {
  const request = ++state.projectRequest;
  $("#project-list").setAttribute("aria-busy", "true");
  $("#project-status").textContent = "Chargement…";
  const params = new URLSearchParams({ page: String(state.page), limit: "6" });
  if (state.competence) params.set("competence", state.competence);
  if (state.domain) params.set("domaine_slug", state.domain);
  try {
    const result = await api(`/candidats/${slugPath}/projets?${params}`);
    if (request !== state.projectRequest) return;
    result.projets.forEach((project) => state.projects.set(project.slug, project));
    if (initial) {
      const domains = [...new Set(result.projets.map(projectDomain))].filter(Boolean);
      $("#domain-filters").innerHTML = [{ slug: "", label: "Tous" }, ...domains.map((slug) => ({ slug, label: prettyDomain(slug) }))].map((item) => `<button class="filter-chip" data-domain="${esc(item.slug)}" aria-pressed="${item.slug === state.domain}">${esc(item.label)}</button>`).join("");
      const featured = [...result.projets].sort((a, b) => (b.date_debut || "").localeCompare(a.date_debut || ""));
      const directions = new Map();
      featured.forEach((project) => { if (!directions.has(projectDomain(project))) directions.set(projectDomain(project), project); });
      $("#focus-strip").innerHTML = [...directions].slice(0, 3).map(([domain, project]) => `<div class="focus-item"><strong>${esc(prettyDomain(domain))}</strong><span>${esc(project.technologies.slice(0, 2).join(" · "))}</span></div>`).join("");
      if (state.graph && !state.flowTouched) { chooseInitialProject(); renderFlow(); }
    }
    const projects = [...result.projets].sort((a, b) => (b.date_debut || "").localeCompare(a.date_debut || ""));
    $("#project-list").innerHTML = projects.map(projectCard).join("") || '<div class="empty-state">Aucun projet pour cette sélection.</div>';
    $("#project-status").textContent = `${result.pagination.total} projet${result.pagination.total === 1 ? "" : "s"}`;
    const p = result.pagination;
    $("#project-pagination").innerHTML = p.total_pages > 1 ? `<button data-page="${p.page - 1}" ${p.page <= 1 ? "disabled" : ""}>Précédent</button><span>${p.page} / ${p.total_pages}</span><button data-page="${p.page + 1}" ${p.page >= p.total_pages ? "disabled" : ""}>Suivant</button>` : "";
  } catch (error) {
    if (request !== state.projectRequest) return;
    $("#project-list").innerHTML = errorPanel(error.message, "projects");
    $("#project-status").textContent = "Indisponible";
    $("#project-pagination").innerHTML = "";
  } finally { if (request === state.projectRequest) $("#project-list").setAttribute("aria-busy", "false"); }
}

let lastFocusedElement = null;
async function openProject(slug) {
  const dialog = $("#project-dialog"), request = ++state.dialogRequest;
  if (!dialog.open) { lastFocusedElement = document.activeElement; dialog.showModal(); document.body.style.overflow = "hidden"; }
  $("#dialog-content").innerHTML = '<div class="dialog-inner"><h2 id="dialog-title">Chargement du projet…</h2></div>';
  $("#close-dialog").focus();
  try {
    const project = await api(`/projets/${encodeURIComponent(slug)}`);
    if (request !== state.dialogRequest || !dialog.open) return;
    const links = [["Code source", project.liens.github], ["Démonstration", project.liens.demo]].filter(([, url]) => safeURL(url));
    const realisations = project["réalisation"] || project.realisations || [];
    $("#dialog-content").innerHTML = `<div class="dialog-inner"><p class="eyebrow">${esc(prettyDomain(projectDomain(project)))} · ${esc(dateRange(project))}</p><h2 id="dialog-title">${esc(project.titre)}</h2>${tags(project.technologies)}<p class="dialog-description">${esc(project.description)}</p>${project.architecture ? `<section class="detail-section"><h3>L’approche</h3><p>${esc(project.architecture)}</p></section>` : ""}${realisations.length ? `<section class="detail-section"><h3>Les réalisations</h3><ul>${realisations.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></section>` : ""}${project.contexte ? `<section class="detail-section"><h3>Le contexte</h3><p>${esc(project.contexte)}</p></section>` : ""}${Object.keys(project.metriques || {}).length ? `<section class="detail-section"><h3>Résultats</h3>${Object.entries(project.metriques).map(([key, value]) => `<p>${esc(key.replaceAll("_", " "))} : ${esc(typeof value === "object" ? JSON.stringify(value) : value)}</p>`).join("")}</section>` : ""}${(project.medias || []).filter((media) => media.type === "image" && safeURL(media.url)).map((media) => `<figure><img src="${esc(safeURL(media.url))}" alt="${esc(media.description)}" loading="lazy" style="max-width:100%;height:auto"></figure>`).join("")}${links.length ? `<div class="detail-links">${links.map(([name, url]) => `<a href="${esc(safeURL(url))}" target="_blank" rel="noopener noreferrer">${name}</a>`).join("")}</div>` : ""}<section class="detail-section"><h3>Des compétences en commun</h3><div id="similar-projects"><p class="muted">Chargement…</p></div></section></div>`;
    dialog.scrollTop = 0;
    try {
      const similar = await api(`/graph/projets/${encodeURIComponent(slug)}/similaires?limit=3`);
      if (request !== state.dialogRequest || !dialog.open) return;
      $("#similar-projects").innerHTML = similar.projets_similaires.map((item) => `<button class="similar-card" data-open-project="${esc(item.slug)}"><strong>${esc(item.titre)}</strong><span>${esc(item.competences_communes.map(skillName).join(" · "))}</span></button>`).join("") || '<p class="muted">Pas encore d’autre projet associé.</p>';
    } catch { if (request === state.dialogRequest && $("#similar-projects")) $("#similar-projects").innerHTML = '<p class="muted">Les recommandations sont momentanément indisponibles.</p>'; }
  } catch (error) {
    if (request === state.dialogRequest && dialog.open) $("#dialog-content").innerHTML = `<div class="dialog-inner"><h2 id="dialog-title">Projet indisponible</h2>${errorPanel(error.message)}<button class="project-open" data-open-project="${esc(slug)}">Réessayer</button></div>`;
  }
}

// Vue du graphe Neo4j en trois colonnes. Les liens proviennent uniquement de nodes + links.
function graphProjects() {
  if (!state.graph) return [];
  const authors = new Set(state.graph.nodes.filter((node) => node.type === "Candidat").map((node) => node.id));
  const ids = new Set(state.graph.links.filter((link) => link.type === "A_REALISE" && authors.has(link.source)).map((link) => link.target));
  return state.graph.nodes.filter((node) => node.type === "Projet" && ids.has(node.id)).sort((a, b) => {
    const aDate = state.projects.get(nodeSlug(a))?.date_debut || "";
    const bDate = state.projects.get(nodeSlug(b))?.date_debut || "";
    return bDate.localeCompare(aDate) || a.label.localeCompare(b.label, "fr");
  });
}
function nodeSlug(node) { return node.id.slice(node.id.indexOf(":") + 1); }
function chooseInitialProject() { state.flowProject = graphProjects()[0]?.id || null; state.flowFocus = null; }

function flowButton(node) {
  const isProject = node.type === "Projet", isSkill = node.type === "Competence";
  const selected = isProject ? node.id === state.flowProject : node.id === state.flowFocus;
  const label = node.type === "Domaine" ? prettyDomain(node.label) : node.label;
  return `<button class="flow-node ${isProject ? "project-node" : isSkill ? "skill-node" : "domain-node"}" data-node="${esc(node.id)}" data-kind="${node.type}" aria-pressed="${selected}"><span>${esc(label)}</span>${isSkill ? `<span class="node-count" data-count-for="${esc(nodeSlug(node))}" hidden></span>` : ""}</button>`;
}

function renderFlow() {
  if (!state.graph) return;
  const projects = graphProjects();
  if (!projects.length) {
    $("#graph-stage").innerHTML = '<p class="muted">Les connexions apparaîtront avec les premiers projets.</p>';
    $("#flow-status").textContent = "";
    return;
  }
  if (state.flowProject && !projects.some((node) => node.id === state.flowProject)) state.flowProject = projects[0].id;
  const visibleProjects = new Set(state.flowProject ? [state.flowProject] : projects.map((node) => node.id));
  const projectEdges = state.graph.links.filter((link) => link.type === "UTILISE" && visibleProjects.has(link.source));
  const skillIds = new Set(projectEdges.map((link) => link.target));
  const skills = state.graph.nodes.filter((node) => node.type === "Competence" && skillIds.has(node.id)).sort((a, b) => a.label.localeCompare(b.label, "fr"));
  const domainEdges = state.graph.links.filter((link) => link.type === "APPARTIENT_A" && skillIds.has(link.source));
  const domainIds = new Set(domainEdges.map((link) => link.target));
  const domains = state.graph.nodes.filter((node) => node.type === "Domaine" && domainIds.has(node.id)).sort((a, b) => a.label.localeCompare(b.label, "fr"));
  state.visibleEdges = [...projectEdges, ...domainEdges];
  const author = state.graph.nodes.find((node) => node.type === "Candidat");
  const columns = [["Projet", "PROJETS", projects, "project"], ["Competence", "COMPÉTENCES", skills, "skill"], ["Domaine", "DOMAINES", domains, "domain"]];
  $("#graph-stage").innerHTML = `<div class="flow-root"><svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><circle cx="9" cy="5" r="3" stroke="currentColor"/><path d="M3 16v-2a6 6 0 0 1 12 0v2" stroke="currentColor"/></svg><span>${esc(author?.label || "Mon parcours")} · ${projects.length} projet${projects.length > 1 ? "s" : ""}</span></div><div id="flow-canvas" class="flow-canvas"><svg class="flow-edges" aria-hidden="true" focusable="false"></svg>${columns.map(([, heading, nodes, kind]) => `<section class="flow-column ${kind}-column" aria-label="${heading}"><h3 class="flow-heading"><i aria-hidden="true"></i>${heading}</h3><div class="flow-node-list">${nodes.map(flowButton).join("") || '<p class="muted">Aucun élément associé.</p>'}</div></section>`).join("")}</div>`;
  $("#flow-reset").setAttribute("aria-pressed", String(!state.flowProject));
  $("#flow-status").textContent = `${skills.length} compétence${skills.length > 1 ? "s" : ""} · ${domains.length} domaine${domains.length > 1 ? "s" : ""}. Sélectionnez un projet ou une compétence.`;
  applyFlowSelection(); updateStatsBadges(); queueFlowDrawing();
}

function relatedNodes() {
  if (!state.flowFocus) return null;
  const ids = new Set([state.flowFocus]);
  state.visibleEdges.forEach((edge) => { if (edge.source === state.flowFocus || edge.target === state.flowFocus) { ids.add(edge.source); ids.add(edge.target); } });
  const domain = state.graph.nodes.find((node) => node.id === state.flowFocus)?.type === "Domaine";
  if (domain) state.visibleEdges.forEach((edge) => { if (edge.type === "UTILISE" && ids.has(edge.target)) ids.add(edge.source); });
  return ids;
}
function applyFlowSelection() {
  const related = relatedNodes();
  document.querySelectorAll(".flow-node").forEach((button) => {
    const project = button.dataset.kind === "Projet";
    button.setAttribute("aria-pressed", String(project ? button.dataset.node === state.flowProject : button.dataset.node === state.flowFocus));
    button.classList.toggle("dimmed", related ? !related.has(button.dataset.node) : project && Boolean(state.flowProject) && button.dataset.node !== state.flowProject);
  });
  queueFlowDrawing();
}

let drawFrame = 0;
function queueFlowDrawing() { cancelAnimationFrame(drawFrame); drawFrame = requestAnimationFrame(drawFlowEdges); }
function drawFlowEdges() {
  const canvas = $("#flow-canvas");
  if (!canvas) return;
  const svg = canvas.querySelector("svg"), rect = canvas.getBoundingClientRect();
  const related = relatedNodes(), mobile = matchMedia("(max-width: 760px)").matches;
  const nodes = new Map([...canvas.querySelectorAll("[data-node]")].map((node) => [node.dataset.node, node]));
  svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
  svg.innerHTML = state.visibleEdges.map((edge) => {
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) return "";
    const a = nodes.get(edge.source).getBoundingClientRect(), b = nodes.get(edge.target).getBoundingClientRect();
    const y1 = a.top - rect.top + a.height / 2, y2 = b.top - rect.top + b.height / 2;
    const x1 = mobile ? a.left - rect.left : a.right - rect.left, x2 = b.left - rect.left;
    const middle = mobile ? Math.max(0, Math.min(x1, x2) - 12) : (x1 + x2) / 2;
    const d = `M ${x1} ${y1} C ${middle} ${y1}, ${middle} ${y2}, ${x2} ${y2}`;
    const highlight = related && related.has(edge.source) && related.has(edge.target);
    return `<path d="${d}" class="flow-edge ${highlight ? "highlight" : related ? "dim" : ""}" data-source="${esc(edge.source)}" data-target="${esc(edge.target)}"/>`;
  }).join("");
}

async function loadGraph() {
  $("#graph-stage").setAttribute("aria-busy", "true");
  try {
    state.graph = await api(`/graph/competences/${slugPath}`);
    chooseInitialProject(); renderFlow();
  } catch (error) {
    state.graph = null;
    $("#graph-stage").innerHTML = errorPanel(error.message, "graph");
    $("#flow-status").textContent = "";
  } finally { $("#graph-stage").setAttribute("aria-busy", "false"); }
}
function updateStatsBadges() {
  document.querySelectorAll("[data-count-for]").forEach((badge) => {
    const count = state.stats.get(badge.dataset.countFor);
    badge.hidden = count === undefined;
    if (count !== undefined) { badge.textContent = count; badge.title = `${count} projet${count > 1 ? "s" : ""}`; badge.setAttribute("aria-label", `${count} projet${count > 1 ? "s" : ""}`); }
  });
  queueFlowDrawing();
}
async function loadStats() {
  try {
    const stats = await api(`/candidats/${slugPath}/stats`);
    state.stats = new Map(stats.statistiques.map((item) => [item.competence_slug, item.nombre_projets]));
    $("#stats-status").textContent = "Les pastilles indiquent le nombre de projets.";
    updateStatsBadges();
  } catch { $("#stats-status").innerHTML = 'Statistiques indisponibles. <button data-retry="stats">Réessayer</button>'; }
}

async function loadPortfolio() {
  $("#global-error").hidden = true;
  try {
    renderProfile(await api(`/candidats/${slugPath}`));
    await Promise.allSettled([loadProjects({ initial: true }), loadGraph(), loadStats()]);
  } catch {
    $("#hero-intro").textContent = "Les informations sont momentanément indisponibles.";
    $("#global-error").innerHTML = 'Le portfolio n’a pas pu charger ses informations.<button type="button" data-retry="all">Réessayer</button>';
    $("#global-error").hidden = false;
    $("#timeline").innerHTML = '<p class="muted">Parcours indisponible.</p>';
    $("#project-list").innerHTML = errorPanel("Les projets sont momentanément indisponibles.", "all");
    $("#project-list").setAttribute("aria-busy", "false");
    $("#project-status").textContent = "Indisponible";
    $("#graph-stage").innerHTML = errorPanel("Les connexions sont momentanément indisponibles.", "all");
    $("#graph-stage").setAttribute("aria-busy", "false");
  }
}

$("#current-year").textContent = new Date().getFullYear();
$("#menu-toggle").addEventListener("click", () => {
  const open = $("#menu-toggle").getAttribute("aria-expanded") !== "true";
  $("#menu-toggle").setAttribute("aria-expanded", String(open));
  $("#menu-toggle").setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
  $("#navigation").classList.toggle("open", open);
});
$("#navigation").addEventListener("click", (event) => {
  if (!event.target.closest("a")) return;
  $("#navigation").classList.remove("open");
  $("#menu-toggle").setAttribute("aria-expanded", "false");
  $("#menu-toggle").setAttribute("aria-label", "Ouvrir le menu");
});
$("#skill-filter").addEventListener("change", (event) => { state.competence = event.target.value; state.page = 1; loadProjects(); });
$("#flow-reset").addEventListener("click", () => { state.flowProject = null; state.flowFocus = null; state.flowTouched = true; renderFlow(); });
document.addEventListener("click", (event) => {
  const project = event.target.closest("[data-open-project]");
  if (project) openProject(project.dataset.openProject);
  const domain = event.target.closest("[data-domain]");
  if (domain) { state.domain = domain.dataset.domain; state.page = 1; document.querySelectorAll("[data-domain]").forEach((button) => button.setAttribute("aria-pressed", String(button === domain))); loadProjects(); }
  const page = event.target.closest("[data-page]");
  if (page && !page.disabled) { state.page = +page.dataset.page; loadProjects(); }
  const node = event.target.closest(".flow-node");
  if (node) {
    state.flowTouched = true;
    if (node.dataset.kind === "Projet") {
      const id = node.dataset.node;
      state.flowProject = id; state.flowFocus = null; renderFlow();
      [...document.querySelectorAll(".flow-node")].find((button) => button.dataset.node === id)?.focus({ preventScroll: true });
    } else { state.flowFocus = state.flowFocus === node.dataset.node ? null : node.dataset.node; applyFlowSelection(); }
  }
  const retry = event.target.closest("[data-retry]");
  if (retry) ({ all: loadPortfolio, projects: () => loadProjects({ initial: !$("#domain-filters").children.length }), graph: loadGraph, stats: loadStats })[retry.dataset.retry]?.();
});
$("#close-dialog").addEventListener("click", () => $("#project-dialog").close());
$("#project-dialog").addEventListener("close", () => { state.dialogRequest++; document.body.style.overflow = ""; if (lastFocusedElement?.isConnected) lastFocusedElement.focus({ preventScroll: true }); });
$("#project-dialog").addEventListener("click", (event) => {
  const rect = event.currentTarget.getBoundingClientRect();
  if (event.target === event.currentTarget && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) event.currentTarget.close();
});
new ResizeObserver(queueFlowDrawing).observe($("#graph-stage"));
document.fonts?.ready.then(queueFlowDrawing);
const observer = new IntersectionObserver((entries) => { entries.forEach((entry) => { if (entry.isIntersecting) document.querySelectorAll("nav a").forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`)); }); }, { rootMargin: "-15% 0px -60% 0px" });
document.querySelectorAll("main section[id]").forEach((section) => observer.observe(section));

let terminalIndex = 0;
function renderTerminal() {
  const skills = state.profile?.competences.filter((skill) => skill.type === "technique") || [];
  $("#terminal-cycle").disabled = skills.length === 0;
  $("#terminal-skill").textContent = skills.length ? skills[terminalIndex % skills.length].nom : "…";
}
$("#terminal-cycle").addEventListener("click", () => { terminalIndex++; renderTerminal(); });

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
let motionEnabled = !reducedMotion.matches;
function updateMotion() {
  document.body.dataset.motion = motionEnabled && !reducedMotion.matches ? "on" : "off";
  const button = $("#motion-toggle"), enabled = document.body.dataset.motion === "on";
  button.setAttribute("aria-pressed", String(enabled));
  button.setAttribute("aria-label", enabled ? "Mettre les animations en pause" : "Activer les animations");
  button.title = reducedMotion.matches ? "Animations réduites selon les préférences du système" : button.getAttribute("aria-label");
  button.disabled = reducedMotion.matches;
  if (!enabled) {
    document.getAnimations().forEach((animation) => animation.cancel());
    document.querySelectorAll(".stage-sticker, .project-visual").forEach((element) => {
      ["--dx", "--dy", "--tilt-x", "--tilt-y"].forEach((property) => element.style.removeProperty(property));
    });
  }
}
$("#motion-toggle").addEventListener("click", () => { motionEnabled = !motionEnabled; updateMotion(); });
reducedMotion.addEventListener("change", () => { motionEnabled = !reducedMotion.matches; updateMotion(); });
updateMotion();
$("#hero-stage").addEventListener("pointermove", (event) => {
  if (document.body.dataset.motion !== "on" || !finePointer.matches) return;
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.querySelectorAll(".stage-sticker").forEach((element) => {
    const depth = Number(element.dataset.depth || 1);
    element.style.setProperty("--dx", `${(event.clientX - rect.left - rect.width / 2) / rect.width * 15 * depth}px`);
    element.style.setProperty("--dy", `${(event.clientY - rect.top - rect.height / 2) / rect.height * 15 * depth}px`);
  });
});
$("#hero-stage").addEventListener("pointerleave", () => document.querySelectorAll(".stage-sticker").forEach((element) => { element.style.setProperty("--dx", "0px"); element.style.setProperty("--dy", "0px"); }));
document.addEventListener("pointermove", (event) => {
  const visual = event.target.closest(".project-visual");
  if (!visual || document.body.dataset.motion !== "on" || !finePointer.matches) return;
  const rect = visual.getBoundingClientRect();
  visual.style.setProperty("--tilt-x", `${-(event.clientY - rect.top - rect.height / 2) / rect.height * 7}deg`);
  visual.style.setProperty("--tilt-y", `${(event.clientX - rect.left - rect.width / 2) / rect.width * 7}deg`);
});
document.addEventListener("pointerout", (event) => {
  const visual = event.target.closest(".project-visual");
  if (visual && !visual.contains(event.relatedTarget)) { visual.style.removeProperty("--tilt-x"); visual.style.removeProperty("--tilt-y"); }
});
const revealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
  if (!entry.isIntersecting) return;
  if (document.body.dataset.motion === "on") entry.target.animate([{ opacity: 0.6, transform: "translateY(18px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 450, easing: "ease-out" });
  revealObserver.unobserve(entry.target);
}), { threshold: 0.08 });
document.querySelectorAll("[data-reveal]").forEach((element) => revealObserver.observe(element));
loadPortfolio();
