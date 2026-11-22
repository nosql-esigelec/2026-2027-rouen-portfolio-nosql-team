const $ = (s) => document.querySelector(s);
const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const idOf = p => p.slug || p.projet_slug || p.candidat_slug;
const skillId = s => s.slug || s.skill_slug;
const date = v => v ? new Date(`${v}-01`).toLocaleDateString('fr-FR', {month:'short',year:'numeric'}) : 'Aujourd’hui';
const safeUrl = (v, protocols = ['http:', 'https:']) => { try { const u = new URL(v, location.href); return protocols.includes(u.protocol) ? u.href : ''; } catch { return ''; } };
const config=window.PORTFOLIO_CONFIG || {};
const storageKey=config.storageKey || 'xucan-team-config-v1';
let saved = {}; try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch {}
let state = {mode:saved.mode || config.defaultMode || 'api', base:saved.base || config.apiBase || location.origin, slug:saved.slug || config.candidateSlug || 'zhong-xucan', profile:null, projects:[], graph:null, stats:null, page:1, total:0, search:'', domain:'', skill:'', timeline:'experiences'};
let localData, loadVersion = 0, requestVersion = 0, detailVersion = 0, toastTimer;
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3500); }
async function fetchJson(url) { const response = await fetch(url, {signal:AbortSignal.timeout(45000)}); if (!response.ok) { let detail; try { detail = (await response.json()).detail; } catch {} const error=new Error(typeof detail === 'string' ? detail : `Erreur HTTP ${response.status}`);error.status=response.status;throw error; } return response.json(); }
function persist() { localStorage.setItem(storageKey, JSON.stringify({mode:state.mode,base:state.base,slug:state.slug})); }
function localGraph() {
  const c = localData.candidat, nodes = new Map(), links = new Map();
  const add = (type,slug,label) => {const id = `${type.toLowerCase()}:${slug}`; nodes.set(id,{id,type,label}); return id;};
  const connect = (source,target,type) => links.set(`${source}|${target}|${type}`,{source,target,type});
  const candidate = add('Candidat',idOf(c),`${c.prenom} ${c.nom}`);
  for (const s of c.competences || []) {const skill = add('Competence',skillId(s),s.nom); connect(candidate,skill,'MAITRISE'); const d=s.domaine_slug || s.domaine; if(d) connect(skill,add('Domaine',d,d.replaceAll('-',' ')),'APPARTIENT_A');}
  for (const p of localData.projets) {const project=add('Projet',idOf(p),p.titre);connect(candidate,project,'A_REALISE');for(const slug of p.competence_slugs || []){const id=`competence:${slug}`;if(!nodes.has(id))add('Competence',slug,slug);connect(project,id,'UTILISE');}}
  return {candidat_slug:idOf(c),nodes:[...nodes.values()],links:[...links.values()]};
}
async function api(path) {
  if (state.mode === 'api') return fetchJson(`${state.base.replace(/\/$/,'')}/api${path}`);
  const url = new URL(path, 'http://local'); const parts = url.pathname.split('/').filter(Boolean);
  const c=localData.candidat, projects=localData.projets;
  if (parts[0]==='candidats' && parts.length===2) return c;
  if (parts[0]==='candidats' && parts[2]==='stats') return {total_projets:projects.length, statistiques:(c.competences || []).map(s=>({competence_slug:skillId(s),nom:s.nom,nombre_projets:projects.filter(p=>p.competence_slugs.includes(skillId(s))).length})).filter(s=>s.nombre_projets).sort((a,b)=>b.nombre_projets-a.nombre_projets)};
  if (parts[0]==='candidats' && parts[2]==='projets') {let items=projects.filter(p=>(!url.searchParams.get('domaine_slug') || p.domaine_slugs.includes(url.searchParams.get('domaine_slug'))) && (!url.searchParams.get('competence') || p.competence_slugs.includes(url.searchParams.get('competence'))));const page=+(url.searchParams.get('page')||1), limit=+(url.searchParams.get('limit')||6);return {projets:items.slice((page-1)*limit,page*limit),pagination:{total:items.length,page,limit}};}
  if (parts[0]==='graph' && parts[1]==='competences') return localGraph();
  if (parts[0]==='projets') {const p=projects.find(p=>idOf(p)===parts[1]); if(!p)throw new Error('Projet introuvable');return p;}
  if (parts[0]==='graph' && parts[1]==='projets') {const p=projects.find(p=>idOf(p)===parts[2]);if(!p)throw new Error('Projet introuvable'); const items=projects.filter(o=>idOf(o)!==idOf(p)).map(o=>{const common=o.competence_slugs.filter(s=>p.competence_slugs.includes(s));return {slug:idOf(o),titre:o.titre,competences_communes:common,nombre_competences_communes:common.length};}).filter(p=>p.nombre_competences_communes).sort((a,b)=>b.nombre_competences_communes-a.nombre_competences_communes);return {total:items.length,projets_similaires:items};}
  throw new Error('Route indisponible');
}
function renderProfile() {
  const c=state.profile; if(!c)return;
  $('#hero-subtitle').textContent=`${c.titre} · ${c.localisation || 'Portfolio d’ingénieur'}`;
  $('#bio').textContent=c.description || c.bio || '';
  const domains=new Set((c.competences || []).map(s=>s.domaine_slug || s.domaine).filter(Boolean));
  $('#stats').innerHTML=[[state.stats?.total_projets ?? state.total,'Projets réalisés'],[(c.competences || []).length,'Compétences'],[(c.experiences || []).length,'Expérience professionnelle'],[domains.size,'Domaines explorés']].map(([n,label])=>`<div><strong>${esc(n)}</strong><span>${label}</span></div>`).join('');
  const personalSlug = config.candidateSlug || 'zhong-xucan';
const contact = c.contact ||
  (c.candidat_slug === personalSlug ? config.contact : {}) ||
  {};

const email = contact.email;
const telephone = contact.telephone;

$('#contact-cta').href = email ? `mailto:${email}` : '#contact-links';

const contacts = [];

if (email) {
  contacts.push(`<a href="mailto:${esc(email)}">${esc(email)}</a>`);
}

if (telephone) {
  contacts.push(
    `<a href="tel:${esc(String(telephone).replace(/[^+\d]/g, ''))}">${esc(telephone)}</a>`
  );
}
  for (const [label,url] of [['GitHub',c.liens?.github],['LinkedIn',c.liens?.linkedin || c.liens?.linkdIn]]) {const safe=safeUrl(url || '');if(url&&safe)contacts.push(`<a href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${label}</a>`);}
  contacts.push('<a href="assets/CV_ZHONG_2026.docx" download>Télécharger le CV</a>');
  $('#contact-links').innerHTML=contacts.join('') || '<p>Coordonnées non renseignées dans le profil.</p>';
  $('#skill-tags').innerHTML=(c.competences || []).map(s=>`<button data-skill="${esc(skillId(s))}">${esc(s.nom)}${s.niveau && typeof s.niveau==='string' ? ` <span>${esc(s.niveau)}</span>` : ''}</button>`).join('');
  const domainsFromProjects=new Set([...domains,...state.projects.flatMap(p=>p.domaine_slugs || [])]);
  $('#domain-filter').innerHTML='<option value="">Tous les domaines</option>'+[...domainsFromProjects].sort().map(d=>`<option value="${esc(d)}">${esc(d.replaceAll('-',' '))}</option>`).join('');$('#domain-filter').value=state.domain;
  const identity=$('.identity-name');if(identity)identity.textContent=`${c.prenom} ${c.nom} — ${c.titre}`;
  renderTimeline(); renderStats();
}
function renderStats() {const stats=(state.stats?.statistiques || []).filter(s=>s.nombre_projets>0).slice(0,8);const max=Math.max(1,...stats.map(s=>s.nombre_projets));$('#skill-stats').innerHTML=stats.map(s=>`<div class="skill-stat"><div><span>${esc(s.nom || s.competence_slug)}</span><span>${s.nombre_projets} projet${s.nombre_projets>1?'s':''}</span></div><div class="track"><span style="width:${s.nombre_projets/max*100}%"></span></div></div>`).join('');}
function projectIllustration(project,index) {
  if(state.mode==='api'){
    const palette=[['#cddcd1','#274a40'],['#dad3e9','#594574'],['#e7dfb8','#6a6536']][index%3];
    const technologies=(project.technologies || project.competence_slugs || []).slice(0,3);
    return `<svg viewBox="0 0 600 440" aria-hidden="true"><rect width="600" height="440" fill="${palette[0]}"/><circle cx="540" cy="50" r="180" fill="white" opacity=".17"/><g transform="translate(55 60) rotate(-3 245 160)"><rect x="8" y="12" width="490" height="310" rx="16" fill="${palette[1]}" opacity=".17"/><rect width="490" height="310" rx="16" fill="#fbfcf7"/><text x="30" y="65" font-family="Arial" font-size="24" font-weight="700" fill="${palette[1]}">${esc(project.titre.length>33?project.titre.slice(0,31)+'…':project.titre)}</text><text x="30" y="90" font-family="Arial" font-size="10" fill="#8a9987">PORTFOLIO / PROJET D’ÉQUIPE</text><path d="M110 190H390" stroke="${palette[1]}" opacity=".4" stroke-width="3"/>${technologies.map((t,i)=>`<rect x="${30+i*155}" y="139" width="125" height="100" rx="10" fill="${palette[0]}"/><text x="${92+i*155}" y="195" text-anchor="middle" font-family="Arial" font-size="13" fill="${palette[1]}">${esc(t.length>17?t.slice(0,15)+'…':t)}</text>`).join('')}<text x="30" y="278" font-family="Arial" font-size="10" fill="#8a9987">${esc(project.architecture?.slice(0,70) || 'EXPLORER LE CONTEXTE, LES OUTILS ET LES RÉALISATIONS')}</text></g></svg><span class="visual-label">ILLUSTRATION DU PROJET</span>`;
  }
  const slug=idOf(project).toLowerCase();
  const type=slug.includes('rfid')?0:slug.includes('business')||slug.includes('bi-')?1:slug.includes('spark')?2:index%3;
  const art=[
    `<rect width="600" height="440" fill="#d6c6e9"/><circle cx="550" cy="60" r="130" fill="#b5b0db"/><circle cx="20" cy="420" r="170" fill="#e8d8f4"/><g transform="translate(65 55) rotate(-5 235 150)"><rect x="8" y="14" width="470" height="300" rx="15" fill="#866a9c" opacity=".25"/><rect width="470" height="300" rx="15" fill="#f7f5f9"/><rect width="470" height="30" rx="15" fill="#fff"/><circle cx="18" cy="15" r="4" fill="#d7a1b7"/><circle cx="31" cy="15" r="4" fill="#c7b9dc"/><circle cx="44" cy="15" r="4" fill="#ddd3ab"/><text x="27" y="80" fill="#4e355d" font-size="29" font-weight="700" font-family="Arial">RFID / LAB</text><text x="28" y="103" fill="#aa93b6" font-size="10" font-family="Arial">DATA EXPLORATION & MACHINE LEARNING</text><rect x="27" y="123" width="275" height="132" rx="8" fill="#eee7f2"/><path d="M45 228L79 215L105 229L138 167L170 183L207 155L240 185L281 149" fill="none" stroke="#9875b4" stroke-width="4"/><path d="M45 230L79 225L105 201L138 209L170 191L207 191L240 163L281 160" fill="none" stroke="#c29cc6" stroke-width="3"/><g fill="#c5b2d7"><rect x="322" y="128" width="120" height="34" rx="6"/><rect x="322" y="172" width="120" height="34" rx="6"/><rect x="322" y="216" width="120" height="34" rx="6"/></g><g fill="#faf8fb" font-family="Arial" font-size="12"><text x="335" y="149">Random Forest</text><text x="335" y="193">KNN</text><text x="335" y="237">Oracle</text></g></g><g transform="translate(425 300) rotate(12)"><rect width="115" height="95" rx="17" fill="#74568c"/><rect x="24" y="20" width="67" height="55" rx="7" fill="none" stroke="#c6afd9" stroke-width="5"/><text x="57" y="53" fill="#f9edff" text-anchor="middle" font-family="monospace" font-size="14">RFID</text></g>`,
    `<rect width="600" height="440" fill="#e9e5b6"/><circle cx="510" cy="420" r="210" fill="#d1d494"/><path d="M-40 80L185-30L280 440H40Z" fill="#f6f0d6"/><g transform="translate(70 50) rotate(4 235 150)"><rect x="8" y="15" width="470" height="320" rx="13" fill="#717b4f" opacity=".2"/><rect width="470" height="320" rx="13" fill="#faf9ee"/><rect width="90" height="320" rx="13" fill="#384d3f"/><text x="17" y="42" fill="#edf2d6" font-size="16" font-weight="700" font-family="Arial">BI STUDIO</text><g fill="#647760"><rect x="16" y="75" width="57" height="7" rx="3"/><rect x="16" y="102" width="46" height="7" rx="3"/><rect x="16" y="129" width="54" height="7" rx="3"/><rect x="16" y="156" width="37" height="7" rx="3"/></g><text x="112" y="47" fill="#304b3d" font-size="25" font-weight="700" font-family="Arial">Data, made clear.</text><rect x="110" y="70" width="335" height="44" rx="6" fill="#efefd8"/><g fill="#6f874d"><rect x="128" y="84" width="61" height="5" rx="2"/><rect x="230" y="84" width="67" height="5" rx="2"/><rect x="340" y="84" width="68" height="5" rx="2"/></g><rect x="110" y="130" width="210" height="162" rx="7" fill="#f0efdc"/><g fill="#97b057"><rect x="128" y="227" width="22" height="43" rx="3"/><rect x="161" y="192" width="22" height="78" rx="3"/><rect x="194" y="215" width="22" height="55" rx="3"/><rect x="227" y="171" width="22" height="99" rx="3"/><rect x="260" y="153" width="22" height="117" rx="3"/></g><circle cx="383" cy="195" r="42" fill="none" stroke="#e0dfbd" stroke-width="17"/><circle cx="383" cy="195" r="42" fill="none" stroke="#a6b867" stroke-width="17" stroke-dasharray="175 264" transform="rotate(-90 383 195)"/><text x="349" y="272" fill="#82916c" font-size="11" font-family="Arial">POWER BI / ETL</text></g><g transform="translate(16 285) rotate(-12)"><rect width="115" height="100" rx="16" fill="#e5bd51"/><g fill="#fff4cc"><rect x="22" y="52" width="17" height="27" rx="3"/><rect x="48" y="37" width="17" height="42" rx="3"/><rect x="74" y="19" width="17" height="60" rx="3"/></g></g>`,
    `<rect width="600" height="440" fill="#bed8d2"/><circle cx="540" cy="70" r="160" fill="#8fb9b5"/><circle cx="90" cy="400" r="150" fill="#cce7dc"/><g transform="translate(65 65) rotate(-3 235 150)"><rect x="9" y="14" width="470" height="300" rx="15" fill="#355f5d" opacity=".22"/><rect width="470" height="300" rx="15" fill="#1c4544"/><text x="28" y="53" fill="#f1f8dc" font-size="29" font-weight="700" font-family="Arial">THINK BIG. SPARK IT.</text><text x="28" y="78" fill="#82aca3" font-size="10" font-family="Arial">PYSPARK / SPARK SQL / MLLIB</text><g fill="none" stroke="#739c83" stroke-width="3"><path d="M90 170H180M240 170H330M210 200V249H370V200"/></g><g fill="#315f55" stroke="#719a7e"><rect x="30" y="127" width="97" height="81" rx="8"/><rect x="167" y="127" width="97" height="81" rx="8"/><rect x="310" y="127" width="130" height="81" rx="8"/></g><g fill="#d5ebbd" font-family="Arial" text-anchor="middle" font-size="13"><text x="78" y="164">DATA</text><text x="78" y="183">CLEANING</text><text x="215" y="164">SPARK</text><text x="215" y="183">SQL</text><text x="375" y="164">MACHINE</text><text x="375" y="183">LEARNING</text></g><circle cx="210" cy="248" r="7" fill="#bad58c"/></g><g transform="translate(454 290) rotate(15)"><rect width="105" height="102" rx="23" fill="#f5b069"/><text x="52" y="76" text-anchor="middle" font-family="Arial" font-size="83" fill="#fff4c7">✦</text></g>`
  ][type];
  return `<svg viewBox="0 0 600 440" aria-hidden="true" focusable="false">${art}</svg><span class="visual-label">ILLUSTRATION DU PROJET</span>`;
}
function renderTimeline() {
  const items=[...(state.profile?.[state.timeline] || [])].sort((a,b)=>String(b.date_debut || b.debut).localeCompare(String(a.date_debut || a.debut)));
  $('#timeline').innerHTML=items.map((item,i)=>`<details class="timeline-item" ${i===0?'open':''}><summary><span class="timeline-date">${date(item.date_debut || item.debut)} — ${date(item.date_fin || item.fin)}</span><div><h3>${esc(item.entreprise || item.etablissement || item.ecole)}</h3><span class="timeline-role">${esc(item.poste || item.diplome)}</span></div><span class="toggle-circle" aria-hidden="true"></span></summary><div class="timeline-body">${esc(item.description || item.diplome || '')}<div class="tag-list">${(item.competences || []).map(s=>`<span class="tag">${esc(s)}</span>`).join('')}</div></div></details>`).join('') || '<p class="empty">Aucune information disponible.</p>';
}
async function loadProjects(append=false) {
  const version=++requestVersion;const params=new URLSearchParams({page:String(state.page),limit:'6'});if(state.domain)params.set('domaine_slug',state.domain);if(state.skill)params.set('competence',state.skill);
  $('#load-more').disabled=true;
  try {const result=await api(`/candidats/${encodeURIComponent(state.slug)}/projets?${params}`);if(version!==requestVersion)return;state.projects=append?[...state.projects,...(result.projets || result.items || [])]:(result.projets || result.items || []);state.total=result.pagination?.total ?? result.total ?? state.projects.length;renderProjects();}
  catch(error){if(version===requestVersion){if(!append)$('#project-list').innerHTML=`<p class="error-inline">Impossible de charger les projets : ${esc(error.message)}</p>`;else {state.page=Math.max(1,state.page-1);toast(error.message);}}}
  finally {if(version===requestVersion)$('#load-more').disabled=false;}
}
function renderProjects() {
  const items=state.projects.filter(p=>`${p.titre} ${p.description} ${(p.technologies || []).join(' ')}`.toLowerCase().includes(state.search));
  $('#project-list').innerHTML=items.map((p,i)=>`<article class="project-row"><span class="paperclip" aria-hidden="true"></span><div class="browser-chrome" aria-hidden="true"><i></i><i></i><i></i></div><button class="visual-open" data-project="${esc(idOf(p))}" aria-label="Découvrir ${esc(p.titre)}"><span class="project-visual">${projectIllustration(p,i)}</span></button><div class="project-row-top"><p class="eyebrow">${esc((p.domaine_slugs || []).join(' / ').replaceAll('-',' ')) || 'PROJET ACADÉMIQUE'}</p><span class="mini-label">${esc(p.date_fin || '')}</span></div><h3>${esc(p.titre)}</h3><p>${esc(p.description)}</p><button class="pill dark open-project" data-project="${esc(idOf(p))}">Voir le projet</button><div class="project-row-bottom"><div class="tag-list">${(p.technologies || p.competence_slugs || []).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div><span class="project-number">SELECTED WORK · ${String(i+1).padStart(2,'0')}</span></div></article>`).join('') || '<p class="empty">Aucun projet ne correspond à ces critères.</p>';
  $('#project-count').textContent=`${items.length} projet${items.length!==1?'s':''} affiché${items.length!==1?'s':''} · ${state.total} au total${state.search?' · recherche sur les projets chargés':''}`;
  $('#load-more').hidden=state.projects.length>=state.total;
}
function selectSkill(slug) {state.skill=state.skill===slug?'':slug;state.page=1;document.querySelectorAll('[data-skill]').forEach(b=>b.classList.toggle('active',b.dataset.skill===state.skill));loadProjects();$('#projects').scrollIntoView({behavior:'smooth'});}
async function openProject(slug) {
  const version=++detailVersion;const dialog=$('#project-dialog');if(!dialog.open)dialog.showModal();$('#project-detail').innerHTML='<p class="loading">Chargement du projet…</p>';
  try {
    const project=await api(`/projets/${encodeURIComponent(slug)}`);if(version!==detailVersion)return;
    let similar;
    if(Array.isArray(project.projets_similaires)){similar={status:'fulfilled',value:{total:project.total_similaires ?? project.projets_similaires.length,projets_similaires:project.projets_similaires}};}
    else {try {similar={status:'fulfilled',value:await api(`/graph/projets/${encodeURIComponent(slug)}/similaires?limit=5`)};}catch(error){similar={status:'rejected',reason:error};}}
    if(version!==detailVersion)return;
    const links=[['Code source',project.liens?.github],['Voir la démo',project.liens?.demo]].filter(([,u])=>u&&safeUrl(u));
    $('#project-detail').innerHTML=`<p class="eyebrow">${esc(project.contexte || 'PROJET')}</p><h2>${esc(project.titre)}</h2><div class="detail-meta"><span>${date(project.date_debut)} — ${date(project.date_fin)}</span><span>${esc((project.domaine_slugs || []).join(' · '))}</span></div><p class="description">${esc(project.description)}</p><div class="tag-list">${(project.technologies || []).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>${project.architecture?`<h3>Architecture & outils</h3><p class="description">${esc(project.architecture)}</p>`:''}<h3>Ce que j’ai réalisé</h3><ul>${(project['réalisation'] || project.realisations || []).map(r=>`<li>${esc(r)}</li>`).join('')}</ul><div class="detail-links">${links.map(([name,url])=>`<a class="pill dark" href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${name}</a>`).join('')}</div><div id="project-media"></div><h3>Projets similaires</h3><div>${similar.status==='rejected'?'<p class="error-inline">Les projets similaires sont indisponibles. Le service Neo4j ne répond pas.</p>':similar.value.projets_similaires.length?similar.value.projets_similaires.map(s=>`<button class="similar-card" data-project="${esc(s.slug)}">${esc(s.titre)}<span>${s.nombre_competences_communes} compétence(s) en commun</span></button>`).join(''):'<p class="empty">Aucun autre projet ne partage encore les mêmes compétences.</p>'}</div>`;
    for(const m of project.medias || []) {if(m.type!=='image'||!safeUrl(m.url))continue;const img=document.createElement('img');img.className='media';img.alt=m.description || project.titre;img.loading='lazy';img.src=safeUrl(m.url);img.addEventListener('error',()=>img.remove());$('#project-media').append(img);}
  }catch(error){if(version===detailVersion)$('#project-detail').innerHTML=`<h2>Projet indisponible</h2><p class="error-inline">${esc(error.message)}</p>`;}
}
function renderGraph(graph) {
  const svg=$('#skill-graph'); svg.replaceChildren();svg.setAttribute('viewBox','0 0 850 510');let zoom=1;const zoomGraph=(factor)=>{zoom=Math.max(1,Math.min(3,zoom*factor));const w=850/zoom,h=510/zoom;svg.setAttribute('viewBox',`${425-w/2} ${255-h/2} ${w} ${h}`);};$('#graph-zoom-in').onclick=()=>zoomGraph(1.3);$('#graph-zoom-out').onclick=()=>zoomGraph(1/1.3);if(!graph?.nodes?.length){svg.innerHTML='<text x="425" y="250" text-anchor="middle" fill="#999">Aucun graphe disponible.</text>';return;}
  const NS='http://www.w3.org/2000/svg', make=(tag,attrs={})=>{const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;};
  const groups={Candidat:[],Projet:[],Competence:[],Domaine:[]};graph.nodes.forEach(n=>(groups[n.type] ||= []).push(n));
  const positions=new Map();for(const [type,nodes]of Object.entries(groups)){const radii={Candidat:0,Projet:115,Competence:190,Domaine:248};nodes.forEach((n,i)=>{const angle=2*Math.PI*i/Math.max(1,nodes.length)+(type==='Projet'?.6:type==='Domaine'?.2:0);const radius=radii[type] ?? 210;positions.set(n.id,{...n,x:425+Math.cos(angle)*radius*(type==='Domaine'?1.36:1.22),y:255+Math.sin(angle)*radius*.82});});}
  const edges=make('g'),circles=make('g');svg.append(edges,circles);const nodeEls=new Map(),lineEls=[];
  for(const link of graph.links || []){const a=positions.get(link.source),b=positions.get(link.target);if(!a||!b)continue;const line=make('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'graph-edge'});edges.append(line);lineEls.push({line,link});}
  function selected(id){const n=positions.get(id);if(!n)return;const connected=new Set([id]);for(const {link}of lineEls){if(link.source===id)connected.add(link.target);if(link.target===id)connected.add(link.source);}for(const[key,el]of nodeEls)el.style.opacity=connected.has(key)?1:.16;lineEls.forEach(({line,link})=>{const active=link.source===id||link.target===id;line.style.opacity=active?1:.1;line.classList.toggle('selected',active);});$('#node-title').textContent=n.label;$('#node-description').textContent=`${n.type} · ${connected.size-1} connexion${connected.size>2?'s':''}. ${state.mode==='local'?'Relations reconstituées à partir du CV.':'Relations chargées depuis Neo4j.'}`;$('#node-links').innerHTML=[...connected].filter(x=>x!==id).map(x=>`<span class="tag">${esc(positions.get(x)?.label)}</span>`).join('');if(n.type==='Competence')$('#node-links').insertAdjacentHTML('beforeend',`<button class="text-button" data-skill="${esc(id.slice(id.indexOf(':')+1))}">Voir les projets associés</button>`);}
  for(const n of positions.values()){const el=make('g',{class:'graph-node',tabindex:'0',role:'button','aria-label':`${n.type} : ${n.label}`,transform:`translate(${n.x},${n.y})`});const colors={Candidat:'#111',Projet:'#c2bba9',Competence:'#929c83',Domaine:'#d7d7d0'},r={Candidat:29,Projet:15,Competence:9,Domaine:7};el.append(make('circle',{r:Math.max(24,r[n.type] || 9),style:'fill:transparent;stroke:none;pointer-events:all'}));el.append(make('circle',{r:r[n.type] || 9,fill:colors[n.type]||'#aaa'}));const label=make('text',{y:n.type==='Candidat'?5:-(r[n.type]||9)-8,'text-anchor':'middle',class:n.type==='Candidat'?'node-initials':''});label.textContent=n.type==='Candidat'?(state.profile?.prenom?.[0]||'X')+(state.profile?.nom?.[0]||'Z'):n.label.length>21?n.label.slice(0,19)+'…':n.label;el.append(label);el.addEventListener('click',()=>selected(n.id));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selected(n.id);}});el.addEventListener('pointerdown',e=>{el.setPointerCapture(e.pointerId);});el.addEventListener('pointermove',e=>{if(!el.hasPointerCapture(e.pointerId))return;const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const at=pt.matrixTransform(svg.getScreenCTM().inverse());n.x=Math.max(25,Math.min(825,at.x));n.y=Math.max(30,Math.min(480,at.y));el.setAttribute('transform',`translate(${n.x},${n.y})`);lineEls.forEach(({line,link})=>{if(link.source===n.id){line.setAttribute('x1',n.x);line.setAttribute('y1',n.y);}if(link.target===n.id){line.setAttribute('x2',n.x);line.setAttribute('y2',n.y);}});});circles.append(el);nodeEls.set(n.id,el);}
  $('#reset-graph').onclick=()=>{renderGraph(graph);$('#node-title').textContent='Tout est connecté.';$('#node-description').textContent='Sélectionnez un nœud pour explorer les liens avec vos projets.';$('#node-links').replaceChildren();};
}
async function load() {
  const version=++loadVersion;++requestVersion;state.projects=[];state.page=1;state.domain='';state.skill='';state.search='';$('#project-search').value='';$('#connection-banner').textContent='Chargement du portfolio…';
  try {const c=await api(`/candidats/${encodeURIComponent(state.slug)}`);if(version!==loadVersion)return;state.profile=c;
    const results=await Promise.allSettled([api(`/graph/competences/${encodeURIComponent(state.slug)}`),api(`/candidats/${encodeURIComponent(state.slug)}/stats`)]);if(version!==loadVersion)return;
    state.graph=results[0].status==='fulfilled'?results[0].value:null;state.stats=results[1].status==='fulfilled'?results[1].value:null;
    await loadProjects();if(version!==loadVersion)return;renderProfile();renderGraph(state.graph);
    const warnings=results.filter(r=>r.status==='rejected').length;
    $('#mode-label').textContent=state.mode==='local'?'CONTENU DU CV':'API D’ÉQUIPE';$('#connection-banner').innerHTML=state.mode==='local'?'Profil issu de mon CV · Le graphe est reconstitué localement. <button id="connect-inline">Connecter l’API d’équipe</button>':`Connecté à l’API d’équipe · ${esc(c.prenom)} ${esc(c.nom)}${state.slug===(config.exampleSlug || 'lea-bernard')?' · PROFIL D’EXEMPLE':''}${warnings?' · Certaines données du graphe ou des statistiques sont indisponibles.':''} <button id="connect-inline">Configurer</button>`;
  }catch(error){if(version!==loadVersion)return;
    if(state.mode==='api'){
      const requested=state.slug;state.mode='local';state.slug=idOf(localData.candidat);const fallbackVersion=loadVersion+1;await load();if(loadVersion!==fallbackVersion)return;
      const message=error.status===404?`Le profil « ${requested} » n’est pas encore présent dans l’API. Votre CV local est affiché ; le graphe est calculé localement.`:`API indisponible (${error.message}). Votre CV local est affiché ; aucune donnée de base n’est simulée comme une réponse API.`;
      $('#connection-banner').innerHTML=`${esc(message)} <button id="retry-api" data-slug="${esc(requested)}">Réessayer l’API</button><button id="sample-api">Tester le profil d’exemple de l’équipe</button><button id="connect-inline">Configurer</button>`;
      return;
    }
    $('#connection-banner').textContent=`Impossible de charger le CV : ${error.message}`;
  }
}
function settings() {$('#api-url').value=state.base;$('#candidate-slug').value=state.slug;$('#settings-dialog').showModal();}
document.addEventListener('click',e=>{const project=e.target.closest('[data-project]');if(project){openProject(project.dataset.project);return;}const skill=e.target.closest('[data-skill]');if(skill){selectSkill(skill.dataset.skill);return;}if(e.target.closest('#connect-inline'))settings();if(e.target.closest('#fallback-local')){state.mode='local';state.slug=idOf(localData.candidat);persist();load();}if(e.target.closest('#sample-api, [data-example-api]')){state.mode='api';state.slug=config.exampleSlug || 'lea-bernard';persist();$('#settings-dialog').close();load();}const retry=e.target.closest('#retry-api');if(retry){state.mode='api';state.slug=retry.dataset.slug;persist();load();}const close=e.target.closest('[data-close]');if(close)close.closest('dialog').close();});
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('#settings-button').onclick=settings;
$('#settings-form').onsubmit=e=>{e.preventDefault();const url=safeUrl($('#api-url').value);if(!url){toast('Adresse HTTP(S) invalide.');return;}state.base=url.replace(/\/$/,'');state.slug=$('#candidate-slug').value.trim();state.mode='api';persist();$('#settings-dialog').close();load();};
$('#local-button').onclick=()=>{state.mode='local';state.slug=idOf(localData.candidat);persist();$('#settings-dialog').close();load();};
$('#project-search').oninput=e=>{state.search=e.target.value.toLowerCase().trim();renderProjects();};
$('#domain-filter').onchange=e=>{state.domain=e.target.value;state.page=1;loadProjects();};
$('#clear-filter').onclick=()=>{state.domain='';state.skill='';state.search='';state.page=1;$('#domain-filter').value='';$('#project-search').value='';document.querySelectorAll('[data-skill]').forEach(b=>b.classList.remove('active'));loadProjects();};
$('#load-more').onclick=()=>{state.page++;loadProjects(true);};
document.querySelectorAll('[data-timeline]').forEach(b=>b.onclick=()=>{state.timeline=b.dataset.timeline;document.querySelectorAll('[data-timeline]').forEach(x=>x.classList.toggle('active',x===b));renderTimeline();});
let dark=localStorage.getItem('xucan-theme')==='dark';function theme(){document.documentElement.dataset.theme=dark?'dark':'light';$('#theme-button').textContent=dark?'☀':'☾';$('#theme-button').setAttribute('aria-label',dark?'Activer le mode jour':'Activer le mode nuit');}theme();$('#theme-button').onclick=()=>{dark=!dark;theme();localStorage.setItem('xucan-theme',dark?'dark':'light');};
if(!matchMedia('(prefers-reduced-motion: reduce)').matches){document.body.classList.add('js-motion');const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}}),{threshold:.07});document.querySelectorAll('.reveal').forEach(e=>observer.observe(e));}
const navObserver=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){const id=e.target.id==='home'?'about':e.target.id;document.querySelectorAll('.dock a').forEach(a=>a.classList.toggle('active',a.hash===`#${id}`));}},{rootMargin:'-15% 0px -55% 0px'});document.querySelectorAll('main>section[id]').forEach(e=>navObserver.observe(e));
if(matchMedia('(hover:hover) and (pointer:fine)').matches&&!matchMedia('(prefers-reduced-motion:reduce)').matches){let frame=0;document.addEventListener('pointermove',e=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{document.documentElement.style.setProperty('--pointer-x',String(e.clientX/innerWidth*2-1));document.documentElement.style.setProperty('--pointer-y',String(e.clientY/innerHeight*2-1));});},{passive:true});}
document.querySelectorAll('.faq-list details').forEach(item=>item.addEventListener('toggle',()=>{if(item.open)document.querySelectorAll('.faq-list details').forEach(other=>{if(other!==item)other.open=false;});}));
try {localData=await fetchJson('cv-data.json');await load();}catch(error){$('#connection-banner').textContent=`Impossible de charger les données du CV : ${error.message}. Lancez le site avec python serve.py.`;}
