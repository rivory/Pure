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



// If not dbs -> show a button that trigger the components that add DBS
// If dbs -> show the dropdown selector 
export function DBSwitcher({
    dbs,
    refreshDB
}: {
    dbs: Array<model.Connection>
    refreshDB: Function
}) {
    const { isMobile } = useSidebar()
    const hasDBs = dbs !== null && dbs.length !== 0 ? true : false

    let trigger = <SidebarMenuButton variant="outline">
        <Plus />Add Database
    </SidebarMenuButton>

    if (hasDBs === false) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <AddDBDialog refreshDB={refreshDB} dialogTrigger={trigger} />
                </SidebarMenuItem>
            </SidebarMenu >
        )
    }

    const [activeDB, setActiveDB] = React.useState(dbs[0]);

    trigger = <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="gap-2 p-2">
        <div className="flex size-6 items-center justify-center rounded-md border bg-background">
            <Plus className="size-4" />
        </div>
        <div className="font-medium text-muted-foreground">Add DB</div>
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
                                    {activeDB.name}
                                </span>
                                <span className="truncate text-xs">{activeDB.name}</span>
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
                            Teams
                        </DropdownMenuLabel>
                        {dbs !== null && dbs.length !== 0 ? dbs.map((db, index) => (
                            <DropdownMenuItem
                                key={db.name}
                                onClick={() => setActiveDB(db)}
                                className="gap-2 p-2"
                            >
                                <div className="flex size-6 items-center justify-center rounded-sm border">
                                    <Database className="size-4 shrink-0" />
                                </div>
                                {db.name}
                                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                            </DropdownMenuItem>
                        )) : ''}
                        <DropdownMenuSeparator />
                        <AddDBDialog refreshDB={refreshDB} dialogTrigger={trigger} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu >
    )
}
