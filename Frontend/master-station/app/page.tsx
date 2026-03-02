"use client"

import * as React from "react"
import {
    Card,
    CardContent,
} from "@/components/ui/card"
import mockData from "@/data/mockData.json"
import { Waves, Truck, AlertTriangle, Activity, ArrowRight, ChevronDown, ChevronUp, Bell, Maximize2 } from "lucide-react"
import { LineChart, Line, ResponsiveContainer } from "recharts"
import Link from "next/link"

export default function Dashboard() {
    const { dashboardStats, stations, liveAlarms } = mockData
    const [isAlarmFeedOpen, setIsAlarmFeedOpen] = React.useState(true)

    // Dummy data for sparkline
    const efficiencyData = dashboardStats.systemEfficiency.trend.map((val, i) => ({ val, index: i }))

    return (
        <div className="flex flex-col p-2 lg:p-4 gap-4 max-w-[1800px] mx-auto w-full text-zinc-100 min-h-full">

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                {/* Total Volume */}
                <Card className="bg-zinc-900 border-zinc-800 shadow-sm text-white overflow-hidden relative group">
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
                <Card className="bg-zinc-900 border-zinc-800 shadow-sm text-white overflow-hidden relative group">
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
                            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${dashboardStats.activeBays.utilization}%` }} />
                            </div>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{dashboardStats.activeBays.utilization}% Utilization</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Critical Alarms */}
                <Card className="bg-zinc-900 border-zinc-800 shadow-sm text-white overflow-hidden relative group border-l-[4px] border-l-red-500">
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
                                Stations: <span className="text-zinc-300 font-medium">{dashboardStats.criticalAlarms.stations.join(", ")}</span>
                            </p>
                            <button className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-bold transition-colors w-fit">
                                Resolve Now <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </CardContent>
                </Card>

                {/* System Efficiency */}
                <Card className="bg-zinc-900 border-zinc-800 shadow-sm text-white overflow-hidden relative group">
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
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                            <Activity className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">Active Fleet Overview</h2>
                            <p className="text-xs text-zinc-500 font-medium">Monitoring 30 receiving stations across North and South sectors</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg hover:border-zinc-700 transition-all shadow-sm">
                            Zone: All <ChevronDown className="h-4 w-4 text-zinc-500" />
                        </button>
                        <button className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg hover:border-zinc-700 transition-all shadow-sm">
                            Status <ChevronDown className="h-4 w-4 text-zinc-500" />
                        </button>
                    </div>
                </div>

                <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                    {stations.slice(0, 10).map((station) => {
                        const isAlarm = station.status === "ALARM" || station.status === "Alarm";
                        const isMaint = station.status === "Maint.";
                        const isOffline = station.status === "Offline" || station.status === "Inactive";

                        let colorClass = "bg-emerald-500";
                        let borderClass = "border-emerald-500/20";
                        let badgeClass = "text-emerald-500 border-emerald-500/20 bg-emerald-500/10";
                        let sparkColor = "#10b981";

                        if (isAlarm) {
                            colorClass = "bg-red-500";
                            borderClass = "border-red-500/20";
                            badgeClass = "text-red-500 border-red-500/20 bg-red-500/10";
                            sparkColor = "#ef4444";
                        } else if (isMaint) {
                            colorClass = "bg-yellow-500";
                            borderClass = "border-yellow-500/20";
                            badgeClass = "text-yellow-500 border-yellow-500/20 bg-yellow-500/10";
                            sparkColor = "#f59e0b";
                        } else if (isOffline) {
                            colorClass = "bg-zinc-600";
                            borderClass = "border-zinc-700";
                            badgeClass = "text-zinc-500 border-zinc-700 bg-zinc-800/50";
                            sparkColor = "#52525b";
                        }

                        const sparkData = station.trend ? station.trend.map((val, i) => ({ val, index: i })) : [];

                        return (
                            <Card key={station.id} className="bg-zinc-900 border-zinc-800 shadow-sm text-white overflow-hidden group hover:border-zinc-700 transition-all">
                                <CardContent className="p-5 flex flex-col h-[160px] relative">
                                    <div className={`absolute top-0 left-0 right-0 h-1 ${colorClass}`} />

                                    <div className="flex justify-between items-start mb-4">
                                        <div className="space-y-0.5">
                                            <h4 className="font-bold text-sm tracking-tight">{station.id}</h4>
                                            <p className="text-[10px] text-zinc-500 font-medium">SRS-HUB-05</p>
                                        </div>
                                        <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded border tracking-widest ${badgeClass}`}>
                                            {station.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Bays</p>
                                            <p className="text-xs font-black text-zinc-100">
                                                {station.activeBays !== null ? `${station.activeBays} / ${station.totalBays}` : "-"}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Flow</p>
                                            <p className="text-xs font-black text-zinc-100">
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
                <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900 shadow-xl">
                    <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-3 bg-zinc-900/50">
                        <div className="bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                            <Bell className="h-4 w-4 text-red-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold tracking-widest text-white uppercase">Critical Alarm Feed</h3>
                            <p className="text-[10px] text-zinc-500 font-medium">Real-time system alerts and critical failures</p>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <Link href="/alarms" className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl transition-all" title="Expand View">
                                <Maximize2 className="h-4 w-4" />
                            </Link>
                            <button
                                onClick={() => setIsAlarmFeedOpen(!isAlarmFeedOpen)}
                                className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
                            >
                                {isAlarmFeedOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    {isAlarmFeedOpen && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] uppercase font-bold text-zinc-500 bg-zinc-900/30 border-b border-zinc-800/50">
                                    <tr>
                                        <th className="px-6 py-3 tracking-widest">Time</th>
                                        <th className="px-6 py-3 tracking-widest">Status</th>
                                        <th className="px-6 py-3 tracking-widest">Class</th>
                                        <th className="px-6 py-3 tracking-widest">Alarm</th>
                                        <th className="px-6 py-3 tracking-widest">Description</th>
                                        <th className="px-6 py-3 tracking-widest">Area</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
                                    {liveAlarms.map((alarm) => (
                                        <tr key={alarm.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-3 text-[11px] font-medium text-zinc-500 whitespace-nowrap">
                                                {alarm.time}
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest ${alarm.status === 'ACTIVE' ? 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}>
                                                    {alarm.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-[11px] font-bold text-purple-400">
                                                {alarm.class}
                                            </td>
                                            <td className="px-6 py-3 text-white font-black text-xs">
                                                {alarm.alarm}
                                            </td>
                                            <td className="px-6 py-3 text-zinc-400 text-xs truncate max-w-[400px]">
                                                {alarm.description}
                                            </td>
                                            <td className="px-6 py-3 text-[11px] font-bold text-blue-400">
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