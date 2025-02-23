import { useState, KeyboardEvent } from "react"
import { Query } from "../../wailsjs/go/main/App"
import { Button } from "@/components/ui/button"
import CodeMirror from "@uiw/react-codemirror"
import { sql } from "@codemirror/lang-sql"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"

interface QueryInterfaceProps {
	selectedConnection?: string
}

export function QueryInterface({ selectedConnection }: QueryInterfaceProps) {
	const [queryText, setQueryText] = useState("")
	const [results, setResults] = useState<{ columns: string[]; rows: any[][] } | null>(null)
	const { toast } = useToast()
	const [queryHistory, setQueryHistory] = useState<string[]>([])
	// @ts-ignore - historyIndex is used in event handlers
	const [historyIndex, setHistoryIndex] = useState(-1)

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
			if (queryText.trim()) {
				setQueryHistory((prev) => [...prev, queryText])
				setHistoryIndex(-1)
			}
		} catch (err) {
			console.error("Query error", err)
			toast({
				title: "Query Error",
				description: err instanceof Error ? err.message : "An error occurred",
				variant: "destructive",
			})
		}
	}

	const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
		
		e.preventDefault();
		
		if (queryHistory.length === 0) return;
		
		const lastIndex = queryHistory.length - 1;
		const newIndex = e.key === "ArrowUp"
        ? Math.min(historyIndex + 1, lastIndex)
        : Math.max(historyIndex - 1, -1);
		
		setHistoryIndex(newIndex);
		setQueryText(newIndex === -1 ? "" : queryHistory[lastIndex - newIndex]);
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
						onKeyDown={handleKeyDown}
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
