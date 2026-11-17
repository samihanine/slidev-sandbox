import {
  FileDownIcon,
  FolderOpenIcon,
  FolderXIcon,
  KeyRoundIcon,
  Loader2Icon,
  type LucideIcon,
  MonitorXIcon,
  PresentationIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { isSupported } from "@/lib/files";

function Screen({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 overflow-y-auto p-8 text-center">
      <div className="from-brand shadow-brand/25 grid size-14 place-items-center rounded-2xl bg-linear-to-b to-[oklch(0.55_0.2_290)] text-white shadow-lg">
        <Icon className="size-7" />
      </div>
      <h1 className="max-w-lg text-2xl font-semibold tracking-tight text-balance">{title}</h1>
      {children}
    </div>
  );
}

const POINTS = [
  {
    icon: SparklesIcon,
    title: "Markdown, rendu soigné",
    text: "Thèmes, mises en page, graphiques, diagrammes avec icônes et logos, écrits en quelques lignes.",
  },
  {
    icon: FileDownIcon,
    title: "PowerPoint et PDF",
    text: "Export PPTX au texte modifiable et aux graphiques natifs, ou PDF prêt à envoyer.",
  },
  {
    icon: ShieldCheckIcon,
    title: "100 % local",
    text: "Les fichiers restent dans votre dossier. Aucun compte, aucun serveur, rien n'est envoyé.",
  },
];

export function Welcome({ onOpen }: { onOpen: () => void }) {
  if (!isSupported())
    return (
      <Screen icon={MonitorXIcon} title="Ce navigateur ne peut pas ouvrir un dossier">
        <p className="text-muted-foreground max-w-md">
          L'application lit et écrit vos fichiers markdown grâce à l'API « File System Access », disponible dans Chrome,
          Edge et les navigateurs basés sur Chromium, sur ordinateur.
        </p>
      </Screen>
    );

  return (
    <Screen icon={PresentationIcon} title="Écrivez vos présentations en markdown, exportez-les en PowerPoint">
      <p className="text-muted-foreground max-w-md">
        Choisissez un dossier de travail : il contient vos présentations (fichiers <code>.md</code>) et leurs images.
        L'application y lit et y écrit directement, et s'en souvient pour la prochaine fois.
      </p>
      <Button onClick={onOpen}>
        <FolderOpenIcon /> Choisir un dossier de travail
      </Button>
      <div className="mt-6 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
        {POINTS.map((point) => (
          <div key={point.title} className="rounded-xl border p-4">
            <point.icon className="text-brand mb-3 size-4" />
            <p className="font-medium">{point.title}</p>
            <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">{point.text}</p>
          </div>
        ))}
      </div>
    </Screen>
  );
}

export function Loading() {
  return (
    <div className="text-muted-foreground flex h-full items-center justify-center gap-2">
      <Loader2Icon className="size-4 animate-spin" /> Ouverture du dossier…
    </div>
  );
}

export function NeedsPermission({ name, onGrant }: { name: string; onGrant: () => void }) {
  return (
    <Screen icon={KeyRoundIcon} title={`Autoriser l'accès au dossier « ${name} »`}>
      <p className="text-muted-foreground max-w-md">
        Par sécurité, le navigateur redemande votre accord avant de rouvrir un dossier. Choisissez « Autoriser à chaque
        visite » pour ne plus voir cette étape.
      </p>
      <Button onClick={onGrant}>
        <KeyRoundIcon /> Autoriser la lecture et l'écriture
      </Button>
    </Screen>
  );
}

export function Missing({ name, onOpen, onRemove }: { name: string; onOpen: () => void; onRemove: () => void }) {
  return (
    <Screen icon={FolderXIcon} title={`Le dossier « ${name} » est introuvable`}>
      <p className="text-muted-foreground max-w-md">
        Il a peut-être été déplacé, renommé ou supprimé. Sélectionnez-le à nouveau.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={onOpen}>
          <FolderOpenIcon /> Retrouver le dossier
        </Button>
        <Button variant="outline" onClick={onRemove}>
          Retirer de la liste
        </Button>
      </div>
    </Screen>
  );
}

export function NoDeck({ onCreate }: { onCreate: () => void }) {
  return (
    <Screen icon={PresentationIcon} title="Aucune présentation dans ce dossier">
      <p className="text-muted-foreground max-w-md">
        Une nouvelle présentation part d'un modèle complet : thème, couverture avec logo, chiffres clés, graphiques,
        diagramme d'architecture, cartes et logos. Il ne reste qu'à remplacer le contenu.
      </p>
      <Button onClick={onCreate}>
        <PresentationIcon /> Créer une présentation
      </Button>
    </Screen>
  );
}
