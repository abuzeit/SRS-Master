import * as React from "react"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

import { NavbarBreadcrumb } from "./NavbarBreadcrumb"

export function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full bg-background text-foreground">
                <AppSidebar />
                <SidebarInset className="flex w-full flex-col flex-1">
                    <header className="h-16 flex shrink-0 items-center justify-between px-6 border-b border-border bg-card sticky top-0 z-50">
                        <div className="flex items-center gap-4">
                            <SidebarTrigger className="-ml-2" />
                            <NavbarBreadcrumb />
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground mr-2">Admin User</span>
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                                A
                            </div>
                        </div>
                    </header>
                    <main className="flex-1">
                        {children}
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    )
}
