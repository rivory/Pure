"use client";

import { Database, ChevronRight, type LucideIcon } from "lucide-react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
} from "@/components/ui/sidebar";
import { CornerLeftUp, Frown } from "lucide-react";
import { ListDatabase } from "../../wailsjs/go/main/App";
import { useEffect, useState } from "react";
import { model } from "../../wailsjs/go/models";
import { useToast } from "@/hooks/use-toast";

export function NavDatabase({ connected }: { connected: boolean }) {
    const { isMobile } = useSidebar();
    const { toast } = useToast();

    const [databases, setDatabases] = useState(Array<model.Database>);

    useEffect(() => {
        // Toast notification for database loading
        toast({
            title: "Loading databases",
            description: "Fetching database information...",
        });

        ListDatabase()
            .then((result) => {
                console.log(result);
                setDatabases(result || []);
                console.log(databases);

                // Success toast
                toast({
                    title: "Databases loaded",
                    description: result
                        ? `Successfully loaded ${result.length} databases`
                        : "No databases found or connection issue",
                    variant: "default",
                });
            })
            .catch((err) => {
                console.log(err);

                // Error toast
                let errorMessage = "Failed to load databases";
                if (err instanceof Error) {
                    errorMessage = err.message;
                } else if (typeof err === "string") {
                    errorMessage = err;
                } else {
                    errorMessage = JSON.stringify(err);
                }

                toast({
                    title: "Database loading error",
                    description: errorMessage,
                    variant: "destructive",
                });
            });
    }, []);
    if (!connected) {
        return (
            <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                <SidebarMenu>
                    <div className="p-2 pb-0">
                        <div className="space-y-1 flex justify-between">
                            <CornerLeftUp className="text-muted-foreground"></CornerLeftUp>

                            <p className="text-sm text-muted-foreground">
                                You need to add <br />
                                an active connection.
                            </p>
                        </div>
                    </div>
                </SidebarMenu>
            </SidebarGroup>
        );
    }
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
        </SidebarGroup>
    );
}
