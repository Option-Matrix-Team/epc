// sidebarDataPatient.ts (or similar file name)
"use client";
import { all_routes } from "@/routes/all_routes";
const routes = all_routes;

export const PatientSidebarData = [
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
                label: "Bookings",
                link: "#",
                submenu: false,
                icon: "calendar-event",
                base: "bookings",
                submenuItems: [

                ],
            },
            {
                label: "Consultations",
                link: "#",
                submenu: false,
                icon: "stethoscope",
                base: "consultations",
                submenuItems: [],
            },
            {
                label: "Procedures",
                link: "#",
                submenu: false,
                icon: "report-medical",
                base: "procedures",
                submenuItems: [],
            },

            {
                label: "Billing", // Includes MRN info
                link: "#",
                submenu: false,
                icon: "user-circle",
                base: "profile",
                submenuItems: [],
            },

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