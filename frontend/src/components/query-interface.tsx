import { useState, KeyboardEvent, useEffect, useRef } from "react"
import { Query, ListTables, GetTableInfo } from "../../wailsjs/go/main/App"
import { Button } from "@/components/ui/button"
import CodeMirror from "@uiw/react-codemirror"
import { sql } from "@codemirror/lang-sql"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { autocompletion, CompletionContext, startCompletion } from "@codemirror/autocomplete"
import { keymap } from "@codemirror/view"
import { createSqlCompletions } from "@/lib/sql-completions"
import { TableInfo } from "@/types/table-info"
import { useTheme } from "@/contexts/theme-context"
import { Input } from "@/components/ui/input"
import { model } from "../../wailsjs/go/models"


// Interface pour le suivi de la cellule en cours d'édition
interface EditingCell {
	rowIndex: number;
	colIndex: number;
	value: string;
	tableName?: string;
	columnName?: string;
}

interface QueryInterfaceProps {
	readonly selectedConnection?: model.Connection
	readonly selectedTable?: string
	readonly initialState?: {
		queryText: string
		results: {
			columns: string[]
			rows: any[][]
		} | null
	}
	readonly onStateChange?: (state: {
		queryText: string
		results: {
			columns: string[]
			rows: any[][]
		} | null
	}) => void
}

