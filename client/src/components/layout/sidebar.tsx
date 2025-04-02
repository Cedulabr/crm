import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";

type SidebarNavItem = {
  href: string;
  icon: string;
  label: string;
};

const mainNavItems: SidebarNavItem[] = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { href: "/clients", icon: "people", label: "Clientes" },
  { href: "/proposals", icon: "description", label: "Propostas" },
  { href: "/kanban", icon: "view_kanban", label: "Kanban" },
];

const quickFilterItems: SidebarNavItem[] = [
  { href: "/proposals?filter=highest", icon: "trending_up", label: "Maiores Propostas" },
  { href: "/proposals?filter=recent", icon: "schedule", label: "Recentes" },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [expanded, setExpanded] = useState(true);

  return (
    <aside
      id="sidebar"
      className={cn(
        "bg-white border-r border-neutral-200 h-full flex-shrink-0 transition-all duration-300 shadow-md",
        expanded ? "w-64" : "w-16"
      )}
      data-expanded={expanded}
    >
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-neutral-200">
          <div className="flex items-center space-x-2">
            <span className="material-icons text-primary-dark">assessment</span>
            {expanded && <h1 className="text-xl font-medium text-neutral-500">CRM Sales</h1>}
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {mainNavItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>
                  <a
                    className={cn(
                      "flex items-center px-3 py-2 rounded-lg transition",
                      location === item.href || (item.href === "/dashboard" && location === "/")
                        ? "bg-primary-light bg-opacity-10 text-primary-dark"
                        : "hover:bg-neutral-100 text-neutral-400 hover:text-primary-dark"
                    )}
                  >
                    <span className="material-icons">{item.icon}</span>
                    {expanded && <span className="ml-3">{item.label}</span>}
                  </a>
                </Link>
              </li>
            ))}
          </ul>
          
          {expanded && (
            <div className="mt-8 pt-4 border-t border-neutral-200">
              <h3 className="px-3 text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">
                Filtros Rápidos
              </h3>
              <ul className="space-y-1">
                {quickFilterItems.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>
                      <a className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-primary-dark transition">
                        <span className="material-icons text-sm">{item.icon}</span>
                        <span>{item.label}</span>
                      </a>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>
        
        <div className="p-4 border-t border-neutral-200">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-center w-full text-neutral-400 hover:text-primary-dark"
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            <span className="material-icons" id="toggle-icon">
              {expanded ? "chevron_left" : "chevron_right"}
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
