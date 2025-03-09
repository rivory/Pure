"use client"

import { useState, useEffect, useCallback } from "react"
import { model } from "../wailsjs/go/models"
import { ListConnections, GetTableInfo, SetActiveConnection, TitleBarPressedDouble } from "../wailsjs/go/main/App"
import { AppSidebar } from "@/components/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { Sidebar, SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { QueryTabs } from "@/components/query-tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TableInfo } from "@/types/table-info"
import type { Tab } from "@/components/query-tabs"

export default function Page() {
	const [connections, SetConnections] = useState(Array<model.Connection>)
	const { toast } = useToast()
	const [selectedConnection, setSelectedConnection] = useState<model.Connection>()
	const [connected, setConnected] = useState(false)
	const [isSearchVisible, setIsSearchVisible] = useState(false)

	const [activeTab, setActiveTab] = useState("1")
	const [tabs, setTabs] = useState<Tab[]>([
		{
			id: "1",
			title: "Query 1",
			queryState: {
				queryText: "",
				results: null,
			},
		},
	])
	const [tables, setTables] = useState<TableInfo[]>([])

	// Fonction pour ajouter un nouvel onglet
	const addNewTab = useCallback(() => {
		// Find the next available query number
		const usedNumbers = tabs.map(tab => {
			const match = tab.title.match(/Query (\d+)/)
			return match ? parseInt(match[1], 10) : 0
		})
		const nextNumber = Math.max(...usedNumbers, 0) + 1

		const newId = String(nextNumber)
		const newTitle = `Query ${newId}`

		setTabs((prevTabs) => [
			...prevTabs,
			{
				id: newId,
				title: newTitle,
				queryState: {
					queryText: "",
					results: null,
				},
			},
		])
		setActiveTab(newId)
	}, [tabs])

	// TODO: move this into a shortcut file maybe where we declare all shortcuts ? 
	// Gestionnaire d'événements pour le raccourci Cmd+T
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Cmd+T sur Mac (ou Ctrl+T sur Windows/Linux)
			if ((e.metaKey || e.ctrlKey) && e.key === "t") {
				e.preventDefault() // Empêcher le comportement par défaut du navigateur
				addNewTab()
			}

			// Cmd+K pour activer/désactiver le champ de recherche
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault()
				setIsSearchVisible(prev => !prev)
			}
		}

		// Ajouter l'écouteur d'événement
		window.addEventListener("keydown", handleKeyDown)

		// Supprimer l'écouteur d'événement à la destruction du composant
		return () => {
			window.removeEventListener("keydown", handleKeyDown)
		}
	}, [addNewTab])

	useEffect(() => {
		if (selectedConnection) {
			loadTableInfo()

			SetActiveConnection(selectedConnection)
				.then(() => {
					console.log("connected to db ")
					setConnected(true)
				})
				.catch((err) => {
					console.error(err) // TODO: better error handling
					toast({
						title: "Error setting active connections",
						description: err instanceof Error ? err.message : "An error occurred",
						variant: "destructive",
					})
				})
		}
	}, [selectedConnection])

	const loadTableInfo = async () => {
		if (!selectedConnection) return
		try {
			// const info = await GetTableInfo(selectedConnection) TODO: fix call
			// setTables(info)
			// if (info.length > 0) {
			// 	setActiveTab(info[0].name)
			// }
		} catch (err) {
			console.error("Failed to load table info", err)
		}
	}

	function refreshConnection() {
		ListConnections()
			.then((result) => {
				SetConnections(result)
				if (result.length > 0 && !selectedConnection) {
					setSelectedConnection(result[0])
				}
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
		refreshConnection()
	}, [])

	return (
		<div>
			<div
				className="w-full size-9 py-1 text-center text-sm dark:bg-black dark:text-white bg-white text-black flex items-center justify-center"
				style={
					{
						"--wails-draggable": "drag",
					} as React.CSSProperties
				}
				onDoubleClick={() => {
					TitleBarPressedDouble();
				}}
			>
				{isSearchVisible ? (
					<div className="max-w-md w-full px-4" onClick={(e) => e.stopPropagation()}>
						<input
							type="text"
							placeholder="Rechercher..."
							className="w-full px-3 py-1 rounded border dark:border-gray-700 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
							autoFocus
							onBlur={() => setIsSearchVisible(false)}
							onClick={(e) => e.stopPropagation()}
						/>
					</div>
				) : (
					<span>Appuyez sur Cmd+K pour rechercher</span>
				)}
			</div>
			<SidebarProvider>
				<AppSidebar
					connections={connections}
					refreshConnection={refreshConnection}
					onSelectConnection={setSelectedConnection}
					connected={connected}
				/>
				<div
					id="content"
					className={cn(
						"max-w-full w-full ml-auto",
						"peer-data-[state=collapsed]:w-[calc(100%-var(--sidebar-width-icon))]",
						"peer-data-[state=expanded]:w-[calc(100%-var(--sidebar-width))]",
						"transition-[width] ease-linear duration-200",
						"h-svh flex flex-col",
					)}
				>
					<SidebarInset>
						<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
							<div className="flex items-center gap-2 px-4">
								<SidebarTrigger className="-ml-1" />
								<Separator
									orientation="vertical"
									className="mr-2 h-4"
								/>
								<Breadcrumb>
									<BreadcrumbList>
										<BreadcrumbItem className="hidden md:block">
											<BreadcrumbLink href="#">Queries</BreadcrumbLink>
										</BreadcrumbItem>
										<BreadcrumbSeparator className="hidden md:block" />
										<BreadcrumbItem>
											<Select
												value={activeTab}
												onValueChange={setActiveTab}
											>
												<SelectTrigger className="h-8 w-[200px]">
													<SelectValue placeholder="Select a query" />
												</SelectTrigger>
												<SelectContent>
													{tabs.map((tab) => (
														<SelectItem
															key={tab.id}
															value={tab.id}
														>
															{tab.title}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</BreadcrumbItem>
									</BreadcrumbList>
								</Breadcrumb>
							</div>
						</header>
						<div className="flex flex-1 flex-col gap-4 p-2 pt-0">
							<div className="flex-1 rounded-xl bg-muted/50 md:min-h-min">
								<QueryTabs
									selectedConnection={selectedConnection}
									activeTab={activeTab}
									onActiveTabChange={setActiveTab}
									tabs={tabs}
									onTabsChange={(newTabs) => setTabs(newTabs)}
									onAddTab={addNewTab}
								/>
							</div>
						</div>
					</SidebarInset>
					<Toaster />
				</div>
			</SidebarProvider>
		</div>
	)
}
