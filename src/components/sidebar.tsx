import {
  CheckIcon,
  ChevronsUpDownIcon,
  CopyIcon,
  EllipsisIcon,
  FolderIcon,
  FolderOpenIcon,
  PencilIcon,
  PlusIcon,
  PresentationIcon,
  RotateCwIcon,
  Trash2Icon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DeckFile } from "@/lib/files";
import type { FolderEntry } from "@/lib/use-folder";
import { cn } from "@/lib/utils";

type FolderSwitcherProps = {
  folders: FolderEntry[];
  activeId: string | undefined;
  onSelect: (id: string) => void;
  onOpen: () => void;
  onRemove: (id: string) => void;
};

/** The select listing every known working folder, with the actions to add or forget one. */
export function FolderSwitcher({ folders, activeId, onSelect, onOpen, onRemove }: FolderSwitcherProps) {
  const active = folders.find((folder) => folder.id === activeId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Dossier de travail"
        className="bg-background hover:bg-muted/50 aria-expanded:bg-muted/50 focus-visible:ring-ring/50 flex h-11 w-full items-center gap-2.5 rounded-xl border px-3 text-left shadow-xs transition-colors outline-none focus-visible:ring-3"
      >
        <FolderIcon className="text-brand size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate font-medium">{active?.name ?? "Choisir un dossier"}</span>
        <ChevronsUpDownIcon className="text-muted-foreground size-4 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-(--anchor-width) min-w-64">
        <DropdownMenuLabel>Dossiers de travail</DropdownMenuLabel>
        {folders.map((folder) => (
          <DropdownMenuItem key={folder.id} onClick={() => onSelect(folder.id)}>
            <FolderIcon />
            <span className="min-w-0 flex-1 truncate">{folder.name}</span>
            {folder.id === activeId && <CheckIcon />}
          </DropdownMenuItem>
        ))}
        {folders.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem onClick={onOpen}>
          <FolderOpenIcon /> Ouvrir un dossier…
        </DropdownMenuItem>
        {active && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onRemove(active.id)}>
              <Trash2Icon /> Retirer « {active.name} » de la liste
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DeckItem({
  deck,
  active,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
}: {
  deck: DeckFile;
  active: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onOpen}
        aria-current={active ? "true" : undefined}
        title={deck.name}
        className={cn(
          "text-foreground/70 hover:bg-muted/70 hover:text-foreground focus-visible:ring-ring/50 flex h-9 w-full items-center gap-2.5 rounded-lg pr-9 pl-2.5 text-left transition-colors outline-none focus-visible:ring-3",
          active && "bg-muted text-foreground font-medium",
        )}
      >
        <PresentationIcon className={cn("size-4 shrink-0", active && "text-brand")} />
        <span className="min-w-0 flex-1 truncate">{deck.name.replace(/\.(md|markdown)$/i, "")}</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions sur ${deck.name}`}
          className="text-muted-foreground hover:bg-background hover:text-foreground aria-expanded:bg-background absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
        >
          <EllipsisIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-44">
          <DropdownMenuItem onClick={onRename}>
            <PencilIcon /> Renommer
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <CopyIcon /> Dupliquer
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2Icon /> Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

type SidebarProps = FolderSwitcherProps & {
  ready: boolean;
  decks: DeckFile[];
  deckName: string | undefined;
  onNewDeck: () => void;
  onOpenDeck: (name: string) => void;
  onRenameDeck: (name: string) => void;
  onDuplicateDeck: (name: string) => void;
  onDeleteDeck: (name: string) => void;
  onRefresh: () => void;
};

export function Sidebar(props: SidebarProps) {
  const { ready, decks, deckName, onNewDeck, onOpenDeck, onRenameDeck, onDuplicateDeck, onDeleteDeck, onRefresh } =
    props;
  return (
    <aside className="flex w-64 shrink-0 flex-col gap-5 overflow-y-auto border-r p-4 max-md:hidden">
      <div className="space-y-2">
        <FolderSwitcher {...props} />
        <button
          type="button"
          disabled={!ready}
          onClick={onNewDeck}
          className="bg-background hover:bg-muted/50 focus-visible:ring-ring/50 flex h-10 w-full items-center gap-2 rounded-xl border px-3 font-medium shadow-xs transition-colors outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50"
        >
          <PlusIcon className="size-4" /> Nouvelle présentation
        </button>
      </div>

      {ready && (
        <div className="space-y-1">
          <div className="flex items-center justify-between pr-1 pb-1 pl-2.5">
            <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">Présentations</p>
            <button
              type="button"
              onClick={onRefresh}
              title="Relire le dossier"
              aria-label="Relire le dossier"
              className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-6 place-items-center rounded-md"
            >
              <RotateCwIcon className="size-3.5" />
            </button>
          </div>
          {decks.map((deck) => (
            <DeckItem
              key={deck.name}
              deck={deck}
              active={deck.name === deckName}
              onOpen={() => onOpenDeck(deck.name)}
              onRename={() => onRenameDeck(deck.name)}
              onDuplicate={() => onDuplicateDeck(deck.name)}
              onDelete={() => onDeleteDeck(deck.name)}
            />
          ))}
          {!decks.length && (
            <p className="text-muted-foreground px-2.5 py-1 text-xs leading-relaxed">
              Aucun fichier markdown dans ce dossier. Créez une présentation : elle part d'un modèle complet.
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
