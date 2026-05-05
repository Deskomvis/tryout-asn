import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

type Crumb = { label: string; to?: string };

export const PageHeader = ({
  title,
  breadcrumbs = [],
  actions,
}: {
  title: string;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
}) => (
  <div className="mb-6">
    {breadcrumbs.length > 0 && (
      <nav aria-label="breadcrumb" className="mb-2 flex items-center gap-1 text-sm text-muted-foreground">
        {breadcrumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
            {c.to ? (
              <Link to={c.to} className="hover:text-primary">{c.label}</Link>
            ) : (
              <span>{c.label}</span>
            )}
          </span>
        ))}
      </nav>
    )}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-foreground md:text-3xl">{title}</h1>
      {actions}
    </div>
  </div>
);
