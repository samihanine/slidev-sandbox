import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/** Asks for a name: the title of a new presentation, or the new name of a file. */
export function NameDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  initial,
  submit,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  label: string;
  initial: string;
  submit: string;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    if (open) setValue(initial);
  }, [open, initial]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!value.trim()) return;
            onSubmit(value.trim());
            onOpenChange(false);
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-2">
            <label htmlFor="name-dialog-input" className="text-sm font-medium">
              {label}
            </label>
            <Input
              id="name-dialog-input"
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onFocus={(event) => event.target.select()}
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!value.trim()}>
              {submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const HELP: { title: string; code: string; text: string }[] = [
  {
    title: "Slides",
    code: "---",
    text: "Une ligne « --- » sépare deux slides. Le premier titre (# ou ##) devient le titre de la slide.",
  },
  {
    title: "En-tête du fichier",
    code: "---\ntheme: aurora\ntitle: Mon titre\nlogo: assets/logo.svg\nfooter: Acme · 2026\nimage: assets/hero.svg\nnumbers: true\n---",
    text: "Thèmes : aurora, paper, sunset, forest. Le logo s'affiche sur chaque slide, l'image sur la couverture.",
  },
  {
    title: "Mise en page d'une slide",
    code: "---\nlayout: two-cols\n---",
    text: "cover, default, section, center, two-cols (avec ::right::), image-right, image-left (avec image:), quote, end.",
  },
  {
    title: "Graphique",
    code: "```chart\ntype: bar\nlabels: [A, B, C]\nseries:\n  - name: 2026\n    data: [3, 5, 8]\n```",
    text: "Types : bar, hbar, line, area, pie, donut. Options : unit, stacked, legend. Exporté en graphique PowerPoint modifiable.",
  },
  {
    title: "Diagramme",
    code: "```diagram\ndirection: LR\nnodes:\n  - id: api\n    label: API\n    sub: Node.js\n    icon: logo:nodedotjs\nedges:\n  - web -> api: HTTPS\n  - api ..> db\n```",
    text: "direction LR ou TB, « ..> » pour une flèche en pointillés, « flow: a -> b -> c » pour un processus.",
  },
  {
    title: "Chiffres clés, cartes, logos",
    code: "```stats\n- value: 98 %\n  label: Satisfaction\n  icon: smile\n  trend: +4 pts\n```",
    text: "Aussi ```cards (title, text, icon) et ```logos (icon, label). La couleur se choisit avec color: 1 à 6 ou #hex.",
  },
  {
    title: "Icônes et logos",
    code: "icon: rocket\nicon: logo:github\nicon: assets/mon-logo.png",
    text: "Toutes les icônes Lucide (lucide.dev), les logos de marque courants (github, figma, notion, stripe, react…) ou une image du dossier.",
  },
  {
    title: "Images et notes",
    code: "![Schéma](assets/schema.png)\n\n<!-- Note pour l'orateur -->",
    text: "Glissez une image dans l'éditeur pour la copier dans assets/. Les commentaires deviennent des notes de l'orateur.",
  },
];

export function HelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Syntaxe des présentations</DialogTitle>
          <DialogDescription>Du markdown classique, plus quelques blocs pour les visuels.</DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-4 sm:grid-cols-2">
          {HELP.map((item) => (
            <div key={item.title} className="space-y-2 rounded-xl border p-4">
              <p className="font-medium">{item.title}</p>
              <pre className="bg-muted overflow-x-auto rounded-lg p-3 font-mono text-[12px] leading-relaxed">
                {item.code}
              </pre>
              <p className="text-muted-foreground text-[13px] leading-relaxed">{item.text}</p>
            </div>
          ))}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
