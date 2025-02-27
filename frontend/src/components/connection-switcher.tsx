"use client"
import * as React from "react"
import { ChevronsUpDown, Plus, Database } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import { model } from '../../wailsjs/go/models';
import { Button } from "./ui/button"
import { AddDBDialog } from "@/components/add-db-dialog"



export function ConnectionSwitcher({
    connections,
    refreshConnection,
    onSelectConnection
}: {
    connections: Array<model.Connection>
    refreshConnection: Function
    onSelectConnection: Function
}) {
    const { isMobile } = useSidebar()
    const hasConnections = connections !== null && connections.length !== 0 ? true : false

    let trigger = <SidebarMenuButton variant="outline">
        <Plus />Add Database
    </SidebarMenuButton>

    if (hasConnections === false) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <AddDBDialog refreshDB={refreshConnection} dialogTrigger={trigger} />
                </SidebarMenuItem>
            </SidebarMenu >
        )
    }

    const [activeConnection, setActiveConnection] = React.useState(connections[0]);

    trigger = <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="gap-2 p-2">
        <div className="flex size-6 items-center justify-center rounded-md border bg-background">
            <Plus className="size-4" />
        </div>
        <div className="font-medium text-muted-foreground">Add Connection</div>
    </DropdownMenuItem>

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                <Database className="size-4" />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">
                                    {activeConnection.name}
                                </span>
                                <span className="truncate text-xs">{activeConnection.name}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                        align="start"
                        side={isMobile ? "bottom" : "right"}
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Connections
                        </DropdownMenuLabel>
                        {connections !== null && connections.length !== 0 ? connections.map((connection, index) => (
                            <DropdownMenuItem
                                key={connection.name}
                                onClick={() => { setActiveConnection(connection); onSelectConnection(connection); }}
                                className="gap-2 p-2"
                            >
                                <div className="flex size-6 items-center justify-center rounded-sm border">
                                    <Database className="size-4 shrink-0" />
                                </div>
                                {connection.name}
                                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                            </DropdownMenuItem>
                        )) : ''}
                        <DropdownMenuSeparator />
                        <AddDBDialog refreshDB={refreshConnection} dialogTrigger={trigger} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu >
    )
}
