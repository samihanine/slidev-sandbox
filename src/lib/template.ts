/** What a new presentation starts with: a full example deck, plus the pictures it uses. */

export const TEMPLATE_ASSETS: Record<string, string> = {
  "assets/logo.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7c9cff"/>
      <stop offset="1" stop-color="#c084fc"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="64" fill="url(#g)"/>
  <path d="M76 180V76l104 104V76" fill="none" stroke="#fff" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`,
  "assets/hero.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7c9cff"/>
      <stop offset="1" stop-color="#c084fc"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7c9cff"/>
      <stop offset="1" stop-color="#5b6cf0"/>
    </linearGradient>
    <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c084fc" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#c084fc" stop-opacity="0"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#0b1020" flood-opacity="0.28"/>
    </filter>
  </defs>
  <circle cx="760" cy="150" r="150" fill="url(#bg)" opacity="0.35"/>
  <circle cx="170" cy="600" r="120" fill="url(#bg)" opacity="0.25"/>
  <g filter="url(#shadow)">
    <rect x="110" y="110" width="700" height="470" rx="32" fill="#ffffff"/>
  </g>
  <rect x="110" y="110" width="700" height="64" rx="32" fill="#f1f4ff"/>
  <rect x="110" y="142" width="700" height="32" fill="#f1f4ff"/>
  <circle cx="150" cy="142" r="9" fill="#ff7a90"/>
  <circle cx="178" cy="142" r="9" fill="#ffc861"/>
  <circle cx="206" cy="142" r="9" fill="#4cd6a0"/>
  <rect x="150" y="210" width="190" height="96" rx="18" fill="#f5f3ff"/>
  <rect x="170" y="232" width="80" height="12" rx="6" fill="#c4b5fd"/>
  <rect x="170" y="258" width="120" height="26" rx="8" fill="#7c3aed"/>
  <rect x="365" y="210" width="190" height="96" rx="18" fill="#eef2ff"/>
  <rect x="385" y="232" width="80" height="12" rx="6" fill="#a5b4fc"/>
  <rect x="385" y="258" width="100" height="26" rx="8" fill="#4f46e5"/>
  <rect x="580" y="210" width="190" height="96" rx="18" fill="#ecfdf5"/>
  <rect x="600" y="232" width="80" height="12" rx="6" fill="#6ee7b7"/>
  <rect x="600" y="258" width="130" height="26" rx="8" fill="#059669"/>
  <rect x="150" y="330" width="400" height="214" rx="18" fill="#f8fafc"/>
  <rect x="180" y="440" width="34" height="80" rx="8" fill="url(#bar)"/>
  <rect x="230" y="400" width="34" height="120" rx="8" fill="url(#bar)"/>
  <rect x="280" y="420" width="34" height="100" rx="8" fill="url(#bar)"/>
  <rect x="330" y="370" width="34" height="150" rx="8" fill="url(#bar)"/>
  <rect x="380" y="390" width="34" height="130" rx="8" fill="url(#bar)"/>
  <rect x="430" y="355" width="34" height="165" rx="8" fill="url(#bar)"/>
  <rect x="480" y="345" width="34" height="175" rx="8" fill="#c084fc"/>
  <rect x="580" y="330" width="190" height="214" rx="18" fill="#f8fafc"/>
  <path d="M600 500 L640 470 L680 482 L720 430 L750 400 L750 524 L600 524 Z" fill="url(#area)"/>
  <path d="M600 500 L640 470 L680 482 L720 430 L750 400" fill="none" stroke="#a855f7" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="750" cy="400" r="9" fill="#ffffff" stroke="#a855f7" stroke-width="5"/>
  <rect x="600" y="350" width="70" height="12" rx="6" fill="#d8b4fe"/>
  <g filter="url(#shadow)">
    <rect x="640" y="520" width="240" height="120" rx="24" fill="#0b1020"/>
  </g>
  <circle cx="694" cy="580" r="26" fill="url(#bg)"/>
  <path d="M682 580 l9 9 l16 -18" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="736" y="560" width="110" height="14" rx="7" fill="#ffffff" opacity="0.9"/>
  <rect x="736" y="586" width="80" height="12" rx="6" fill="#ffffff" opacity="0.45"/>
</svg>
`,
};

