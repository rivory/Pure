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
import { translateToSql } from "@/lib/ollama"
import { Loader2, Info, X } from "lucide-react"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

// Interface pour le suivi de la cellule en cours d'édition
interface EditingCell {
	rowIndex: number;
	colIndex: number;
	value: string;
	tableName?: string;
	columnName?: string;
}

interface QueryInterfaceProps {
	readonly selectedConnection?: string
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
	// État pour le champ de texte en langage naturel
	const [naturalLanguageQuery, setNaturalLanguageQuery] = useState("")
	// État pour indiquer si la traduction est en cours
	const [isTranslating, setIsTranslating] = useState(false)

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
			const tablesList = await ListTables(selectedConnection)
			setTables(tablesList)
		} catch (err) {
			console.error("Failed to load tables", err)
		}
	}

	const loadTableInfo = async () => {
		if (!selectedConnection) return
		try {
			const info = await GetTableInfo(selectedConnection)
			setTableInfo(info)
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
			await Query(selectedConnection, updateQuery)
			
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

	// Fonction pour traduire le texte en SQL avec Ollama
	const handleTranslate = async () => {
		if (!naturalLanguageQuery.trim()) {
			toast({
				title: "Champ vide",
				description: "Veuillez entrer une phrase à traduire en SQL",
				variant: "destructive",
			})
			return
		}

		setIsTranslating(true)
		try {
			// Passer les informations de tables à la fonction translateToSql
			// qui utilise maintenant le backend Go pour communiquer avec Ollama
			const sqlQuery = await translateToSql(naturalLanguageQuery, tableInfo)
			setQueryText(sqlQuery)
			toast({
				title: "Traduction réussie",
				description: "La requête SQL a été générée avec succès",
			})
		} catch (err) {
			console.error("Erreur de traduction", err)
			toast({
				title: "Erreur de traduction",
				description: err instanceof Error ? err.message : "Une erreur s'est produite lors de la traduction",
				variant: "destructive",
			})
		} finally {
			setIsTranslating(false)
		}
	}

	// Fonction pour effacer le champ de traduction
	const clearTranslationInput = () => {
		setNaturalLanguageQuery("");
	}

	return (
		<div className="flex flex-col gap-4 p-4">
			{/* Nouveau champ pour la saisie en langage naturel */}
			<div className="flex flex-col gap-2">
				<div className="flex items-center gap-2">
					<h3 className="text-sm font-medium">Traduction IA</h3>
					<Badge variant="outline" className="text-xs">Experimental</Badge>
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="ghost" size="icon" className="h-6 w-6">
								<Info className="h-4 w-4" />
								<span className="sr-only">Informations</span>
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-80">
							<div className="space-y-2">
								<h4 className="font-medium">À propos de la traduction IA</h4>
								<p className="text-sm">
									Cette fonctionnalité utilise un modèle LLM (llama3.2) local via Ollama pour traduire vos questions en requêtes SQL.
								</p>
								<p className="text-sm">
									<strong>Conseils d'utilisation:</strong>
								</p>
								<ul className="text-sm list-disc list-inside space-y-1">
									<li>Soyez précis dans votre description</li>
									<li>Spécifiez les tables concernées si possible</li>
									<li>Vérifiez et ajustez la requête générée avant de l'exécuter</li>
								</ul>
								<p className="text-sm text-muted-foreground">
									Requiert Ollama actif sur votre machine avec le modèle llama3.2
								</p>
							</div>
						</PopoverContent>
					</Popover>
				</div>
				<div className="flex gap-2 items-center">
					<div className="flex-grow relative">
						<Input
							placeholder="Décrivez votre requête en langage naturel, ex: 'Donne-moi tous les utilisateurs créés après 2023'"
							value={naturalLanguageQuery}
							onChange={(e) => setNaturalLanguageQuery(e.target.value)}
							className="w-full pr-8"
							onKeyDown={(e) => {
								if (e.key === 'Enter' && !isTranslating && naturalLanguageQuery.trim()) {
									handleTranslate();
								}
							}}
							disabled={isTranslating}
						/>
						{naturalLanguageQuery && (
							<Button
								variant="ghost"
								size="icon"
								className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
								onClick={clearTranslationInput}
								disabled={isTranslating}
							>
								<X className="h-4 w-4" />
								<span className="sr-only">Effacer</span>
							</Button>
						)}
					</div>
					<Button 
						onClick={handleTranslate} 
						disabled={isTranslating || !naturalLanguageQuery.trim()}
						variant="outline"
						className="min-w-[140px]"
					>
						{isTranslating ? (
							<span className="flex items-center gap-2">
								<Loader2 className="h-4 w-4 animate-spin" />
								Traduction...
							</span>
						) : "Traduire en SQL"}
					</Button>
				</div>
			</div>

			{/* Ajouter une info pour l'utilisateur */}
			{tableInfo.length > 0 && (
				<div className="text-xs text-muted-foreground italic">
					{`Information: La traduction utilisera les données des ${tableInfo.length} tables disponibles pour optimiser la requête.`}
				</div>
			)}
			
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
