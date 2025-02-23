import { useState } from 'react'
import { Query } from "../../wailsjs/go/main/App"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"

interface QueryInterfaceProps {
    selectedConnection?: string
}

export function QueryInterface({ selectedConnection }: QueryInterfaceProps) {
    const [queryText, setQueryText] = useState("")
    const [results, setResults] = useState<{columns: string[], rows: any[][]} | null>(null)
    const { toast } = useToast()

    const handleQuery = async () => {
        if (!selectedConnection) {
            toast({
                title: "Error",
                description: "Please select a connection first",
                variant: "destructive",
            })
            return
        }

        try {
            const result = await Query(selectedConnection, queryText)
            setResults(result)
        } catch (err) {
            console.error("Query error", err)
            toast({
                title: "Query Error",
                description: err instanceof Error ? err.message : "An error occurred",
                variant: "destructive",
            })
        }
    }

    console.log("results", results)
    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="flex gap-2">
                <Textarea 
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    placeholder="Enter your SQL query here..."
                    className="font-mono"
                />
                <Button onClick={handleQuery}>Run Query</Button>
            </div>
            
            {results && (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {results.columns.map((column, i) => (
                                    <TableHead key={i}>{column}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* {results.rows.map((row, i) => (
                                <TableRow key={i}>
                                    {row.map((cell, j) => (
                                        <TableCell key={j}>{String(cell)}</TableCell>
                                    ))}
                                </TableRow>
                            ))} */}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
} 