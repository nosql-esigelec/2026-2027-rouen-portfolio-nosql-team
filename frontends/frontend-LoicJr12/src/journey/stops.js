// Les escales du voyage (= sections de la page) et ce que dit le robot guide à chacune.
export const GUIDE_NAME = 'Nova'

export const STOPS = [
  {
    id: 'accueil',
    label: 'Décollage',
    color: 'var(--lime)',
    lines: [
      `Salut ! Moi c'est ${GUIDE_NAME}, ton guide dans l'univers de Loïc.`,
      ({ candidat }) => (candidat ? `Loïc est ${candidat.titre}. Embarque, je te fais la visite !` : null),
      'Fais défiler la page pour décoller : chaque escale révèle une partie de son parcours.',
      "Astuce : clique sur moi quand tu veux, j'ai toujours quelque chose à dire.",
    ],
  },
  {
    id: 'parcours',
    label: 'Parcours',
    color: 'var(--cyan)',
    lines: [
      'Première escale : le parcours de Loïc.',
      ({ recente }) =>
        recente ? `Sa dernière mission : ${recente.poste} chez ${recente.entreprise}. Elle est épinglée juste là.` : null,
      ({ chiffres }) =>
        chiffres?.experiences != null
          ? `${chiffres.experiences} expériences et ${chiffres.formations} formations en orbite. Utilise les filtres pour trier.`
          : 'Ses expériences et formations gravitent ici, de la plus récente à la plus ancienne.',
      'Passe ta souris sur une carte : elle réagit en 3D.',
    ],
  },
  {
    id: 'competences',
    label: 'Compétences',
    color: 'var(--violet)',
    lines: [
      'Bienvenue dans la constellation des compétences !',
      ({ graph }) =>
        graph
          ? `${graph.nodes.filter((n) => n.type === 'Competence').length} étoiles-compétences, reliées à ses projets et à leurs domaines. Clique sur un astre pour voir sa fiche.`
          : 'Chaque étoile est une techno, reliée aux projets où Loïc l’a utilisée.',
      ({ stats }) => {
        const top = stats?.statistiques?.reduce((a, b) => (b.nombre_projets > (a?.nombre_projets ?? 0) ? b : a), null)
        return top ? `Sa compétence la plus utilisée ? ${top.nom}, dans ${top.nombre_projets} projets sur ${stats.total_projets}.` : null
      },
      'Astuce : clique sur une barre des statistiques, je te montre où est la compétence dans la constellation.',
    ],
  },
  {
    id: 'projets',
    label: 'Projets',
    color: 'var(--pink)',
    lines: [
      'Voici les planètes-projets !',
      'Filtre-les par compétence ou par domaine pour trouver ce qui t’intéresse.',
    ],
  },
  {
    id: 'contact',
    label: 'Contact',
    color: 'var(--gold)',
    lines: [
      'Fin du voyage… pour l’instant !',
      'Envie de travailler avec Loïc ? Ses liens sont juste ici.',
    ],
  },
]
