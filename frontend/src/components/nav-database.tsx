"use client"

import {
    Database,
    type LucideIcon,
} from "lucide-react"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import { CornerLeftUp, Frown } from "lucide-react"


export function NavDatabase({
    databases,
    connected
}: {
    databases: {
        name: string
    }[]
    connected: boolean
}) {
    const { isMobile } = useSidebar()

    if (!connected) {
        return (
            <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                <SidebarMenu>
                    <div className="p-2 pb-0">
                        <div className="space-y-1 flex justify-between">
                            <CornerLeftUp className="text-muted-foreground" ></CornerLeftUp>

                            <p className="text-sm text-muted-foreground">
                                You need to add <br />an active connection.
                            </p>
                        </div>
                    </div>

                </SidebarMenu>
            </SidebarGroup >
        )
    }

    return (
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarMenu>
                <SidebarGroupLabel>Databases</SidebarGroupLabel>
                {databases.map((item) => (
                    <div>
                        test
                    </div>
                ))}

            </SidebarMenu>
        </SidebarGroup >
    )
}
