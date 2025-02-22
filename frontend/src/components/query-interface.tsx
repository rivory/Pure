import { useState } from 'react'
import { Query } from "../../wailsjs/go/main/App"
import { Button } from "@/components/ui/button"
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
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

    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="flex gap-2">
                <div className="flex-grow">
                    <CodeMirror
                        value={queryText}
                        height="200px"
                        extensions={[sql()]}
                        onChange={(value) => setQueryText(value)}
                        className="border rounded-md"
                        theme="dark"
                        basicSetup={{
                            lineNumbers: true,
                            highlightActiveLineGutter: true,
                            highlightSpecialChars: true,
                            foldGutter: true,
                            dropCursor: true,
                            allowMultipleSelections: true,
                            indentOnInput: true,
                            bracketMatching: true,
                            closeBrackets: true,
                            autocompletion: true,
                            rectangularSelection: true,
                            crosshairCursor: true,
                            highlightActiveLine: true,
                            highlightSelectionMatches: true,
                            closeBracketsKeymap: true,
                            defaultKeymap: true,
                            searchKeymap: true,
                            historyKeymap: true,
                            foldKeymap: true,
                            completionKeymap: true,
                            lintKeymap: true,
                        }}
                    />
                </div>
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
                            {results?.rows?.map((row, i) => (
                                <TableRow key={i}>
                                    {row.map((cell, j) => (
                                        <TableCell key={j}>{String(cell)}</TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
} 