"use client";

import { routes } from "@/lib/routes";

export const ProviderSidebarData = [
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
                label: "Bookings",
                link: routes.appointments,
                submenu: false,
                icon: "stethoscope",
                base: "bookings",
                submenuItems: [],
            },
            {
                label: "Consultations",
                link: routes.consultations,
                submenu: false,
                icon: "report-medical",
                base: "consultations",
                submenuItems: [],
            },
            {
                label: "Procedures",
                link: routes.procedures,
                submenu: false,
                icon: "user-circle",
                base: "procedures",
                submenuItems: [],
            },
            {
                label: "Billing",
                link: routes.billing,
                submenu: false,
                icon: "coin",
                base: "billing",
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
