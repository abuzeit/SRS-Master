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

const STATIONS = [
    { value: "srs-01", label: "SRS-01 Ghayathi" },
    { value: "srs-02", label: "SRS-02 Ruwais" },
    { value: "srs-03", label: "SRS-03 Madinat Zayed" },
    { value: "srs-04", label: "SRS-04 Liwa" },
    { value: "srs-05", label: "SRS-05 Mirfa" },
    { value: "srs-06", label: "SRS-06 Sila" },
]

export default function AlarmsPage() {
    const [open, setOpen] = React.useState(false)
    const [selectedStations, setSelectedStations] = React.useState<string[]>(["srs-02"])
    const [isTableExpanded, setIsTableExpanded] = React.useState(false)

    return (
        <div className="flex flex-col p-2 lg:p-4 gap-4 h-[calc(100vh-4rem)] bg-[#09090b] text-zinc-100 font-sans overflow-hidden">
            {/* Main Area */}
            <div className="flex-1 flex flex-col bg-[#09090b] relative">

                {/* Top Statistics Cards */}
                {!isTableExpanded && (
                    <div className="px-2 pt-2 pb-0 grid grid-cols-1 xl:grid-cols-3 gap-4 flex-shrink-0">

                        {/* Alarm Volume Trend Chart */}
                        <div className="xl:col-span-2 bg-[#18181b] border border-zinc-800 rounded-xl p-4 flex flex-col shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-base font-semibold text-white">Alarm Volume Trend</h3>
                                    <p className="text-sm text-zinc-400">Events per hour (Last 24h)</p>
                                </div>
                                <div className="flex items-center gap-2 px-2.5 py-1 bg-red-500/10 rounded border border-red-500/20">
                                    <TrendingUp className="text-red-500 w-4 h-4" />
                                    <span className="text-xs font-bold text-red-500">+12% vs avg</span>
                                </div>
                            </div>
                            <div className="h-48 w-full relative group">
                                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="w-full h-px border-t border-zinc-800 border-dashed"></div>
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
                                    <circle className="fill-[#09090b] stroke-red-500 hover:r-2 transition-all" cx="70" cy="10" r="1.5" strokeWidth="0.5"></circle>
                                    <circle className="fill-[#09090b] stroke-red-500 hover:r-2 transition-all" cx="90" cy="8" r="1.5" strokeWidth="0.5"></circle>
                                </svg>
                                <div className="absolute top-[10%] left-[70%] bg-zinc-800 border border-zinc-700 text-white text-xs py-1.5 px-3 rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity transform -translate-x-1/2 -translate-y-full shadow-lg">
                                    14 Events
                                </div>
                            </div>
                            <div className="flex justify-between mt-4 text-xs text-zinc-500 font-medium font-mono">
                                <span>00:00</span>
                                <span>06:00</span>
                                <span>12:00</span>
                                <span>18:00</span>
                                <span>23:59</span>
                            </div>
                        </div>

                        {/* Top Alerting Stations */}
                        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-4 flex flex-col shadow-sm overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-base font-semibold text-white">Top Alerting Stations</h3>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                                <div className="flex items-center gap-4">
                                    <div className="bg-zinc-800/50 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-zinc-300 border border-zinc-700">04</div>
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1.5">
                                            <span className="text-sm font-medium text-zinc-200">SRS-04 (North)</span>
                                            <span className="text-xs font-bold text-red-500">24 Alerts</span>
                                        </div>
                                        <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                            <div className="bg-red-500 h-1.5 rounded-full" style={{ width: '85%' }}></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="bg-zinc-800/50 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-zinc-300 border border-zinc-700">12</div>
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1.5">
                                            <span className="text-sm font-medium text-zinc-200">SRS-12 (East)</span>
                                            <span className="text-xs font-bold text-amber-500">18 Alerts</span>
                                        </div>
                                        <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                            <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '60%' }}></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="bg-zinc-800/50 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-zinc-300 border border-zinc-700">09</div>
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1.5">
                                            <span className="text-sm font-medium text-zinc-200">SRS-09 (North)</span>
                                            <span className="text-xs font-bold text-zinc-400">12 Alerts</span>
                                        </div>
                                        <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                            <div className="bg-zinc-500 h-1.5 rounded-full" style={{ width: '40%' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {/* Table Data */}
                <div className="flex-1 p-2 overflow-hidden flex flex-col">
                    <div className="bg-[#18181b] border border-zinc-800 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">

                        {/* Table Operations Heading */}
                        <div className="px-2 py-2 border-b border-zinc-800 flex items-center justify-between bg-[#18181b]">
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm font-semibold text-white">Network Alarm Analytics</h3>
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
                                    <SheetTrigger className="p-1.5 flex items-center gap-2 text-sm text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-colors border border-transparent hover:border-zinc-800 cursor-pointer">
                                        <Filter className="w-4 h-4 text-red-500" />
                                        Filters
                                    </SheetTrigger>
                                    <SheetContent side="left" className="bg-[#09090b] border-r border-zinc-800 text-zinc-100 p-0 w-80 sm:max-w-96 flex flex-col">
                                        <SheetHeader className="p-4 pb-4 border-b border-zinc-800 text-left">
                                            <SheetTitle className="text-white text-base font-semibold flex items-center gap-2">
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
                                                <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-red-500/10 text-red-500 transition-colors group w-full text-left border border-red-500/20">
                                                    <BellRing className="w-5 h-5" />
                                                    <span className="text-sm font-medium">All Alarms</span>
                                                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">142</span>
                                                </button>
                                                <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/50 text-zinc-400 transition-colors group w-full text-left border border-transparent hover:border-zinc-800">
                                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                                    <span className="text-sm font-medium text-zinc-300">Critical Only</span>
                                                    <span className="ml-auto bg-zinc-800/50 text-zinc-400 group-hover:bg-zinc-800 text-[10px] font-bold px-2 py-0.5 rounded-full">12</span>
                                                </button>
                                                <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/50 text-zinc-400 transition-colors group w-full text-left border border-transparent hover:border-zinc-800">
                                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                                    <span className="text-sm font-medium text-zinc-300">Warnings</span>
                                                    <span className="ml-auto bg-zinc-800/50 text-zinc-400 group-hover:bg-zinc-800 text-[10px] font-bold px-2 py-0.5 rounded-full">45</span>
                                                </button>
                                                <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/50 text-zinc-400 transition-colors group w-full text-left border border-transparent hover:border-zinc-800">
                                                    <Info className="w-5 h-5 text-[#13a4ec]" />
                                                    <span className="text-sm font-medium text-zinc-300">Info Logs</span>
                                                    <span className="ml-auto bg-zinc-800/50 text-zinc-400 group-hover:bg-zinc-800 text-[10px] font-bold px-2 py-0.5 rounded-full">85</span>
                                                </button>
                                            </div>

                                            {/* Station Selection using Combobox */}
                                            <div className="space-y-3 pt-4 border-t border-zinc-800">
                                                <label className="text-xs font-medium text-zinc-200">
                                                    Station Selection
                                                </label>

                                                <Popover open={open} onOpenChange={setOpen}>
                                                    <PopoverTrigger
                                                        role="combobox"
                                                        aria-expanded={open}
                                                        className="w-full flex justify-between items-center bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all cursor-pointer"
                                                    >
                                                        <span className="truncate text-zinc-300">
                                                            {selectedStations.length === 0
                                                                ? "Search stations..."
                                                                : `${selectedStations.length} station${selectedStations.length > 1 ? 's' : ''} selected`}
                                                        </span>
                                                        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-80 p-0 bg-[#09090b] border-zinc-800 text-white" align="start">
                                                        <Command className="bg-[#09090b]">
                                                            <CommandInput placeholder="Search stations..." className="text-xs text-white border-b border-zinc-800 focus:ring-0" />
                                                            <CommandList className="custom-scrollbar max-h-48">
                                                                <CommandEmpty className="py-4 text-center text-xs text-zinc-500">No station found.</CommandEmpty>
                                                                <CommandGroup className="text-zinc-400">
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
                                                                            className="text-white text-xs data-[selected=true]:bg-zinc-800/50 data-[selected=true]:text-white focus:bg-zinc-800/50 focus:text-white cursor-pointer py-2"
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
                                                                <div key={stationValue} className="flex items-center gap-1 bg-zinc-800/50 border border-zinc-700 text-[10px] text-zinc-300 px-1.5 py-0.5 rounded">
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
                                            {/* Time Range */}
                                            <div className="space-y-3 pt-4 border-t border-zinc-800">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-medium text-zinc-200">Time Range</label>
                                                    <span className="text-[10px] text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">Last 24h</span>
                                                </div>
                                                <div className="px-1">
                                                    <div className="relative pt-4 pb-2">
                                                        <div className="h-1 bg-zinc-800 rounded-full w-full relative">
                                                            <div className="absolute left-[20%] right-[30%] top-0 bottom-0 bg-red-500 rounded-full"></div>
                                                            <div className="absolute left-[20%] top-1/2 -translate-y-1/2 w-3 h-3 bg-[#09090b] border-2 border-red-500 rounded-full shadow cursor-pointer hover:scale-110 transition-transform z-10"></div>
                                                            <div className="absolute right-[30%] top-1/2 -translate-y-1/2 w-3 h-3 bg-[#09090b] border-2 border-red-500 rounded-full shadow cursor-pointer hover:scale-110 transition-transform z-10"></div>
                                                        </div>
                                                        <div className="flex justify-between mt-2 text-[10px] text-zinc-500 font-mono">
                                                            <span>00:00</span>
                                                            <span>23:59</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 border-t border-zinc-800 bg-[#09090b]">
                                            <button className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-md font-medium text-xs shadow-lg shadow-red-500/20 transition-all border border-red-500">
                                                Apply Filters
                                            </button>
                                            <button className="w-full mt-2 text-zinc-500 hover:text-white text-xs py-1 transition-colors">
                                                Reset Defaults
                                            </button>
                                        </div>
                                    </SheetContent>
                                </Sheet>

                                <div className="hidden sm:block h-4 w-px bg-zinc-800 mx-1"></div>
                                <div className="relative border-zinc-800">
                                    <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                        <Search className="w-4 h-4 text-zinc-500" />
                                    </span>
                                    <input className="pl-8 w-48 lg:w-64 bg-[#09090b] border border-zinc-800 outline-none text-xs rounded-md focus:border-red-500 focus:ring-1 focus:ring-red-500 py-1.5 text-white placeholder-zinc-500" placeholder="Filter alarms..." type="text" />
                                </div>
                                <div className="hidden sm:block h-4 w-px bg-zinc-800 mx-1"></div>
                                <button
                                    onClick={() => setIsTableExpanded(!isTableExpanded)}
                                    className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-md transition-colors border border-transparent hover:border-zinc-800"
                                    title={isTableExpanded ? "Collapse View" : "Expand View"}
                                >
                                    {isTableExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </button>
                                <button className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-md transition-colors border border-transparent hover:border-zinc-800" title="Export CSV">
                                    <Download className="w-4 h-4" />
                                </button>
                                <button className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-md transition-colors border border-transparent hover:border-zinc-800" title="Live Update">
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Actual Table Wrapper */}
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead className="sticky top-0 bg-zinc-800/80 backdrop-blur-sm z-10 text-xs text-zinc-400 font-medium border-b border-zinc-800">
                                    <tr>
                                        <th className="px-6 py-2 font-medium">Timestamp</th>
                                        <th className="px-6 py-2 font-medium">Station ID</th>
                                        <th className="px-6 py-2 font-medium w-32">Severity</th>
                                        <th className="px-6 py-2 font-medium">Parameter</th>
                                        <th className="px-6 py-2 font-medium text-right">Duration</th>
                                        <th className="px-6 py-2 font-medium text-center w-16">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-zinc-800/50 text-zinc-200 bg-[#18181b]">
                                    {[
                                        { time: "2023-10-27 10:42:15", id: "SRS-04", severity: "Critical", severityClass: "bg-red-500/10 text-red-500 border-red-500/20", indicatorClass: "bg-red-500", param: "PH High (>9.5)", duration: "15m 30s" },
                                        { time: "2023-10-27 10:40:00", id: "SRS-12", severity: "Warning", severityClass: "bg-amber-500/10 text-amber-500 border-amber-500/20", indicatorClass: "bg-amber-500", param: "Flow Rate Low", duration: "45m 00s" },
                                        { time: "2023-10-27 10:15:30", id: "SRS-01", severity: "Info", severityClass: "bg-[#13a4ec]/10 text-[#13a4ec] border-[#13a4ec]/20", indicatorClass: "bg-[#13a4ec]", param: "Pump Cycle Start", duration: "-" },
                                        { time: "2023-10-27 09:55:10", id: "SRS-04", severity: "Critical", severityClass: "bg-red-500/10 text-red-500 border-red-500/20", indicatorClass: "bg-red-500", param: "Emergency Stop Activated", duration: "2h 10m" },
                                        { time: "2023-10-27 09:30:22", id: "SRS-28", severity: "Warning", severityClass: "bg-amber-500/10 text-amber-500 border-amber-500/20", indicatorClass: "bg-amber-500", param: "Tank Level High (85%)", duration: "10m 05s" },
                                        { time: "2023-10-27 08:45:00", id: "SRS-15", severity: "Info", severityClass: "bg-[#13a4ec]/10 text-[#13a4ec] border-[#13a4ec]/20", indicatorClass: "bg-[#13a4ec]", param: "Maintenance Mode Enabled", duration: "4h 00m" },
                                        { time: "2023-10-27 08:12:45", id: "SRS-09", severity: "Critical", severityClass: "bg-red-500/10 text-red-500 border-red-500/20", indicatorClass: "bg-red-500", param: "Power Failure", duration: "30m 15s" },
                                        { time: "2023-10-27 07:55:20", id: "SRS-11", severity: "Warning", severityClass: "bg-amber-500/10 text-amber-500 border-amber-500/20", indicatorClass: "bg-amber-500", param: "Valve 4 Position Error", duration: "12m 45s" },
                                        { time: "2023-10-27 07:15:00", id: "SRS-05", severity: "Warning", severityClass: "bg-amber-500/10 text-amber-500 border-amber-500/20", indicatorClass: "bg-amber-500", param: "Temperature High (45°C)", duration: "55m 20s" },
                                        { time: "2023-10-27 06:30:10", id: "SRS-02", severity: "Critical", severityClass: "bg-red-500/10 text-red-500 border-red-500/20", indicatorClass: "bg-red-500", param: "Pump 2 Overload", duration: "1h 25m" },
                                    ].slice(0, isTableExpanded ? 10 : 5).map((row, idx) => (
                                        <tr key={idx} className="group hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-6 py-2 font-mono text-xs text-zinc-500 group-hover:text-white">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                                                    {row.time}
                                                </div>
                                            </td>
                                            <td className="px-6 py-2 font-medium text-white">{row.id}</td>
                                            <td className="px-6 py-2 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border ${row.severityClass}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${row.indicatorClass}`}></span>
                                                    {row.severity}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-2 text-sm ${row.severity === 'Critical' ? 'font-medium text-zinc-200' : 'text-zinc-300'}`}>
                                                {row.param}
                                            </td>
                                            <td className="px-6 py-2 text-right font-mono text-zinc-400">
                                                {row.duration}
                                            </td>
                                            <td className="px-6 py-2 text-center">
                                                <button className="text-zinc-500 hover:text-red-500 transition-colors p-1 rounded hover:bg-white/5">
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-6 py-2 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500 bg-[#18181b]">
                            <span>Showing 1-{isTableExpanded ? 10 : 5} of 142 records</span>
                            <div className="flex items-center gap-1">
                                <button className="p-1 hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed" disabled>
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button className="w-6 h-6 flex items-center justify-center rounded bg-red-500 text-white font-medium">1</button>
                                <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors">2</button>
                                <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors">3</button>
                                <span className="mx-1">...</span>
                                <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors">21</button>
                                <button className="p-1 hover:bg-white/10 rounded">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    )
}
