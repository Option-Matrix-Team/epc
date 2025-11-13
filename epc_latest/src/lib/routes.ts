export const routes = {
    // Auth routes
    login: "/login",
    forgotPassword: "/forgot-password",
    resetPassword: "/reset-password",
    verifyOTP: "/verify-otp",

    // Dashboard routes
    dashboard: "/dashboard",

    // User management
    users: "/users",
    rolesPermissions: "/roles-permissions",

    // Patient management
    patients: "/patients",
    patientDetails: "/patients/:id",

    // Provider management
    providers: "/providers",
    providerDetails: "/providers/:id",

    // Nurse management
    nurses: "/nurses",
    nurseDetails: "/nurses/:id",

    // Technician management
    technicians: "/technicians",
    technicianDetails: "/technicians/:id",

    // Appointments
    appointments: "/appointments",
    appointmentDetails: "/appointments/:id",

    // Master data
    masterStates: "/master/states",
    masterCities: "/master/cities",

    // Application
    chat: "/chat",
    calendar: "/calendar",

    // Placeholder routes (to be implemented)
    reports: "/reports",
    registration: "/registration",
    consultations: "/consultations",
    procedures: "/procedures",
    diagnostics: "/diagnostics",
    imaging: "/imaging",
    clinicalServices: "/clinical-services",
    accommodation: "/accommodation",
    billing: "/billing",
    documents: "/documents",
    settings: "/settings",
    departments: "/departments",
    specialties: "/specialties",
    codingMaster: "/coding-master",
    resources: "/resources",
    availability: "/availability",
    shifts: "/shifts",
} as const;
