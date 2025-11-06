// sidebarDataNurse.ts (or similar file name)
"use client";
import { all_routes } from "@/routes/all_routes";
const routes = all_routes;

export const NurseSidebarData = [
    {

        icon: "airplay",
        showAsTab: true,
        separateRoute: false,
        submenuItems: [
            {
                label: "Dashboard", // Added a dashboard link
                link: routes.dashboard,
                submenu: false,
                icon: "layout-dashboard",
                base: "dashboard",
                submenuItems: [],
            },
            {
                label: "Availability", // Focused on Home Health Care
                link: "#",
                submenu: false,
                icon: "calendar-event",
                base: "availability",
                submenuItems: [

                ],
            },
            {
                label: "Allocation",
                link: "#",
                submenu: false,
                icon: "directions", // Example icon
                base: "allocation",
                submenuItems: [],
            },
            {
                label: "Messaging",
                link: "#",
                submenu: false,
                icon: "message-dots",
                base: "chat",
                submenuItems: [],
            },
        ],
    },
];