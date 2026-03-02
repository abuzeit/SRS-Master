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


const MapWithNoSSR = dynamic(() => import("@/components/MapComponent"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-background rounded-xl">
            <div className="text-muted-foreground">Loading map...</div>
        </div>
    ),
})

export default function MapPage() {
    const { liveAlarms } = mockData
    const [isAlarmFeedOpen, setIsAlarmFeedOpen] = React.useState(true)

    return (
        <div className="flex flex-col p-2 lg:p-4 gap-4 h-[calc(100vh-4rem)] bg-background text-foreground font-sans overflow-hidden">

            {/* Map Container */}
            <div className={`relative bg-background overflow-hidden w-full rounded-xl transition-all duration-300 ease-in-out border border-border ${isAlarmFeedOpen ? 'flex-[0_0_500px]' : 'flex-1'}`}>
                <MapWithNoSSR isAlarmFeedOpen={isAlarmFeedOpen} />
            </div>

            {/* Bottom Panel */}
            <div className="bg-card border border-border rounded-xl flex-shrink-0 z-30 shadow-sm overflow-hidden">
                <div
                    onClick={() => setIsAlarmFeedOpen(!isAlarmFeedOpen)}
                    className="flex items-center justify-between px-6 py-3 bg-card border-b border-border cursor-pointer hover:bg-accent/50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-5 h-5 rounded bg-rose-500/20 text-rose-500 animate-pulse">
                            <AlertTriangle className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-sm font-semibold text-foreground tracking-tight text-[10px] uppercase">LIVE ALARM FEED</div>
                    </div>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Link href="/alarms" className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors" title="View Full Table">
                            <Maximize2 className="h-4 w-4" />
                        </Link>
                        <button
                            onClick={() => setIsAlarmFeedOpen(!isAlarmFeedOpen)}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                        >
                            <div className={`transition-transform duration-300 ${isAlarmFeedOpen ? 'rotate-180' : ''}`}>
                                <ChevronUp className="h-4 w-4" />
                            </div>
                        </button>
                    </div>
                </div>

                <div className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${isAlarmFeedOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="min-h-0 overflow-hidden">
                        <div className="overflow-x-auto max-h-56 custom-scrollbar bg-card">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="uppercase tracking-wider border-b border-border bg-muted/80 text-[10px] font-semibold text-muted-foreground sticky top-0 backdrop-blur-sm z-10">
                                    <tr>
                                        <th className="px-6 py-1.5 font-medium border-r border-border/50 whitespace-nowrap" scope="col">Time</th>
                                        <th className="px-6 py-1.5 font-medium border-r border-border/50" scope="col">Station ID</th>
                                        <th className="px-6 py-1.5 font-medium border-r border-border/50" scope="col">Status</th>
                                        <th className="px-6 py-1.5 font-medium border-r border-border/50" scope="col">Alarm Class</th>
                                        <th className="px-6 py-1.5 font-medium border-r border-border/50" scope="col">Alarm</th>
                                        <th className="px-6 py-1.5 font-medium border-r border-border/50 w-full" scope="col">Alarm Description</th>
                                        <th className="px-6 py-1.5 font-medium" scope="col">Area</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {liveAlarms.map((alarm, idx) => (
                                        <tr key={alarm.id || idx} className="bg-card text-foreground hover:bg-accent/50 transition-colors">
                                            <td className="px-6 py-1.5 text-xs font-mono text-muted-foreground whitespace-nowrap">{alarm.time}</td>
                                            <td className="px-6 py-1.5 text-xs font-bold text-blue-500 whitespace-nowrap">{alarm.stationId || "N/A"}</td>
                                            <td className="px-6 py-1.5 text-xs font-medium">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold shadow-sm ${alarm.status === 'ACTIVE'
                                                    ? 'bg-rose-500 text-white shadow-rose-500/20'
                                                    : 'border border-border text-muted-foreground bg-transparent'
                                                    }`}>
                                                    {alarm.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-1.5 text-xs text-muted-foreground">{alarm.class}</td>
                                            <td className="px-6 py-1.5 text-xs font-medium text-foreground">{alarm.alarm}</td>
                                            <td className="px-6 py-1.5 text-xs text-muted-foreground truncate max-w-[300px]">{alarm.description}</td>
                                            <td className="px-6 py-1.5 text-xs text-muted-foreground">{alarm.area}</td>
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
