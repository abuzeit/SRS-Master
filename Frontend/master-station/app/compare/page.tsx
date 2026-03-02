"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import {
    MoreHorizontal,
    Droplets,
    FlaskConical,
    Zap,
    Truck,
    ArrowDown,
    ArrowUp,
    Minus,
    ArrowRight,
    Check,
    ChevronsUpDown,
    Search
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import mockData from "@/data/mockData.json"
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

// Helper to generate consistent mock data for fields not in JSON
const getStationExtendedData = (stationId: string) => {
    const seed = stationId.split('-').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const seededRandom = (s: number) => {
        const x = Math.sin(s) * 10000
        return x - Math.floor(x)
    }

    return {
        operations: Math.floor(seededRandom(seed) * 50) + 20,
        temp: (18 + seededRandom(seed + 1) * 10).toFixed(1),
        pressure: (2.5 + seededRandom(seed + 2) * 1.5).toFixed(2),
        dischargeTrend: Array.from({ length: 7 }, (_, i) => Math.floor(seededRandom(seed + i + 10) * 100)),
        opsTrend: Array.from({ length: 8 }, (_, i) => Math.floor(seededRandom(seed + i + 20) * 100)),
        logs: [
            { time: "10:45 AM", event: "Standard Flush", status: "Success", type: "success" },
            { time: "10:12 AM", event: "Sensor Sync", status: "Routine", type: "info" },
            { time: "09:55 AM", event: "Calibration", status: "In Progress", type: "warning" },
        ]
    }
}

