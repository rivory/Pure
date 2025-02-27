import { useState, KeyboardEvent, useEffect, useRef } from "react"
import { Query, ListTables, GetTableInfo, TranslateToSQL, IsOllamaRunning, GetOllamaStatus } from "../../wailsjs/go/main/App"
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
import { Loader2, Info, X, Lightbulb, Download } from "lucide-react"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

// Interface pour le suivi de la cellule en cours d'édition
interface EditingCell {
	rowIndex: number;
	colIndex: number;
	value: string;
	tableName?: string;
	columnName?: string;
}

// Interface pour le status d'Ollama
interface OllamaStatus {
	state: string
	downloadedSize: number
	totalSize: number
	progress: number
	message: string
	error?: string
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
	const { toast } = useToast()
	const { theme } = useTheme()
	const [queryText, setQueryText] = useState(initialState?.queryText || "")
	const [results, setResults] = useState(initialState?.results || null)
	const [translationInput, setTranslationInput] = useState("")
	const [isExecuting, setIsExecuting] = useState(false)
	const [tableInfo, setTableInfo] = useState<TableInfo[]>([])
	const [tables, setTables] = useState<string[]>([])
	const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
	const editInputRef = useRef<HTMLInputElement>(null)
	const [currentTableName, setCurrentTableName] = useState<string>("")
	const [queryHistory, setQueryHistory] = useState<string[]>([])
	const [historyIndex, setHistoryIndex] = useState<number>(-1)
	
	// État pour indiquer si la traduction est en cours
	const [isTranslating, setIsTranslating] = useState(false)
	const [isOllamaRunning, setIsOllamaRunning] = useState(false)
	const [showTranslationInput, setShowTranslationInput] = useState(false)
	const [naturalLanguageQuery, setNaturalLanguageQuery] = useState("")
	
	// Status d'Ollama pour suivre l'installation/téléchargement
	const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>({
		state: "idle",
		downloadedSize: 0,
		totalSize: 0,
		progress: 0,
		message: "En attente d'initialisation"
	})
	
