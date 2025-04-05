import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

type SidebarNavItem = {
  href: string;
  icon: string;
  label: string;
  roles?: string[]; // Funções de usuário permitidas para ver este item
};

const mainNavItems: SidebarNavItem[] = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { href: "/clients", icon: "people", label: "Clientes" },
  { href: "/proposals", icon: "description", label: "Propostas" },
  { href: "/forms", icon: "dynamic_form", label: "Formulários" },
  { 
    href: "/users", 
    icon: "manage_accounts", 
    label: "Usuários",
    roles: ["superadmin", "manager"] // Apenas admins e gestores podem ver
  },
  { 
    href: "/organizations", 
    icon: "business", 
    label: "Empresas",
    roles: ["superadmin"] // Apenas superadmin pode ver
  },
];

const quickFilterItems: SidebarNavItem[] = [
  { href: "/proposals?filter=highest", icon: "trending_up", label: "Maiores Propostas" },
  { href: "/proposals?filter=recent", icon: "schedule", label: "Recentes" },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [expanded, setExpanded] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Carregar o usuário atual do localStorage
  useEffect(() => {
    const userString = localStorage.getItem("user");
    if (userString) {
      try {
        const user = JSON.parse(userString);
        setCurrentUser(user);
      } catch (e) {
        console.error("Erro ao carregar dados do usuário:", e);
      }
    }
  }, []);

  // Filtrar os itens de menu com base nas permissões do usuário
  const filteredNavItems = mainNavItems.filter(item => {
    // Se o item não tem restrições de função, mostrar para todos
    if (!item.roles) return true;
    // Se usuário não está carregado, não mostrar itens com restrição
    if (!currentUser) return false;
    // Verificar se a função do usuário está na lista de funções permitidas
    return item.roles.includes(currentUser.role);
  });

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
            {filteredNavItems.map((item) => (
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
