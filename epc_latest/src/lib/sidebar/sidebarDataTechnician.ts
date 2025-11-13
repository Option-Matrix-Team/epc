"use client";

import { routes } from "@/lib/routes";

export const TechnicianSidebarData = [
    {
        icon: "airplay",
        showAsTab: true,
        separateRoute: false,
        submenuItems: [
            {
                label: "Dashboard",
                link: routes.dashboard,
                submenu: false,
                icon: "layout-dashboard",
                base: "dashboard",
                submenuItems: [],
            },
            {
                label: "Availability",
                link: routes.availability,
                submenu: false,
                icon: "calendar-event",
                base: "availability",
                submenuItems: [],
            },
            {
                label: "Allocation",
                link: routes.technicians,
                submenu: false,
                icon: "directions",
                base: "allocation",
                submenuItems: [],
            },
            {
                label: "Messaging",
                link: routes.chat,
                submenu: false,
                icon: "message-dots",
                base: "chat",
                submenuItems: [],
            },
        ],
    },
];