export default function ComparePage() {
    const [scrolled, setScrolled] = useState(false)
    const [scrollTier, setScrollTier] = useState(0)
    const [stationAId, setStationAId] = useState("Station-01")
    const [stationBId, setStationBId] = useState("Station-04")
    const [rotation, setRotation] = useState(0)
    const [openA, setOpenA] = useState(false)
    const [openB, setOpenB] = useState(false)

    const stationA = useMemo(() => mockData.stations.find(s => s.id === stationAId) || mockData.stations[0], [stationAId])
    const stationB = useMemo(() => mockData.stations.find(s => s.id === stationBId) || mockData.stations[1], [stationBId])

    const extraA = useMemo(() => getStationExtendedData(stationA.id), [stationA.id])
    const extraB = useMemo(() => getStationExtendedData(stationB.id), [stationB.id])

    useEffect(() => {
        const handleScroll = () => {
            const y = window.scrollY
            setScrolled(y > 20)
            if (y > 550) setScrollTier(3)
            else if (y > 350) setScrollTier(2)
            else if (y > 150) setScrollTier(1)
            else setScrollTier(0)
        }
        window.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll()
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const calculateVariance = (valA: number, valB: number, isPercentage = false) => {
        const diff = valA - valB
        if (isPercentage) return `${Math.abs(diff).toFixed(1)}%`
        return Math.abs(diff).toFixed(valA % 1 === 0 && valB % 1 === 0 ? 0 : 1)
    }

    const getVarianceColor = (valA: number, valB: number, higherIsBetter = true) => {
        if (valA === valB) return "text-zinc-500"
        if (higherIsBetter) return valA > valB ? "text-emerald-500" : "text-rose-500"
        return valA < valB ? "text-emerald-500" : "text-rose-500"
    }

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, staggerChildren: 0.1 }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: { opacity: 1, scale: 1 }
    }

    const getStatusColor = (status: string) => {
        const s = status.toLowerCase()
        if (s.includes('operational')) return 'emerald'
        if (s.includes('alarm')) return 'rose'
        if (s.includes('maint')) return 'amber'
        return 'zinc'
    }

    const handleSwap = () => {
        const temp = stationAId
        setStationAId(stationBId)
        setStationBId(temp)
        setRotation(prev => prev + 180)
    }

    return (
        <div className="flex flex-col p-2 lg:p-4 gap-4 max-w-[1800px] mx-auto w-full text-zinc-100">
            {/* Header & Selectors */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
                <div>
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-2xl font-bold tracking-tight text-white"
                    >
                        Station Comparison
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-zinc-500 mt-1 text-xs max-w-2xl"
                    >
                        Compare real-time metrics and historical performance data between two receiving stations side-by-side.
                    </motion.p>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-[#09090b] p-1.5 rounded-xl border border-zinc-800 shadow-2xl w-full md:w-auto overflow-hidden">
                    {/* Station A Selector */}
                    <div className="flex flex-col flex-grow sm:flex-grow-0">
                        <Popover open={openA} onOpenChange={setOpenA}>
                            <PopoverTrigger className="flex flex-col items-start px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all text-left min-w-[180px] group border-none bg-transparent">
                                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest leading-none mb-1.5 group-hover:text-zinc-400">Station A</span>
                                <div className="flex items-center justify-between w-full gap-2">
                                    <span className="text-sm font-bold text-white truncate">{stationA.id} <span className="text-zinc-500 font-medium ml-1">({stationA.name})</span></span>
                                    <ChevronsUpDown className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-[240px] p-0 bg-[#09090b] border-zinc-800 shadow-2xl z-50" align="start">
                                <Command className="bg-[#09090b] text-white border-none">
                                    <CommandInput placeholder="Search station..." className="h-9 text-xs border-none focus:ring-0" />
                                    <CommandList className="max-h-[300px] custom-scrollbar overflow-y-auto">
                                        <CommandEmpty className="py-6 text-center text-xs text-zinc-500 italic">No station found.</CommandEmpty>
                                        <CommandGroup>
                                            {mockData.stations.map((s) => (
                                                <CommandItem
                                                    key={s.id}
                                                    value={`${s.id} ${s.name}`}
                                                    onSelect={() => {
                                                        setStationAId(s.id)
                                                        setOpenA(false)
                                                    }}
                                                    className="flex items-center justify-between px-3 py-2 text-xs text-zinc-400 aria-selected:bg-zinc-800 aria-selected:text-white cursor-pointer"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="font-bold">{s.id}</span>
                                                        <span className="text-[10px] opacity-60">{s.name}</span>
                                                    </div>
                                                    {stationAId === s.id && <Check className="h-3.5 w-3.5 text-[#13a4ec]" strokeWidth={3} />}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="h-10 w-px bg-zinc-800/80 mx-1 hidden sm:block"></div>

                    <motion.button
                        animate={{ rotate: rotation }}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.85 }}
                        transition={{ type: "spring", stiffness: 300, damping: 15 }}
                        onClick={handleSwap}
                        className="flex items-center justify-center h-9 w-9 rounded-full bg-[#13a4ec] text-white shadow-[0_0_15px_rgba(19,164,236,0.4)] hover:bg-[#13a4ec]/90 transition-colors flex-shrink-0 z-10"
                        title="Swap Stations"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                    </motion.button>

                    <div className="h-10 w-px bg-zinc-800/80 mx-1 hidden sm:block"></div>

                    {/* Station B Selector */}
                    <div className="flex flex-col flex-grow sm:flex-grow-0 text-right">
                        <Popover open={openB} onOpenChange={setOpenB}>
                            <PopoverTrigger className="flex flex-col items-end px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all text-right min-w-[180px] group border-none bg-transparent">
                                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest leading-none mb-1.5 group-hover:text-zinc-400">Station B</span>
                                <div className="flex items-center justify-end w-full gap-2">
                                    <ChevronsUpDown className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                                    <span className="text-sm font-bold text-white truncate">{stationB.id} <span className="text-zinc-500 font-medium ml-1">({stationB.name})</span></span>
                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-[240px] p-0 bg-[#09090b] border-zinc-800 shadow-2xl z-50" align="end">
                                <Command className="bg-[#09090b] text-white border-none">
                                    <CommandInput placeholder="Search station..." className="h-9 text-xs border-none focus:ring-0" />
                                    <CommandList className="max-h-[300px] custom-scrollbar overflow-y-auto">
                                        <CommandEmpty className="py-6 text-center text-xs text-zinc-500 italic">No station found.</CommandEmpty>
                                        <CommandGroup>
                                            {mockData.stations.map((s) => (
                                                <CommandItem
                                                    key={s.id}
                                                    value={`${s.id} ${s.name}`}
                                                    onSelect={() => {
                                                        setStationBId(s.id)
                                                        setOpenB(false)
                                                    }}
                                                    className="flex items-center justify-between px-3 py-2 text-xs text-zinc-400 aria-selected:bg-zinc-800 aria-selected:text-white cursor-pointer"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="font-bold">{s.id}</span>
                                                        <span className="text-[10px] opacity-60">{s.name}</span>
                                                    </div>
                                                    {stationBId === s.id && <Check className="h-3.5 w-3.5 text-[#13a4ec]" strokeWidth={3} />}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>

            {/* Main Grid: Row-based for perfect alignment */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_120px_1fr] gap-4 lg:gap-x-8 lg:gap-y-8 items-stretch relative">
                {/* Visual Connector: Middle vertical line */}
                <div className="absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-transparent via-zinc-800 to-transparent -translate-x-1/2 -z-10 hidden lg:block" style={{ gridColumn: 2 }}></div>

                {/* --- ROW 1: HEADERS (Sticky) --- */}
                {/* Station A Header */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`side-A-${stationA.id}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={`sticky top-[88px] z-30 transition-all duration-300 rounded-xl border border-zinc-800 relative overflow-hidden group ${scrolled
                            ? "bg-[#18181b]/95 backdrop-blur-md shadow-2xl py-2 px-4 ring-1 ring-zinc-700/50"
                            : "bg-[#18181b] p-4"
                            }`}
                    >
                        <div className={`absolute top-0 left-0 w-1 bg-${getStatusColor(stationA.status)}-500 h-full opacity-100`}></div>
                        <div className="flex justify-between items-center whitespace-nowrap">
                            <div className="flex items-center gap-4">
                                <div className={`flex flex-col transition-all duration-300 ${scrolled ? "transform scale-90 origin-left" : ""}`}>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={`flex h-1.5 w-1.5 rounded-full bg-${getStatusColor(stationA.status)}-500 ${stationA.status.toLowerCase().includes('maint') ? 'animate-pulse' : ''}`}></span>
                                        <span className={`text-${getStatusColor(stationA.status)}-500 font-bold uppercase tracking-wider transition-all ${scrolled ? "text-[8px]" : "text-[10px]"}`}>{stationA.status}</span>
                                    </div>
                                    <h3 className={`font-bold text-white tracking-tight transition-all duration-300 ${scrolled ? "text-lg" : "text-2xl"}`}>{stationA.id}</h3>
                                    {!scrolled && <p className="text-xs text-zinc-500 transition-opacity duration-200">{stationA.name} • Uptime: {stationA.uptime}</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-4 mr-2">
                                    {scrollTier >= 1 && (
                                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col items-end">
                                            <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest leading-none mb-1">Total Flow Rate</span>
                                            <span className="text-sm font-bold text-white leading-none">{stationA.flowRate || 0}<span className="text-[8px] font-normal text-zinc-500 ml-0.5">m³/h</span></span>
                                        </motion.div>
                                    )}
                                    {scrollTier >= 2 && (
                                        <>
                                            <div className="h-6 w-px bg-zinc-800/50" />
                                            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col items-end">
                                                <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest leading-none mb-1">Average pH</span>
                                                <span className="text-sm font-bold text-white leading-none tracking-tight">{stationA.ph || "--"}</span>
                                            </motion.div>
                                        </>
                                    )}
                                    {scrollTier >= 3 && (
                                        <>
                                            <div className="h-6 w-px bg-zinc-800/50" />
                                            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col items-end">
                                                <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest leading-none mb-1">Average Conductivity</span>
                                                <span className="text-sm font-bold text-white leading-none tracking-tight">{stationA.conductivity || "--"}</span>
                                            </motion.div>
                                        </>
                                    )}
                                </div>
                                <button className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-white/5 text-zinc-500 transition-colors">
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Variance Label Header */}
                <div className={`sticky top-[88px] z-20 flex flex-col items-center justify-center transition-all duration-300`}>
                    <div className={`flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm rounded-full px-3 py-1 ring-1 ring-zinc-800 transition-all ${scrolled ? "opacity-100 scale-90" : "opacity-50"}`}>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 whitespace-nowrap">Variance</span>
                    </div>
                </div>

                {/* Station B Header */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`side-B-${stationB.id}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={`sticky top-[88px] z-30 transition-all duration-300 rounded-xl border border-zinc-800 relative overflow-hidden group ${scrolled
                            ? "bg-[#18181b]/95 backdrop-blur-md shadow-2xl py-2 px-4 ring-1 ring-zinc-700/50"
                            : "bg-[#18181b] p-4"
                            }`}
                    >
                        <div className={`absolute top-0 left-0 w-1 bg-${getStatusColor(stationB.status)}-500 h-full opacity-100`}></div>
                        <div className="flex justify-between items-center whitespace-nowrap">
                            <div className="flex items-center gap-4">
                                <div className={`flex flex-col transition-all duration-300 ${scrolled ? "transform scale-90 origin-left" : ""}`}>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={`flex h-1.5 w-1.5 rounded-full bg-${getStatusColor(stationB.status)}-500 ${stationB.status.toLowerCase().includes('maint') ? 'animate-pulse' : ''}`}></span>
                                        <span className={`text-${getStatusColor(stationB.status)}-500 font-bold uppercase tracking-wider transition-all ${scrolled ? "text-[8px]" : "text-[10px]"}`}>{stationB.status}</span>
                                    </div>
                                    <h3 className={`font-bold text-white tracking-tight transition-all duration-300 ${scrolled ? "text-lg" : "text-2xl"}`}>{stationB.id}</h3>
                                    {!scrolled && <p className="text-xs text-zinc-500 transition-opacity duration-200">{stationB.name} • Uptime: {stationB.uptime}</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-4 mr-2">
                                    {scrollTier >= 1 && (
                                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col items-end">
                                            <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest leading-none mb-1">Total Flow Rate</span>
                                            <span className="text-sm font-bold text-white leading-none">{stationB.flowRate || 0}<span className="text-[8px] font-normal text-zinc-500 ml-0.5">m³/h</span></span>
                                        </motion.div>
                                    )}
                                    {scrollTier >= 2 && (
                                        <>
                                            <div className="h-6 w-px bg-zinc-800/50" />
                                            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col items-end">
                                                <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest leading-none mb-1">Average pH</span>
                                                <span className="text-sm font-bold text-white leading-none tracking-tight">{stationB.ph || "--"}</span>
                                            </motion.div>
                                        </>
                                    )}
                                    {scrollTier >= 3 && (
                                        <>
                                            <div className="h-6 w-px bg-zinc-800/50" />
                                            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col items-end">
                                                <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest leading-none mb-1">Average Conductivity</span>
                                                <span className="text-sm font-bold text-white leading-none tracking-tight">{stationB.conductivity || "--"}</span>
                                            </motion.div>
                                        </>
                                    )}
                                </div>
                                <button className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-white/5 text-zinc-500 transition-colors">
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* --- ROW 2: FLOW RATE --- */}
                {/* Station A Flow */}
                <motion.div
                    layout
                    key={`side-A-${stationA.id}-flow`}
                    className="bg-[#18181b] rounded-xl p-5 border border-zinc-800 flex flex-col items-center justify-center relative min-h-[220px]"
                >
                    <div className="absolute top-4 left-4 flex items-center gap-2 text-zinc-500">
                        <Droplets className="w-4 h-4" />
                        <h4 className="text-sm font-medium">Current Total Flow Rate</h4>
                    </div>
                    <div className="relative w-48 h-48 flex items-center justify-center mt-4">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <path className="text-white/5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5"></path>
                            <motion.path
                                initial={{ strokeDasharray: "0, 100" }}
                                animate={{ strokeDasharray: `${Math.min((stationA.flowRate || 0) / 5, 100)}, 100` }}
                                transition={{ duration: 1, type: "spring" }}
                                className="text-[#13a4ec] drop-shadow-[0_0_8px_rgba(19,164,236,0.3)]"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeWidth="2.5"
                            ></motion.path>
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <motion.span
                                key={stationA.flowRate}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-3xl font-bold text-white tracking-tighter"
                            >
                                {stationA.flowRate || 0}
                            </motion.span>
                            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mt-1">m³/h</span>
                        </div>
                    </div>
                </motion.div>

                {/* Flow Variance */}
                <div className="flex items-center justify-center h-full">
                    <motion.div
                        key={`${stationA.id}-${stationB.id}-flow-var`}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`bg-[#18181b] rounded-full py-1.5 px-4 text-sm font-bold ${getVarianceColor(stationA.flowRate || 0, stationB.flowRate || 0)} ring-1 ring-zinc-800 shadow-xl flex items-center gap-2 z-10 transition-transform hover:scale-110 cursor-default`}
                    >
                        {(stationA.flowRate || 0) > (stationB.flowRate || 0) ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                        {calculateVariance(stationA.flowRate || 0, stationB.flowRate || 0)}
                    </motion.div>
                </div>

                {/* Station B Flow */}
                <motion.div
                    layout
                    key={`side-B-${stationB.id}-flow`}
                    className="bg-[#18181b] rounded-xl p-5 border border-zinc-800 flex flex-col items-center justify-center relative min-h-[220px]"
                >
                    <div className="absolute top-4 left-4 flex items-center gap-2 text-zinc-500">
                        <Droplets className="w-4 h-4" />
                        <h4 className="text-sm font-medium">Current Total Flow Rate</h4>
                    </div>
                    <div className="relative w-48 h-48 flex items-center justify-center mt-4">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <path className="text-white/5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5"></path>
                            <motion.path
                                initial={{ strokeDasharray: "0, 100" }}
                                animate={{ strokeDasharray: `${Math.min((stationB.flowRate || 0) / 5, 100)}, 100` }}
                                transition={{ duration: 1, type: "spring" }}
                                className={`text-${getStatusColor(stationB.status)}-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeWidth="2.5"
                            ></motion.path>
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <motion.span
                                key={stationB.flowRate}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-3xl font-bold text-white tracking-tighter"
                            >
                                {stationB.flowRate || 0}
                            </motion.span>
                            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mt-1">m³/h</span>
                        </div>
                    </div>
                </motion.div>

                {/* --- ROW 3: pH LEVEL --- */}
                <motion.div key={`side-A-${stationA.id}-ph`} initial="hidden" animate="visible" variants={itemVariants} className="bg-[#18181b] p-6 rounded-xl border border-zinc-800 flex justify-between items-center group transition-colors">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "h-10 w-10 rounded-lg flex items-center justify-center transition-all",
                            getStatusColor(stationA.status) === 'emerald' ? "bg-emerald-500/10 text-emerald-500" :
                                getStatusColor(stationA.status) === 'rose' ? "bg-rose-500/10 text-rose-500" :
                                    getStatusColor(stationA.status) === 'amber' ? "bg-amber-500/10 text-amber-500" :
                                        "bg-zinc-500/10 text-zinc-500"
                        )}>
                            <FlaskConical className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Average pH</span>
                            <div className="text-2xl font-bold text-white tracking-tight">{stationA.ph || "--"}</div>
                        </div>
                    </div>
                    <span className={cn(
                        "text-xs font-medium px-2 py-1 rounded",
                        getStatusColor(stationA.status) === 'emerald' ? "text-emerald-500 bg-emerald-500/10" :
                            getStatusColor(stationA.status) === 'rose' ? "text-rose-500 bg-rose-500/10" :
                                getStatusColor(stationA.status) === 'amber' ? "text-amber-500 bg-amber-500/10" :
                                    "text-zinc-500 bg-zinc-500/10"
                    )}>
                        {(stationA.ph || 7) < 7 ? "Acidic" : (stationA.ph || 7) > 7.5 ? "Alkaline" : "Normal"}
                    </span>
                </motion.div>

                {/* pH Variance */}
                <div className="flex items-center justify-center h-full">
                    <motion.div
                        key={`${stationA.id}-${stationB.id}-ph-var`}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#18181b] rounded-full py-1 px-3 text-xs font-bold text-zinc-500 ring-1 ring-zinc-800 shadow-xl flex items-center gap-1.5 z-10 transition-transform hover:scale-110 cursor-default"
                    >
                        {(stationA.ph || 0) === (stationB.ph || 0) ? <Minus className="w-3.5 h-3.5" /> : (stationA.ph || 0) > (stationB.ph || 0) ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                        {calculateVariance(stationA.ph || 0, stationB.ph || 0)}
                    </motion.div>
                </div>

                <motion.div key={`side-B-${stationB.id}-ph`} initial="hidden" animate="visible" variants={itemVariants} className="bg-[#18181b] p-6 rounded-xl border border-zinc-800 flex justify-between items-center group transition-colors">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "h-10 w-10 rounded-lg flex items-center justify-center transition-all",
                            getStatusColor(stationB.status) === 'emerald' ? "bg-emerald-500/10 text-emerald-500" :
                                getStatusColor(stationB.status) === 'rose' ? "bg-rose-500/10 text-rose-500" :
                                    getStatusColor(stationB.status) === 'amber' ? "bg-amber-500/10 text-amber-500" :
                                        "bg-zinc-500/10 text-zinc-500"
                        )}>
                            <FlaskConical className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Average pH</span>
                            <div className="text-2xl font-bold text-white tracking-tight">{stationB.ph || "--"}</div>
                        </div>
                    </div>
                    <span className={cn(
                        "text-xs font-medium px-2 py-1 rounded",
                        getStatusColor(stationB.status) === 'emerald' ? "text-emerald-500 bg-emerald-500/10" :
                            getStatusColor(stationB.status) === 'rose' ? "text-rose-500 bg-rose-500/10" :
                                getStatusColor(stationB.status) === 'amber' ? "text-amber-500 bg-amber-500/10" :
                                    "text-zinc-500 bg-zinc-500/10"
                    )}>
                        {(stationB.ph || 7) < 7 ? "Acidic" : (stationB.ph || 7) > 7.5 ? "Alkaline" : "Normal"}
                    </span>
                </motion.div>

                {/* --- ROW 4: CONDUCTIVITY --- */}
                <motion.div key={`side-A-${stationA.id}-cond`} initial="hidden" animate="visible" variants={itemVariants} className="bg-[#18181b] p-6 rounded-xl border border-zinc-800 flex justify-between items-center group hover:border-[#13a4ec]/20 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-[#13a4ec]/10 flex items-center justify-center text-[#13a4ec] group-hover:bg-[#13a4ec] group-hover:text-black transition-all">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Average Conductivity</span>
                            <div className="text-2xl font-bold text-white tracking-tight">{stationA.conductivity || "--"} <span className="text-[10px] text-zinc-500 ml-1">µS/cm</span></div>
                        </div>
                    </div>
                    <div className="h-2 w-16 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((stationA.conductivity || 0) / 20, 100)}%` }} className="h-full bg-[#13a4ec]" />
                    </div>
                </motion.div>

                {/* Conductivity Variance */}
                <div className="flex items-start pt-8 justify-center h-full">
                    <motion.div
                        key={`${stationA.id}-${stationB.id}-cond-var`}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`bg-[#18181b] rounded-full py-1 px-3 text-xs font-bold ${getVarianceColor(stationA.conductivity || 0, stationB.conductivity || 0, false)} ring-1 ring-zinc-800 shadow-xl flex items-center gap-1.5 z-10 transition-transform hover:scale-110 cursor-default`}
                    >
                        {(stationA.conductivity || 0) > (stationB.conductivity || 0) ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                        {calculateVariance(stationA.conductivity || 0, stationB.conductivity || 0)}
                    </motion.div>
                </div>

                <motion.div key={`side-B-${stationB.id}-cond`} initial="hidden" animate="visible" variants={itemVariants} className="bg-[#18181b] p-6 rounded-xl border border-zinc-800 flex justify-between items-center group hover:border-[#13a4ec]/20 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-[#13a4ec]/10 flex items-center justify-center text-[#13a4ec] group-hover:bg-[#13a4ec] group-hover:text-black transition-all">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Average Conductivity</span>
                            <div className="text-2xl font-bold text-white tracking-tight">{stationB.conductivity || "--"} <span className="text-[10px] text-zinc-500 ml-1">µS/cm</span></div>
                        </div>
                    </div>
                    <div className="h-2 w-16 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((stationB.conductivity || 0) / 20, 100)}%` }} className="h-full bg-[#13a4ec]" />
                    </div>
                </motion.div>

                {/* --- ROW 5: TOTAL OPERATIONS --- */}
                <motion.div key={`side-A-${stationA.id}-ops`} initial="hidden" animate="visible" variants={itemVariants} className="bg-[#18181b] p-6 rounded-xl border border-zinc-800">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <Truck className="text-zinc-500 w-5 h-5" />
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Operations (24h)</span>
                        </div>
                        <div className="text-2xl font-bold text-white tracking-tight">{extraA.operations}</div>
                    </div>
                    <div className="h-8 flex gap-1.5 items-end mb-2">
                        {extraA.opsTrend.map((h, i) => (
                            <motion.div
                                key={`bar-A-${i}-${stationA.id}`}
                                initial={{ height: 0 }}
                                animate={{ height: `${h}%` }}
                                className="flex-1 bg-[#13a4ec]/20 rounded-sm hover:bg-[#13a4ec]/50 transition-colors"
                            ></motion.div>
                        ))}
                    </div>
                    <div className="flex justify-between px-0.5">
                        {['12 AM', '6 AM', '12 PM', '6 PM', '11 PM'].map((time, i) => (
                            <span key={`lbl-A-${i}`} className="text-[8px] font-bold text-zinc-600 uppercase tracking-tighter">{time}</span>
                        ))}
                    </div>
                </motion.div>

                {/* Operations Variance */}
                <div className="flex items-start pt-8 justify-center h-full">
                    <motion.div
                        key={`${stationA.id}-${stationB.id}-ops-var`}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`bg-[#18181b] rounded-full py-1 px-3 text-xs font-bold ${getVarianceColor(extraA.operations, extraB.operations)} ring-1 ring-zinc-800 shadow-xl flex items-center gap-1.5 z-10 transition-transform hover:scale-110 cursor-default`}
                    >
                        {extraA.operations > extraB.operations ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                        {calculateVariance(extraA.operations, extraB.operations)}
                    </motion.div>
                </div>

                <motion.div key={`side-B-${stationB.id}-ops`} initial="hidden" animate="visible" variants={itemVariants} className="bg-[#18181b] p-6 rounded-xl border border-zinc-800">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <Truck className="text-zinc-500 w-5 h-5" />
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Operations (24h)</span>
                        </div>
                        <div className="text-2xl font-bold text-white tracking-tight">{extraB.operations}</div>
                    </div>
                    <div className="h-8 flex gap-1.5 items-end mb-2">
                        {extraB.opsTrend.map((h, i) => {
                            const statusColor = getStatusColor(stationB.status)
                            const barClass = statusColor === 'emerald' ? 'bg-emerald-500/20 hover:bg-emerald-500/50' :
                                statusColor === 'rose' ? 'bg-rose-500/20 hover:bg-rose-500/50' :
                                    statusColor === 'amber' ? 'bg-amber-500/20 hover:bg-amber-500/50' :
                                        'bg-zinc-500/20 hover:bg-zinc-500/50'

                            return (
                                <motion.div
                                    key={`bar-B-${i}-${stationB.id}`}
                                    initial={{ height: 0 }}
                                    animate={{ height: `${h}%` }}
                                    className={`flex-1 ${barClass} rounded-sm transition-colors`}
                                ></motion.div>
                            )
                        })}
                    </div>
                    <div className="flex justify-between px-0.5">
                        {['12 AM', '6 AM', '12 PM', '6 PM', '11 PM'].map((time, i) => (
                            <span key={`lbl-B-${i}`} className="text-[8px] font-bold text-zinc-600 uppercase tracking-tighter">{time}</span>
                        ))}
                    </div>
                </motion.div>

                {/* --- ROW 6: DISCHARGE VOLUME --- */}
                <motion.div key={`side-A-${stationA.id}-discharge`} initial="hidden" animate="visible" variants={itemVariants} className="bg-[#18181b] rounded-xl p-5 border border-zinc-800">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-6">Discharge Volume (7 Days)</h4>
                    <div className="h-24 flex items-end gap-2.5 justify-between mb-2">
                        {extraA.dischargeTrend.map((h, i) => (
                            <motion.div
                                key={i}
                                initial={{ height: 0 }}
                                animate={{ height: `${h}%` }}
                                className={`flex-1 rounded-sm ${i === 4 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-white/5"}`}
                            ></motion.div>
                        ))}
                    </div>
                    <div className="flex justify-between px-1">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                            <span key={day} className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">{day}</span>
                        ))}
                    </div>
                </motion.div>

                {/* Discharge Variance */}
                <div className="flex items-start pt-7 justify-center h-full">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#18181b] rounded-full py-1 px-3 text-xs font-bold text-emerald-500 ring-1 ring-zinc-800 shadow-xl flex items-center gap-1.5 z-10 transition-transform hover:scale-110 cursor-default"
                    >
                        <ArrowUp className="w-3.5 h-3.5" />
                        15%
                    </motion.div>
                </div>

                <motion.div key={`side-B-${stationB.id}-discharge`} initial="hidden" animate="visible" variants={itemVariants} className="bg-[#18181b] rounded-xl p-5 border border-zinc-800">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-6">Discharge Volume (7 Days)</h4>
                    <div className="h-24 flex items-end gap-2.5 justify-between mb-2">
                        {extraB.dischargeTrend.map((h, i) => {
                            const statusColor = getStatusColor(stationB.status)
                            const barColor = statusColor === 'emerald' ? 'bg-emerald-500' :
                                statusColor === 'rose' ? 'bg-rose-500' :
                                    statusColor === 'amber' ? 'bg-amber-500' :
                                        'bg-zinc-500'

                            const glowColor = statusColor === 'emerald' ? 'rgba(16,185,129,0.3)' :
                                statusColor === 'rose' ? 'rgba(244,63,94,0.3)' :
                                    statusColor === 'amber' ? 'rgba(245,158,11,0.3)' :
                                        'rgba(161,161,170,0.3)'

                            return (
                                <motion.div
                                    key={`dis-B-${i}-${stationB.id}`}
                                    initial={{ height: 0 }}
                                    animate={{ height: `${h}%` }}
                                    className={`flex-1 rounded-sm ${i === 4 ? `${barColor} shadow-[0_0_10px_${glowColor}]` : "bg-white/5"}`}
                                ></motion.div>
                            )
                        })}
                    </div>
                    <div className="flex justify-between px-1">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                            <span key={day} className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">{day}</span>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Bottom Section: Logs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Logs Station A */}
                <motion.div
                    layout
                    key={`side-A-${stationA.id}-logs`}
                    initial="hidden" animate="visible" variants={containerVariants}
                    className="bg-[#18181b] rounded-xl border border-zinc-800 overflow-hidden shadow-sm"
                >
                    <div className="px-4 py-2.5 border-b border-zinc-800 flex justify-between items-center bg-white/[0.02]">
                        <h3 className="font-semibold text-sm text-white">{stationA.id} Latest Logs</h3>
                        <button className="text-xs font-medium text-zinc-500 hover:text-[#13a4ec] transition-colors flex items-center gap-1">
                            View All <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs uppercase text-zinc-500 bg-white/[0.02] border-b border-zinc-800">
                                <tr>
                                    <th className="px-4 py-2 font-medium tracking-wider w-32">Time</th>
                                    <th className="px-4 py-2 font-medium tracking-wider">Event</th>
                                    <th className="px-4 py-2 font-medium tracking-wider text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {extraA.logs.map((log, idx) => (
                                    <motion.tr variants={itemVariants} key={idx} className="hover:bg-white/[0.02] transition-colors text-xs">
                                        <td className="px-4 py-1.5 text-white font-mono">{log.time}</td>
                                        <td className="px-4 py-1.5 text-zinc-300">{log.event}</td>
                                        <td className="px-4 py-1.5 text-right">
                                            <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-medium border ${log.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                log.type === 'warning' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                    'bg-white/5 text-zinc-500 border-white/10'
                                                }`}>
                                                <span className={`w-1 h-1 rounded-full ${log.type === 'success' ? 'bg-emerald-500' :
                                                    log.type === 'warning' ? 'bg-amber-500' :
                                                        'bg-zinc-400'
                                                    }`}></span>
                                                {log.status}
                                            </span>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Logs Station B */}
                <motion.div
                    layout
                    key={`side-B-${stationB.id}-logs`}
                    initial="hidden" animate="visible" variants={containerVariants}
                    className="bg-[#18181b] rounded-xl border border-zinc-800 overflow-hidden shadow-sm"
                >
                    <div className="px-4 py-2.5 border-b border-zinc-800 flex justify-between items-center bg-white/[0.02]">
                        <h3 className="font-semibold text-sm text-white">{stationB.id} Latest Logs</h3>
                        <button className="text-xs font-medium text-zinc-500 hover:text-[#13a4ec] transition-colors flex items-center gap-1">
                            View All <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs uppercase text-zinc-500 bg-white/[0.02] border-b border-zinc-800">
                                <tr>
                                    <th className="px-4 py-2 font-medium tracking-wider w-32">Time</th>
                                    <th className="px-4 py-2 font-medium tracking-wider">Event</th>
                                    <th className="px-4 py-2 font-medium tracking-wider text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {extraB.logs.map((log, idx) => (
                                    <motion.tr variants={itemVariants} key={idx} className="hover:bg-white/[0.02] transition-colors text-xs">
                                        <td className="px-4 py-1.5 text-white font-mono">{log.time}</td>
                                        <td className="px-4 py-1.5 text-zinc-300">{log.event}</td>
                                        <td className="px-4 py-1.5 text-right">
                                            <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-medium border ${log.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                log.type === 'warning' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                    'bg-white/5 text-zinc-500 border-white/10'
                                                }`}>
                                                <span className={`w-1 h-1 rounded-full ${log.type === 'success' ? 'bg-emerald-500' :
                                                    log.type === 'warning' ? 'bg-amber-500' :
                                                        'bg-zinc-400'
                                                    }`}></span>
                                                {log.status}
                                            </span>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
