import { useState, useEffect } from 'react';
import { model } from "../../../wailsjs/go/models"
import { ListConnections, } from "../../../wailsjs/go/main/App"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

import { ConnectionAddDialog } from './connection-add-dialog';
import { ConnectionEditDialog } from './connection-edit-dialog';

import { ChevronRight, PlugZap, Database, SquarePen, Pencil, Trash2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"


export function ConnectionListDialog({ dialogTrigger }: { dialogTrigger: JSX.Element }) {
    const { toast } = useToast()
    const [open, setOpen] = useState(false);
    const [connections, SetConnections] = useState(Array<model.Connection>)
    const [activeItem, setActiveItem] = useState<number | null>(null)

    // Calculate the height of the container
    let maxVisibleItems = 5
    const maxHeight = `${Math.min(maxVisibleItems, maxVisibleItems) * 3.5}rem`

    function GetListConnections() {
        ListConnections()
            .then((result) => {
                SetConnections(result)
            })
            .catch((err) => {
                console.error(err)
                toast({
                    title: "Error loading connections",
                    description: err instanceof Error ? err.message : "An error occurred",
                    variant: "destructive",
                })
            })
    }

    useEffect(() => {
        // only fetch the list when the dialog is open
        if (open === true) {
            GetListConnections()
        }
    }, [open])

    let connectionAddTrigger = <Button>
        New connection
    </Button>

    let connectionEditTrigger = <button
        className="p-2 hover:bg-primary/90 hover:text-primary-foreground aspect-square  rounded-lg transition-colors duration-200 ease-in-out">
        <Pencil className="h-4 w-4" />
    </button>



    // TODO: set active connection in backend and close modal
    const onItemClick = (item: model.Connection) => {
        console.log(`Clicked: ${item.name}`)
    }

    // TODO: edit item
    const onEditItem = (item: model.Connection) => {
        console.log(`Edit: ${item.name}`)
    }

    // TODO: delete item
    const onDeleteItem = (item: model.Connection) => {
        console.log(`Delete: ${item.name}`)
    }


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {dialogTrigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Connections</DialogTitle>
                    <DialogDescription>
                        Establish or create a new connection.
                    </DialogDescription>
                </DialogHeader>
                <div className="rounded-md border" style={{ height: maxHeight }}>
                    <ScrollArea className="h-full">
                        <div className="pr-4">
                            {connections.map((item, index) => (
                                <div
                                    key={item.id}
                                    className={cn(
                                        "group flex items-center w-full text-left",
                                        "transition-colors duration-200 ease-in-out",
                                        "hover:bg-accent hover:text-accent-foreground",
                                        activeItem === item.id && "bg-accent text-accent-foreground",
                                        index !== connections.length - 1 && "border-b border-border",
                                    )}
                                    onMouseEnter={() => setActiveItem(item.id)}
                                    onMouseLeave={() => setActiveItem(null)}
                                >
                                    <button className="flex-grow flex items-center justify-between  p-4 cursor-pointer" onClick={() => onItemClick(item)}>
                                        <div className={cn(
                                            "transition-colors duration-200 ease-in-out",
                                            "flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground mr-6",
                                            activeItem === item.id && "bg-green-400",
                                        )}
                                        >
                                            <PlugZap className="size-4" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="font-medium">{item.name}</div>
                                            <div className="text-sm text-muted-foreground group-hover:text-accent-foreground">
                                                {item.host}:{item.port}
                                            </div>
                                        </div>
                                    </button>
                                    <div className="flex items-center pr-2">
                                        <ConnectionEditDialog dialogTrigger={connectionEditTrigger} callback={GetListConnections} connection={item} />
                                        <button
                                            className="p-2 hover:bg-destructive hover:text-destructive-foreground aspect-square  rounded-lg transition-colors duration-200 ease-in-out"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onDeleteItem(item)
                                            }}
                                            aria-label={`Delete ${item.name}`}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <ConnectionAddDialog dialogTrigger={connectionAddTrigger} callback={GetListConnections} />

                </DialogFooter>
            </DialogContent>
        </Dialog >
    )
}