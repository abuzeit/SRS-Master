"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import mockData from "@/data/mockData.json"
import {
    Plus,
    Minus,
    Crosshair,
    Layers,
    BarChart,
    TrendingUp,
    Trophy,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Maximize2
} from "lucide-react"
import Link from "next/link"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

const stationData = [
    { id: "SRS-01", name: "Ghayathi", lat: 24.2097, lng: 53.7626, status: "healthy", ph: 7.23, conductivity: 1404, discharge: 19.77 },
    { id: "SRS-05", name: "Al Ain Central", lat: 24.2075, lng: 55.7447, status: "healthy", ph: 7.1, conductivity: 1350, discharge: 22.5 },
    { id: "SRS-11", name: "Shahama", lat: 24.4691, lng: 54.6197, status: "healthy", ph: 7.05, conductivity: 1420, discharge: 18.2 },
    { id: "SRS-14", name: "Ruwais", lat: 24.1108, lng: 52.8867, status: "alarm", alarmType: "AC Failure", ph: 8.01, conductivity: 1550, discharge: 0 },
    { id: "SRS-22", name: "Mirfa", lat: 24.6278, lng: 53.4158, status: "alarm", alarmType: "High PH", ph: 9.2, conductivity: 1600, discharge: 12 },
]

const MapWithNoSSR = dynamic(() => import("@/components/MapComponent"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-zinc-900">
            <div className="text-zinc-500">Loading map...</div>
        </div>
    ),
})

export default function MapPage() {
    const { liveAlarms } = mockData
    const [isAlarmFeedOpen, setIsAlarmFeedOpen] = React.useState(true)

    return (
        <div className="flex flex-col p-2 lg:p-4 gap-4 h-[calc(100vh-4rem)] bg-[#09090b] text-zinc-100 font-sans overflow-hidden">

            {/* Map Container */}
            <div className={`relative bg-zinc-900 overflow-hidden w-full rounded-xl transition-all duration-300 ease-in-out ${isAlarmFeedOpen ? 'flex-[0_0_500px]' : 'flex-1'}`}>
                <MapWithNoSSR isAlarmFeedOpen={isAlarmFeedOpen} />
            </div>

            {/* Bottom Panel */}
            <div className="bg-[#18181b] border border-zinc-800 rounded-xl flex-shrink-0 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] overflow-hidden">
                <div
                    onClick={() => setIsAlarmFeedOpen(!isAlarmFeedOpen)}
                    className="flex items-center justify-between px-6 py-3 bg-[#18181b] border-b border-zinc-800 cursor-pointer hover:bg-zinc-800/80 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-5 h-5 rounded bg-rose-900/30 text-rose-500 animate-pulse">
                            <AlertTriangle className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-sm font-semibold text-zinc-100 tracking-tight text-[10px] uppercase">LIVE ALARM FEED</div>
                    </div>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Link href="/alarms" className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors" title="View Full Table">
                            <Maximize2 className="h-4 w-4" />
                        </Link>
                        <button
                            onClick={() => setIsAlarmFeedOpen(!isAlarmFeedOpen)}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                        >
                            <div className={`transition-transform duration-300 ${isAlarmFeedOpen ? 'rotate-180' : ''}`}>
                                <ChevronUp className="h-4 w-4" />
                            </div>
                        </button>
                    </div>
                </div>

                <div className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${isAlarmFeedOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="min-h-0 overflow-hidden">
                        <div className="overflow-x-auto max-h-56 custom-scrollbar bg-[#09090b]">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="uppercase tracking-wider border-b border-zinc-800 bg-zinc-900/50 text-[10px] font-semibold text-muted-foreground sticky top-0 backdrop-blur-sm z-10">
                                    <tr>
                                        <th className="px-6 py-1.5 font-medium border-r border-zinc-800/50 whitespace-nowrap" scope="col">Time</th>
                                        <th className="px-6 py-1.5 font-medium border-r border-zinc-800/50" scope="col">Status</th>
                                        <th className="px-6 py-1.5 font-medium border-r border-zinc-800/50" scope="col">Alarm Class</th>
                                        <th className="px-6 py-1.5 font-medium border-r border-zinc-800/50" scope="col">Alarm</th>
                                        <th className="px-6 py-1.5 font-medium border-r border-zinc-800/50 w-full" scope="col">Alarm Description</th>
                                        <th className="px-6 py-1.5 font-medium" scope="col">Area</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {liveAlarms.map((alarm, idx) => (
                                        <tr key={alarm.id || idx} className="bg-zinc-900/20 text-zinc-300 hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-6 py-1.5 text-xs font-mono text-zinc-400 whitespace-nowrap">{alarm.time}</td>
                                            <td className="px-6 py-1.5 text-xs font-medium">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold shadow-sm ${alarm.status === 'ACTIVE'
                                                    ? 'bg-rose-500 text-white shadow-rose-900/20'
                                                    : 'border border-zinc-700 text-zinc-400 bg-transparent'
                                                    }`}>
                                                    {alarm.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-1.5 text-xs text-zinc-300">{alarm.class}</td>
                                            <td className="px-6 py-1.5 text-xs font-medium text-white">{alarm.alarm}</td>
                                            <td className="px-6 py-1.5 text-xs text-zinc-400 truncate max-w-[300px]">{alarm.description}</td>
                                            <td className="px-6 py-1.5 text-xs text-zinc-400">{alarm.area}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