export function QueryInterface({
	selectedConnection,
	selectedTable,
	initialState,
	onStateChange
}: QueryInterfaceProps) {
	const [queryText, setQueryText] = useState(initialState?.queryText ?? "")
	const [results, setResults] = useState(initialState?.results ?? null)
	const { toast } = useToast()
	const [queryHistory, setQueryHistory] = useState<string[]>([])
	const [historyIndex, setHistoryIndex] = useState(-1)
	const [tables, setTables] = useState<string[]>([])
	const [tableInfo, setTableInfo] = useState<TableInfo[]>([])
	const { theme } = useTheme()

	// État pour suivre la cellule en cours d'édition
	const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
	// Référence pour le focus de l'input
	const inputRef = useRef<HTMLInputElement>(null)
	// Stockage du nom de la table actuellement affichée
	const [currentTableName, setCurrentTableName] = useState<string>("")

	useEffect(() => {
		if (selectedConnection) {
			loadTables()
			loadTableInfo()
		}
	}, [selectedConnection])

	useEffect(() => {
		onStateChange?.({
			queryText,
			results
		})
	}, [queryText, results])

	// Déterminer la table actuellement affichée
	useEffect(() => {
		if (results && queryText) {
			// Extraction simple du nom de la table à partir de la requête
			const fromMatch = queryText.match(/FROM\s+(\w+)/i)
			if (fromMatch && fromMatch[1]) {
				setCurrentTableName(fromMatch[1])
			}
		}
	}, [results, queryText])

	// Focus sur l'input lorsqu'une cellule est en édition
	useEffect(() => {
		if (editingCell && inputRef.current) {
			inputRef.current.focus()
		}
	}, [editingCell])

	const loadTables = async () => {
		if (!selectedConnection) return
		try {
			// const tablesList = await ListTables(selectedConnection) TODO: Fix call
			// setTables(tablesList)
		} catch (err) {
			console.error("Failed to load tables", err)
		}
	}

	const loadTableInfo = async () => {
		if (!selectedConnection) return
		try {
			// const info = await GetTableInfo(selectedConnection) TODO: fix call
			// setTableInfo(info)
		} catch (err) {
			console.error("Failed to load table info", err)
		}
	}

	const handleQuery = async () => {
		if (!selectedConnection) {
			toast({
				title: "Error",
				description: "Please select a connection first",
				variant: "destructive",
			})
			return
		}

		// Réinitialiser la cellule en cours d'édition
		setEditingCell(null)

		try {
			// const result = await Query(selectedConnection, queryText) 
			// setResults(result) TODO: Fix call
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
		// Vérifie si une boîte d'autocomplétion est active
		const completionActive = document.querySelector('.cm-tooltip-autocomplete')
		if (completionActive) return console.log("PREVENT ----")

		if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return

		e.preventDefault()

		if (queryHistory.length === 0) return

		const lastIndex = queryHistory.length - 1
		const newIndex = e.key === "ArrowUp" ? Math.min(historyIndex + 1, lastIndex) : Math.max(historyIndex - 1, -1)

		setHistoryIndex(newIndex)
		setQueryText(newIndex === -1 ? "" : queryHistory[lastIndex - newIndex])
	}

	// Commencer l'édition d'une cellule
	const startEditing = (rowIndex: number, colIndex: number, value: any) => {
		if (!results) return

		const columnName = results.columns[colIndex]

		setEditingCell({
			rowIndex,
			colIndex,
			value: String(value),
			tableName: currentTableName,
			columnName
		})
	}

	// Annuler l'édition
	const cancelEditing = () => {
		setEditingCell(null)
	}

	// Gestion des touches spéciales lors de l'édition
	const handleEditInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Escape') {
			cancelEditing()
		} else if (e.key === 'Enter') {
			saveEdit()
		}
	}

	// Construire et exécuter une requête UPDATE
	const saveEdit = async () => {
		if (!editingCell || !results || !selectedConnection) return

		try {
			const { rowIndex, colIndex, value, tableName, columnName } = editingCell

			if (!tableName || !columnName) {
				toast({
					title: "Error",
					description: "Unable to determine table or column name",
					variant: "destructive",
				})
				return
			}

			// Identifier la ligne pour construire la clause WHERE
			const whereConditions = results.columns.map((col, idx) => {
				const cellValue = results.rows[rowIndex][idx]

				// Si c'est la colonne qu'on modifie, utiliser l'ancienne valeur
				if (idx === colIndex) {
					return null
				}

				// Pour les valeurs NULL
				if (cellValue === null) {
					return `${col} IS NULL`
				}

				// Pour les valeurs textuelles, entourer de guillemets simples
				if (typeof cellValue === 'string') {
					return `${col} = '${cellValue.replace(/'/g, "''")}'`
				}

				// Pour les autres types de valeurs
				return `${col} = ${cellValue}`
			}).filter(Boolean).join(' AND ')

			// Si aucune condition WHERE, ne pas permettre l'UPDATE (trop dangereux)
			if (!whereConditions) {
				toast({
					title: "Error",
					description: "Cannot update without WHERE conditions",
					variant: "destructive",
				})
				return
			}

			// Générer la requête UPDATE
			let updateValue = value
			if (typeof results.rows[rowIndex][colIndex] === 'string') {
				updateValue = `'${value.replace(/'/g, "''")}'`
			} else if (value === '') {
				// Traiter les champs vides comme NULL pour les types non-texte
				updateValue = 'NULL'
			}

			const updateQuery = `UPDATE ${tableName} SET ${columnName} = ${updateValue} WHERE ${whereConditions}`

			// Exécuter la requête UPDATE
			// await Query(selectedConnection, updateQuery) TODO fix call

			// Mettre à jour localement le résultat affiché
			const newResults = { ...results }
			newResults.rows[rowIndex][colIndex] = value === '' ? null : value
			setResults(newResults)

			// Notification de succès
			toast({
				title: "Update successful",
				description: "The value has been updated in the database",
			})
		} catch (err) {
			console.error("Update error", err)
			toast({
				title: "Update Error",
				description: err instanceof Error ? err.message : "An error occurred",
				variant: "destructive",
			})
		} finally {
			setEditingCell(null)
		}
	}

	return (
		<div className="flex flex-col gap-4 p-4">
			<div className="flex gap-2">
				<div className="flex-grow">
					<CodeMirror
						value={queryText}
						height="200px"
						extensions={[
							sql(),
							autocompletion({ override: [createSqlCompletions(tableInfo)] }),
							keymap.of([{
								key: "Alt-Escape",
								run: startCompletion
							}])
						]}
						onChange={(value) => setQueryText(value)}
						onKeyDown={handleKeyDown}
						className="border rounded-md"
						theme={theme === 'dark' ? 'dark' : 'light'}
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
							{results?.rows?.map((row, rowIdx) => (
								<TableRow key={rowIdx}>
									{row.map((cell, colIdx) => (
										<TableCell
											key={colIdx}
											onDoubleClick={() => startEditing(rowIdx, colIdx, cell)}
											className="cursor-pointer"
										>
											{editingCell &&
												editingCell.rowIndex === rowIdx &&
												editingCell.colIndex === colIdx ? (
												<Input
													ref={inputRef}
													value={editingCell.value}
													onChange={(e) => setEditingCell({
														...editingCell,
														value: e.target.value
													})}
													onKeyDown={handleEditInputKeyDown}
													onBlur={saveEdit}
													className="w-full"
												/>
											) : (
												<span className="px-1 py-0.5 rounded hover:bg-muted">
													{cell === null ? 'NULL' : String(cell)}
												</span>
											)}
										</TableCell>
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
