"use client"
import * as React from "react"
import { AudioWaveform, BookOpen, Bot, Command, Frame, GalleryVerticalEnd, Map, PieChart, Settings2, SquareTerminal } from "lucide-react"
import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-project"
import { NavUser } from "@/components/nav-user"
import { NavDatabase } from "@/components/nav-database"
import { ConnectionSwitcher } from "@/components/connection-switcher"
import { ConnectionListDialog } from "@/components/connection/connection-list-dialog"
import {
	Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar"
import { model } from "../../wailsjs/go/models"
import { Button } from "@/components/ui/button"
import { Dispatch, SetStateAction } from "react"
import { CornerLeftUp, Cable } from "lucide-react"



// This is sample data.
const data = {
	user: {
		name: "shadcn",
		email: "m@example.com",
		avatar: "/avatars/shadcn.jpg",
	},
	teams: [
		{
			name: "Acme Inc",
			logo: GalleryVerticalEnd,
			plan: "Enterprise",
		},
		{
			name: "Acme Corp.",
			logo: AudioWaveform,
			plan: "Startup",
		},
		{
			name: "Evil Corp.",
			logo: Command,
			plan: "Free",
		},
	],
	navMain: [
		{
			title: "Playground",
			url: "#",
			icon: SquareTerminal,
			isActive: true,
			items: [
				{
					title: "History",
					url: "#",
				},
				{
					title: "Starred",
					url: "#",
				},
				{
					title: "Settings",
					url: "#",
				},
			],
		},
		{
			title: "Models",
			url: "#",
			icon: Bot,
			items: [
				{
					title: "Genesis",
					url: "#",
				},
				{
					title: "Explorer",
					url: "#",
				},
				{
					title: "Quantum",
					url: "#",
				},
			],
		},
		{
			title: "Documentation",
			url: "#",
			icon: BookOpen,
			items: [
				{
					title: "Introduction",
					url: "#",
				},
				{
					title: "Get Started",
					url: "#",
				},
				{
					title: "Tutorials",
					url: "#",
				},
				{
					title: "Changelog",
					url: "#",
				},
			],
		},
		{
			title: "Settings",
			url: "#",
			icon: Settings2,
			items: [
				{
					title: "General",
					url: "#",
				},
				{
					title: "Team",
					url: "#",
				},
				{
					title: "Billing",
					url: "#",
				},
				{
					title: "Limits",
					url: "#",
				},
			],
		},
	],
	projects: [
		{
			name: "Design Engineering",
			url: "#",
			icon: Frame,
		},
		{
			name: "Sales & Marketing",
			url: "#",
			icon: PieChart,
		},
		{
			name: "Travel",
			url: "#",
			icon: Map,
		},
	],
}

interface AppSidebarProps {
	readonly connections: model.Connection[]
	readonly refreshConnection: () => void
	onSelectConnection: Dispatch<SetStateAction<model.Connection | undefined>>
	readonly connected: boolean
}

export function AppSidebar({ connections, refreshConnection, onSelectConnection, connected, ...props }: AppSidebarProps) {

	let connectionListTrigger = <SidebarMenuButton onSelect={(e) => e.preventDefault()}>
		<div className="flex size-6 items-center justify-center rounded-md border bg-background">
			<Cable className="size-4" />
		</div>
		<div className="text-muted-foreground">Connections</div>
	</SidebarMenuButton>

	return (
		<Sidebar
			collapsible="icon"
			variant="floating"
		>
			<SidebarHeader>
				<ConnectionSwitcher
					connections={connections}
					refreshConnection={refreshConnection}
					onSelectConnection={onSelectConnection}
				/>
			</SidebarHeader>
			<SidebarContent>
				<NavDatabase connected={connected} />
				<NavMain items={data.navMain} />
				<NavProjects projects={data.projects} />
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<ConnectionListDialog dialogTrigger={connectionListTrigger} />
					</SidebarMenuItem>
				</SidebarMenu>
				{/* <NavUser user={data.user} /> */}
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	)
}