export const templateMarkdown = (title: string) => `---
theme: aurora
title: ${title.replace(/\n/g, " ")}
logo: assets/logo.svg
footer: Acme · Novembre 2026
image: assets/hero.svg
---

# ${title}

La plateforme qui transforme vos données en **décisions**.

Équipe Produit · 17 novembre 2026

<!--
Notes de l'orateur : tout commentaire HTML devient une note, exportée dans le PowerPoint.
-->

---
layout: section
---

# Le marché

Pourquoi maintenant, et pour qui

---

# Les chiffres clés

\`\`\`stats
- value: 12 M€
  label: Chiffre d'affaires 2026
  icon: trending-up
  trend: +38 %
- value: 4 200
  label: Clients actifs
  icon: users
  trend: +1 100
- value: 98 %
  label: Satisfaction
  icon: smile
- value: 32
  label: Pays couverts
  icon: globe
\`\`\`

Une croissance portée par les **entreprises de taille intermédiaire**.

---

# Croissance du chiffre d'affaires

\`\`\`chart
type: bar
unit: k€
labels: [T1, T2, T3, T4]
series:
  - name: "2025"
    data: [1200, 1500, 1700, 2100]
  - name: "2026"
    data: [1900, 2400, 3100, 3800]
\`\`\`

---
layout: two-cols
---

# Qui sont nos clients ?

- **PME** : la majorité des comptes
- **ETI** : la plus forte croissance
- **Grands comptes** : contrats pluriannuels
- Secteur public, en test depuis septembre

::right::

\`\`\`chart
type: donut
labels: [PME, ETI, Grands comptes, Public]
data: [46, 31, 17, 6]
unit: "%"
\`\`\`

---

# Architecture de la plateforme

\`\`\`diagram
direction: LR
nodes:
  - id: web
    label: Application web
    sub: React · TypeScript
    icon: logo:react
  - id: api
    label: API
    sub: Node.js
    icon: logo:nodedotjs
  - id: db
    label: Base de données
    sub: PostgreSQL
    icon: logo:postgresql
  - id: cache
    label: Cache
    sub: Redis
    icon: logo:redis
  - id: pay
    label: Paiements
    sub: Stripe
    icon: logo:stripe
edges:
  - web -> api: HTTPS
  - api -> db
  - api -> cache
  - api -> pay
\`\`\`

---

# Ce qui change pour nos clients

\`\`\`cards
- title: Tableaux de bord
  text: Les indicateurs clés en temps réel, partagés avec toute l'équipe.
  icon: layout-dashboard
- title: Alertes intelligentes
  text: Une notification dès qu'un indicateur sort de sa trajectoire.
  icon: bell-ring
- title: Sécurité
  text: Chiffrement de bout en bout et hébergement en Europe.
  icon: shield-check
\`\`\`

---
layout: image-right
image: assets/hero.svg
---

# Une expérience pensée pour tous

- Prise en main en **moins de 10 minutes**
- Rapports exportés en un clic
- Accessible sur ordinateur et mobile

> « Nova nous fait gagner une demi-journée par semaine. »

---

# Utilisateurs actifs

\`\`\`chart
type: area
labels: [Jan, Fév, Mar, Avr, Mai, Juin, Juil, Août, Sep, Oct]
series:
  - name: Utilisateurs actifs (milliers)
    data: [12, 15, 18, 22, 27, 31, 30, 36, 44, 52]
\`\`\`

---

# Feuille de route

| Trimestre | Objectif | Statut |
| --- | --- | --- |
| T1 2027 | Application mobile | En cours |
| T2 2027 | Connecteurs ERP | Planifié |
| T3 2027 | Ouverture en Amérique du Nord | Planifié |
| T4 2027 | Assistant IA intégré | Exploration |

---

# Processus de lancement

\`\`\`diagram
flow: Conception -> Bêta privée -> Bêta publique -> Lancement
nodes:
  - id: Conception
    icon: pencil-ruler
    sub: Juillet
  - id: Bêta privée
    icon: flask-conical
    sub: Septembre
  - id: Bêta publique
    icon: users
    sub: Octobre
  - id: Lancement
    icon: rocket
    sub: Novembre
\`\`\`

---

# Ils s'intègrent avec Nova

\`\`\`logos
- icon: logo:notion
  label: Notion
- icon: logo:github
  label: GitHub
- icon: logo:figma
  label: Figma
- icon: logo:hubspot
  label: HubSpot
- icon: logo:googledrive
  label: Google Drive
- icon: logo:zapier
  label: Zapier
\`\`\`

---
layout: quote
---

> La meilleure façon de prédire l'avenir, c'est de le créer.

Peter Drucker

---
layout: end
---

# Merci !

Des questions ? produit@acme.example
`;
