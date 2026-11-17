# Markdown Slides

Écrit des présentations en markdown et les exporte en **PowerPoint (texte modifiable)** ou en **PDF**.
Tout se passe dans le navigateur, sur un dossier de votre ordinateur. Rien n'est envoyé sur Internet.

Même base technique que [local-csv-viewer](https://github.com/samihanine/local-csv-viewer) :
React + TypeScript + Vite + Tailwind + shadcn/ui (Base UI) + Bun.

## Fonctionnalités

- **Dossier de travail** : au démarrage, choix d'un dossier avec accès en lecture et écriture. Il contient les présentations (`.md`) et leurs images (`assets/`). Plusieurs dossiers mémorisés, changement via le sélecteur.
- **Présentations** : création (à partir d'un modèle complet), ouverture, renommage, duplication, suppression (annulable). Enregistrement automatique ; Ctrl+S enregistre tout de suite. Un fichier modifié par un autre programme est relu au retour sur l'onglet.
- **Éditeur** markdown (CodeMirror) avec coloration, séparateurs de slides mis en évidence, menu « Insérer » (slides, graphiques, diagrammes, chiffres clés, cartes, logos, tableau) et aide sur la syntaxe. Glisser une image dans l'éditeur la copie dans `assets/` et l'insère.
- **Aperçu** en direct de la slide sous le curseur, et de toutes les slides en vignettes. Trois affichages : écrire, les deux (séparateur réglable), aperçu.
- **Présenter** en plein écran : flèches, espace ou clic pour avancer, Échap pour sortir, N pour les notes de l'orateur.
- **Export PowerPoint** : chaque titre, paragraphe, liste, carte et nœud de diagramme est une zone de texte modifiable ; les graphiques sont des graphiques PowerPoint natifs (données modifiables) ; les tableaux sont des tableaux PowerPoint ; les flèches des diagrammes sont des formes ; les commentaires deviennent des notes de l'orateur. Seul le fond décoratif de la slide est une image.
- **Export PDF** : une page 16:9 par slide, en haute définition.
- **Thèmes** : Aurora et Forest (sombres), Paper et Sunset (clairs), changeables depuis la barre du haut.

## Syntaxe

Proche de [Slidev](https://sli.dev) : `---` sépare les slides, un bloc YAML en tête du fichier règle la présentation.

```md
---

theme: aurora # aurora, paper, sunset, forest
title: Lancement Nova
logo: assets/logo.svg # affiché sur chaque slide
footer: Acme · 2026
image: assets/hero.svg # image de la couverture
---

# Lancement Nova

La plateforme qui transforme vos données en **décisions**.

<!-- Notes de l'orateur -->

---

## layout: two-cols

# Titre

- Colonne de gauche

::right::

![Schéma](assets/schema.png)
```

Mises en page (`layout:`) : `cover`, `default`, `section`, `center`, `two-cols`, `image-right`, `image-left` (avec `image:`), `quote`, `end`.

Blocs visuels (blocs de code avec un langage particulier, contenu en YAML) :

| Bloc      | Contenu                                                                                                                                |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `chart`   | `type` (bar, hbar, line, area, pie, donut), `labels`, `series` (ou `data`), `unit`, `stacked`, `legend`                                |
| `diagram` | `nodes` (id, label, sub, icon, color), `edges` (`a -> b: libellé`, `a ..> b` en pointillés), `flow: a -> b -> c`, `direction` (LR, TB) |
| `stats`   | liste de `value`, `label`, `icon`, `trend`                                                                                             |
| `cards`   | liste de `title`, `text`, `icon`                                                                                                       |
| `logos`   | liste de `icon`, `label`                                                                                                               |

Icônes : toute icône [Lucide](https://lucide.dev) (`rocket`, `shield-check`…), un logo de marque courant
(`logo:github`, `logo:figma`, `logo:stripe`, `logo:react`… via Simple Icons) ou une image du dossier (`assets/x.png`).

Le texte trop long pour une slide est réduit automatiquement (jusqu'à 60 %).

## Polices

L'aperçu utilise Inter, Space Grotesk et JetBrains Mono, inclus dans l'application. Le PowerPoint les nomme aussi :
installez-les (Google Fonts) pour un rendu identique, sinon PowerPoint les remplace par une police proche.

## Où sont stockées les données

| Donnée                               | Emplacement                                                           |
| ------------------------------------ | --------------------------------------------------------------------- |
| Présentations et images              | Le dossier de travail, sur le disque                                  |
| Liste des dossiers, affichage, thème | `localStorage`                                                        |
| Accès aux dossiers (handles)         | IndexedDB : le navigateur ne permet pas de les mettre en localStorage |

Navigateur requis : Chrome, Edge ou un autre navigateur Chromium sur ordinateur (API File System Access).

## Commandes

| Commande              | Effet                                                        |
| --------------------- | ------------------------------------------------------------ |
| `bun install`         | Installe les dépendances                                     |
| `bun dev`             | Serveur de développement sur http://localhost:5173           |
| `bun run build:html`  | Construit **un seul fichier** : `dist-html/index.html`       |
| `bun run build`       | Build classique dans `dist/`                                 |
| `bun run format`      | Corrige le style, trie les imports et les classes Tailwind   |
| `bun run check`       | Typage + lint + tests + build, à lancer avant de partager    |
| `bun run audit`       | Liste les dépendances ayant une vulnérabilité connue         |
| `bun run deps:update` | Met à jour les dépendances, annule si une vérification casse |

## Structure

```
src/
  app.tsx                 Mise en page, barre du haut, éditeur et aperçu
  slides.css              Styles des slides (1280 × 720 px)
  components/
    slide/                Rendu d'une slide : mises en page, blocs, graphiques, diagrammes, cartes
    editor.tsx            Éditeur markdown (CodeMirror)
    presenter.tsx         Présentation plein écran
    export-stage.tsx      Slides rendues hors écran pour les exports
    sidebar.tsx           Dossiers et présentations
    dialogs.tsx           Nom d'une présentation, aide sur la syntaxe
    welcome.tsx           Écrans d'accueil, d'autorisation et d'erreur
    ui/                   Composants shadcn/ui
  lib/                    Logique sans interface, testée (*.test.ts)
    deck.ts               Lecture du markdown : slides, frontmatter, blocs, notes
    specs.ts              Blocs chart, diagram, stats, cards, logos
    diagram-layout.ts     Placement des nœuds et tracé des flèches
    themes.ts             Thèmes des slides
    icons.ts, logos.ts    Icônes Lucide et logos de marque
    template.ts           Modèle d'une nouvelle présentation et ses images
    export-pptx.ts        Export PowerPoint (lit la mise en page réelle des slides)
    export-pdf.ts         Export PDF
    files.ts              Accès au dossier de travail
    use-folder.ts         État de l'application, enregistrement automatique, images
```

L'export PowerPoint ne recalcule pas la mise en page : il rend les slides hors écran puis lit la position et le style
calculé de chaque élément marqué `data-x` (texte, liste, forme, image, tableau, graphique, flèches). Le PowerPoint
reproduit donc l'aperçu.

## Sécurité

- La page construite porte une Content-Security-Policy qui bloque toute requête réseau : les fichiers ne peuvent pas sortir de l'ordinateur (seules les adresses `data:` et `blob:` locales sont lisibles, pour les exports).
- Le markdown est rendu en éléments React, jamais en HTML injecté ; seuls les liens `http(s)` et `mailto` sont cliquables.
- Les chemins d'images ne peuvent pas sortir du dossier de travail (`..` refusé).
- L'écriture passe par un fichier temporaire : un fichier n'est remplacé qu'une fois le nouveau contenu complet.
- `bunfig.toml` refuse les paquets publiés depuis moins de 3 jours, `bun.lock` fige les versions, les scripts d'installation des dépendances ne s'exécutent pas.
- Dependabot et la CI (`.github/`) lancent l'audit et les vérifications.

Pour signaler une vulnérabilité, voir `SECURITY.md`.
