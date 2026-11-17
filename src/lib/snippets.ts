/** Blocks offered by the « Insérer » menu, written at the cursor. */
export type Snippet = { id: string; label: string; hint: string; text: string };

export const SNIPPETS: Snippet[] = [
  {
    id: "slide",
    label: "Nouvelle slide",
    hint: "Titre et liste",
    text: "\n---\n\n# Titre de la slide\n\n- Premier point\n- Deuxième point\n- Troisième point\n",
  },
  {
    id: "section",
    label: "Slide de section",
    hint: "layout: section",
    text: "\n---\nlayout: section\n---\n\n# Nouvelle partie\n\nSous-titre de la partie\n",
  },
  {
    id: "two-cols",
    label: "Deux colonnes",
    hint: "layout: two-cols",
    text: "\n---\nlayout: two-cols\n---\n\n# Titre\n\nColonne de gauche\n\n::right::\n\nColonne de droite\n",
  },
  {
    id: "image-right",
    label: "Texte et image",
    hint: "layout: image-right",
    text: "\n---\nlayout: image-right\nimage: assets/hero.svg\n---\n\n# Titre\n\n- Un point\n- Un autre point\n",
  },
  {
    id: "bar",
    label: "Graphique en barres",
    hint: "```chart",
    text: '\n```chart\ntype: bar\nunit: k€\nlabels: [T1, T2, T3, T4]\nseries:\n  - name: "2025"\n    data: [120, 150, 170, 210]\n  - name: "2026"\n    data: [140, 190, 230, 280]\n```\n',
  },
  {
    id: "line",
    label: "Courbe",
    hint: "type: line ou area",
    text: "\n```chart\ntype: line\nlabels: [Jan, Fév, Mar, Avr, Mai, Juin]\nseries:\n  - name: Visiteurs\n    data: [320, 410, 380, 520, 610, 700]\n```\n",
  },
  {
    id: "donut",
    label: "Camembert",
    hint: "type: pie ou donut",
    text: '\n```chart\ntype: donut\nunit: "%"\nlabels: [France, Europe, Monde]\ndata: [55, 30, 15]\n```\n',
  },
  {
    id: "diagram",
    label: "Diagramme",
    hint: "Nœuds, icônes et flèches",
    text: "\n```diagram\ndirection: LR\nnodes:\n  - id: app\n    label: Application\n    sub: React\n    icon: logo:react\n  - id: api\n    label: API\n    icon: server\n  - id: db\n    label: Base de données\n    icon: database\nedges:\n  - app -> api: HTTPS\n  - api -> db\n```\n",
  },
  {
    id: "flow",
    label: "Processus",
    hint: "flow: a -> b -> c",
    text: "\n```diagram\nflow: Idée -> Prototype -> Test -> Lancement\n```\n",
  },
  {
    id: "stats",
    label: "Chiffres clés",
    hint: "```stats",
    text: "\n```stats\n- value: 98 %\n  label: Clients satisfaits\n  icon: smile\n  trend: +4 pts\n- value: 2,4 M€\n  label: Revenus\n  icon: trending-up\n- value: 120\n  label: Collaborateurs\n  icon: users\n```\n",
  },
  {
    id: "cards",
    label: "Cartes",
    hint: "```cards",
    text: "\n```cards\n- title: Rapide\n  text: Une phrase qui explique le bénéfice.\n  icon: zap\n- title: Fiable\n  text: Une phrase qui explique le bénéfice.\n  icon: shield-check\n- title: Simple\n  text: Une phrase qui explique le bénéfice.\n  icon: sparkles\n```\n",
  },
  {
    id: "logos",
    label: "Logos",
    hint: "```logos",
    text: "\n```logos\n- icon: logo:github\n  label: GitHub\n- icon: logo:figma\n  label: Figma\n- icon: logo:notion\n  label: Notion\n```\n",
  },
  {
    id: "table",
    label: "Tableau",
    hint: "| a | b |",
    text: "\n| Colonne | Valeur |\n| --- | --- |\n| Ligne 1 | 10 |\n| Ligne 2 | 20 |\n",
  },
];
