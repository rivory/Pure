import { useState } from 'react';
import { useToast } from "@/hooks/use-toast"
import { z } from "zod"
import { AddConnection } from "../../../wailsjs/go/main/App";



import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"



const validateSchema = z.object({
    username: z.string({}),
    name: z.string({}),
    password: z.string({}),
    host: z.string({}),
    port: z.coerce.number().refine((val) => `${val}`.length === 4, 'Port must be 4 digits long'),
})


export function ConnectionAddDialog({ dialogTrigger, callback }: { dialogTrigger: JSX.Element, callback: Function }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast()

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        // Prevent the browser from reloading the page
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            const validatedForm = validateSchema.parse(data);

            AddConnection(validatedForm.name, validatedForm.username, validatedForm.password, validatedForm.host, validatedForm.port).then(() => {
                setOpen(false);
                callback();
            }).catch(err => {
                let message
                if (err instanceof Error) message = err.message
                else message = String(err)


                toast({
                    variant: "destructive",
                    title: "Uh oh! Something went wrong.",
                    description: message,
                })
            })
        } catch (err) {
            let errorMessage = "There was a problem with your request.";
            if (err instanceof z.ZodError) {
                errorMessage = err.message;
            }

            toast({
                variant: "destructive",
                title: "Uh oh! Something went wrong.",
                description: errorMessage,
            })
        }
    }

    // TODO: add ssl mode 
    // TODO: store password in keychain ??
    // TODO: add optional database name

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {dialogTrigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>New connection</DialogTitle>
                    <DialogDescription>
                        Add a new connection.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Name
                            </Label>
                            <Input id="name" name="name" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="username" className="text-right">
                                Username
                            </Label>
                            <Input id="username" name="username" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="password" className="text-right">
                                Password
                            </Label>
                            <Input id="password" name="password" className="col-span-3" type="password" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="host" className="text-right">
                                Host
                            </Label>
                            <Input id="host" name="host" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="host" className="text-right">
                                Port
                            </Label>
                            <Input id="port" name="port" className="col-span-3" type="number" />
                        </div>

                    </div>
                    <DialogFooter>
                        <Button type="submit">Add</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}