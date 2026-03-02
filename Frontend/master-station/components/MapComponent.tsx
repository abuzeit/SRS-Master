"use client"

import * as React from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
    Plus,
    Minus,
    Crosshair,
    BarChart,
    TrendingUp,
    Trophy,
    AlertTriangle,
    Navigation,
    Sun,
    Moon,
    Map,
    Droplets,
    Waves,
    Thermometer,
    Activity,
    Clock,
    ArrowUpRight
} from "lucide-react"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

import mockData from "@/data/mockData.json"

// Map specific station data from mock data
const stationData = mockData.stations.filter(s => s.lat && s.lng)

const healthyIcon = L.divIcon({
    className: "custom-marker",
    html: `<div class="relative flex items-center justify-center">
            <div class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-40"></div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-9 w-9 text-emerald-500" style="filter: drop-shadow(0 4px 4px rgba(0,0,0,0.8));">
                <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
            </svg>
           </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
})

const alarmIcon = L.divIcon({
    className: "custom-marker",
    html: `<div class="relative flex items-center justify-center">
            <div class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-9 w-9 text-rose-500" style="filter: drop-shadow(0 4px 4px rgba(0,0,0,0.8));">
                <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
            </svg>
           </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
})

const maintIcon = L.divIcon({
    className: "custom-marker",
    html: `<div class="relative flex items-center justify-center">
            <div class="animate-pulse absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-50"></div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-9 w-9 text-amber-500" style="filter: drop-shadow(0 4px 4px rgba(0,0,0,0.8));">
                <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
            </svg>
           </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
})

const closedIcon = L.divIcon({
    className: "custom-marker",
    html: `<div class="relative flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-9 w-9 text-zinc-600" style="filter: drop-shadow(0 4px 4px rgba(0,0,0,1));">
                <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
            </svg>
           </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
})

function MapControls({ onZoomIn, onZoomOut, onCenter, onCurrentLocation, mapStyle, onToggleTheme }: {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onCenter: () => void;
    onCurrentLocation: () => void;
    mapStyle: "gray" | "color" | "positron" | "bright" | "dark";
    onToggleTheme: () => void;
}) {
    return (
        <div className="absolute top-6 right-6 flex flex-col gap-2 z-[1000]">
            <button
                onClick={onZoomIn}
                className="bg-zinc-800/85 backdrop-blur-md border border-zinc-700 w-9 h-9 flex items-center justify-center rounded-md shadow-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
                <Plus className="h-5 w-5" />
            </button>
            <button
                onClick={onZoomOut}
                className="bg-zinc-800/85 backdrop-blur-md border border-zinc-700 w-9 h-9 flex items-center justify-center rounded-md shadow-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
                <Minus className="h-5 w-5" />
            </button>
            <button
                onClick={onCenter}
                className="bg-zinc-800/85 backdrop-blur-md border border-zinc-700 w-9 h-9 flex items-center justify-center rounded-md shadow-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors mt-2"
                title="Center map"
            >
                <Crosshair className="h-5 w-5" />
            </button>
            <button
                onClick={onCurrentLocation}
                className="bg-zinc-800/85 backdrop-blur-md border border-zinc-700 w-9 h-9 flex items-center justify-center rounded-md shadow-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors mt-2"
                title="Fly to current location"
            >
                <Navigation className="h-5 w-5" />
            </button>
            <button
                onClick={onToggleTheme}
                className="bg-zinc-800/85 backdrop-blur-md border border-zinc-700 w-9 h-9 flex items-center justify-center rounded-md shadow-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors mt-2"
                title={`Current: ${mapStyle.charAt(0).toUpperCase() + mapStyle.slice(1)} - Click to change`}
            >
                {mapStyle === "gray" && <Moon className="h-5 w-5" />}
                {mapStyle === "color" && <Sun className="h-5 w-5" />}
                {mapStyle === "positron" && <Map className="h-5 w-5" />}
                {mapStyle === "bright" && <Sun className="h-5 w-5" />}
                {mapStyle === "dark" && <Moon className="h-5 w-5" />}
            </button>
        </div>
    )
}

