"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
    IconPlus,
    IconSearch,
    IconDotsVertical,
    IconEdit,
    IconTrash,
    IconKey,
    IconToggleLeft,
    IconToggleRight,
    IconChevronLeft,
    IconChevronRight,
    IconChevronUp,
    IconDownload,
    IconUpload,
    IconFilter,
    IconX,
    IconDeviceFloppy,
    IconLayoutGrid,
    IconEye,
    IconEyeOff
} from "@tabler/icons-react";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

// Form Field wrapper component
function FormField({
    label,
    required,
    children,
    className
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={className}>
            <Label className="mb-2 block">
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {children}
        </div>
    );
}

interface Patient {
    id: string;
    email: string;
    user_metadata?: {
        name?: string;
    };
    created_at: string;
    profile?: {
        user_type?: string;
    };
    patient?: {
        is_active?: boolean;
        date_of_birth?: string;
        phone_number?: string;
        address?: string;
        zip?: string;
        state_id?: string;
        city_id?: string;
    };
}

interface State {
    id: string;
    name: string;
    abbreviation: string;
}

interface City {
    id: string;
    name: string;
    state_id: string;
}

export default function PatientsPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [states, setStates] = useState<State[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

    // Filter states
    const [showFilters, setShowFilters] = useState(false);
    const [filterPhone, setFilterPhone] = useState("");
    const [filterZip, setFilterZip] = useState("");
    const [filterState, setFilterState] = useState("");
    const [filterCity, setFilterCity] = useState("");
    const [filterStatus, setFilterStatus] = useState("");

    // Dialog states
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [confirmToggleActiveDialog, setConfirmToggleActiveDialog] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        date_of_birth: "",
        phone_number: "",
        address: "",
        zip: "",
        state_id: "",
        city_id: "",
    });
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Loading states for buttons
    const [isAddingPatient, setIsAddingPatient] = useState(false);
    const [isEditingPatient, setIsEditingPatient] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [isDeletingPatient, setIsDeletingPatient] = useState(false);
    const [isTogglingActive, setIsTogglingActive] = useState(false);

    // Password strength calculator
    const calculatePasswordStrength = (password: string) => {
        let strength = 0;
        if (password.length >= 8) strength += 25;
        if (password.length >= 12) strength += 10;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 20;
        if (/\d/.test(password)) strength += 20;
        if (/[^a-zA-Z0-9]/.test(password)) strength += 25;
        return Math.min(strength, 100);
    };

    const getPasswordStrengthLabel = (strength: number) => {
        if (strength === 0) return { label: "", color: "" };
        if (strength < 40) return { label: "Weak", color: "bg-red-500" };
        if (strength < 70) return { label: "Medium", color: "bg-yellow-500" };
        return { label: "Strong", color: "bg-green-500" };
    };

    const passwordStrength = calculatePasswordStrength(newPassword);
    const passwordStrengthInfo = getPasswordStrengthLabel(passwordStrength);

    // Advanced features
    const [showColumnDialog, setShowColumnDialog] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState({
        actions: true,
        name: true,
        email: true,
        dob: true,
        phone: true,
        address: true,
        state: true,
        city: true,
        zip: true,
        status: true,
        created: true,
    });
    const [savedSearches, setSavedSearches] = useState<Array<{ id: string, name: string, filters: any }>>([]);
    const [showSaveSearchDialog, setShowSaveSearchDialog] = useState(false);
    const [searchName, setSearchName] = useState("");
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [showImportDialog, setShowImportDialog] = useState(false);

    useEffect(() => {
        fetchPatients();
        fetchStates();
        fetchCities();
    }, []);

    useEffect(() => {
        // Fetch cities when state filter changes
        if (filterState) {
            fetchCities(filterState);
        }
    }, [filterState]);

    useEffect(() => {
        // Fetch cities when form state changes
        if (formData.state_id) {
            fetchCities(formData.state_id);
        }
    }, [formData.state_id]);

    const fetchPatients = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/patients?userType=Patient");
            const data = await response.json();
            if (data.error) {
                toast.error(data.error);
            } else {
                setPatients(data.users || []);
            }
        } catch (error) {
            toast.error("Failed to fetch patients");
        } finally {
            setLoading(false);
        }
    };

    const fetchStates = async () => {
        try {
            const response = await fetch("/api/states");
            const data = await response.json();
            if (!data.error) {
                setStates(data.states || []);
            }
        } catch (error) {
            console.error("Failed to fetch states", error);
        }
    };

    const fetchCities = async (stateId?: string) => {
        try {
            const url = stateId ? `/api/cities?state_id=${stateId}` : "/api/cities";
            const response = await fetch(url);
            const data = await response.json();
            if (!data.error) {
                setCities(data.cities || []);
            }
        } catch (error) {
            console.error("Failed to fetch cities", error);
        }
    };

    const handleAddPatient = async () => {
        try {
            if (!formData.email || !formData.name) {
                toast.error("Name and email are required");
                return;
            }

            setIsAddingPatient(true);
            const response = await fetch("/api/patients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    userType: "Patient",
                }),
            });

            const data = await response.json();
            if (data.error) {
                toast.error(data.error);
            } else {
                toast.success("Patient added successfully");
                setAddDialogOpen(false);
                resetForm();
                fetchPatients();
            }
        } catch (error) {
            toast.error("Failed to add Patient");
        } finally {
            setIsAddingPatient(false);
        }
    };

    const handleEditPatient = async () => {
        try {
            if (!selectedPatient) return;

            setIsEditingPatient(true);
            const response = await fetch("/api/patients", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "edit",
                    patientId: selectedPatient.id,
                    ...formData,
                }),
            });

            const data = await response.json();
            if (data.error) {
                toast.error(data.error);
            } else {
                toast.success("Patient updated successfully");
                setEditDialogOpen(false);
                resetForm();
                fetchPatients();
            }
        } catch (error) {
            toast.error("Failed to update Patient");
        } finally {
            setIsEditingPatient(false);
        }
    };

    const handleResetPassword = async () => {
        try {
            if (!selectedPatient) return;
            if (newPassword !== confirmPassword) {
                toast.error("Passwords do not match");
                return;
            }
            if (newPassword.length < 8) {
                toast.error("Password must be at least 8 characters");
                return;
            }

            setIsResettingPassword(true);
            const response = await fetch("/api/patients", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "reset_password",
                    patientId: selectedPatient.id,
                    password: newPassword,
                }),
            });

            const data = await response.json();
            if (data.error) {
                toast.error(data.error);
            } else {
                toast.success("Password reset successfully");
                setResetPasswordDialogOpen(false);
                setSelectedPatient(null);
                setNewPassword("");
                setConfirmPassword("");
                setShowNewPassword(false);
                setShowConfirmPassword(false);
            }
        } catch (error) {
            toast.error("Failed to reset password");
        } finally {
            setIsResettingPassword(false);
        }
    };

    const handleToggleActive = async (Patient: Patient) => {
        setSelectedPatient(Patient);
        setConfirmToggleActiveDialog(true);
    };

    const confirmToggleActive = async () => {
        try {
            if (!selectedPatient) return;

            setIsTogglingActive(true);
            const response = await fetch("/api/patients", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "toggle_active",
                    patientId: selectedPatient.id,
                    isActive: !selectedPatient.patient?.is_active,
                }),
            });

            const data = await response.json();
            if (data.error) {
                toast.error(data.error);
            } else {
                toast.success(`Patient ${selectedPatient.patient?.is_active ? "deactivated" : "activated"} successfully`);
                setConfirmToggleActiveDialog(false);
                setSelectedPatient(null);
                fetchPatients();
            }
        } catch (error) {
            toast.error("Failed to toggle patient status");
        } finally {
            setIsTogglingActive(false);
        }
    };

    const handleDeletePatient = async () => {
        try {
            if (!selectedPatient) return;

            setIsDeletingPatient(true);
            const response = await fetch("/api/patients", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "soft_delete",
                    patientId: selectedPatient.id,
                }),
            });

            const data = await response.json();
            if (data.error) {
                toast.error(data.error);
            } else {
                toast.success("Patient deleted successfully");
                setDeleteDialogOpen(false);
                setSelectedPatient(null);
                fetchPatients();
            }
        } catch (error) {
            toast.error("Failed to delete patient");
        } finally {
            setIsDeletingPatient(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            email: "",
            date_of_birth: "",
            phone_number: "",
            address: "",
            zip: "",
            state_id: "",
            city_id: "",
        });
        setSelectedPatient(null);
    };

    const openEditDialog = (patient: Patient) => {
        setSelectedPatient(patient);
        setFormData({
            name: patient.user_metadata?.name || "",
            email: patient.email,
            date_of_birth: patient.patient?.date_of_birth || "",
            phone_number: patient.patient?.phone_number || "",
            address: patient.patient?.address || "",
            zip: patient.patient?.zip || "",
            state_id: patient.patient?.state_id || "",
            city_id: patient.patient?.city_id || "",
        });
        setEditDialogOpen(true);
    };

    const openResetPasswordDialog = (patient: Patient) => {
        setSelectedPatient(patient);
        setResetPasswordDialogOpen(true);
    };

    const openDeleteDialog = (patient: Patient) => {
        setSelectedPatient(patient);
        setDeleteDialogOpen(true);
    };

    // Filter and sort patients
    const filteredPatients = useMemo(() => {
        let filtered = patients.filter((patient) => {
            const matchesSearch =
                patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                patient.user_metadata?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                patient.patient?.address?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesPhone = !filterPhone || patient.patient?.phone_number?.includes(filterPhone);
            const matchesZip = !filterZip || patient.patient?.zip?.includes(filterZip);
            const matchesState = !filterState || patient.patient?.state_id === filterState;
            const matchesCity = !filterCity || patient.patient?.city_id === filterCity;
            const matchesStatus = !filterStatus ||
                (filterStatus === "active" && patient.patient?.is_active) ||
                (filterStatus === "inactive" && !patient.patient?.is_active);

            return matchesSearch && matchesPhone &&
                matchesZip && matchesState && matchesCity && matchesStatus;
        });

        if (sortColumn) {
            filtered.sort((a, b) => {
                let aVal: any, bVal: any;

                switch (sortColumn) {
                    case "name":
                        aVal = a.user_metadata?.name || "";
                        bVal = b.user_metadata?.name || "";
                        break;
                    case "email":
                        aVal = a.email;
                        bVal = b.email;
                        break;
                    case "dob":
                        aVal = a.patient?.date_of_birth || "";
                        bVal = b.patient?.date_of_birth || "";
                        break;
                    case "phone":
                        aVal = a.patient?.phone_number || "";
                        bVal = b.patient?.phone_number || "";
                        break;
                    case "address":
                        aVal = a.patient?.address || "";
                        bVal = b.patient?.address || "";
                        break;
                    case "state":
                        aVal = states.find(s => s.id === a.patient?.state_id)?.name || "";
                        bVal = states.find(s => s.id === b.patient?.state_id)?.name || "";
                        break;
                    case "city":
                        aVal = cities.find(c => c.id === a.patient?.city_id)?.name || "";
                        bVal = cities.find(c => c.id === b.patient?.city_id)?.name || "";
                        break;
                    case "zip":
                        aVal = a.patient?.zip || "";
                        bVal = b.patient?.zip || "";
                        break;
                    case "created_at":
                        aVal = new Date(a.created_at).getTime();
                        bVal = new Date(b.created_at).getTime();
                        break;
                    default:
                        return 0;
                }

                if (sortDirection === "asc") {
                    return aVal > bVal ? 1 : -1;
                } else {
                    return aVal < bVal ? 1 : -1;
                }
            });
        }

        return filtered;
    }, [patients, searchTerm, filterPhone, filterZip, filterState, filterCity, filterStatus, sortColumn, sortDirection, states, cities]);

    // Paginate patients
    const paginatedPatients = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredPatients.slice(startIndex, endIndex);
    }, [filteredPatients, currentPage, pageSize]);

    const totalPages = Math.ceil(filteredPatients.length / pageSize);

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    const clearFilters = () => {
        setSearchTerm("");
        setFilterPhone("");
        setFilterZip("");
        setFilterState("");
        setFilterCity("");
        setFilterStatus("");
        toast.success("Filters cleared");
    };

    // CSV Export
    const handleExportCSV = () => {
        try {
            const headers = ["Name", "Email", "DOB", "Phone", "Address", "State", "City", "Zip", "Status", "Created"];
            const csvData = filteredPatients.map(patient => [
                patient.user_metadata?.name || "",
                patient.email || "",
                patient.patient?.date_of_birth || "",
                patient.patient?.phone_number || "",
                patient.patient?.address || "",
                states.find(s => s.id === patient.patient?.state_id)?.name || "",
                cities.find(c => c.id === patient.patient?.city_id)?.name || "",
                patient.patient?.zip || "",
                patient.patient?.is_active ? "Active" : "Inactive",
                new Date(patient.created_at).toLocaleDateString(),
            ]);

            const csvContent = [
                headers.join(","),
                ...csvData.map(row => row.map(cell => `"${cell}"`).join(","))
            ].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `Patients_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("CSV exported successfully");
        } catch (error) {
            toast.error("Failed to export CSV");
        }
    };

    // Download CSV Template
    const handleDownloadTemplate = () => {
        const headers = ["Name", "Email", "Phone", "Address", "State", "City", "Zip", "Role"];
        const sampleRow = ["John Doe", "john@example.com", "1234567890", "123 Main St", "California", "Los Angeles", "90001", "Patient"];
        const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "Patients_import_template.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Template downloaded");
    };

    // CSV Import
    const handleImportCSV = async () => {
        if (!csvFile) {
            toast.error("Please select a file");
            return;
        }

        try {
            const text = await csvFile.text();
            const lines = text.split("\n").filter(line => line.trim());
            const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));

            let successCount = 0;
            let errorCount = 0;

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(",").map(v => v.trim().replace(/"/g, ""));
                const PatientData: any = {};

                headers.forEach((header, index) => {
                    const key = header.toLowerCase().replace(/\s+/g, "_");
                    PatientData[key] = values[index];
                });

                try {
                    const response = await fetch("/api/patients", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            name: PatientData.name,
                            email: PatientData.email,
                            phone_number: PatientData.phone,
                            address: PatientData.address,
                            zip: PatientData.zip,
                            userType: "Patient",
                        }),
                    });

                    if (response.ok) {
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    errorCount++;
                }
            }

            toast.success(`Import completed: ${successCount} Patients added, ${errorCount} errors`);
            setShowImportDialog(false);
            setCsvFile(null);
            fetchPatients();
        } catch (error) {
            toast.error("Failed to import CSV");
        }
    };

    // Save Search
    const handleSaveSearch = async () => {
        if (!searchName.trim()) {
            toast.error("Please enter a search name");
            return;
        }

        const filters = {
            filterPhone,
            filterZip,
            filterState,
            filterCity,
            filterStatus,
        };

        // In a real implementation, save to Supabase saved_searches table
        const newSearch = {
            id: Date.now().toString(),
            name: searchName,
            filters,
        };

        setSavedSearches([...savedSearches, newSearch]);
        localStorage.setItem("savedSearches", JSON.stringify([...savedSearches, newSearch]));
        toast.success("Search saved successfully");
        setShowSaveSearchDialog(false);
        setSearchName("");
    };

    // Load Search
    const handleLoadSearch = (search: any) => {
        setFilterPhone(search.filters.filterPhone);
        setFilterZip(search.filters.filterZip);
        setFilterState(search.filters.filterState);
        setFilterCity(search.filters.filterCity);
        setFilterStatus(search.filters.filterStatus);
        toast.success(`Loaded search: ${search.name}`);
    };

    // Delete Search
    const handleDeleteSearch = (searchId: string) => {
        const updated = savedSearches.filter(s => s.id !== searchId);
        setSavedSearches(updated);
        localStorage.setItem("savedSearches", JSON.stringify(updated));
        toast.success("Search deleted");
    };

    // Load saved searches from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("savedSearches");
        if (saved) {
            setSavedSearches(JSON.parse(saved));
        }
    }, []);

    // Save Column Preferences
    const handleSaveColumns = () => {
        localStorage.setItem("PatientTableColumns", JSON.stringify(visibleColumns));
        toast.success("Column preferences saved");
        setShowColumnDialog(false);
    };

    // Load column preferences
    useEffect(() => {
        const saved = localStorage.getItem("PatientTableColumns");
        if (saved) {
            setVisibleColumns(JSON.parse(saved));
        }
    }, []);

    return (
        <div className="container mx-auto py-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Patients</h1>
            </div>

            {/* Search and Actions Bar */}
            <div className="flex items-center gap-4 mb-4">
                <div className="relative w-80">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, email, or address..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex items-center gap-2 ml-auto">
                    <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setShowFilters(!showFilters)}>
                        <IconFilter className="h-4 w-4 mr-2" />
                        {showFilters ? "Hide Filters" : "Show Filters"}
                    </Button>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" onClick={handleExportCSV} className="cursor-pointer">
                                    <IconDownload className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Export CSV</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)} className="cursor-pointer">
                                    <IconUpload className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Import CSV</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setShowColumnDialog(true)} className="cursor-pointer">
                                    <IconLayoutGrid className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Grid Columns</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <Button size="sm" onClick={() => setAddDialogOpen(true)} className="cursor-pointer">
                        <IconPlus className="h-4 w-4 mr-2" />
                        Add Patient
                    </Button>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg mb-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Phone</label>
                            <Input
                                className="bg-white w-full"
                                placeholder="Search phone"
                                value={filterPhone}
                                onChange={(e) => setFilterPhone(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Zip Code</label>
                            <Input
                                className="bg-white w-full"
                                placeholder="Search zip"
                                value={filterZip}
                                onChange={(e) => setFilterZip(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">State</label>
                            <Select value={filterState || undefined} onValueChange={setFilterState}>
                                <SelectTrigger className="bg-white w-full">
                                    <SelectValue placeholder="All states" />
                                </SelectTrigger>
                                <SelectContent>
                                    {states.map((state) => (
                                        <SelectItem key={state.id} value={state.id}>
                                            {state.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">City</label>
                            <Select value={filterCity || undefined} onValueChange={setFilterCity}>
                                <SelectTrigger className="bg-white w-full">
                                    <SelectValue placeholder="All cities" />
                                </SelectTrigger>
                                <SelectContent>
                                    {cities.map((city) => (
                                        <SelectItem key={city.id} value={city.id}>
                                            {city.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Status</label>
                            <Select value={filterStatus || undefined} onValueChange={setFilterStatus}>
                                <SelectTrigger className="bg-white w-full">
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <div className="flex gap-2">
                            {savedSearches.length > 0 && (
                                <Select onValueChange={(value) => {
                                    const search = savedSearches.find(s => s.id === value);
                                    if (search) handleLoadSearch(search);
                                }}>
                                    <SelectTrigger className="w-52 bg-white">
                                        <SelectValue placeholder="Load saved search" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {savedSearches.map((search) => (
                                            <SelectItem key={search.id} value={search.id}>
                                                {search.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setShowSaveSearchDialog(true)}>
                                <IconDeviceFloppy className="h-4 w-4 mr-2" />
                                Save Search
                            </Button>
                            <Button variant="outline" size="sm" onClick={clearFilters}>
                                <IconX className="h-4 w-4 mr-2" />
                                Clear
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setShowFilters(false)}>
                                <IconChevronUp className="h-4 w-4 mr-2" />
                                Hide
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                <div
                    id="Patients-table-container"
                    className="overflow-x-auto"
                >
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-100 border-b border-gray-300">
                                {visibleColumns.actions && <TableHead className="font-semibold text-gray-700">Actions</TableHead>}
                                {visibleColumns.name && (
                                    <TableHead className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900" onClick={() => handleSort("name")}>
                                        <span className="flex items-center gap-1">
                                            Name
                                            <span className="text-xs">{sortColumn === "name" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
                                        </span>
                                    </TableHead>
                                )}
                                {visibleColumns.email && (
                                    <TableHead className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900" onClick={() => handleSort("email")}>
                                        <span className="flex items-center gap-1">
                                            Email
                                            <span className="text-xs">{sortColumn === "email" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
                                        </span>
                                    </TableHead>
                                )}
                                {visibleColumns.dob && (
                                    <TableHead className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900" onClick={() => handleSort("dob")}>
                                        <span className="flex items-center gap-1">
                                            Date of Birth
                                            <span className="text-xs">{sortColumn === "dob" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
                                        </span>
                                    </TableHead>
                                )}
                                {visibleColumns.phone && (
                                    <TableHead className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900" onClick={() => handleSort("phone")}>
                                        <span className="flex items-center gap-1">
                                            Phone
                                            <span className="text-xs">{sortColumn === "phone" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
                                        </span>
                                    </TableHead>
                                )}
                                {visibleColumns.address && (
                                    <TableHead className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900" onClick={() => handleSort("address")}>
                                        <span className="flex items-center gap-1">
                                            Address
                                            <span className="text-xs">{sortColumn === "address" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
                                        </span>
                                    </TableHead>
                                )}
                                {visibleColumns.state && (
                                    <TableHead className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900" onClick={() => handleSort("state")}>
                                        <span className="flex items-center gap-1">
                                            State
                                            <span className="text-xs">{sortColumn === "state" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
                                        </span>
                                    </TableHead>
                                )}
                                {visibleColumns.city && (
                                    <TableHead className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900" onClick={() => handleSort("city")}>
                                        <span className="flex items-center gap-1">
                                            City
                                            <span className="text-xs">{sortColumn === "city" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
                                        </span>
                                    </TableHead>
                                )}
                                {visibleColumns.zip && (
                                    <TableHead className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900" onClick={() => handleSort("zip")}>
                                        <span className="flex items-center gap-1">
                                            Zip
                                            <span className="text-xs">{sortColumn === "zip" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
                                        </span>
                                    </TableHead>
                                )}
                                {visibleColumns.status && <TableHead className="font-semibold text-gray-700">Status</TableHead>}
                                {visibleColumns.created && (
                                    <TableHead className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900" onClick={() => handleSort("created_at")}>
                                        <span className="flex items-center gap-1">
                                            Created
                                            <span className="text-xs">{sortColumn === "created_at" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
                                        </span>
                                    </TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length} className="text-center py-8">
                                        <div className="flex items-center justify-center gap-2">
                                            <Button disabled size="sm">
                                                <Spinner />
                                                Loading...
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedPatients.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length} className="text-center py-8 text-gray-500">
                                        No Patients found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedPatients.map((patient) => (
                                    <TableRow key={patient.id} className="hover:bg-gray-50 border-b border-gray-300">
                                        {visibleColumns.actions && (
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <IconDotsVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => openEditDialog(patient)} className="cursor-pointer">
                                                            <IconEdit className="h-4 w-4 mr-2" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => openResetPasswordDialog(patient)} className="cursor-pointer">
                                                            <IconKey className="h-4 w-4 mr-2" />
                                                            Reset Password
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleToggleActive(patient)} className="cursor-pointer">
                                                            {patient.patient?.is_active ? (
                                                                <>
                                                                    <IconToggleLeft className="h-4 w-4 mr-2" />
                                                                    Deactivate
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <IconToggleRight className="h-4 w-4 mr-2" />
                                                                    Activate
                                                                </>
                                                            )}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => openDeleteDialog(patient)} className="text-destructive cursor-pointer">
                                                            <IconTrash className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        )}
                                        {visibleColumns.name && <TableCell>{patient.user_metadata?.name || "-"}</TableCell>}
                                        {visibleColumns.email && <TableCell>{patient.email}</TableCell>}
                                        {visibleColumns.dob && <TableCell>{patient.patient?.date_of_birth || "-"}</TableCell>}
                                        {visibleColumns.phone && <TableCell>{patient.patient?.phone_number || "-"}</TableCell>}
                                        {visibleColumns.address && (
                                            <TableCell className="max-w-xs">
                                                <div className="break-words whitespace-normal">
                                                    {patient.patient?.address || "-"}
                                                </div>
                                            </TableCell>
                                        )}
                                        {visibleColumns.state && (
                                            <TableCell>
                                                {states.find((s) => s.id === patient.patient?.state_id)?.name || "-"}
                                            </TableCell>
                                        )}
                                        {visibleColumns.city && (
                                            <TableCell>
                                                {cities.find((c) => c.id === patient.patient?.city_id)?.name || "-"}
                                            </TableCell>
                                        )}
                                        {visibleColumns.zip && <TableCell>{patient.patient?.zip || "-"}</TableCell>}
                                        {visibleColumns.status && (
                                            <TableCell>
                                                {patient.patient?.is_active ? (
                                                    <Badge variant="default">Active</Badge>
                                                ) : (
                                                    <Badge variant="secondary">Inactive</Badge>
                                                )}
                                            </TableCell>
                                        )}
                                        {visibleColumns.created && (
                                            <TableCell>
                                                {new Date(patient.created_at).toLocaleDateString()}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Show</span>
                        <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                            <SelectTrigger className="w-20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                        <span className="text-sm text-gray-600">entries</span>
                    </div>
                    <div className="text-sm text-gray-600">
                        Showing {(currentPage - 1) * pageSize + 1} to{" "}
                        {Math.min(currentPage * pageSize, filteredPatients.length)} of {filteredPatients.length} entries
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        <IconChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const page = i + 1;
                            return (
                                <Button
                                    key={page}
                                    variant={currentPage === page ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCurrentPage(page)}
                                    className={currentPage === page ? "bg-gray-900 hover:bg-gray-800" : ""}
                                >
                                    {page}
                                </Button>
                            );
                        })}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        <IconChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Add Patient Dialog */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Add New Patient</DialogTitle>
                        <DialogDescription>
                            Create a new Patient account. They will receive an email to set their password.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <FormField label="Name" required>
                            <Input
                                className="w-full"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Enter full name"
                            />
                        </FormField>
                        <FormField label="Email" required>
                            <Input
                                className="w-full"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="Enter email address"
                            />
                        </FormField>
                        <FormField label="Phone Number" required>
                            <Input
                                className="w-full"
                                value={formData.phone_number}
                                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                placeholder="Enter phone number"
                            />
                        </FormField>
                        <FormField label="Date of Birth" required>
                            <Input
                                className="w-full"
                                type="date"
                                value={formData.date_of_birth}
                                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                            />
                        </FormField>
                        <FormField label="State" required>
                            <Select value={formData.state_id} onValueChange={(v) => setFormData({ ...formData, state_id: v, city_id: "" })}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select state" />
                                </SelectTrigger>
                                <SelectContent>
                                    {states.map((state) => (
                                        <SelectItem key={state.id} value={state.id}>
                                            {state.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>
                        <FormField label="City" required>
                            <Select value={formData.city_id} onValueChange={(v) => setFormData({ ...formData, city_id: v })}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select city" />
                                </SelectTrigger>
                                <SelectContent>
                                    {cities.filter(c => !formData.state_id || c.state_id === formData.state_id).map((city) => (
                                        <SelectItem key={city.id} value={city.id}>
                                            {city.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>
                        <FormField label="Zip Code" required>
                            <Input
                                className="w-full"
                                value={formData.zip}
                                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                                placeholder="Enter zip code"
                            />
                        </FormField>
                        <FormField label="Address" className="col-span-2" required>
                            <Input
                                className="w-full"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Enter address"
                            />
                        </FormField>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetForm(); }} disabled={isAddingPatient}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddPatient}
                            disabled={!formData.name || !formData.email || !formData.phone_number || !formData.date_of_birth || !formData.state_id || !formData.city_id || !formData.zip || !formData.address || isAddingPatient}
                            className="cursor-pointer"
                        >
                            {isAddingPatient ? (
                                <>
                                    <Spinner className="mr-2" />
                                    Adding...
                                </>
                            ) : (
                                "Add Patient"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Patient Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Patient</DialogTitle>
                        <DialogDescription>
                            Update Patient information.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <FormField label="Name" required>
                            <Input
                                className="w-full"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Enter full name"
                            />
                        </FormField>
                        <FormField label="Email" required>
                            <Input
                                className="w-full"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="Enter email address"
                            />
                        </FormField>
                        <FormField label="Phone Number" required>
                            <Input
                                className="w-full"
                                value={formData.phone_number}
                                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                placeholder="Enter phone number"
                            />
                        </FormField>
                        <FormField label="Date of Birth" required>
                            <Input
                                className="w-full"
                                type="date"
                                value={formData.date_of_birth}
                                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                            />
                        </FormField>
                        <FormField label="State" required>
                            <Select value={formData.state_id} onValueChange={(v) => setFormData({ ...formData, state_id: v, city_id: "" })}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select state" />
                                </SelectTrigger>
                                <SelectContent>
                                    {states.map((state) => (
                                        <SelectItem key={state.id} value={state.id}>
                                            {state.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>
                        <FormField label="City" required>
                            <Select value={formData.city_id} onValueChange={(v) => setFormData({ ...formData, city_id: v })}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select city" />
                                </SelectTrigger>
                                <SelectContent>
                                    {cities.filter(c => !formData.state_id || c.state_id === formData.state_id).map((city) => (
                                        <SelectItem key={city.id} value={city.id}>
                                            {city.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>
                        <FormField label="Zip Code" required>
                            <Input
                                className="w-full"
                                value={formData.zip}
                                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                                placeholder="Enter zip code"
                            />
                        </FormField>
                        <FormField label="Address" className="col-span-2" required>
                            <Input
                                className="w-full"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Enter address"
                            />
                        </FormField>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setEditDialogOpen(false); resetForm(); }} disabled={isEditingPatient}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleEditPatient}
                            disabled={!formData.name || !formData.email || !formData.phone_number || !formData.date_of_birth || !formData.state_id || !formData.city_id || !formData.zip || !formData.address || isEditingPatient}
                            className="cursor-pointer"
                        >
                            {isEditingPatient ? (
                                <>
                                    <Spinner className="mr-2" />
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reset Password Dialog */}
            <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                            Enter a new password for {selectedPatient?.user_metadata?.name || selectedPatient?.email}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <FormField label="New Password" required>
                            <div className="relative">
                                <Input
                                    type={showNewPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showNewPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                                </button>
                            </div>
                            {newPassword && (
                                <div className="mt-2 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Progress
                                            value={passwordStrength}
                                            className={`h-2 ${passwordStrengthInfo.color}`}
                                        />
                                        {passwordStrengthInfo.label && (
                                            <span className="text-sm font-medium text-gray-600 min-w-[60px]">
                                                {passwordStrengthInfo.label}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Password should be at least 8 characters with uppercase, lowercase, numbers, and symbols
                                    </p>
                                </div>
                            )}
                        </FormField>
                        <FormField label="Confirm Password" required>
                            <div className="relative">
                                <Input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showConfirmPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                                </button>
                            </div>
                            {confirmPassword && confirmPassword !== newPassword && (
                                <p className="text-xs text-red-500 mt-1">
                                    Passwords do not match
                                </p>
                            )}
                        </FormField>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setResetPasswordDialogOpen(false);
                            setNewPassword("");
                            setConfirmPassword("");
                            setShowNewPassword(false);
                            setShowConfirmPassword(false);
                        }} disabled={isResettingPassword}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleResetPassword}
                            disabled={isResettingPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                            className="cursor-pointer"
                        >
                            {isResettingPassword ? (
                                <>
                                    <Spinner className="mr-2" />
                                    Resetting...
                                </>
                            ) : (
                                "Reset Password"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Patient</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {selectedPatient?.user_metadata?.name || selectedPatient?.email}?
                            This action can be undone by reactivating the Patient.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setSelectedPatient(null); }} disabled={isDeletingPatient}>
                            No
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeletePatient}
                            disabled={isDeletingPatient}
                            className="cursor-pointer"
                        >
                            {isDeletingPatient ? (
                                <>
                                    <Spinner className="mr-2" />
                                    Deleting...
                                </>
                            ) : (
                                "Yes"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Toggle Active Confirmation Dialog */}
            <Dialog open={confirmToggleActiveDialog} onOpenChange={setConfirmToggleActiveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {selectedPatient?.patient?.is_active ? "Deactivate" : "Activate"} Patient
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to {selectedPatient?.patient?.is_active ? "deactivate" : "activate"}{" "}
                            {selectedPatient?.user_metadata?.name || selectedPatient?.email}?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setConfirmToggleActiveDialog(false); setSelectedPatient(null); }} disabled={isTogglingActive}>
                            No
                        </Button>
                        <Button
                            onClick={confirmToggleActive}
                            disabled={isTogglingActive}
                            className="cursor-pointer"
                        >
                            {isTogglingActive ? (
                                <>
                                    <Spinner className="mr-2" />
                                    {selectedPatient?.patient?.is_active ? "Deactivating..." : "Activating..."}
                                </>
                            ) : (
                                "Yes"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Column Customization Dialog */}
            <Dialog open={showColumnDialog} onOpenChange={setShowColumnDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Customize Columns</DialogTitle>
                        <DialogDescription>
                            Select which columns to display in the table
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        {Object.entries(visibleColumns).map(([key, value]) => (
                            <div key={key} className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id={key}
                                    checked={value}
                                    onChange={(e) => setVisibleColumns({
                                        ...visibleColumns,
                                        [key]: e.target.checked
                                    })}
                                    className="h-4 w-4"
                                />
                                <label htmlFor={key} className="text-sm font-medium capitalize">
                                    {key}
                                </label>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowColumnDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveColumns}>
                            Save Preferences
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Save Search Dialog */}
            <Dialog open={showSaveSearchDialog} onOpenChange={setShowSaveSearchDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save Current Search</DialogTitle>
                        <DialogDescription>
                            Give this filter combination a name to save it for later
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <FormField label="Search Name" required>
                            <Input
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                                placeholder="Enter search name"
                            />
                        </FormField>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowSaveSearchDialog(false);
                            setSearchName("");
                        }}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveSearch}>
                            Save Search
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CSV Import Dialog */}
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Import Patients from CSV</DialogTitle>
                        <DialogDescription>
                            Upload a CSV file to bulk import Patients. Download the template first if you need it.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
                            <IconDownload className="h-4 w-4 mr-2" />
                            Download CSV Template
                        </Button>
                        <FormField label="Select CSV File">
                            <Input
                                type="file"
                                accept=".csv"
                                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                            />
                        </FormField>
                        {csvFile && (
                            <p className="text-sm text-muted-foreground">
                                Selected: {csvFile.name}
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowImportDialog(false);
                            setCsvFile(null);
                        }}>
                            Cancel
                        </Button>
                        <Button onClick={handleImportCSV} disabled={!csvFile}>
                            Import Patients
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
