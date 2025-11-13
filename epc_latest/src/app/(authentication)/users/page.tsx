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
    IconLayoutGrid
} from "@tabler/icons-react";
import { Label } from "@/components/ui/label";

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

interface User {
    id: string;
    email: string;
    user_metadata?: {
        name?: string;
        role?: string;
    };
    created_at: string;
    profile?: {
        user_type?: string;
    };
    admin?: {
        is_active?: boolean;
        role_id?: string;
        phone_number?: string;
        address?: string;
        zip?: string;
        state_id?: string;
        city_id?: string;
    };
}

interface Role {
    id: string;
    role_name: string;
    user_type: string;
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

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
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
    const [filterRole, setFilterRole] = useState("");
    const [filterPhone, setFilterPhone] = useState("");
    const [filterAddress, setFilterAddress] = useState("");
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
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone_number: "",
        address: "",
        zip: "",
        state_id: "",
        city_id: "",
        role_id: "",
    });
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Loading states for buttons
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [isEditingUser, setIsEditingUser] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [isDeletingUser, setIsDeletingUser] = useState(false);
    const [isTogglingActive, setIsTogglingActive] = useState(false);

    // Advanced features
    const [showColumnDialog, setShowColumnDialog] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState({
        actions: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        state: true,
        city: true,
        zip: true,
        role: true,
        status: true,
        created: true,
    });
    const [savedSearches, setSavedSearches] = useState<Array<{ id: string, name: string, filters: any }>>([]);
    const [showSaveSearchDialog, setShowSaveSearchDialog] = useState(false);
    const [searchName, setSearchName] = useState("");
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [showImportDialog, setShowImportDialog] = useState(false);

    useEffect(() => {
        fetchUsers();
        fetchRoles();
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

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/users?userType=Admin");
            const data = await response.json();
            if (data.error) {
                toast.error(data.error);
            } else {
                setUsers(data.users || []);
            }
        } catch (error) {
            toast.error("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const response = await fetch("/api/roles");
            const data = await response.json();
            if (!data.error) {
                setRoles(data.roles || []);
            }
        } catch (error) {
            console.error("Failed to fetch roles", error);
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

    const handleAddUser = async () => {
        try {
            if (!formData.email || !formData.name) {
                toast.error("Name and email are required");
                return;
            }

            setIsAddingUser(true);
            const response = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    userType: "Admin",
                }),
            });

            const data = await response.json();
            if (data.error) {
                toast.error(data.error);
            } else {
                toast.success("User added successfully");
                setAddDialogOpen(false);
                resetForm();
                fetchUsers();
            }
        } catch (error) {
            toast.error("Failed to add user");
        } finally {
            setIsAddingUser(false);
        }
    };

    const handleEditUser = async () => {
        try {
            if (!selectedUser) return;

            setIsEditingUser(true);
            const response = await fetch("/api/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "edit",
                    userId: selectedUser.id,
                    ...formData,
                }),
            });

            const data = await response.json();
            if (data.error) {
                toast.error(data.error);
            } else {
                toast.success("User updated successfully");
                setEditDialogOpen(false);
                resetForm();
                fetchUsers();
            }
        } catch (error) {
            toast.error("Failed to update user");
        } finally {
            setIsEditingUser(false);
        }
    };

    const handleResetPassword = async () => {
        try {
            if (!selectedUser) return;
            if (newPassword !== confirmPassword) {
                toast.error("Passwords do not match");
                return;
            }
            if (newPassword.length < 8) {
                toast.error("Password must be at least 8 characters");
                return;
            }

            setIsResettingPassword(true);
            const response = await fetch("/api/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "reset_password",
                    userId: selectedUser.id,
                    password: newPassword,
                }),
            });

            const data = await response.json();
            if (data.error) {
                toast.error(data.error);
            } else {
                toast.success("Password reset successfully");
                setResetPasswordDialogOpen(false);
                setSelectedUser(null);
                setNewPassword("");
                setConfirmPassword("");
            }
        } catch (error) {
            toast.error("Failed to reset password");
        } finally {
            setIsResettingPassword(false);
        }
    };

    const handleToggleActive = async (user: User) => {
        setSelectedUser(user);
        setConfirmToggleActiveDialog(true);
    };

    const confirmToggleActive = async () => {
        try {
            if (!selectedUser) return;

            setIsTogglingActive(true);
            const response = await fetch("/api/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "toggle_active",
                    userId: selectedUser.id,
                    isActive: !selectedUser.admin?.is_active,
                }),
            });

            const data = await response.json();
            if (data.error) {
                toast.error(data.error);
            } else {
                toast.success(`User ${selectedUser.admin?.is_active ? "deactivated" : "activated"} successfully`);
                setConfirmToggleActiveDialog(false);
                setSelectedUser(null);
                fetchUsers();
            }
        } catch (error) {
            toast.error("Failed to toggle user status");
        } finally {
            setIsTogglingActive(false);
        }
    };

    const handleDeleteUser = async () => {
        try {
            if (!selectedUser) return;

            setIsDeletingUser(true); const response = await fetch("/api/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "soft_delete",
                    userId: selectedUser.id,
                }),
            });

            const data = await response.json();
            if (data.error) {
                toast.error(data.error);
            } else {
                toast.success("User deleted successfully");
                setDeleteDialogOpen(false);
                setSelectedUser(null);
                fetchUsers();
            }
        } catch (error) {
            toast.error("Failed to delete user");
        } finally {
            setIsDeletingUser(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            email: "",
            phone_number: "",
            address: "",
            zip: "",
            state_id: "",
            city_id: "",
            role_id: "",
        });
        setSelectedUser(null);
    };

    const openEditDialog = (user: User) => {
        setSelectedUser(user);
        setFormData({
            name: user.user_metadata?.name || "",
            email: user.email,
            phone_number: user.admin?.phone_number || "",
            address: user.admin?.address || "",
            zip: user.admin?.zip || "",
            state_id: user.admin?.state_id || "",
            city_id: user.admin?.city_id || "",
            role_id: user.admin?.role_id || "",
        });
        setEditDialogOpen(true);
    };

    const openResetPasswordDialog = (user: User) => {
        setSelectedUser(user);
        setResetPasswordDialogOpen(true);
    };

    const openDeleteDialog = (user: User) => {
        setSelectedUser(user);
        setDeleteDialogOpen(true);
    };

    // Filter and sort users
    const filteredUsers = useMemo(() => {
        let filtered = users.filter((user) => {
            const matchesSearch =
                user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.user_metadata?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.admin?.address?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesRole = !filterRole || user.admin?.role_id === filterRole;
            const matchesPhone = !filterPhone || user.admin?.phone_number?.includes(filterPhone);
            const matchesZip = !filterZip || user.admin?.zip?.includes(filterZip);
            const matchesState = !filterState || user.admin?.state_id === filterState;
            const matchesCity = !filterCity || user.admin?.city_id === filterCity;
            const matchesStatus = !filterStatus ||
                (filterStatus === "active" && user.admin?.is_active) ||
                (filterStatus === "inactive" && !user.admin?.is_active);

            return matchesSearch && matchesRole && matchesPhone &&
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
                    case "phone":
                        aVal = a.admin?.phone_number || "";
                        bVal = b.admin?.phone_number || "";
                        break;
                    case "address":
                        aVal = a.admin?.address || "";
                        bVal = b.admin?.address || "";
                        break;
                    case "state":
                        aVal = states.find(s => s.id === a.admin?.state_id)?.name || "";
                        bVal = states.find(s => s.id === b.admin?.state_id)?.name || "";
                        break;
                    case "city":
                        aVal = cities.find(c => c.id === a.admin?.city_id)?.name || "";
                        bVal = cities.find(c => c.id === b.admin?.city_id)?.name || "";
                        break;
                    case "zip":
                        aVal = a.admin?.zip || "";
                        bVal = b.admin?.zip || "";
                        break;
                    case "role":
                        aVal = roles.find(r => r.id === a.admin?.role_id)?.role_name || "";
                        bVal = roles.find(r => r.id === b.admin?.role_id)?.role_name || "";
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
    }, [users, searchTerm, filterRole, filterPhone, filterZip, filterState, filterCity, filterStatus, sortColumn, sortDirection, states, cities, roles]);

    // Paginate users
    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredUsers.slice(startIndex, endIndex);
    }, [filteredUsers, currentPage, pageSize]);

    const totalPages = Math.ceil(filteredUsers.length / pageSize);

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
        setFilterRole("");
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
            const headers = ["Name", "Email", "Phone", "Address", "State", "City", "Zip", "Role", "Status", "Created"];
            const csvData = filteredUsers.map(user => [
                user.user_metadata?.name || "",
                user.email || "",
                user.admin?.phone_number || "",
                user.admin?.address || "",
                states.find(s => s.id === user.admin?.state_id)?.name || "",
                cities.find(c => c.id === user.admin?.city_id)?.name || "",
                user.admin?.zip || "",
                roles.find(r => r.id === user.admin?.role_id)?.role_name || "",
                user.admin?.is_active ? "Active" : "Inactive",
                new Date(user.created_at).toLocaleDateString(),
            ]);

            const csvContent = [
                headers.join(","),
                ...csvData.map(row => row.map(cell => `"${cell}"`).join(","))
            ].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `users_${new Date().toISOString().split('T')[0]}.csv`);
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
        const sampleRow = ["John Doe", "john@example.com", "1234567890", "123 Main St", "California", "Los Angeles", "90001", "Admin"];
        const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "users_import_template.csv");
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
                const userData: any = {};

                headers.forEach((header, index) => {
                    const key = header.toLowerCase().replace(/\s+/g, "_");
                    userData[key] = values[index];
                });

                try {
                    const response = await fetch("/api/users", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            name: userData.name,
                            email: userData.email,
                            phone_number: userData.phone,
                            address: userData.address,
                            zip: userData.zip,
                            userType: "Admin",
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

            toast.success(`Import completed: ${successCount} users added, ${errorCount} errors`);
            setShowImportDialog(false);
            setCsvFile(null);
            fetchUsers();
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
            filterRole,
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
        setFilterRole(search.filters.filterRole);
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
        localStorage.setItem("userTableColumns", JSON.stringify(visibleColumns));
        toast.success("Column preferences saved");
        setShowColumnDialog(false);
    };

    // Load column preferences
    useEffect(() => {
        const saved = localStorage.getItem("userTableColumns");
        if (saved) {
            setVisibleColumns(JSON.parse(saved));
        }
    }, []);

    return (
        <div className="container mx-auto py-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Users</h1>
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
                        Add User
                    </Button>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg mb-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Role</label>
                            <Select value={filterRole || undefined} onValueChange={setFilterRole}>
                                <SelectTrigger className="bg-white w-full">
                                    <SelectValue placeholder="All roles" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map((role) => (
                                        <SelectItem key={role.id} value={role.id}>
                                            {role.role_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

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
                    id="users-table-container"
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
                                {visibleColumns.role && (
                                    <TableHead className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900" onClick={() => handleSort("role")}>
                                        <span className="flex items-center gap-1">
                                            Role
                                            <span className="text-xs">{sortColumn === "role" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
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
                            ) : paginatedUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length} className="text-center py-8 text-gray-500">
                                        No users found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedUsers.map((user) => (
                                    <TableRow key={user.id} className="hover:bg-gray-50 border-b border-gray-300">
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
                                                        <DropdownMenuItem onClick={() => openEditDialog(user)} className="cursor-pointer">
                                                            <IconEdit className="h-4 w-4 mr-2" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => openResetPasswordDialog(user)} className="cursor-pointer">
                                                            <IconKey className="h-4 w-4 mr-2" />
                                                            Reset Password
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleToggleActive(user)} className="cursor-pointer">
                                                            {user.admin?.is_active ? (
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
                                                        <DropdownMenuItem onClick={() => openDeleteDialog(user)} className="text-destructive cursor-pointer">
                                                            <IconTrash className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        )}
                                        {visibleColumns.name && <TableCell>{user.user_metadata?.name || "-"}</TableCell>}
                                        {visibleColumns.email && <TableCell>{user.email}</TableCell>}
                                        {visibleColumns.phone && <TableCell>{user.admin?.phone_number || "-"}</TableCell>}
                                        {visibleColumns.address && (
                                            <TableCell className="max-w-xs">
                                                <div className="break-words whitespace-normal">
                                                    {user.admin?.address || "-"}
                                                </div>
                                            </TableCell>
                                        )}
                                        {visibleColumns.state && (
                                            <TableCell>
                                                {states.find((s) => s.id === user.admin?.state_id)?.name || "-"}
                                            </TableCell>
                                        )}
                                        {visibleColumns.city && (
                                            <TableCell>
                                                {cities.find((c) => c.id === user.admin?.city_id)?.name || "-"}
                                            </TableCell>
                                        )}
                                        {visibleColumns.zip && <TableCell>{user.admin?.zip || "-"}</TableCell>}
                                        {visibleColumns.role && (
                                            <TableCell>
                                                {roles.find((r) => r.id === user.admin?.role_id)?.role_name || "-"}
                                            </TableCell>
                                        )}
                                        {visibleColumns.status && (
                                            <TableCell>
                                                {user.admin?.is_active ? (
                                                    <Badge variant="default">Active</Badge>
                                                ) : (
                                                    <Badge variant="secondary">Inactive</Badge>
                                                )}
                                            </TableCell>
                                        )}
                                        {visibleColumns.created && (
                                            <TableCell>
                                                {new Date(user.created_at).toLocaleDateString()}
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
                        {Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} entries
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

            {/* Add User Dialog */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                        <DialogDescription>
                            Create a new user account. They will receive an email to set their password.
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
                        <FormField label="Role" required>
                            <Select value={formData.role_id} onValueChange={(v) => setFormData({ ...formData, role_id: v })}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map((role) => (
                                        <SelectItem key={role.id} value={role.id}>
                                            {role.role_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                        <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetForm(); }} disabled={isAddingUser}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddUser}
                            disabled={!formData.name || !formData.email || !formData.phone_number || !formData.role_id || !formData.state_id || !formData.city_id || !formData.zip || !formData.address || isAddingUser}
                            className="cursor-pointer"
                        >
                            {isAddingUser ? (
                                <>
                                    <Spinner className="mr-2" />
                                    Adding...
                                </>
                            ) : (
                                "Add User"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                            Update user information.
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
                        <FormField label="Role" required>
                            <Select value={formData.role_id} onValueChange={(v) => setFormData({ ...formData, role_id: v })}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map((role) => (
                                        <SelectItem key={role.id} value={role.id}>
                                            {role.role_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                        <Button variant="outline" onClick={() => { setEditDialogOpen(false); resetForm(); }} disabled={isEditingUser}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleEditUser}
                            disabled={!formData.name || !formData.email || !formData.phone_number || !formData.role_id || !formData.state_id || !formData.city_id || !formData.zip || !formData.address || isEditingUser}
                            className="cursor-pointer"
                        >
                            {isEditingUser ? (
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
                            Enter a new password for {selectedUser?.user_metadata?.name || selectedUser?.email}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <FormField label="New Password" required>
                            <Input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                            />
                        </FormField>
                        <FormField label="Confirm Password" required>
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                            />
                        </FormField>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setResetPasswordDialogOpen(false);
                            setNewPassword("");
                            setConfirmPassword("");
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
                        <DialogTitle>Delete User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {selectedUser?.user_metadata?.name || selectedUser?.email}?
                            This action can be undone by reactivating the user.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setSelectedUser(null); }} disabled={isDeletingUser}>
                            No
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteUser}
                            disabled={isDeletingUser}
                            className="cursor-pointer"
                        >
                            {isDeletingUser ? (
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
                            {selectedUser?.admin?.is_active ? "Deactivate" : "Activate"} User
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to {selectedUser?.admin?.is_active ? "deactivate" : "activate"}{" "}
                            {selectedUser?.user_metadata?.name || selectedUser?.email}?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setConfirmToggleActiveDialog(false); setSelectedUser(null); }} disabled={isTogglingActive}>
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
                                    {selectedUser?.admin?.is_active ? "Deactivating..." : "Activating..."}
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
                        <DialogTitle>Import Users from CSV</DialogTitle>
                        <DialogDescription>
                            Upload a CSV file to bulk import users. Download the template first if you need it.
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
                            Import Users
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