export default function MapComponent({ isAlarmFeedOpen = true }: { isAlarmFeedOpen?: boolean }) {
    const mapRef = React.useRef<L.Map | null>(null)
    const [currentLocation, setCurrentLocation] = React.useState<[number, number] | null>(null)
    const [mapStyle, setMapStyle] = React.useState<"gray" | "color" | "positron" | "bright" | "dark">("gray")
    const [visibleStatuses, setVisibleStatuses] = React.useState<string[]>(['Operational', 'Alarm', 'Maint.', 'Closed'])
    const AbuDhabiCenter: [number, number] = [23.960903, 54.074578]

    const statusCounts = React.useMemo(() => {
        return mockData.stations.reduce((acc, station) => {
            const status = station.status || 'Closed'
            acc[status] = (acc[status] || 0) + 1
            return acc
        }, {} as Record<string, number>)
    }, [])

    const toggleStatusVisibility = (status: string) => {
        setVisibleStatuses(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status]
        )
    }

    const toggleTheme = () => {
        setMapStyle(prev => {
            const styles: Array<"gray" | "color" | "positron" | "bright" | "dark"> = ["gray", "color", "positron", "bright", "dark"]
            const currentIndex = styles.indexOf(prev)
            return styles[(currentIndex + 1) % styles.length]
        })
    }

    const handleZoomIn = () => {
        mapRef.current?.zoomIn()
    }

    const handleZoomOut = () => {
        mapRef.current?.zoomOut()
    }

    const handleCenter = () => {
        mapRef.current?.setView(AbuDhabiCenter, 10)
    }

    const handleCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords
                    setCurrentLocation([latitude, longitude])
                    mapRef.current?.flyTo([latitude, longitude], 14, {
                        duration: 1.5
                    })
                },
                (error) => {
                    console.error("Error getting location:", error.message)
                }
            )
        }
    }

    const currentLocationIcon = L.divIcon({
        className: "custom-marker",
        html: `<div class="relative flex items-center justify-center">
                <div class="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg"></div>
                <div class="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping"></div>
               </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    })

    return (
        <div className="relative w-full h-full transition-all duration-300">
            <MapContainer
                ref={mapRef}
                center={AbuDhabiCenter}
                zoom={7}
                style={{ height: "100%", width: "100%" }}
                className="absolute inset-0 z-0"
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                    url={mapStyle === "gray"
                        ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        : mapStyle === "color"
                            ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            : mapStyle === "positron"
                                ? "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                                : mapStyle === "bright"
                                    ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                    : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    }
                />
                {currentLocation && (
                    <Marker
                        position={currentLocation}
                        icon={currentLocationIcon}
                    >
                        <Popup>
                            <div className="text-sm">
                                <strong>Your Location</strong>
                            </div>
                        </Popup>
                    </Marker>
                )}
                {stationData.filter((s: any) => visibleStatuses.includes(s.status)).map((station: any) => {
                    const status = station.status?.toLowerCase()
                    const isAlarm = status.includes("alarm")
                    const isMaint = status.includes("maint")
                    const isClosed = status.includes("closed")

                    let icon = healthyIcon
                    if (isAlarm) icon = alarmIcon
                    else if (isMaint) icon = maintIcon
                    else if (isClosed) icon = closedIcon

                    return (
                        <Marker
                            key={station.id}
                            position={[station.lat, station.lng]}
                            icon={icon}
                        >
                            <Popup className="custom-popup">
                                <div className="bg-[#09090b]/95 backdrop-blur-xl rounded-xl min-w-[240px] border border-zinc-800 shadow-2xl overflow-hidden">
                                    {/* Status Header Bar */}
                                    <div className={cn(
                                        "h-1 w-full",
                                        isAlarm ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" :
                                            isMaint ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" :
                                                isClosed ? "bg-zinc-600" : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                    )} />

                                    <div className="p-3">
                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-2.5">
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <h3 className="font-black text-white text-base tracking-tighter">{station.id}</h3>
                                                    <span className={cn(
                                                        "text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest",
                                                        isAlarm ? "text-rose-400 border-rose-500/30 bg-rose-500/10" :
                                                            isMaint ? "text-amber-400 border-amber-500/30 bg-amber-500/10" :
                                                                isClosed ? "text-zinc-500 border-zinc-700 bg-zinc-800/50" :
                                                                    "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                                                    )}>
                                                        {station.status}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide mt-0.5">{station.name}</p>
                                            </div>
                                            <div className="bg-zinc-800/50 p-1.5 rounded-lg border border-zinc-700/50">
                                                <Activity className={cn(
                                                    "w-3.5 h-3.5",
                                                    isAlarm ? "text-rose-500" : isMaint ? "text-amber-500" : isClosed ? "text-zinc-600" : "text-emerald-500"
                                                )} />
                                            </div>
                                        </div>

                                        {/* Alarm Banner if Active */}
                                        {isAlarm && station.alarmDetail && (
                                            <div className="mb-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 flex items-center gap-2">
                                                <div className="bg-rose-500 rounded-full p-1 animate-pulse shrink-0">
                                                    <AlertTriangle className="w-2.5 h-2.5 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-rose-100 font-medium leading-none truncate">{station.alarmDetail}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Metrics Grid */}
                                        <div className="grid grid-cols-2 gap-1.5 mb-3">
                                            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg px-2 py-1 flex items-center justify-between">
                                                <div className="flex items-center gap-1 text-zinc-500">
                                                    <Droplets className="w-2.5 h-2.5" />
                                                    <span className="text-[8px] font-black uppercase tracking-tighter">Average pH</span>
                                                </div>
                                                <p className="text-[11px] font-black text-white font-mono">{station.ph || "--"}</p>
                                            </div>
                                            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg px-2 py-1 flex items-center justify-between">
                                                <div className="flex items-center gap-1 text-zinc-500">
                                                    <Activity className="w-2.5 h-2.5" />
                                                    <span className="text-[8px] font-black uppercase tracking-tighter">Average Conductivity</span>
                                                </div>
                                                <p className="text-[11px] font-black text-white font-mono">{station.conductivity || "--"}</p>
                                            </div>
                                            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg px-2 py-1 flex items-center justify-between">
                                                <div className="flex items-center gap-1 text-zinc-500">
                                                    <Waves className="w-2.5 h-2.5" />
                                                    <span className="text-[8px] font-black uppercase tracking-tighter">Total Flow Rate</span>
                                                </div>
                                                <p className="text-[11px] font-black text-white font-mono">{station.flowRate || "0"}</p>
                                            </div>
                                            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg px-2 py-1 flex items-center justify-between">
                                                <div className="flex items-center gap-1 text-zinc-500">
                                                    <Clock className="w-2.5 h-2.5" />
                                                    <span className="text-[8px] font-black uppercase tracking-tighter">Uptime</span>
                                                </div>
                                                <p className="text-[11px] font-black text-white font-mono">{station.uptime}</p>
                                            </div>
                                        </div>

                                        {/* Footer Action */}
                                        <Link
                                            href={`/alarms?station=${station.id}`}
                                            className="flex items-center justify-center gap-1.5 w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold rounded-lg transition-all border border-zinc-700/50 group"
                                        >
                                            View Details
                                            <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                        </Link>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    )
                })}
            </MapContainer>

            <MapControls
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onCenter={handleCenter}
                onCurrentLocation={handleCurrentLocation}
                mapStyle={mapStyle}
                onToggleTheme={toggleTheme}
            />

            <div className="absolute top-6 left-6 w-80 bg-zinc-800/85 backdrop-blur-md rounded-xl shadow-2xl z-[1000] flex flex-col max-h-[calc(100%-3rem)] overflow-hidden transition-all duration-300 border border-zinc-700">
                <Accordion defaultValue={["ranking"]} className="w-full">
                    <AccordionItem value="ranking" className="border-b-0">
                        <AccordionTrigger className="px-4 py-4 hover:no-underline hover:bg-zinc-800/50 border-b border-border bg-zinc-900/40 data-[state=open]:border-b">
                            <div className="flex flex-col items-start gap-1">
                                <h2 className="font-semibold text-zinc-100 flex items-center gap-2 text-sm">
                                    <BarChart className="h-5 w-5 text-blue-500" />
                                    Station Ranking
                                </h2>
                                <p className="text-xs text-muted-foreground font-normal">Based on Daily Throughput</p>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-0 border-none m-0 overflow-y-auto">
                            <div className="p-3 space-y-2.5">

                                <div className="bg-gradient-to-r from-blue-900/30 to-blue-800/10 rounded-lg p-2.5 border border-blue-900/50">
                                    <div className="text-[10px] text-blue-400 font-medium mb-1 uppercase tracking-wide">Total Network Discharge</div>
                                    <div className="text-2xl font-bold text-white font-mono tracking-tight">15,482 <span className="text-sm font-normal text-zinc-500">m³</span></div>
                                    <div className="text-[10px] text-emerald-500 mt-1 flex items-center font-medium">
                                        <TrendingUp className="h-3.5 w-3.5 mr-1" />
                                        +5.2% vs Yesterday
                                    </div>
                                </div>

                                <Accordion defaultValue={["top"]} className="w-full">
                                    <AccordionItem value="top" className="border-zinc-700">
                                        <AccordionTrigger className="py-1.5 hover:no-underline">
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-500 uppercase tracking-wide">
                                                <Trophy className="h-3.5 w-3.5" /> Top Performing
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-1 pb-2">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between p-2 bg-zinc-800/40 rounded-md border border-zinc-700 hover:border-blue-500/50 hover:bg-zinc-800/60 transition-all cursor-pointer group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="font-bold text-blue-500/60 text-xs font-mono group-hover:text-blue-500">01</div>
                                                        <div>
                                                            <div className="text-xs font-medium text-zinc-200 leading-tight">SRS-02</div>
                                                            <div className="text-[10px] text-zinc-500 leading-tight">Mussafah</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs font-mono font-bold text-zinc-300">1,240 m³</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between p-2 bg-zinc-800/40 rounded-md border border-zinc-700 hover:border-blue-500/50 hover:bg-zinc-800/60 transition-all cursor-pointer group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="font-bold text-blue-500/60 text-xs font-mono group-hover:text-blue-500">02</div>
                                                        <div>
                                                            <div className="text-xs font-medium text-zinc-200 leading-tight">SRS-05</div>
                                                            <div className="text-[10px] text-zinc-500 leading-tight">Al Ain Central</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs font-mono font-bold text-zinc-300">980 m³</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between p-2 bg-zinc-800/40 rounded-md border border-zinc-700 hover:border-blue-500/50 hover:bg-zinc-800/60 transition-all cursor-pointer group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="font-bold text-blue-500/60 text-xs font-mono group-hover:text-blue-500">03</div>
                                                        <div>
                                                            <div className="text-xs font-medium text-zinc-200 leading-tight">SRS-11</div>
                                                            <div className="text-[10px] text-zinc-500 leading-tight">Shahama</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs font-mono font-bold text-zinc-300">855 m³</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="critical" className="border-b-0">
                                        <AccordionTrigger className="py-1.5 hover:no-underline">
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-500 uppercase tracking-wide">
                                                <AlertTriangle className="h-3.5 w-3.5" /> Critical Alerts
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-1 pb-2">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between p-2 bg-rose-950/20 rounded-md border border-rose-900/40 cursor-pointer hover:bg-rose-950/30 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                                                        <div>
                                                            <div className="text-xs font-medium text-zinc-200 leading-tight">SRS-14</div>
                                                            <div className="text-[10px] text-rose-400 font-medium leading-tight">AC Failure</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs font-mono font-bold text-zinc-500">0 m³</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between p-2 bg-rose-950/20 rounded-md border border-rose-900/40 cursor-pointer hover:bg-rose-950/30 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                                                        <div>
                                                            <div className="text-xs font-medium text-zinc-200 leading-tight">SRS-22</div>
                                                            <div className="text-[10px] text-rose-400 font-medium leading-tight">High pH</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs font-mono font-bold text-zinc-500">12 m³</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>

                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>

            <div className="absolute bottom-4 right-4 bg-zinc-800/85 backdrop-blur-md rounded-lg p-3 shadow-2xl z-[1000] border border-zinc-700">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-2 tracking-wider">Network Status</h4>
                <div className="flex flex-col gap-2.5">
                    <button
                        onClick={() => toggleStatusVisibility('Operational')}
                        className={`flex items-center justify-between gap-4 text-sm transition-opacity ${visibleStatuses.includes('Operational') ? 'opacity-100' : 'opacity-40'}`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                            <span className="text-zinc-200 text-xs font-medium">Operational</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">({statusCounts['Operational'] || 0})</span>
                    </button>
                    <button
                        onClick={() => toggleStatusVisibility('Alarm')}
                        className={`flex items-center justify-between gap-4 text-sm transition-opacity ${visibleStatuses.includes('Alarm') ? 'opacity-100' : 'opacity-40'}`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
                            <span className="text-zinc-200 text-xs font-medium">Alarm</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">({statusCounts['Alarm'] || 0})</span>
                    </button>
                    <button
                        onClick={() => toggleStatusVisibility('Maint.')}
                        className={`flex items-center justify-between gap-4 text-sm transition-opacity ${visibleStatuses.includes('Maint.') ? 'opacity-100' : 'opacity-40'}`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></span>
                            <span className="text-zinc-200 text-xs font-medium">Maint.</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">({statusCounts['Maint.'] || 0})</span>
                    </button>
                    <button
                        onClick={() => toggleStatusVisibility('Closed')}
                        className={`flex items-center justify-between gap-4 text-sm transition-opacity ${visibleStatuses.includes('Closed') ? 'opacity-100' : 'opacity-40'}`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-zinc-600"></span>
                            <span className="text-zinc-200 text-xs font-medium">Closed</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">({statusCounts['Closed'] || 0})</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
