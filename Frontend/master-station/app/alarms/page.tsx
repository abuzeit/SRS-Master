"use client"

import * as React from "react"
import {
    BellRing,
    AlertCircle,
    AlertTriangle,
    Info,
    Search,
    Download,
    RefreshCw,
    TrendingUp,
    Clock,
    Filter,
    Check,
    ChevronsUpDown,
    X,
    Maximize2,
    Minimize2,
    ChevronLeft,
    ChevronRight,
    Eye
} from "lucide-react"

import { cn } from "@/lib/utils"
import mockData from "@/data/mockData.json"

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

const STATIONS = mockData.stations.map(s => ({
    value: s.id,
    label: `${s.id} ${s.name}`
}))

export default function AlarmsPage() {
    const [open, setOpen] = React.useState(false)
    const [hasMounted, setHasMounted] = React.useState(false)
    const [selectedStations, setSelectedStations] = React.useState<string[]>([])
    const [isTableExpanded, setIsTableExpanded] = React.useState(false)

    // Top Alerting Stations calculation
    const topAlertingStations = React.useMemo(() => {
        const counts = mockData.alarms.reduce((acc, curr) => {
            acc[curr.stationId] = (acc[curr.stationId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);
    }, []);

    // Filtering states
    const [searchQuery, setSearchQuery] = React.useState("")
    const [selectedSeverity, setSelectedSeverity] = React.useState<string | null>(null)
    const [startDate, setStartDate] = React.useState("")
    const [endDate, setEndDate] = React.useState("")

    // Load from localStorage on mount
    React.useEffect(() => {
        const savedStations = localStorage.getItem("alarms_selectedStations")
        if (savedStations) setSelectedStations(JSON.parse(savedStations))

        const savedSearch = localStorage.getItem("alarms_searchQuery")
        if (savedSearch) setSearchQuery(savedSearch)

        const savedSeverity = localStorage.getItem("alarms_selectedSeverity")
        if (savedSeverity) setSelectedSeverity(JSON.parse(savedSeverity))

        const savedStart = localStorage.getItem("alarms_startDate")
        if (savedStart) setStartDate(savedStart)

        const savedEnd = localStorage.getItem("alarms_endDate")
        if (savedEnd) setEndDate(savedEnd)

        setHasMounted(true)
    }, [])

    // Persist filters to localStorage
    React.useEffect(() => {
        if (hasMounted) {
            localStorage.setItem("alarms_selectedStations", JSON.stringify(selectedStations))
        }
    }, [selectedStations, hasMounted])

    React.useEffect(() => {
        if (hasMounted) {
            localStorage.setItem("alarms_searchQuery", searchQuery)
        }
    }, [searchQuery, hasMounted])

    React.useEffect(() => {
        if (hasMounted) {
            localStorage.setItem("alarms_selectedSeverity", JSON.stringify(selectedSeverity))
        }
    }, [selectedSeverity, hasMounted])

    React.useEffect(() => {
        if (hasMounted) {
            localStorage.setItem("alarms_startDate", startDate)
        }
    }, [startDate, hasMounted])

    React.useEffect(() => {
        if (hasMounted) {
            localStorage.setItem("alarms_endDate", endDate)
        }
    }, [endDate, hasMounted])

    // Pagination state
    const [currentPage, setCurrentPage] = React.useState(1)
    const itemsPerPage = isTableExpanded ? 10 : 5

    // Counts for filters
    const severityCounts = React.useMemo(() => {
        return mockData.alarms.reduce((acc, curr) => {
            acc[curr.severity] = (acc[curr.severity] || 0) + 1;
            acc['All'] = (acc['All'] || 0) + 1;
            return acc;
        }, {} as Record<string, number>)
    }, [])

    // Filter Logic
    const filteredAlarms = React.useMemo(() => {
        return mockData.alarms.filter(alarm => {
            // Global search
            const matchesSearch = searchQuery === "" ||
                Object.values(alarm).some(val =>
                    val?.toString().toLowerCase().includes(searchQuery.toLowerCase())
                )

            // Station filter
            const matchesStation = selectedStations.length === 0 || selectedStations.includes(alarm.stationId)

            // Severity filter
            const matchesSeverity = !selectedSeverity || alarm.severity === selectedSeverity

            // Date filter
            const logDate = alarm.time ? new Date(alarm.time.split(' ')[0]) : null
            const matchesStartDate = !startDate || (logDate && logDate >= new Date(startDate))
            const matchesEndDate = !endDate || (logDate && logDate <= new Date(endDate))

            return matchesSearch && matchesStation && matchesSeverity && matchesStartDate && matchesEndDate
        })
    }, [searchQuery, selectedStations, selectedSeverity, startDate, endDate])

    // Pagination Logic
    const totalPages = Math.ceil(filteredAlarms.length / itemsPerPage)
    const paginatedAlarms = filteredAlarms.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    const resetFilters = () => {
        setSearchQuery("")
        setSelectedSeverity(null)
        setSelectedStations([])
        setStartDate("")
        setEndDate("")
        setCurrentPage(1)
    }

    React.useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, selectedStations, selectedSeverity, startDate, endDate, itemsPerPage])

    return (
        <div className="flex flex-col p-2 lg:p-4 gap-4 h-[calc(100vh-4rem)] bg-background text-foreground font-sans overflow-hidden">
            {/* Main Area */}
            <div className="flex-1 flex flex-col bg-background relative">

                {/* Top Statistics Cards */}
                {!isTableExpanded && (
                    <div className="px-2 pt-2 pb-0 grid grid-cols-1 xl:grid-cols-3 gap-4 flex-shrink-0">

                        {/* Alarm Volume Trend Chart */}
                        <div className="xl:col-span-2 bg-card border border-border rounded-xl p-4 flex flex-col shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-base font-semibold text-card-foreground">Alarm Volume Trend</h3>
                                    <p className="text-sm text-muted-foreground">Events per hour (Last 24h)</p>
                                </div>
                                <div className="flex items-center gap-2 px-2.5 py-1 bg-red-500/10 rounded border border-red-500/20">
                                    <TrendingUp className="text-red-500 w-4 h-4" />
                                    <span className="text-xs font-bold text-red-500">+12% vs avg</span>
                                </div>
                            </div>
                            <div className="h-48 w-full relative group">
                                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="w-full h-px border-t border-border border-dashed"></div>
                                    ))}
                                </div>
                                <svg className="w-full h-full absolute inset-0 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 50">
                                    <defs>
                                        <linearGradient id="chartGradientAlarms" x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2"></stop>
                                            <stop offset="100%" stopColor="#ef4444" stopOpacity="0"></stop>
                                        </linearGradient>
                                    </defs>
                                    <path d="M0,50 L0,35 L10,30 L20,38 L30,25 L40,28 L50,15 L60,20 L70,10 L80,18 L90,8 L100,20 L100,50 Z" fill="url(#chartGradientAlarms)"></path>
                                    <path d="M0,35 L10,30 L20,38 L30,25 L40,28 L50,15 L60,20 L70,10 L80,18 L90,8 L100,20" fill="none" stroke="#ef4444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.8" vectorEffect="non-scaling-stroke"></path>
                                    <circle className="fill-background stroke-red-500 hover:r-2 transition-all" cx="70" cy="10" r="1.5" strokeWidth="0.5"></circle>
                                    <circle className="fill-background stroke-red-500 hover:r-2 transition-all" cx="90" cy="8" r="1.5" strokeWidth="0.5"></circle>
                                </svg>
                                <div className="absolute top-[10%] left-[70%] bg-popover border border-border text-popover-foreground text-xs py-1.5 px-3 rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity transform -translate-x-1/2 -translate-y-full shadow-lg">
                                    14 Events
                                </div>
                            </div>
                            <div className="flex justify-between mt-4 text-xs text-muted-foreground font-medium font-mono">
                                <span>00:00</span>
                                <span>06:00</span>
                                <span>12:00</span>
                                <span>18:00</span>
                                <span>23:59</span>
                            </div>
                        </div>

                        {/* Top Alerting Stations */}
                        <div className="bg-card border border-border rounded-xl p-4 flex flex-col shadow-sm overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-base font-semibold text-card-foreground">Top Alerting Stations</h3>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                                {topAlertingStations.map(([stationId, count], i) => {
                                    const station = mockData.stations.find(s => s.id === stationId);
                                    return (
                                        <div key={i} className="flex items-center gap-4">
                                            <div className="bg-secondary w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-foreground border border-border">
                                                {stationId.split('-')[1]}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between mb-1.5">
                                                    <span className="text-sm font-medium text-foreground">{station?.name || stationId}</span>
                                                    <span className="text-xs font-bold text-red-500">{count} Alerts</span>
                                                </div>
                                                <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                                                    <div className="bg-red-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${(count / Number(topAlertingStations[0][1])) * 100}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                )}

                {/* Table Data */}
                <div className="flex-1 p-4 overflow-hidden flex flex-col">
                    <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col h-full overflow-hidden">

                        {/* Table Operations Heading */}
                        <div className="px-2 py-2 border-b border-border flex items-center justify-between bg-card">
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm font-semibold text-card-foreground">Network Alarm Analytics</h3>
                                <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                    </span>
                                    <span className="text-[10px] font-medium text-red-500">Live Feed</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                <Sheet>
                                    <SheetTrigger className="p-1.5 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors border border-transparent hover:border-border cursor-pointer">
                                        <Filter className="w-4 h-4 text-red-500" />
                                        Filters
                                    </SheetTrigger>
                                    <SheetContent side="left" className="bg-background border-r border-border text-foreground p-0 w-80 sm:max-w-96 flex flex-col">
                                        <SheetHeader className="p-4 pb-4 border-b border-border text-left">
                                            <SheetTitle className="text-foreground text-base font-semibold flex items-center gap-2">
                                                <Filter className="w-5 h-5 text-red-500" />
                                                Alarm Filters
                                            </SheetTitle>
                                            <SheetDescription className="text-[11px] text-zinc-500">
                                                Drill down into network data
                                            </SheetDescription>
                                        </SheetHeader>

                                        {/* Filters Content */}
                                        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                                            <div className="flex flex-col gap-1">
                                                <button
                                                    onClick={() => setSelectedSeverity(null)}
                                                    className={cn(
                                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group w-full text-left border",
                                                        selectedSeverity === null ? "bg-red-500/10 text-red-500 border-red-500/20" : "hover:bg-accent text-muted-foreground border-transparent hover:border-border"
                                                    )}
                                                >
                                                    <BellRing className="w-5 h-5" />
                                                    <span className="text-sm font-medium">All Alarms</span>
                                                    <span className="ml-auto bg-accent text-muted-foreground group-hover:bg-accent/80 text-[10px] font-bold px-2 py-0.5 rounded-full">{severityCounts['All']}</span>
                                                </button>
                                                <button
                                                    onClick={() => setSelectedSeverity("Critical")}
                                                    className={cn(
                                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group w-full text-left border",
                                                        selectedSeverity === "Critical" ? "bg-red-500/10 text-red-500 border-red-500/20" : "hover:bg-accent text-muted-foreground border-transparent hover:border-border"
                                                    )}
                                                >
                                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                                    <span className="text-sm font-medium text-foreground">Critical Only</span>
                                                    <span className="ml-auto bg-accent text-muted-foreground group-hover:bg-accent/80 text-[10px] font-bold px-2 py-0.5 rounded-full">{severityCounts['Critical']}</span>
                                                </button>
                                                <button
                                                    onClick={() => setSelectedSeverity("Warning")}
                                                    className={cn(
                                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group w-full text-left border",
                                                        selectedSeverity === "Warning" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "hover:bg-accent text-muted-foreground border-transparent hover:border-border"
                                                    )}
                                                >
                                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                                    <span className="text-sm font-medium text-foreground">Warnings</span>
                                                    <span className="ml-auto bg-accent text-muted-foreground group-hover:bg-accent/80 text-[10px] font-bold px-2 py-0.5 rounded-full">{severityCounts['Warning']}</span>
                                                </button>
                                                <button
                                                    onClick={() => setSelectedSeverity("Info")}
                                                    className={cn(
                                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group w-full text-left border",
                                                        selectedSeverity === "Info" ? "bg-[#13a4ec]/10 text-[#13a4ec] border-[#13a4ec]/20" : "hover:bg-accent text-muted-foreground border-transparent hover:border-border"
                                                    )}
                                                >
                                                    <Info className="w-5 h-5 text-[#13a4ec]" />
                                                    <span className="text-sm font-medium text-foreground">Info Logs</span>
                                                    <span className="ml-auto bg-accent text-muted-foreground group-hover:bg-accent/80 text-[10px] font-bold px-2 py-0.5 rounded-full">{severityCounts['Info']}</span>
                                                </button>
                                            </div>

                                            {/* Station Selection using Combobox */}
                                            <div className="space-y-3 pt-4 border-t border-border">
                                                <label className="text-xs font-medium text-foreground">
                                                    Station Selection
                                                </label>

                                                <Popover open={open} onOpenChange={setOpen}>
                                                    <PopoverTrigger
                                                        role="combobox"
                                                        aria-expanded={open}
                                                        className="w-full flex justify-between items-center bg-background border border-border rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all cursor-pointer"
                                                    >
                                                        <span className="truncate text-muted-foreground">
                                                            {selectedStations.length === 0
                                                                ? "Select Station(s)"
                                                                : `${selectedStations.length} station${selectedStations.length > 1 ? 's' : ''} selected`}
                                                        </span>
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-72 p-0 bg-popover border-border text-popover-foreground" align="start">
                                                        <Command className="bg-popover">
                                                            <CommandInput placeholder="Search stations..." className="text-foreground border-b border-border text-xs py-2" />
                                                            <CommandList className="custom-scrollbar max-h-48">
                                                                <CommandEmpty className="py-4 text-center text-xs text-zinc-500">No station found.</CommandEmpty>
                                                                <CommandGroup className="text-muted-foreground">
                                                                    {STATIONS.map((station) => (
                                                                        <CommandItem
                                                                            key={station.value}
                                                                            value={station.value}
                                                                            onSelect={() => {
                                                                                setSelectedStations(
                                                                                    selectedStations.includes(station.value)
                                                                                        ? selectedStations.filter((item) => item !== station.value)
                                                                                        : [...selectedStations, station.value]
                                                                                )
                                                                            }}
                                                                            className="text-foreground text-xs data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer py-2"
                                                                        >
                                                                            <div className={cn(
                                                                                "mr-2 flex h-3 w-3 items-center justify-center rounded-[2px] border border-red-500",
                                                                                selectedStations.includes(station.value)
                                                                                    ? "bg-red-500 text-white"
                                                                                    : "opacity-50 [&_svg]:invisible"
                                                                            )}>
                                                                                <Check className={cn("h-2.5 w-2.5")} />
                                                                            </div>
                                                                            {station.label}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>

                                                {selectedStations.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {selectedStations.map(stationValue => {
                                                            const station = STATIONS.find(s => s.value === stationValue);
                                                            return station ? (
                                                                <div key={stationValue} className="flex items-center gap-1 bg-secondary border border-border text-[10px] text-foreground px-2 py-1 rounded">
                                                                    {station.label}
                                                                    <button
                                                                        onClick={() => setSelectedStations(selectedStations.filter(s => s !== stationValue))}
                                                                        className="hover:text-red-400 focus:outline-none transition-colors"
                                                                    >
                                                                        <X className="w-2.5 h-2.5" />
                                                                    </button>
                                                                </div>
                                                            ) : null;
                                                        })}
                                                        {selectedStations.length > 1 && (
                                                            <button
                                                                onClick={() => setSelectedStations([])}
                                                                className="text-[10px] text-red-500 hover:text-red-400 hover:underline px-1 py-0.5 transition-colors"
                                                            >
                                                                Clear all
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {/* Severity Filter Buttons */}
                                            <div className="space-y-3 pt-4 border-t border-border">
                                                <label className="text-xs font-medium text-foreground">Severity</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {['All', 'CRITICAL', 'MAJOR', 'MINOR', 'WARNING', 'INFO'].map((sev) => (
                                                        <button
                                                            key={sev}
                                                            onClick={() => setSelectedSeverity(sev === 'All' ? null : sev)}
                                                            className={cn(
                                                                "flex items-center justify-between px-3 py-2 rounded-md border text-[10px] font-bold transition-all",
                                                                (selectedSeverity === sev || (sev === 'All' && !selectedSeverity))
                                                                    ? "bg-red-500/10 border-red-500 text-red-500"
                                                                    : "bg-background border-border text-muted-foreground hover:bg-accent"
                                                            )}
                                                        >
                                                            {sev}
                                                            <span className="opacity-60">{severityCounts[sev] || 0}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            {/* Time Range */}
                                            <div className="space-y-3 pt-4 border-t border-border">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-medium text-foreground">Time Range</label>
                                                    <span className="text-[10px] text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">Last 24h</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    <div>
                                                        <label className="text-[10px] text-muted-foreground mb-1 block">Start Date</label>
                                                        <input
                                                            className="bg-background border border-border text-[11px] text-foreground rounded px-2 py-1.5 w-full focus:border-red-500 focus:ring-1 focus:ring-red-500 placeholder-muted-foreground outline-none"
                                                            type="date"
                                                            value={startDate}
                                                            onChange={(e) => setStartDate(e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-muted-foreground mb-1 block">End Date</label>
                                                        <input
                                                            className="bg-background border border-border text-[11px] text-foreground rounded px-2 py-1.5 w-full focus:border-red-500 focus:ring-1 focus:ring-red-500 placeholder-muted-foreground outline-none"
                                                            type="date"
                                                            value={endDate}
                                                            onChange={(e) => setEndDate(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 border-t border-border bg-background">
                                            <button
                                                className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-md font-medium text-xs shadow-lg shadow-red-500/20 transition-all border border-red-500"
                                                onClick={() => { /* Filters already reflect state */ }}
                                            >
                                                Apply Filters
                                            </button>
                                            <button
                                                className="w-full mt-2 text-muted-foreground hover:text-foreground text-xs py-1 transition-colors"
                                                onClick={resetFilters}
                                            >
                                                Reset Defaults
                                            </button>
                                        </div>
                                    </SheetContent>
                                </Sheet>

                                <div className="hidden sm:block h-4 w-px bg-border mx-1"></div>
                                <div className="relative border-border">
                                    <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                        <Search className="w-4 h-4 text-muted-foreground" />
                                    </span>
                                    <input
                                        className="pl-8 w-48 lg:w-64 bg-background border border-border outline-none text-xs rounded-md focus:border-red-500 py-1.5 text-foreground placeholder-muted-foreground"
                                        placeholder="Filter alarms..."
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="hidden sm:block h-4 w-px bg-border mx-1"></div>
                                <button
                                    onClick={() => setIsTableExpanded(!isTableExpanded)}
                                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors border border-transparent hover:border-border"
                                    title={isTableExpanded ? "Collapse View" : "Expand View"}
                                >
                                    {isTableExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </button>
                                <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors border border-transparent hover:border-border" title="Export CSV">
                                    <Download className="w-4 h-4" />
                                </button>
                                <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors border border-transparent hover:border-border" title="Live Update">
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Actual Table Wrapper */}
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10 text-xs text-muted-foreground font-medium border-b border-border">
                                    <tr>
                                        <th className="px-6 py-2 font-medium">Timestamp</th>
                                        <th className="px-6 py-2 font-medium">Station ID</th>
                                        <th className="px-6 py-2 font-medium w-32">Severity</th>
                                        <th className="px-6 py-2 font-medium">Parameter</th>
                                        <th className="px-6 py-2 font-medium text-right">Duration</th>
                                        <th className="px-6 py-2 font-medium text-center w-16">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-border text-foreground bg-card">
                                    {paginatedAlarms.map((row, idx) => (
                                        <tr key={idx} className="group hover:bg-accent/50 transition-colors">
                                            <td className="px-6 py-2 font-mono text-xs text-muted-foreground group-hover:text-foreground">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                                    {row.time}
                                                </div>
                                            </td>
                                            <td className="px-6 py-2 font-medium text-foreground">{row.stationId}</td>
                                            <td className="px-6 py-2 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border ${row.severityClass}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${row.indicatorClass}`}></span>
                                                    {row.severity}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-2 text-sm ${row.severity === 'Critical' ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                                                {row.param}
                                            </td>
                                            <td className="px-6 py-2 text-right font-mono text-muted-foreground">
                                                {row.duration}
                                            </td>
                                            <td className="px-6 py-2 text-center">
                                                <button className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded hover:bg-accent">
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-6 py-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-card">
                            <span>Showing {filteredAlarms.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, filteredAlarms.length)} of {filteredAlarms.length} records</span>
                            <div className="flex items-center gap-1">
                                <button
                                    className="p-1 hover:bg-accent rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>

                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum = i + 1;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={cn(
                                                "w-6 h-6 flex items-center justify-center rounded transition-colors",
                                                currentPage === pageNum ? "bg-red-500 text-white font-medium" : "hover:bg-accent"
                                            )}
                                        >
                                            {pageNum}
                                        </button>
                                    )
                                })}

                                {totalPages > 5 && <span className="mx-1">...</span>}
                                {totalPages > 5 && (
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        className={cn(
                                            "w-6 h-6 flex items-center justify-center rounded transition-colors",
                                            currentPage === totalPages ? "bg-red-500 text-white font-medium" : "hover:bg-accent"
                                        )}
                                    >
                                        {totalPages}
                                    </button>
                                )}

                                <button
                                    className="p-1 hover:bg-accent rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div >
    )
}
