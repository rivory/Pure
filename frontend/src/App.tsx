"use client"

import { useState, useEffect, useCallback } from "react"
import { model } from "../wailsjs/go/models"
import { ListConnections, GetTableInfo, SetActiveConnection } from "../wailsjs/go/main/App"
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
	const [activeTab, setActiveTab] = useState("1")
	const [tabs, setTabs] = useState<Tab[]>([{
		id: "1",
		title: "Query 1",
		queryState: {
			queryText: "",
			results: null
		}
	}])
	const [tables, setTables] = useState<TableInfo[]>([])

	// Fonction pour ajouter un nouvel onglet
	const addNewTab = useCallback(() => {
		const newId = String(tabs.length + 1)
		const newTitle = `Query ${newId}`
		setTabs((prevTabs) => [...prevTabs, {
			id: newId,
			title: newTitle,
			queryState: {
				queryText: "",
				results: null
			}
		}])
		setActiveTab(newId)
	}, [tabs.length])

	// Gestionnaire d'événements pour le raccourci Cmd+T
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Cmd+T sur Mac (ou Ctrl+T sur Windows/Linux)
			if ((e.metaKey || e.ctrlKey) && e.key === 't') {
				e.preventDefault() // Empêcher le comportement par défaut du navigateur
				addNewTab()
			}
		}

		// Ajouter l'écouteur d'événement
		window.addEventListener('keydown', handleKeyDown)

		// Supprimer l'écouteur d'événement à la destruction du composant
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [addNewTab])

	useEffect(() => {
		if (selectedConnection) {
			loadTableInfo()

			SetActiveConnection(selectedConnection)
				.then(() => {
					// no-op
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
					console.log({ result })
					console.log("result[0].uuid.toString() :", result[0].uuid.toString())
					setSelectedConnection(result[0])
				}
				console.log(result)
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

	console.log("selectedConnection", selectedConnection)

	return (
		<SidebarProvider>
			<AppSidebar
				connections={connections}
				refreshConnection={refreshConnection}
				onSelectConnection={setSelectedConnection}
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
										<BreadcrumbLink href="#">
											Queries
										</BreadcrumbLink>
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
	)
}
