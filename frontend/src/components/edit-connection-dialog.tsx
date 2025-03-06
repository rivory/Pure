import { Button } from "@/components/ui/button"
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
import { z } from "zod"
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast"
import { model } from '../../wailsjs/go/models';
import { SetActiveConnection, UpdateConnection } from "../../wailsjs/go/main/App";

const validateSchema = z.object({
    uuid: z.string({}),
    name: z.string({}),
    username: z.string({}),
    password: z.string({}),
    host: z.string({}),
    port: z.coerce.number().refine((val) => `${val}`.length === 4, 'Port must be 4 digits long'),
})

export function EditConnectionDialog({
    connection,
    refreshDB,
    dialogTrigger,
    onUpdateSuccess
}: {
    connection: model.Connection
    refreshDB: Function
    dialogTrigger: JSX.Element
    onUpdateSuccess?: (updatedConnection: model.Connection) => void
}) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast()
    const [formData, setFormData] = useState({
        uuid: connection.uuid?.toString() || '',
        name: connection.name || '',
        username: connection.username || '',
        password: connection.password || '',
        host: connection.host || '',
        port: connection.port || 5432,
    });

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        try {
            const validatedForm = validateSchema.parse(formData);

            // Create a connection object
            const updatedConnection: model.Connection = {
                id: connection.id, // Keep the original ID
                uuid: connection.uuid, // Keep the original UUID
                name: validatedForm.name,
                type: connection.type, // Keep the original type
                username: validatedForm.username,
                password: validatedForm.password,
                host: validatedForm.host,
                port: validatedForm.port,
            };

            // First update the connection
            UpdateConnection(updatedConnection)
                .then(() => {
                    // Then set it as active
                    return SetActiveConnection(updatedConnection);
                })
                .then(() => {
                    toast({
                        title: "Connection updated",
                        description: "Connection updated and reconnected successfully.",
                    });

                    setOpen(false);

                    // Refresh the connection list
                    refreshDB();

                    // Notify parent component
                    if (onUpdateSuccess) {
                        onUpdateSuccess(updatedConnection);
                    }
                })
                .catch((err: unknown) => {
                    let message = "Connection update failed";
                    if (err instanceof Error) message = err.message;
                    else message = String(err);

                    toast({
                        variant: "destructive",
                        title: "Connection error",
                        description: message,
                    });
                });
        } catch (err) {
            let errorMessage = "There was a problem with your request.";
            if (err instanceof z.ZodError) {
                errorMessage = err.errors.map(e => `${e.path}: ${e.message}`).join(", ");
            }

            toast({
                variant: "destructive",
                title: "Validation error",
                description: errorMessage,
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {dialogTrigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Connection</DialogTitle>
                    <DialogDescription>
                        Edit your database connection settings.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="username" className="text-right">
                                Username
                            </Label>
                            <Input
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="password" className="text-right">
                                Password
                            </Label>
                            <Input
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="col-span-3"
                                type="password"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="host" className="text-right">
                                Host
                            </Label>
                            <Input
                                id="host"
                                name="host"
                                value={formData.host}
                                onChange={handleChange}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="port" className="text-right">
                                Port
                            </Label>
                            <Input
                                id="port"
                                name="port"
                                value={formData.port}
                                onChange={handleChange}
                                className="col-span-3"
                                type="number"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
} 