"use client";

import { all_routes } from "@/routes/all_routes";

const routes = all_routes;

// Define the new sidebar structure for the Admin user type
export const AdminSidebarData = [
    {
        tittle: "Radar",
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
                label: "Reports",
                link: "#", // Placeholder: Add specific report routes if available
                submenu: false, // Assuming multiple reports
                icon: "report",
                base: "reports", // Base path for reports
                submenuItems: [

                ],
            },
        ],
    },
    {
        tittle: "Authentication",
        icon: "airplay", // Changed icon for context
        showAsTab: true,
        separateRoute: false,
        submenuItems: [
            {
                label: "Manage Users",
                link: routes.users, // Assuming this is the main user management page
                submenu: false,
                icon: "user",
                base: "users",
                submenuItems: [],
            },
            {
                label: "Roles & Permissions",
                link: routes.rolesPermissions,
                submenu: false,
                icon: "user-shield", // Changed icon
                base: "roles-permissions",
                submenuItems: [],
            },
            // You might add Delete Account Request here if it's a separate page
            // {
            //   label: "Delete Account Request",
            //   link: routes.deleteaccountrequest,
            //   submenu: false,
            //   icon: "user-off",
            //   base: "delete-request",
            //   submenuItems: [],
            // },
        ],
    },


    {
        tittle: "Activities",
        icon: "airplay",
        showAsTab: true,
        separateRoute: false,
        submenuItems: [
            {
                label: "Bookings", // Assuming this relates to Appointments
                link: routes.appointments, // Reuse existing appointment route
                submenu: false,
                icon: "calendar-check",
                base: "appointments",
                submenuItems: [],
            },
            {
                label: "Registration", // Need a specific route for this
                link: "#",  // Placeholder link
                submenu: false,
                icon: "file-pencil", // Example icon
                base: "registration",
                submenuItems: [],
            },
            {
                label: "Consultations", // Need a specific route
                link: "#",  // Placeholder link
                submenu: false,
                icon: "stethoscope", // Example icon
                base: "consultations",
                submenuItems: [],
            },
            {
                label: "Procedures",
                link: "#",
                submenu: false,
                icon: "report-medical", // Changed icon
                base: "procedures",
                submenuItems: [],
            },
            {
                label: "Diagnostics", // Need a specific route
                link: "#",  // Placeholder link
                submenu: false,
                icon: "clipboard-heart", // Example icon
                base: "diagnostics",
                submenuItems: [],
            },
            {
                label: "Imaging", // Need a specific route
                link: "#",  // Placeholder link
                submenu: false,
                icon: "photo-scan", // Example icon
                base: "imaging",
                submenuItems: [],
            },
            {
                label: "Clinical Services", // Need a specific route
                link: "#",  // Placeholder link
                submenu: false,
                icon: "building-hospital", // Example icon
                base: "clinical-services",
                submenuItems: [],
            },
            {
                label: "Nurse Allocation", // Need a specific route, maybe link to Nurses?
                link: "#",
                submenu: false,
                icon: "home-exclamation", // Example icon
                base: "nurses",
                submenuItems: [],
            },
            {
                label: "Accommodation", // Need a specific route
                link: "#",  // Placeholder link
                submenu: false,
                icon: "bed", // Example icon
                base: "accommodation",
                submenuItems: [],
            },

            {
                label: "Billing", // Link to Invoices or Payments?
                link: "#",
                submenu: false,
                icon: "coin", // Example icon
                base: "billing",
                submenuItems: [],
            },
            {
                label: "Documents", // Need a specific route
                link: "#",
                submenu: false,
                icon: "file-stack", // Example icon
                base: "documents",
                submenuItems: [],
            },
            {
                label: "Messaging", // Reuse existing chat route
                link: routes.chat,
                submenu: false,
                icon: "message-dots",
                base: "chat",
                submenuItems: [],
            },
            ,
            {
                label: "Settings", // Reuse existing chat route
                link: routes.chat,
                submenu: false,
                icon: "user-cog",
                base: "chat",
                submenuItems: [],
            },
        ],
    },
    {
        tittle: "Setup",
        icon: "airplay",
        showAsTab: true,
        separateRoute: false,
        submenuItems: [
            {
                label: "Manage Accounts",
                link: "#", // This is a submenu container
                submenu: true,
                icon: "users-group",
                base: "manage-accounts",
                submenuItems: [
                    { label: "Patients", link: routes.patients },
                    { label: "Providers", link: routes.providers },
                    { label: "Nurses", link: routes.nurses },
                    { label: "Technicians", link: routes.technicians } // Use the updated route name                 
                ],
            },
            {
                label: "Manage Departments",
                link: "#",
                submenu: false,
                icon: "building-community", // Changed icon
                base: "departments",
                submenuItems: [],
            },
            {
                label: "Manage Specialties", // Need a specific route
                link: "#",
                submenu: false,
                icon: "star", // Example icon
                base: "specialties",
                submenuItems: [],
            },
            {
                label: "Coding Master", // Need a specific route
                link: "#",
                submenu: false,
                icon: "code", // Example icon
                base: "coding-master",
                submenuItems: [],
            },
            {
                label: "Manage Resources", // Need a specific route
                link: "#",
                submenu: false,
                icon: "box", // Example icon
                base: "resources",
                submenuItems: [],
            },
            {
                label: "Availability",
                link: "#", // This is a submenu container
                submenu: true,
                icon: "calendar-time", // Example icon
                base: "availability",
                submenuItems: [
                    { label: "Resources", link: "#", }, // Placeholder links
                    { label: "Providers", link: "#", },
                    { label: "Nurses", link: "#", },
                    { label: "Technicians", link: "#", },
                    { label: "Working Hours", link: "#", },
                    { label: "Holidays", link: "#", },
                    { label: "Vacations", link: "#", }, // Placeholder link
                    { label: "Commitments", link: "#", }, // Placeholder link
                    { label: "Exceptions", link: "#", }, // Placeholder link
                ],
            },
        ],
    },
    {
        tittle: "Master Data",
        icon: "airplay",
        showAsTab: true,
        separateRoute: false,
        submenuItems: [
            {
                label: "Shift Master", // Need a specific route
                link: "#",
                submenu: false,
                icon: "clock-hour-4", // Example icon
                base: "shifts",
                submenuItems: [],
            },
            {
                label: "States",
                link: routes.masterStates, // Reuse existing route
                submenu: false,
                icon: "map-pin",
                base: "master-states",
                submenuItems: [],
            },
            {
                label: "Cities",
                link: routes.masterCities, // Reuse existing route
                submenu: false,
                icon: "building-arch", // Changed icon
                base: "master-cities",
                submenuItems: [],
            },
        ],
    }
];

// IMPORTANT: Replace the old SidebarData export with this one
// Remove or comment out the old `export const SidebarData = [...]` definition.
// Make sure this new definition is exported instead.