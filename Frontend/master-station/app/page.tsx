"use client"

import * as React from "react"
import {
    Card,
    CardContent,
} from "@/components/ui/card"
import mockData from "@/data/mockData.json"
import { Waves, Truck, AlertTriangle, Activity, ArrowRight, ChevronDown, ChevronUp, Bell, Maximize2, Check, ChevronsUpDown, X } from "lucide-react"
import { LineChart, Line, ResponsiveContainer } from "recharts"
import Link from "next/link"
import { cn } from "@/lib/utils"

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"

export default function Dashboard() {
    const { dashboardStats, stations, liveAlarms } = mockData
    const [isAlarmFeedOpen, setIsAlarmFeedOpen] = React.useState(true)
    const [hasMounted, setHasMounted] = React.useState(false)
    const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>([])
    const [zoneOpen, setZoneOpen] = React.useState(false)
    const [statusOpen, setStatusOpen] = React.useState(false)
    const [selectedZones, setSelectedZones] = React.useState<string[]>([])

    // Load from localStorage on mount
    React.useEffect(() => {
        const savedStatuses = localStorage.getItem("dashboard_selectedStatuses")
        if (savedStatuses) setSelectedStatuses(JSON.parse(savedStatuses))
        const savedZones = localStorage.getItem("dashboard_selectedZones")
        if (savedZones) setSelectedZones(JSON.parse(savedZones))
        setHasMounted(true)
    }, [])

    // Persist filters to localStorage
    React.useEffect(() => {
        if (hasMounted) {
            localStorage.setItem("dashboard_selectedStatuses", JSON.stringify(selectedStatuses))
        }
    }, [selectedStatuses, hasMounted])

    React.useEffect(() => {
        if (hasMounted) {
            localStorage.setItem("dashboard_selectedZones", JSON.stringify(selectedZones))
        }
    }, [selectedZones, hasMounted])

    // Get unique zone names (station IDs)
    const stationOptions = stations.map(s => ({ value: s.id, label: s.id }))

    const statusOptions = [
        { value: "Operational", label: "Operational" },
        { value: "Alarm", label: "Alarm" },
        { value: "Maint.", label: "Maint." },
        { value: "Closed", label: "Closed" },
    ]

    // Filter stations
    const filteredStations = stations.filter(station => {
        const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(station.status)
        const matchesZone = selectedZones.length === 0 || selectedZones.includes(station.id)
        return matchesStatus && matchesZone
    })

    // Dummy data for sparkline
    const efficiencyData = dashboardStats.systemEfficiency.trend.map((val, i) => ({ val, index: i }))

    return (
        <div className="flex flex-col p-2 lg:p-4 gap-4 max-w-[1800px] mx-auto w-full text-foreground min-h-full">

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                {/* Total Volume */}
                <Card className="bg-card border-border shadow-sm text-card-foreground overflow-hidden relative group">
                    <CardContent className="p-6 flex flex-col justify-between h-[150px]">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Total Volume (24H)</p>
                                <div className="flex items-baseline gap-1.5">
                                    <h3 className="text-3xl font-bold tracking-tight">{dashboardStats.totalVolume.value}</h3>
                                    <span className="text-xs font-medium text-zinc-500">{dashboardStats.totalVolume.unit}</span>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                                <Waves className="h-5 w-5 text-blue-500" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-auto">
                            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                ↑ {dashboardStats.totalVolume.change.replace('+', '')}
                            </span>
                            <span className="text-xs text-zinc-500 leading-none">{dashboardStats.totalVolume.changeText}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Active Bays */}
                <Card className="bg-card border-border shadow-sm text-card-foreground overflow-hidden relative group">
                    <CardContent className="p-6 flex flex-col justify-between h-[150px]">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Active Bays</p>
                                <div className="flex items-baseline gap-1.5">
                                    <h3 className="text-3xl font-bold tracking-tight">{dashboardStats.activeBays.active}</h3>
                                    <span className="text-xs font-medium text-zinc-500">/ {dashboardStats.activeBays.total}</span>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                                <Truck className="h-5 w-5 text-emerald-500" />
                            </div>
                        </div>
                        <div className="mt-auto space-y-2.5">
                            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${dashboardStats.activeBays.utilization}%` }} />
                            </div>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{dashboardStats.activeBays.utilization}% Utilization</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Critical Alarms */}
                <Card className="bg-card border-border shadow-sm text-card-foreground overflow-hidden relative group border-l-[4px] border-l-red-500">
                    <CardContent className="p-6 flex flex-col justify-between h-[150px]">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Critical Alarms</p>
                                <h3 className="text-3xl font-bold text-red-500 tracking-tight">{dashboardStats.criticalAlarms.count}</h3>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:bg-red-500/20 transition-colors">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                            </div>
                        </div>
                        <div className="mt-auto flex flex-col gap-1">
                            <p className="text-xs text-zinc-500">
                                Stations: <span className="text-foreground font-medium">{dashboardStats.criticalAlarms.stations.join(", ")}</span>
                            </p>
                            <button className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-bold transition-colors w-fit">
                                Resolve Now <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </CardContent>
                </Card>

                {/* System Efficiency */}
                <Card className="bg-card border-border shadow-sm text-card-foreground overflow-hidden relative group">
                    <CardContent className="p-6 flex flex-col justify-between h-[150px] relative">
                        <div className="flex justify-between items-start z-10">
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">System Efficiency</p>
                                <h3 className="text-3xl font-bold tracking-tight">{dashboardStats.systemEfficiency.value}</h3>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
                                <Activity className="h-5 w-5 text-purple-500" />
                            </div>
                        </div>
                        {/* Sparkline overlay */}
                        <div className="absolute bottom-0 left-0 right-0 h-[60px] opacity-40 group-hover:opacity-60 transition-opacity">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={efficiencyData}>
                                    <Line type="monotone" dataKey="val" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={true} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

            </div>

            {/* Grid of Stations */}
            <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-border">
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center justify-center p-1 bg-zinc-100 dark:bg-white/5 rounded-lg border border-border dark:border-white/10 overflow-hidden size-9">
                            <img src="/logo.png" alt="SRS Master" className="size-full object-contain" />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-xl font-bold tracking-tight whitespace-nowrap">Stations Overview</h2>
                            <p className="text-xs text-zinc-500 font-medium whitespace-nowrap">Monitoring key data of all stations</p>
                        </div>
                    </div>
                    <div className="flex gap-2 items-start">
                        {/* Zone Multi-Select Combobox */}
                        <Popover open={zoneOpen} onOpenChange={setZoneOpen}>
                            <PopoverTrigger className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-700 transition-all shadow-sm min-w-[160px] cursor-pointer">
                                <span className="truncate">
                                    {selectedZones.length === 0
                                        ? "Select Station(s)"
                                        : `${selectedZones.length} selected`}
                                </span>
                                <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-0 bg-popover border-border text-popover-foreground" align="start">
                                <Command className="bg-popover">
                                    <CommandInput placeholder="Search zones..." className="text-foreground border-b border-border text-xs py-2" />
                                    <CommandList className="custom-scrollbar max-h-48">
                                        <CommandEmpty className="py-4 text-center text-xs text-zinc-400">No zone found.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                onSelect={() => {
                                                    setSelectedZones(stationOptions.map(s => s.value))
                                                }}
                                                className="text-foreground text-xs data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer py-1.5"
                                            >
                                                <div className={cn(
                                                    "mr-2 flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-blue-500",
                                                    selectedZones.length === stationOptions.length
                                                        ? "bg-blue-500 text-white"
                                                        : "opacity-50 [&_svg]:invisible"
                                                )}>
                                                    <Check className={cn("h-2.5 w-2.5")} />
                                                </div>
                                                <span className="font-bold">Select All</span>
                                            </CommandItem>
                                            <CommandItem
                                                onSelect={() => {
                                                    setSelectedZones([])
                                                }}
                                                className="text-foreground text-xs data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer py-1.5"
                                            >
                                                <div className={cn(
                                                    "mr-2 flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-blue-500",
                                                    selectedZones.length === 0
                                                        ? "bg-blue-500 text-white"
                                                        : "opacity-50 [&_svg]:invisible"
                                                )}>
                                                    <Check className={cn("h-2.5 w-2.5")} />
                                                </div>
                                                <span className="font-bold">Unselect All</span>
                                            </CommandItem>
                                            <div className="h-px bg-border my-1" />
                                            {stationOptions.map((station) => (
                                                <CommandItem
                                                    key={station.value}
                                                    value={station.value}
                                                    onSelect={() => {
                                                        setSelectedZones(
                                                            selectedZones.includes(station.value)
                                                                ? selectedZones.filter((item) => item !== station.value)
                                                                : [...selectedZones, station.value]
                                                        )
                                                    }}
                                                    className="text-foreground text-xs data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer py-1.5"
                                                >
                                                    <div className={cn(
                                                        "mr-2 flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-blue-500",
                                                        selectedZones.includes(station.value)
                                                            ? "bg-blue-500 text-white"
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

                        {/* Selected Zone Chips */}
                        {selectedZones.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {selectedZones.map(zone => (
                                    <div key={zone} className="flex items-center gap-1 bg-secondary border border-border text-[10px] text-foreground px-2 py-1.5 rounded">
                                        <span>{zone}</span>
                                        <button
                                            onClick={() => setSelectedZones(selectedZones.filter(z => z !== zone))}
                                            className="hover:text-red-400 focus:outline-none transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                {selectedZones.length > 1 && (
                                    <button
                                        onClick={() => setSelectedZones([])}
                                        className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline px-1 py-1.5 transition-colors"
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Status Multi-Select Combobox */}
                        <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                            <PopoverTrigger className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-700 transition-all shadow-sm min-w-[140px] cursor-pointer">
                                <span className="truncate">
                                    {selectedStatuses.length === 0
                                        ? "Select Status"
                                        : `${selectedStatuses.length} selected`}
                                </span>
                                <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-0 bg-popover border-border text-popover-foreground" align="start">
                                <Command className="bg-popover">
                                    <CommandInput placeholder="Search status..." className="text-foreground border-b border-border text-xs py-2" />
                                    <CommandList className="custom-scrollbar max-h-48">
                                        <CommandEmpty className="py-4 text-center text-xs text-zinc-400">No status found.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                onSelect={() => {
                                                    setSelectedStatuses(statusOptions.map(s => s.value))
                                                }}
                                                className="text-foreground text-xs data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer py-1.5"
                                            >
                                                <div className={cn(
                                                    "mr-2 flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-blue-500",
                                                    selectedStatuses.length === statusOptions.length
                                                        ? "bg-blue-500 text-white"
                                                        : "opacity-50 [&_svg]:invisible"
                                                )}>
                                                    <Check className={cn("h-2.5 w-2.5")} />
                                                </div>
                                                <span className="font-bold">Select All</span>
                                            </CommandItem>
                                            <CommandItem
                                                onSelect={() => {
                                                    setSelectedStatuses([])
                                                }}
                                                className="text-foreground text-xs data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer py-1.5"
                                            >
                                                <div className={cn(
                                                    "mr-2 flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-blue-500",
                                                    selectedStatuses.length === 0
                                                        ? "bg-blue-500 text-white"
                                                        : "opacity-50 [&_svg]:invisible"
                                                )}>
                                                    <Check className={cn("h-2.5 w-2.5")} />
                                                </div>
                                                <span className="font-bold">Unselect All</span>
                                            </CommandItem>
                                            <div className="h-px bg-border my-1" />
                                            {statusOptions.map((status) => (
                                                <CommandItem
                                                    key={status.value}
                                                    value={status.value}
                                                    onSelect={() => {
                                                        setSelectedStatuses(
                                                            selectedStatuses.includes(status.value)
                                                                ? selectedStatuses.filter((item) => item !== status.value)
                                                                : [...selectedStatuses, status.value]
                                                        )
                                                    }}
                                                    className="text-foreground text-xs data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer py-1.5"
                                                >
                                                    <div className={cn(
                                                        "mr-2 flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-blue-500",
                                                        selectedStatuses.includes(status.value)
                                                            ? "bg-blue-500 text-white"
                                                            : "opacity-50 [&_svg]:invisible"
                                                    )}>
                                                        <Check className={cn("h-2.5 w-2.5")} />
                                                    </div>
                                                    {status.label}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        {/* Selected Status Chips */}
                        {selectedStatuses.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {selectedStatuses.map(status => (
                                    <div key={status} className="flex items-center gap-1 bg-secondary border border-border text-[10px] text-foreground px-2 py-1.5 rounded">
                                        <span>{status}</span>
                                        <button
                                            onClick={() => setSelectedStatuses(selectedStatuses.filter(s => s !== status))}
                                            className="hover:text-red-400 focus:outline-none transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                {selectedStatuses.length > 1 && (
                                    <button
                                        onClick={() => setSelectedStatuses([])}
                                        className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline px-1 py-1.5 transition-colors"
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                    {filteredStations.map((station) => {
                        const status = station.status?.toLowerCase() || ""
                        const isAlarm = status.includes("alarm");
                        const isMaint = status.includes("maint");
                        const isClosed = status.includes("closed") || status === "offline" || status === "inactive";

                        let colorClass = "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]";
                        let borderClass = "border-emerald-500/20";
                        let badgeClass = "text-emerald-400 border-emerald-500/20 bg-emerald-500/10";
                        let sparkColor = "#10b981";

                        if (isAlarm) {
                            colorClass = "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]";
                            borderClass = "border-rose-500/20";
                            badgeClass = "text-rose-400 border-rose-500/20 bg-rose-500/10";
                            sparkColor = "#f43f5e";
                        } else if (isMaint) {
                            colorClass = "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]";
                            borderClass = "border-amber-500/20";
                            badgeClass = "text-amber-400 border-amber-500/20 bg-amber-500/10";
                            sparkColor = "#f59e0b";
                        } else if (isClosed) {
                            colorClass = "bg-zinc-600";
                            borderClass = "border-zinc-700";
                            badgeClass = "text-zinc-500 border-zinc-700 bg-zinc-800/50";
                            sparkColor = "#52525b";
                        }

                        const sparkData = station.trend ? station.trend.map((val, i) => ({ val, index: i })) : [];

                        return (
                            <Card key={station.id} className="bg-card border-border shadow-sm text-card-foreground overflow-hidden group hover:border-zinc-400 dark:hover:border-zinc-700 transition-all">
                                <CardContent className="p-5 flex flex-col h-[160px] relative">
                                    <div className={`absolute top-0 left-0 right-0 h-1 ${colorClass}`} />

                                    <div className="flex justify-between items-start mb-4">
                                        <div className="space-y-0.5">
                                            <h4 className="font-bold text-sm tracking-tight">{station.id}</h4>
                                            <p className="text-[10px] text-zinc-500 font-medium">SRS-NODE-{station.id.split('-')[1] || "00"}</p>
                                        </div>
                                        <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded border tracking-widest ${badgeClass}`}>
                                            {station.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Bays</p>
                                            <p className="text-xs font-black text-foreground">
                                                {station.activeBays !== null ? `${station.activeBays} / ${station.totalBays}` : "-"}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Total Flow Rate</p>
                                            <p className="text-xs font-black text-foreground">
                                                {station.flowRate !== null ? `${station.flowRate} \u33A5/h` : "-"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-auto">
                                        {isAlarm ? (
                                            <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 bg-red-500/5 p-1 rounded">
                                                <AlertTriangle className="h-3 w-3" /> {station.alarmDetail || "CRITICAL"}
                                            </p>
                                        ) : (
                                            <div className="h-6 w-full opacity-60 group-hover:opacity-100 transition-opacity">
                                                {sparkData.length > 0 ? (
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <LineChart data={sparkData}>
                                                            <Line type="monotone" dataKey="val" stroke={sparkColor} strokeWidth={2} dot={false} isAnimationActive={false} />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                ) : (
                                                    <p className="text-[10px] text-zinc-600 italic tracking-tight">Standby Mode</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>

            {/* Live Alarm Feed */}
            <div className="pt-4 pb-4">
                <div className="border border-border rounded-xl overflow-hidden bg-card shadow-xl">
                    <div className="px-6 py-4 border-b border-border flex items-center gap-3 bg-card/50">
                        <div className="bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                            <Bell className="h-4 w-4 text-red-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold tracking-widest text-card-foreground uppercase">Critical Alarm Feed</h3>
                            <p className="text-[10px] text-zinc-500 font-medium">Real-time system alerts and critical failures</p>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <Link href="/alarms" className="p-2 text-zinc-500 hover:text-foreground hover:bg-secondary rounded-xl transition-all" title="Expand View">
                                <Maximize2 className="h-4 w-4" />
                            </Link>
                            <button
                                onClick={() => setIsAlarmFeedOpen(!isAlarmFeedOpen)}
                                className="p-2 text-zinc-500 hover:text-foreground hover:bg-secondary rounded-xl transition-all"
                            >
                                {isAlarmFeedOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    {isAlarmFeedOpen && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] uppercase font-bold text-zinc-500 bg-secondary/50 border-b border-border">
                                    <tr>
                                        <th className="px-4 py-1.5 tracking-wider border-r border-border whitespace-nowrap">Time</th>
                                        <th className="px-4 py-1.5 tracking-wider border-r border-border">Station ID</th>
                                        <th className="px-4 py-1.5 tracking-wider border-r border-border">Status</th>
                                        <th className="px-4 py-1.5 tracking-wider border-r border-border">Class</th>
                                        <th className="px-4 py-1.5 tracking-wider border-r border-border">Alarm</th>
                                        <th className="px-4 py-1.5 tracking-wider border-r border-border">Description</th>
                                        <th className="px-4 py-1.5 tracking-wider">Area</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border text-muted-foreground">
                                    {liveAlarms.map((alarm) => (
                                        <tr key={alarm.id} className="hover:bg-accent transition-colors group bg-card/20">
                                            <td className="px-4 py-1.5 text-xs font-mono text-zinc-400 whitespace-nowrap">
                                                {alarm.time}
                                            </td>
                                            <td className="px-4 py-1.5 text-xs font-bold text-blue-500 whitespace-nowrap">
                                                {alarm.stationId || "N/A"}
                                            </td>
                                            <td className="px-4 py-1.5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold shadow-sm ${alarm.status === 'ACTIVE'
                                                    ? 'bg-rose-500 text-white shadow-rose-900/20'
                                                    : 'border border-border text-muted-foreground bg-transparent'
                                                    }`}>
                                                    {alarm.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-1.5 text-xs text-muted-foreground">
                                                {alarm.class}
                                            </td>
                                            <td className="px-4 py-1.5 text-xs font-medium text-foreground">
                                                {alarm.alarm}
                                            </td>
                                            <td className="px-4 py-1.5 text-xs text-muted-foreground truncate max-w-[300px]">
                                                {alarm.description}
                                            </td>
                                            <td className="px-4 py-1.5 text-xs text-muted-foreground">
                                                {alarm.area}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

        </div>
    )
}