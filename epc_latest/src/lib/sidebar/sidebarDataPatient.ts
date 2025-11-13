"use client";

import { routes } from "@/lib/routes";

export const PatientSidebarData = [
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
                label: "Bookings",
                link: routes.appointments,
                submenu: false,
                icon: "calendar-event",
                base: "bookings",
                submenuItems: [],
            },
            {
                label: "Consultations",
                link: routes.consultations,
                submenu: false,
                icon: "stethoscope",
                base: "consultations",
                submenuItems: [],
            },
            {
                label: "Procedures",
                link: routes.procedures,
                submenu: false,
                icon: "report-medical",
                base: "procedures",
                submenuItems: [],
            },
            {
                label: "Billing",
                link: routes.billing,
                submenu: false,
                icon: "user-circle",
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