	// Function to update state and notify parent component
	const updateState = (newState: { queryText: string, results: { columns: string[], rows: any[][] } | null }) => {
		if (onStateChange) {
			onStateChange(newState)
		}
	}
	
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
		if (editingCell && editInputRef.current) {
			editInputRef.current.focus()
		}
	}, [editingCell])

	// Check if Ollama is running and get its status
	useEffect(() => {
		const checkOllamaStatus = async () => {
			try {
				const running = await IsOllamaRunning()
				setIsOllamaRunning(running)
				
				// Récupérer l'état détaillé d'Ollama
				const status = await GetOllamaStatus()
				setOllamaStatus(status)
			} catch (error) {
				console.error("Error checking Ollama status:", error)
				setIsOllamaRunning(false)
			}
		}
		
		checkOllamaStatus()
		
		// Vérifier l'état toutes les 2 secondes pendant l'installation
		const interval = setInterval(checkOllamaStatus, 2000)
		return () => clearInterval(interval)
	}, [])

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
		if (!naturalLanguageQuery.trim()) return

		if (!isOllamaRunning) {
			toast({
				title: "Ollama non disponible",
				description: "Le service Ollama est en cours de démarrage ou n'est pas disponible. Veuillez patienter ou vérifier l'état du service.",
				variant: "destructive"
			})
			return
		}

		setIsTranslating(true)
		try {
			// Convertir les informations de tables en JSON pour le backend
			const tableInfoJSON = tableInfo.length > 0 ? JSON.stringify(tableInfo) : "";
			
			// Appel au backend pour traduire avec Ollama
			// qui utilise maintenant le backend Go pour communiquer avec Ollama
			const sqlQuery = await TranslateToSQL(naturalLanguageQuery, tableInfoJSON);
			
			// Mettre à jour le champ SQL
			setQueryText(sqlQuery);
			updateState({ queryText: sqlQuery, results });
			setNaturalLanguageQuery("");
			setShowTranslationInput(false);
			
		} catch (error) {
			console.error("Erreur lors de la traduction:", error);
			toast({
				title: "Erreur de traduction",
				description: error instanceof Error ? error.message : "Une erreur s'est produite lors de la traduction",
				variant: "destructive",
			});
		} finally {
			setIsTranslating(false);
		}
	};

	// Helper pour formater la taille de téléchargement
	const formatFileSize = (bytes: number): string => {
		if (bytes === 0) return '0 B';
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
	};
	
	// Rendu du statut d'Ollama
	const renderOllamaStatus = () => {
		if (isOllamaRunning && ollamaStatus.state === "running") {
			return (
				<Badge variant="outline" className="ml-2 bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100">
					Ollama prêt
				</Badge>
			);
		}
		
		// Pendant le téléchargement
		if (ollamaStatus.state === "downloading") {
			return (
				<div className="ml-2 flex flex-col items-start">
					<Badge variant="outline" className="mb-1 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 flex items-center">
						<Download className="mr-1 h-3 w-3" />
						Téléchargement d'Ollama
					</Badge>
					<div className="w-48">
						<Progress value={ollamaStatus.progress} />
						<div className="text-xs text-muted-foreground mt-1">
							{formatFileSize(ollamaStatus.downloadedSize)} / {formatFileSize(ollamaStatus.totalSize)} ({ollamaStatus.progress.toFixed(1)}%)
						</div>
					</div>
				</div>
			);
		}
		
		// Pendant l'installation
		if (["extracting", "starting", "checking", "installing"].includes(ollamaStatus.state)) {
			return (
				<Badge variant="outline" className="ml-2 bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100 flex items-center">
					<Loader2 className="mr-1 h-3 w-3 animate-spin" />
					{ollamaStatus.message}
				</Badge>
			);
		}
		
		// En cas d'erreur
		if (ollamaStatus.state === "error") {
			return (
				<Badge variant="outline" className="ml-2 bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100">
					Erreur: {ollamaStatus.message}
				</Badge>
			);
		}
		
		// État par défaut (initialisation)
		return (
			<Badge variant="outline" className="ml-2 bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
				<Loader2 className="mr-1 h-3 w-3 animate-spin" />
				Initialisation...
			</Badge>
		);
	};

	return (
		<div className="flex flex-col h-full p-4">
			{/* Translation section */}
			<div className="mb-4 flex items-center">
				<Button
					variant="outline"
					size="sm"
					onClick={() => setShowTranslationInput(!showTranslationInput)}
					className="flex items-center gap-2"
				>
					<Lightbulb className="h-4 w-4" />
					Question en langage naturel
					{renderOllamaStatus()}
				</Button>
				
				<Popover>
					<PopoverTrigger asChild>
						<Button variant="ghost" size="icon" className="ml-2">
							<Info className="h-4 w-4" />
						</Button>
					</PopoverTrigger>
					<PopoverContent side="bottom" align="start" className="w-80">
						<div className="space-y-2">
							<h4 className="font-medium">Traduction en langage naturel</h4>
							<p className="text-sm text-muted-foreground">
								Cette fonctionnalité utilise un modèle LLM (llama3.2) local via Ollama pour traduire vos questions en requêtes SQL.
							</p>
							<p className="text-sm text-muted-foreground">
								Exemple: "Montre-moi tous les utilisateurs dont le nom contient 'Smith'"
							</p>
							{ollamaStatus.state !== "running" && (
								<div className="text-sm font-medium text-amber-600 dark:text-amber-400">
									<p>{ollamaStatus.message}</p>
									{ollamaStatus.state === "downloading" && (
										<div className="mt-2">
											<Progress value={ollamaStatus.progress} />
											<div className="text-xs mt-1">
												{formatFileSize(ollamaStatus.downloadedSize)} / {formatFileSize(ollamaStatus.totalSize)}
											</div>
										</div>
									)}
								</div>
							)}
						</div>
					</PopoverContent>
				</Popover>
			</div>
			
			{showTranslationInput && (
				<div className="flex items-center gap-2 mb-4">
					<Input
						placeholder="Entrez votre question en langage naturel..."
						value={naturalLanguageQuery}
						onChange={(e) => setNaturalLanguageQuery(e.target.value)}
						className="flex-1"
						onKeyDown={(e) => e.key === 'Enter' && handleTranslate()}
						disabled={isTranslating || !isOllamaRunning}
					/>
					<Button 
						onClick={handleTranslate} 
						disabled={isTranslating || !naturalLanguageQuery.trim() || !isOllamaRunning}
					>
						{isTranslating ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Traduction...
							</>
						) : (
							'Traduire'
						)}
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setShowTranslationInput(false)}
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			)}
			
			{/* SQL Editor section */}
			<div className="flex-1">
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
														ref={editInputRef}
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
		</div>
	)
}
