"use client"

import { useState, useEffect } from "react"
import { model } from "../wailsjs/go/models"
import { ListConnections } from "../wailsjs/go/main/App"
import { AppSidebar } from "@/components/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { Sidebar, SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { QueryInterface } from "@/components/query-interface"

export default function Page() {
	const [dbs, setDbs] = useState(Array<model.Connection>)
	const { toast } = useToast()
	const [selectedConnection, setSelectedConnection] = useState<string>()

	function refreshDB() {
		ListConnections()
			.then((result) => {
				setDbs(result)
				if (result.length > 0 && !selectedConnection) {
					console.log({ result })
					console.log("result[0].uuid.toString() :", result[0].uuid.toString())
					setSelectedConnection(result[0].uuid.toString())
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
		refreshDB()
	}, [])

	console.log("selectedConnection", selectedConnection)

	return (
		<SidebarProvider>
			<AppSidebar
				dbs={dbs}
				refreshDB={refreshDB}
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
											Building Your Application
										</BreadcrumbLink>
									</BreadcrumbItem>
									<BreadcrumbSeparator className="hidden md:block" />
									<BreadcrumbItem>
										<BreadcrumbPage>Data Fetching</BreadcrumbPage>
									</BreadcrumbItem>
								</BreadcrumbList>
							</Breadcrumb>
						</div>
					</header>
					<div className="flex flex-1 flex-col gap-4 p-2 pt-0">
						<div className="grid auto-rows-min gap-4 md:grid-cols-3">
							<div className="aspect-video rounded-xl bg-muted/50">
								<h1>Db list</h1>
								<ul>
									{dbs === null || dbs.length === 0 ? (
										<h2>There is no DB added.</h2>
									) : (
										dbs.map((db) => (
											<li key={db.host}>
												<b>{db.host}</b> -- {db.username}
											</li>
										))
									)}
								</ul>
							</div>
							<div className="aspect-video rounded-xl bg-muted/50" />
							<div className="aspect-video rounded-xl bg-muted/50" />
						</div>
						<div className="flex-1 rounded-xl bg-muted/50 md:min-h-min">
							<QueryInterface selectedConnection={selectedConnection} />
						</div>
					</div>
				</SidebarInset>
				<Toaster />
			</div>
		</SidebarProvider>
	)
}

{
	/* <div className="flex flex-1 flex-col gap-4 p-4">
<div className="grid auto-rows-min gap-4 md:grid-cols-3">
    <div className="aspect-video rounded-xl bg-muted/50"></div>
    <div className="aspect-video rounded-xl bg-muted/50" >
        <h1>Db list</h1>
        <ul>
            {dbs === null || dbs.length === 0 ?
                <h2>
                    There is no DB added.
                </h2>
                :
                dbs.map((db) => (
                    <li key={db.host}><b>{db.host}</b> -- {db.username}</li>
                ))
            }
        </ul>
    </div>
    <div className="aspect-video rounded-xl bg-muted/50">
        <SidebarProvider>
            <DBSwitcher dbs={dbs} refreshDB={refreshDB} />
        </SidebarProvider>
    </div>
</div>
<div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
</div> */
}

// import { useState } from 'react';
// import logo from './assets/images/logo-universal.png';
// import './App.css';
// import { Greet } from "../wailsjs/go/main/App";

// function App() {
//     const [resultText, setResultText] = useState("Please enter your name below 👇");
//     const [name, setName] = useState('');
//     const updateName = (e: any) => setName(e.target.value);
//     const updateResultText = (result: string) => setResultText(result);

//     function greet() {
//         Greet(name).then(updateResultText);
//     }

//     return (
//         <div id="App">
//             <img src={logo} id="logo" alt="logo" />
//             <div id="result" className="result">{resultText}</div>
//             <div id="input" className="input-box">
//                 <input id="name" className="input" onChange={updateName} autoComplete="off" name="input" type="text" />
//                 <button className="btn" onClick={greet}>Greet</button>
//             </div>
//             <button className="bg-violet-500 hover:bg-violet-600 focus:outline-2 focus:outline-offset-2 focus:outline-violet-500 active:bg-violet-700 ...">
//                 Save changes
//             </button>
//             <h1 className="text-3xl font-bold underline">
//                 Hello world!
//             </h1>
//         </div>
//     )
// }

// export default App

// import { AppSidebar } from "@/components/app-sidebar"
// import {
//     Breadcrumb,
//     BreadcrumbItem,
//     BreadcrumbLink,
//     BreadcrumbList,
//     BreadcrumbPage,
//     BreadcrumbSeparator,
// } from "@/components/ui/breadcrumb"
// import { Separator } from "@/components/ui/separator"
// import {
//     SidebarInset,
//     SidebarProvider,
//     SidebarTrigger,
// } from "@/components/ui/sidebar"

// export default function Page() {
//     return (
//         <SidebarProvider
//             style={
//                 {
//                     "--sidebar-width": "390px",
//                 } as React.CSSProperties
//             }
//         >
//             <AppSidebar />
//             <SidebarInset>
//                 <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
//                     <div className="flex items-center gap-2 px-4">
//                         <SidebarTrigger className="-ml-1" />
//                         <Separator orientation="vertical" className="mr-2 h-4" />
//                         <Breadcrumb>
//                             <BreadcrumbList>
//                                 <BreadcrumbItem className="hidden md:block">
//                                     <BreadcrumbLink href="#">All Inboxes</BreadcrumbLink>
//                                 </BreadcrumbItem>
//                                 <BreadcrumbSeparator className="hidden md:block" />
//                                 <BreadcrumbItem>
//                                     <BreadcrumbPage>Inbox</BreadcrumbPage>
//                                 </BreadcrumbItem>
//                             </BreadcrumbList>
//                         </Breadcrumb>
//                     </div>
//                 </header>
//                 <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
//                     <div className="grid auto-rows-min gap-4 md:grid-cols-3">
//                         <div className="aspect-video rounded-xl bg-muted/50" />
//                         <div className="aspect-video rounded-xl bg-muted/50" />
//                         <div className="aspect-video rounded-xl bg-muted/50" />
//                     </div>
//                     <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
//                 </div>
//             </SidebarInset>
//         </SidebarProvider >
//     )
// }
