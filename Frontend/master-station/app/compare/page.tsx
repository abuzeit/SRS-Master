"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
    MoreHorizontal,
    Droplets,
    FlaskConical,
    Zap,
    Truck,
    ArrowDown,
    ArrowUp,
    Minus,
    ArrowRight
} from "lucide-react"

export default function ComparePage() {
    const [scrolled, setScrolled] = useState(false)
    const [scrollTier, setScrollTier] = useState(0) // 0: none, 1: +flow, 2: +flow+ph+cond

    useEffect(() => {
        const handleScroll = () => {
            const y = window.scrollY
            setScrolled(y > 20)

            // 0: none, 1: +flow, 2: +flow+ph, 3: +flow+ph+cond
            if (y > 550) setScrollTier(3)
            else if (y > 350) setScrollTier(2)
            else if (y > 150) setScrollTier(1)
            else setScrollTier(0)
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        // Initial check
        handleScroll()

        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <div className="flex flex-col p-2 lg:p-4 gap-4 max-w-[1800px] mx-auto w-full text-zinc-100">
            {/* Header & Selectors */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Station Comparison</h1>
                    <p className="text-zinc-500 mt-1 text-xs max-w-2xl">Compare real-time metrics and historical performance data between two receiving stations side-by-side.</p>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-zinc-900 p-1.5 rounded-lg border border-zinc-800 shadow-sm w-full md:w-auto overflow-hidden">
                    <div className="flex flex-col px-2 flex-grow sm:flex-grow-0">
                        <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-0.5">Station A</label>
                        <select className="bg-transparent border-none p-0 text-sm font-semibold text-white focus:ring-0 cursor-pointer w-full sm:min-w-[160px] hover:text-[#13a4ec] transition-colors focus:outline-none focus:ring-offset-0 truncate appearance-none">
                            <option>SRS-05 (North)</option>
                            <option>SRS-02 (East)</option>
                            <option>SRS-08 (West)</option>
                        </select>
                    </div>
                    <div className="h-8 w-px bg-zinc-800 mx-1 sm:mx-2 hidden sm:block"></div>
                    <div className="flex items-center justify-center h-8 w-8 rounded-md bg-white/5 text-zinc-500 flex-shrink-0">
                        {/* Compare Arrows Icon */}
                        <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    </div>
                    <div className="h-8 w-px bg-zinc-800 mx-1 sm:mx-2 hidden sm:block"></div>
                    <div className="flex flex-col px-2 flex-grow sm:flex-grow-0">
                        <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-0.5">Station B</label>
                        <select className="bg-transparent border-none p-0 text-sm font-semibold text-white focus:ring-0 cursor-pointer w-full sm:min-w-[160px] hover:text-[#13a4ec] transition-colors focus:outline-none focus:ring-offset-0 truncate appearance-none">
                            <option>SRS-12 (South)</option>
                            <option>SRS-02 (East)</option>
                            <option>SRS-08 (West)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Grid: Row-based for perfect alignment */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_120px_1fr] gap-4 lg:gap-x-8 lg:gap-y-8 items-stretch relative">
                {/* Visual Connector: Middle vertical line */}
                <div className="absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-transparent via-zinc-800 to-transparent -translate-x-1/2 -z-10 hidden lg:block" style={{ gridColumn: 2 }}></div>

                {/* --- ROW 1: HEADERS (Sticky) --- */}
                {/* Station A Header */}
                <div className={`sticky top-[88px] z-30 transition-all duration-300 rounded-xl border border-zinc-800 relative overflow-hidden group ${scrolled
                    ? "bg-[#18181b]/95 backdrop-blur-md shadow-2xl py-2 px-4 ring-1 ring-zinc-700/50"
                    : "bg-[#18181b] p-4"
                    }`}>
                    <div className={`absolute top-0 left-0 w-1 bg-emerald-500 h-full opacity-100`}></div>
                    <div className="flex justify-between items-center whitespace-nowrap">
                        <div className="flex items-center gap-4">
                            <div className={`flex flex-col transition-all duration-300 ${scrolled ? "transform scale-90 origin-left" : ""}`}>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                    <span className={`text-emerald-500 font-bold uppercase tracking-wider transition-all ${scrolled ? "text-[8px]" : "text-[10px]"}`}>Operational</span>
                                </div>
                                <h3 className={`font-bold text-white tracking-tight transition-all duration-300 ${scrolled ? "text-lg" : "text-2xl"}`}>SRS-05</h3>
                                {!scrolled && <p className="text-xs text-zinc-500 transition-opacity duration-200">North Sector • ID: 8842</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-4 mr-2">
                                {scrollTier >= 1 && (
                                    <div className="flex flex-col items-end transition-all duration-500 animate-in fade-in slide-in-from-right-2">
                                        <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest leading-none mb-1">Flow</span>
                                        <span className="text-sm font-bold text-white leading-none">450<span className="text-[8px] font-normal text-zinc-500 ml-0.5">L/m</span></span>
                                    </div>
                                )}
                                {scrollTier >= 2 && (
                                    <>
                                        <div className="h-6 w-px bg-zinc-800/50" />
                                        <div className="flex flex-col items-end transition-all duration-500 animate-in fade-in slide-in-from-right-4">
                                            <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest leading-none mb-1">pH</span>
                                            <span className="text-sm font-bold text-white leading-none tracking-tight">7.2</span>
                                        </div>
                                    </>
                                )}
                                {scrollTier >= 3 && (
                                    <>
                                        <div className="h-6 w-px bg-zinc-800/50" />
                                        <div className="flex flex-col items-end transition-all duration-500 animate-in fade-in slide-in-from-right-6">
                                            <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest leading-none mb-1">Cond</span>
                                            <span className="text-sm font-bold text-white leading-none tracking-tight">1,240</span>
                                        </div>
                                    </>
                                )}
                            </div>
                            <button className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-white/5 text-zinc-500 transition-colors">
                                <MoreHorizontal className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Variance Label Header */}
                <div className={`sticky top-[88px] z-20 flex flex-col items-center justify-center transition-all duration-300`}>
                    <div className={`flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm rounded-full px-3 py-1 ring-1 ring-zinc-800 transition-all ${scrolled ? "opacity-100 scale-90" : "opacity-50"}`}>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 whitespace-nowrap">Variance</span>
                    </div>
                </div>

                {/* Station B Header */}
                <div className={`sticky top-[88px] z-30 transition-all duration-300 rounded-xl border border-zinc-800 relative overflow-hidden group ${scrolled
                    ? "bg-[#18181b]/95 backdrop-blur-md shadow-2xl py-2 px-4 ring-1 ring-zinc-700/50"
                    : "bg-[#18181b] p-4"
                    }`}>
                    <div className={`absolute top-0 left-0 w-1 bg-amber-500 h-full opacity-100`}></div>
                    <div className="flex justify-between items-center whitespace-nowrap">
                        <div className="flex items-center gap-4">
                            <div className={`flex flex-col transition-all duration-300 ${scrolled ? "transform scale-90 origin-left" : ""}`}>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                    <span className={`text-amber-500 font-bold uppercase tracking-wider transition-all ${scrolled ? "text-[8px]" : "text-[10px]"}`}>Warning</span>
                                </div>
                                <h3 className={`font-bold text-white tracking-tight transition-all duration-300 ${scrolled ? "text-lg" : "text-2xl"}`}>SRS-12</h3>
                                {!scrolled && <p className="text-xs text-zinc-500 transition-opacity duration-200">South Sector • ID: 9921</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-4 mr-2">
                                {scrollTier >= 1 && (
                                    <div className="flex flex-col items-end transition-all duration-500 animate-in fade-in slide-in-from-right-2">
                                        <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest leading-none mb-1">Flow</span>
                                        <span className="text-sm font-bold text-white leading-none">480<span className="text-[8px] font-normal text-zinc-500 ml-0.5">L/m</span></span>
                                    </div>
                                )}
                                {scrollTier >= 2 && (
                                    <>
                                        <div className="h-6 w-px bg-zinc-800/50" />
                                        <div className="flex flex-col items-end transition-all duration-500 animate-in fade-in slide-in-from-right-4">
                                            <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest leading-none mb-1">pH</span>
                                            <span className="text-sm font-bold text-white leading-none tracking-tight">6.8</span>
                                        </div>
                                    </>
                                )}
                                {scrollTier >= 3 && (
                                    <>
                                        <div className="h-6 w-px bg-zinc-800/50" />
                                        <div className="flex flex-col items-end transition-all duration-500 animate-in fade-in slide-in-from-right-6">
                                            <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest leading-none mb-1">Cond</span>
                                            <span className="text-sm font-bold text-white leading-none tracking-tight">1,120</span>
                                        </div>
                                    </>
                                )}
                            </div>
                            <button className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-white/5 text-zinc-500 transition-colors">
                                <MoreHorizontal className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- ROW 2: FLOW RATE --- */}
                {/* Station A Flow */}
                <div className="bg-[#18181b] rounded-xl p-5 border border-zinc-800 flex flex-col items-center justify-center relative min-h-[220px]">
                    <div className="absolute top-4 left-4 flex items-center gap-2 text-zinc-500">
                        <Droplets className="w-4 h-4" />
                        <h4 className="text-sm font-medium">Current Flow Rate</h4>
                    </div>
                    <div className="relative w-48 h-48 flex items-center justify-center mt-4">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <path className="text-white/5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5"></path>
                            <path className="text-[#13a4ec] drop-shadow-[0_0_8px_rgba(19,164,236,0.3)]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="75, 100" strokeLinecap="round" strokeWidth="2.5"></path>
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-3xl font-bold text-white tracking-tighter">450</span>
                            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mt-1">L/min</span>
                        </div>
                    </div>
                </div>

                {/* Flow Variance */}
                <div className="flex items-center justify-center h-full">
                    <div className="bg-[#18181b] rounded-full py-1.5 px-4 text-sm font-bold text-rose-500 ring-1 ring-zinc-800 shadow-xl flex items-center gap-2 z-10 transition-transform hover:scale-110 cursor-default">
                        <ArrowDown className="w-4 h-4" />
                        30
                    </div>
                </div>

                {/* Station B Flow */}
                <div className="bg-[#18181b] rounded-xl p-5 border border-zinc-800 flex flex-col items-center justify-center relative min-h-[220px]">
                    <div className="absolute top-4 left-4 flex items-center gap-2 text-zinc-500">
                        <Droplets className="w-4 h-4" />
                        <h4 className="text-sm font-medium">Current Flow Rate</h4>
                    </div>
                    <div className="relative w-48 h-48 flex items-center justify-center mt-4">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <path className="text-white/5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5"></path>
                            <path className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="80, 100" strokeLinecap="round" strokeWidth="2.5"></path>
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-3xl font-bold text-white tracking-tighter">480</span>
                            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mt-1">L/min</span>
                        </div>
                    </div>
                </div>

                {/* --- ROW 3: pH LEVEL --- */}
                <div className="bg-[#18181b] p-6 rounded-xl border border-zinc-800 flex justify-between items-center group hover:border-emerald-500/20 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-black transition-all">
                            <FlaskConical className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">pH Level</span>
                            <div className="text-2xl font-bold text-white tracking-tight">7.2</div>
                        </div>
                    </div>
                    <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">Normal</span>
                </div>

                {/* pH Variance */}
                <div className="flex items-center justify-center h-full">
                    <div className="bg-[#18181b] rounded-full py-1 px-3 text-xs font-bold text-zinc-500 ring-1 ring-zinc-800 shadow-xl flex items-center gap-1.5 z-10 transition-transform hover:scale-110 cursor-default">
                        <Minus className="w-3.5 h-3.5" />
                        0.4
                    </div>
                </div>

                <div className="bg-[#18181b] p-6 rounded-xl border border-zinc-800 flex justify-between items-center group hover:border-amber-500/20 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-all">
                            <FlaskConical className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">pH Level</span>
                            <div className="text-2xl font-bold text-white tracking-tight">6.8</div>
                        </div>
                    </div>
                    <span className="text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded">Acidic</span>
                </div>

                {/* --- ROW 4: CONDUCTIVITY --- */}
                <div className="bg-[#18181b] p-6 rounded-xl border border-zinc-800 flex justify-between items-center group hover:border-[#13a4ec]/20 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-[#13a4ec]/10 flex items-center justify-center text-[#13a4ec] group-hover:bg-[#13a4ec] group-hover:text-black transition-all">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Conductivity</span>
                            <div className="text-2xl font-bold text-white tracking-tight">1,240 <span className="text-[10px] text-zinc-500 ml-1">µS/cm</span></div>
                        </div>
                    </div>
                    <div className="h-2 w-16 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#13a4ec] w-[70%]" />
                    </div>
                </div>

                {/* Conductivity Variance (Aligned with Metric Value) */}
                <div className="flex items-start pt-8 justify-center h-full">
                    <div className="bg-[#18181b] rounded-full py-1 px-3 text-xs font-bold text-emerald-500 ring-1 ring-zinc-800 shadow-xl flex items-center gap-1.5 z-10 transition-transform hover:scale-110 cursor-default">
                        <ArrowUp className="w-3.5 h-3.5" />
                        120
                    </div>
                </div>

                <div className="bg-[#18181b] p-6 rounded-xl border border-zinc-800 flex justify-between items-center group hover:border-[#13a4ec]/20 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-[#13a4ec]/10 flex items-center justify-center text-[#13a4ec] group-hover:bg-[#13a4ec] group-hover:text-black transition-all">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Conductivity</span>
                            <div className="text-2xl font-bold text-white tracking-tight">1,120 <span className="text-[10px] text-zinc-500 ml-1">µS/cm</span></div>
                        </div>
                    </div>
                    <div className="h-2 w-16 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#13a4ec] w-[60%]" />
                    </div>
                </div>

                {/* --- ROW 5: TOTAL OPERATIONS --- */}
                <div className="bg-[#18181b] p-6 rounded-xl border border-zinc-800">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <Truck className="text-zinc-500 w-5 h-5" />
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Operations (24h)</span>
                        </div>
                        <div className="text-2xl font-bold text-white tracking-tight">34</div>
                    </div>
                    <div className="h-8 flex gap-1.5 items-end mb-2">
                        {[40, 60, 80, 50, 70, 45, 90, 65].map((h, i) => (
                            <div key={i} className="flex-1 bg-[#13a4ec]/20 rounded-sm hover:bg-[#13a4ec]/50 transition-colors" style={{ height: `${h}%` }}></div>
                        ))}
                    </div>
                    <div className="flex justify-between px-0.5">
                        {['12 AM', '6 AM', '12 PM', '6 PM', '11 PM'].map((time, i) => (
                            <span key={i} className="text-[8px] font-bold text-zinc-600 uppercase tracking-tighter">{time}</span>
                        ))}
                    </div>
                </div>

                {/* Operations Variance (Aligned with Metric Value) */}
                <div className="flex items-start pt-8 justify-center h-full">
                    <div className="bg-[#18181b] rounded-full py-1 px-3 text-xs font-bold text-[#13a4ec] ring-1 ring-zinc-800 shadow-xl flex items-center gap-1.5 z-10 transition-transform hover:scale-110 cursor-default">
                        <ArrowUp className="w-3.5 h-3.5" />
                        4
                    </div>
                </div>

                <div className="bg-[#18181b] p-6 rounded-xl border border-zinc-800">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <Truck className="text-zinc-500 w-5 h-5" />
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Operations (24h)</span>
                        </div>
                        <div className="text-2xl font-bold text-white tracking-tight">30</div>
                    </div>
                    <div className="h-8 flex gap-1.5 items-end mb-2">
                        {[30, 40, 60, 80, 50, 35, 60, 40].map((h, i) => (
                            <div key={i} className="flex-1 bg-amber-500/20 rounded-sm hover:bg-amber-500/50 transition-colors" style={{ height: `${h}%` }}></div>
                        ))}
                    </div>
                    <div className="flex justify-between px-0.5">
                        {['12 AM', '6 AM', '12 PM', '6 PM', '11 PM'].map((time, i) => (
                            <span key={i} className="text-[8px] font-bold text-zinc-600 uppercase tracking-tighter">{time}</span>
                        ))}
                    </div>
                </div>

                {/* --- ROW 6: DISCHARGE VOLUME --- */}
                <div className="bg-[#18181b] rounded-xl p-5 border border-zinc-800">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-6">Discharge Volume (7 Days)</h4>
                    <div className="h-24 flex items-end gap-2.5 justify-between mb-2">
                        {[50, 65, 45, 80, 95, 40, 30].map((h, i) => (
                            <div key={i} className={`flex-1 rounded-sm ${i === 4 ? "bg-emerald-500" : "bg-white/5"}`} style={{ height: `${h}%` }}></div>
                        ))}
                    </div>
                    <div className="flex justify-between px-1">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                            <span key={day} className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">{day}</span>
                        ))}
                    </div>
                </div>

                {/* Discharge Variance */}
                <div className="flex items-start pt-7 justify-center h-full">
                    <div className="bg-[#18181b] rounded-full py-1 px-3 text-xs font-bold text-emerald-500 ring-1 ring-zinc-800 shadow-xl flex items-center gap-1.5 z-10 transition-transform hover:scale-110 cursor-default">
                        <ArrowUp className="w-3.5 h-3.5" />
                        15%
                    </div>
                </div>

                <div className="bg-[#18181b] rounded-xl p-5 border border-zinc-800">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-6">Discharge Volume (7 Days)</h4>
                    <div className="h-24 flex items-end gap-2.5 justify-between mb-2">
                        {[50, 60, 55, 70, 85, 40, 25].map((h, i) => (
                            <div key={i} className={`flex-1 rounded-sm ${i === 4 ? "bg-amber-500" : "bg-white/5"}`} style={{ height: `${h}%` }}></div>
                        ))}
                    </div>
                    <div className="flex justify-between px-1">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                            <span key={day} className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">{day}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Logs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Logs Station A */}
                <div className="bg-[#18181b] rounded-xl border border-zinc-800 overflow-hidden shadow-sm">
                    <div className="px-4 py-2.5 border-b border-zinc-800 flex justify-between items-center bg-white/[0.02]">
                        <h3 className="font-semibold text-sm text-white">SRS-05 Latest Logs</h3>
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
                                <tr className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-4 py-1.5 text-white font-mono text-xs">10:42 AM</td>
                                    <td className="px-4 py-1.5 text-zinc-300 text-xs">Pump P-101 Activated</td>
                                    <td className="px-4 py-1.5 text-right">
                                        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500 border border-emerald-500/20">
                                            <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                                            Success
                                        </span>
                                    </td>
                                </tr>
                                <tr className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-4 py-1.5 text-white font-mono text-xs">10:38 AM</td>
                                    <td className="px-4 py-1.5 text-zinc-300 text-xs">Valve V-2 Closed</td>
                                    <td className="px-4 py-1.5 text-right">
                                        <span className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-500 border border-white/10">
                                            <span className="w-1 h-1 rounded-full bg-zinc-400"></span>
                                            Routine
                                        </span>
                                    </td>
                                </tr>
                                <tr className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-4 py-1.5 text-white font-mono text-xs">10:15 AM</td>
                                    <td className="px-4 py-1.5 text-zinc-300 text-xs">Truck T-99 Arrival</td>
                                    <td className="px-4 py-1.5 text-right">
                                        <span className="inline-flex items-center gap-1.5 rounded-md bg-[#13a4ec]/10 px-2 py-0.5 text-[10px] font-medium text-[#13a4ec] border border-[#13a4ec]/20">
                                            <span className="w-1 h-1 rounded-full bg-[#13a4ec]"></span>
                                            Log
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Logs Station B */}
                <div className="bg-[#18181b] rounded-xl border border-zinc-800 overflow-hidden shadow-sm">
                    <div className="px-4 py-2.5 border-b border-zinc-800 flex justify-between items-center bg-white/[0.02]">
                        <h3 className="font-semibold text-sm text-white">SRS-12 Latest Logs</h3>
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
                                <tr className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-4 py-1.5 text-white font-mono text-xs">10:45 AM</td>
                                    <td className="px-4 py-1.5 text-zinc-300 text-xs">Flow Rate Warning</td>
                                    <td className="px-4 py-1.5 text-right">
                                        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500 border border-amber-500/20">
                                            <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                                            Warning
                                        </span>
                                    </td>
                                </tr>
                                <tr className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-4 py-1.5 text-white font-mono text-xs">10:30 AM</td>
                                    <td className="px-4 py-1.5 text-zinc-300 text-xs">Pump P-202 High Temp</td>
                                    <td className="px-4 py-1.5 text-right">
                                        <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-500 border border-red-500/20">
                                            <span className="w-1 h-1 rounded-full bg-rose-500"></span>
                                            Alert
                                        </span>
                                    </td>
                                </tr>
                                <tr className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-4 py-1.5 text-white font-mono text-xs">10:10 AM</td>
                                    <td className="px-4 py-1.5 text-zinc-300 text-xs">System Check</td>
                                    <td className="px-4 py-1.5 text-right">
                                        <span className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-500 border border-white/10">
                                            <span className="w-1 h-1 rounded-full bg-zinc-400"></span>
                                            Routine
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
