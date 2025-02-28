"use client"

import {
    Database,
    ChevronRight,
    type LucideIcon,
} from "lucide-react"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { CornerLeftUp, Frown } from "lucide-react"
import { ListDatabase } from "../../wailsjs/go/main/App"
import { useEffect, useState } from "react"
import { model } from "../../wailsjs/go/models"


export function NavDatabase({
    connected
}: {
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

    const [databases, setDatabases] = useState(Array<model.Database>)


    useEffect(() => {
        ListDatabase()
            .then((result) => {
                console.log(result)
                setDatabases(result)
                console.log(databases)
            })
            .catch((err) => {
                console.log(err)
            })
    }, [])

    return (
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarMenu>
                <SidebarGroupLabel>Databases</SidebarGroupLabel>
                {databases?.map((db) => (
                    <Collapsible
                        key={db.Name}
                        asChild
                        // defaultOpen={item.isActive}
                        className="group/collapsible"
                    >
                        <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                                <SidebarMenuButton tooltip={db.Name}>
                                    <Database />
                                    {/* {item.icon && <item.icon />} */}
                                    <span>{db.Name}</span>
                                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <SidebarMenuSub>
                                    {db.Tables?.map((table) => (
                                        <SidebarMenuSubItem key={table}>
                                            <SidebarMenuSubButton asChild>
                                                {/* <a href={subItem.url}> */}
                                                <span>{table}</span>
                                                {/* </a> */}
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    ))}
                                </SidebarMenuSub>
                            </CollapsibleContent>
                        </SidebarMenuItem>
                    </Collapsible>
                ))}

            </SidebarMenu>
        </SidebarGroup >
    )
}
