// sidebarDataProvider.ts (or similar file name)
"use client";
import { all_routes } from "@/routes/all_routes";
const routes = all_routes;

export const ProviderSidebarData = [
    {

        icon: "airplay",
        showAsTab: true,
        separateRoute: false,
        submenuItems: [
            {
                label: "Dashboard",
                link: routes.dashboard, // Reuse main dashboard or create a specific patient one
                submenu: false,
                icon: "layout-dashboard",
                base: "dashboard",
                submenuItems: [],
            },
            {
                label: "Availability",
                link: "#",
                submenu: false,
                icon: "calendar-event",
                base: "availability",
                submenuItems: [

                ],
            },
            {
                label: "Bookings",
                link: "#",
                submenu: false,
                icon: "stethoscope",
                base: "bookings",
                submenuItems: [],
            },
            {
                label: "Consultations",
                link: "#",
                submenu: false,
                icon: "report-medical",
                base: "consultations",
                submenuItems: [],
            },

            {
                label: "Procedures", // Includes MRN info
                link: "#",
                submenu: false,
                icon: "user-circle",
                base: "procedures",
                submenuItems: [],
            },
            {
                label: "Billing", // Includes MRN info
                link: "#",
                submenu: false,
                icon: "user-circle",
                base: "billing",
                submenuItems: [],
            }, ,

            {
                label: "Messaging",
                link: routes.chat, // Existing route
                submenu: false,
                icon: "message-dots",
                base: "chat",
                submenuItems: [],
            },
        ],
    },
];