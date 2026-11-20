// Les escales du voyage (= sections de la page) et ce que dit le robot guide à chacune.
export const GUIDE_NAME = 'Nova'

export const STOPS = [
  {
    id: 'accueil',
    label: 'Décollage',
    color: 'var(--lime)',
    lines: [
      `Salut ! Moi c'est ${GUIDE_NAME}, ton guide dans l'univers de Loïc.`,
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
      'Ses expériences et formations gravitent ici, de la plus récente à la plus ancienne.',
    ],
  },
  {
    id: 'competences',
    label: 'Compétences',
    color: 'var(--violet)',
    lines: [
      'Bienvenue dans la constellation des compétences.',
      'Chaque étoile est une techno, reliée aux projets où Loïc l’a utilisée.',
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
