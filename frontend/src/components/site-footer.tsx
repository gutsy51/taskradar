import { Separator } from "@/components/ui/separator";

export function SiteFooter() {
  return (
    <footer className="shrink-0 border-t px-6 py-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">TaskRadar</span>
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-3"
          />
          <span>Агрегатор фриланс-заданий</span>
        </div>
        <span>© 2025 MoglaVOS · gutsy51</span>
      </div>
    </footer>
  );
}
